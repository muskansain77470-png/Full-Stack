const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendOTP = require("../utils/sendEmail");

// --- RENDER METHODS (GET) ---
exports.getSignupPage = (req, res) => res.render("signup", { message: null });

exports.getLoginPage = (req, res) => {
    const message = req.query.verified === 'true' ? "Success! Account verified. Please login." : null;
    res.render("login", { message });
};

exports.getVerifyPage = (req, res) => {
    const { email, type } = req.query;
    res.render("verify-otp", { email: email || "", message: null, type: type || 'signup' });
};

exports.getForgotPasswordPage = (req, res) => {
    res.render("forgot-password", { message: null });
};

// --- LOGIC METHODS (POST) ---

exports.postSignup = async (req, res) => {
    try {
        const { username, password, email, phone } = req.body;
        const cleanEmail = email.toLowerCase().trim();
        const cleanUsername = username.trim();

        const existingUser = await User.findOne({ 
            $or: [{ email: cleanEmail }, { username: cleanUsername }] 
        });
        
        if (existingUser) {
            if (existingUser.isVerified) {
                return res.status(400).json({ success: false, message: "User already exists." });
            } 
            await User.findByIdAndDelete(existingUser._id);
        }

        const avatarPath = req.file ? `/images/${req.file.filename}` : "/images/default-avatar.png";
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

        const newUser = new User({
            username: cleanUsername,
            email: cleanEmail,
            phone: phone ? phone.trim() : "",
            password: password, // IMPORTANT: Hash model handle karega, yahan mat karna
            avatar: avatarPath,
            otp: otpCode,
            otpExpires: Date.now() + 10 * 60 * 1000
        });

        await newUser.save();
        await sendOTP(cleanEmail, otpCode);
        
        return res.json({ success: true, redirectUrl: `/verify-otp?email=${cleanEmail}&type=signup` });
    } catch (err) {
        console.error("Signup Error:", err);
        return res.status(500).json({ success: false, message: "Registration failed. Try again." });
    }
};

exports.postLogin = async (req, res) => {
    try {
        const { username, password } = req.body;
        // Case-insensitive username search
        const user = await User.findOne({ 
            username: { $regex: new RegExp(`^${username.trim()}$`, "i") } 
        }).select("+password");

        if (!user) return res.status(401).json({ success: false, message: "Invalid credentials." });

        // FIXED: Using model method for comparison
        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(401).json({ success: false, message: "Invalid credentials." });

        const payload = { id: user._id, name: user.username, role: user.role, avatar: user.avatar };
        const secret = process.env.JWT_SECRET || "fullstack_cafe_secret_key";
        const token = jwt.sign(payload, secret, { expiresIn: "1d" });

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 24 * 60 * 60 * 1000
        });

        if (!user.isVerified && user.role !== "admin") {
            const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
            user.otp = newOtp;
            user.otpExpires = Date.now() + 10 * 60 * 1000;
            await user.save();
            await sendOTP(user.email, newOtp);
            return res.json({ success: true, redirectUrl: `/verify-otp?email=${user.email}&type=signup` });
        }

        const redirectUrl = user.role === "admin" ? "/admin/dashboard" : "/products";
        return res.json({ success: true, redirectUrl });
    } catch (err) {
        console.error("Login Error:", err);
        return res.status(500).json({ success: false, message: "Server error during login." });
    }
};

exports.postVerifyOTP = async (req, res) => {
    try {
        const { email, otp, type } = req.body;
        const user = await User.findOne({ email: email.toLowerCase().trim() });

        if (!user) return res.status(404).json({ success: false, message: "User not found." });

        if (user.otp === otp && user.otpExpires > Date.now()) {
            user.otp = undefined;
            user.otpExpires = undefined;
            
            if (type === 'reset') {
                await user.save();
                return res.json({ success: true, redirectUrl: `/reset-password?email=${user.email}` });
            } else {
                user.isVerified = true;
                await user.save();
                return res.json({ success: true, redirectUrl: "/login?verified=true" });
            }
        } else {
            const msg = user.otpExpires < Date.now() ? "OTP Expired." : "Invalid OTP.";
            return res.status(400).json({ success: false, message: msg });
        }
    } catch (err) {
        return res.status(500).json({ success: false, message: "Verification failed." });
    }
};

exports.postResendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = newOtp;
        user.otpExpires = Date.now() + 10 * 60 * 1000;
        await user.save();
        await sendOTP(user.email, newOtp);
        return res.json({ success: true, message: "New OTP sent!" });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Error resending OTP" });
    }
};

exports.postForgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) return res.status(404).json({ success: false, message: "Email not registered." });

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otpCode;
        user.otpExpires = Date.now() + 10 * 60 * 1000;
        await user.save();
        await sendOTP(user.email, otpCode);

        return res.json({ success: true, redirectUrl: `/verify-otp?email=${user.email}&type=reset` });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Server error." });
    }
};

exports.postResetPassword = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        user.password = password; // Model will hash this automatically on save
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        return res.json({ success: true, redirectUrl: "/login?verified=true" });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Reset failed." });
    }
};

exports.logout = (req, res) => {
    res.clearCookie("token");
    res.redirect("/login");
};