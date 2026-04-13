const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
// ✅ Destructured sendOTP from the utility object
const { sendOTP } = require("../utils/sendEmail");

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

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

        const newUser = new User({
            username: cleanUsername,
            email: cleanEmail,
            phone: phone ? phone.trim() : "",
            password: password, 
            avatar: "/images/default-avatar.png",
            otp: otpCode,
            otpExpires: Date.now() + 10 * 60 * 1000
        });

        if (typeof sendOTP !== 'function') {
            throw new Error("sendOTP is not defined correctly in utils/sendEmail.js");
        }

        await newUser.save();
        await sendOTP(cleanEmail, otpCode);
        
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

exports.postLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ success: false, message: "Required fields missing." });

        const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ success: false, message: "Invalid credentials." });
        }

        if (!user.isVerified && user.role !== "admin") {
            const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
            user.otp = newOtp;
            user.otpExpires = Date.now() + 10 * 60 * 1000;
            await user.save();
            await sendOTP(user.email, newOtp);

            return res.json({ 
                success: true, 
                redirectUrl: `/verify-otp?email=${encodeURIComponent(user.email)}&type=signup` 
            });
        }

        const token = jwt.sign(
            { id: user._id, name: user.username, role: user.role }, 
            process.env.JWT_SECRET || "fullstack_cafe_secret_key", 
            { expiresIn: "1d" }
        );

        res.cookie("token", token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
        return res.json({ success: true, redirectUrl: user.role === "admin" ? "/admin/dashboard" : "/products" });

    } catch (err) {
        return res.status(500).json({ success: false, message: "Login failed." });
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
            user.isVerified = true;
            await user.save();

            const url = type === 'reset' ? `/reset-password?email=${user.email}` : "/login?verified=true";
            return res.json({ success: true, redirectUrl: url });
        } else {
            return res.status(400).json({ success: false, message: "Invalid or expired OTP." });
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

// ✅ ADDED: Missing Forgot Password Logic
exports.postForgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) return res.status(404).json({ success: false, message: "Email not found." });

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otpCode;
        user.otpExpires = Date.now() + 10 * 60 * 1000;
        await user.save();
        await sendOTP(user.email, otpCode);

        return res.json({ 
            success: true, 
            redirectUrl: `/verify-otp?email=${encodeURIComponent(user.email)}&type=reset` 
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Server error." });
    }
};

// ✅ ADDED: Missing Reset Password Logic
exports.postResetPassword = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) return res.status(404).json({ success: false, message: "User not found." });

        user.password = password; // Ensure your User model has a password hash pre-save hook
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