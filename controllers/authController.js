const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendOTP = require("../utils/sendEmail");

// --- RENDER METHODS (GET) ---
exports.getSignupPage = (req, res) => res.render("signup", { title: "Signup | FullStack Cafe", message: null });

exports.getLoginPage = (req, res) => {
    const message = req.query.verified === 'true' ? "Success! Account verified. Please login." : null;
    res.render("login", { title: "Login | FullStack Cafe", message });
};

exports.getVerifyPage = (req, res) => {
    const { email, type } = req.query;
    res.render("verify-otp", { 
        title: "Verify OTP",
        email: email || "", 
        message: null, 
        type: type || 'signup' 
    });
};

exports.getForgotPasswordPage = (req, res) => {
    res.render("forgot-password", { title: "Forgot Password", message: null });
};

// --- LOGIC METHODS (POST) ---

/**
 * Signup: Enforces unique emails, allows any username.
 */
exports.postSignup = async (req, res) => {
    try {
        const { username, password, email, phone } = req.body;
        const cleanEmail = email.toLowerCase().trim();
        const cleanUsername = username.trim();

        const existingUser = await User.findOne({ email: cleanEmail });
        
        if (existingUser) {
            if (existingUser.isVerified) {
                return res.status(400).json({ 
                    success: false, 
                    message: "User already exists with this email." 
                });
            } 
            await User.findByIdAndDelete(existingUser._id);
        }

        const avatarPath = "/images/default-avatar.png";
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

        const newUser = new User({
            username: cleanUsername,
            email: cleanEmail,
            phone: phone ? phone.trim() : "",
            password: password, 
            avatar: avatarPath,
            otp: otpCode,
            otpExpires: Date.now() + 10 * 60 * 1000
        });

        if (typeof sendOTP !== 'function') {
            throw new Error("sendOTP is not defined correctly in utils/sendEmail.js");
        }

        await Promise.all([
            newUser.save(),
            sendOTP(cleanEmail, otpCode)
        ]);
        
        return res.json({ 
            success: true, 
            redirectUrl: `/verify-otp?email=${encodeURIComponent(cleanEmail)}&type=signup` 
        });

    } catch (err) {
        console.error("Signup Error:", err);
        return res.status(500).json({ 
            success: false, 
            message: err.message || "Registration failed." 
        });
    }
};

/**
 * Login: Updated to use EMAIL instead of username
 */
exports.postLogin = async (req, res) => {
    try {
        const { email, password } = req.body; // Changed from username to email
        
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required." });
        }

        const cleanEmail = email.toLowerCase().trim();

        // Find user by email
        const user = await User.findOne({ email: cleanEmail }).select("+password");

        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid email or password." });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid email or password." });
        }

        // JWT Generation
        const payload = { id: user._id, name: user.username, email: user.email, role: user.role, avatar: user.avatar };
        const secret = process.env.JWT_SECRET || "fullstack_cafe_secret_key";
        const token = jwt.sign(payload, secret, { expiresIn: "1d" });

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000
        });

        // OTP Redirect if not verified
        if (!user.isVerified && user.role !== "admin") {
            const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
            user.otp = newOtp;
            user.otpExpires = Date.now() + 10 * 60 * 1000;
            
            await Promise.all([
                user.save(),
                sendOTP(user.email, newOtp)
            ]);

            return res.json({ 
                success: true, 
                redirectUrl: `/verify-otp?email=${encodeURIComponent(user.email)}&type=signup` 
            });
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

        await Promise.all([
            user.save(),
            sendOTP(user.email, newOtp)
        ]);

        return res.json({ success: true, message: "New OTP sent successfully!" });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Error resending OTP" });
    }
};

exports.postForgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) return res.status(404).json({ success: false, message: "This email is not registered." });

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otpCode;
        user.otpExpires = Date.now() + 10 * 60 * 1000;

        await Promise.all([
            user.save(),
            sendOTP(user.email, otpCode)
        ]);

        return res.json({ 
            success: true, 
            redirectUrl: `/verify-otp?email=${encodeURIComponent(user.email)}&type=reset` 
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Server error. Please try again later." });
    }
};

exports.postResetPassword = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        user.password = password; 
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        return res.json({ success: true, redirectUrl: "/login?verified=true" });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Failed to reset password." });
    }
};

exports.logout = (req, res) => {
    res.clearCookie("token");
    res.redirect("/login");
};