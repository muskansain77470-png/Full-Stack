const User = require("../models/User");
const Cart = require("../models/Cart");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendMail } = require("../utils/mailer"); 

const SECRET_KEY = process.env.JWT_SECRET || "fullstack_cafe_secret_key";

/* ================= HELPERS ================= */

const sendOTPEmail = async (email, otp) => {
    try {
        await sendMail({
            to: email,
            subject: "Verify your FullStack Cafe Account",
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee;">
                    <h2 style="color: #333;">Email Verification</h2>
                    <p>Your OTP for FullStack Cafe is:</p>
                    <h1 style="color: #e67e22; letter-spacing: 5px;">${otp}</h1>
                    <p>This OTP will expire in 10 minutes.</p>
                </div>
            `
        });
    } catch (error) {
        console.error("❌ Error sending OTP:", error.message);
        throw new Error("Email service failed");
    }
};

const proceedToLogin = async (user, req, res) => {
    try {
        if (req.session.cart && req.session.cart.length > 0) {
            let userCart = await Cart.findOne({ userId: user._id });
            if (!userCart) {
                userCart = new Cart({ userId: user._id, items: req.session.cart });
            } else {
                req.session.cart.forEach(sessionItem => {
                    const exist = userCart.items.find(item => 
                        item.productId?.toString() === sessionItem.productId?.toString() || 
                        item.name === sessionItem.name
                    );
                    if (exist) exist.quantity += sessionItem.quantity;
                    else userCart.items.push(sessionItem);
                });
            }
            await userCart.save();
            req.session.cart = []; 
        }

        const token = jwt.sign(
            { id: user._id, name: user.username, role: user.role, avatar: user.avatar },
            SECRET_KEY,
            { expiresIn: "1d" }
        );

        res.cookie("token", token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production"
        });

        const redirectUrl = user.role === "admin" ? "/admin/dashboard" : "/products";
        return res.json({ success: true, redirectUrl });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Error finalizing login." });
    }
};

/* ================= RENDER METHODS ================= */

exports.getSignupPage = (req, res) => res.render("signup", { title: "Signup | FullStack Cafe", message: null });
exports.getLoginPage = (req, res) => {
    const message = req.query.verified === 'true' ? "Success! Account verified. Please login." : null;
    res.render("login", { title: "Login | FullStack Cafe", message });
};
exports.getVerifyPage = (req, res) => {
    const { email, type } = req.query;
    res.render("verify-otp", { title: "Verify OTP", email: email || "", message: null, type: type || 'signup' });
};
exports.getForgotPasswordPage = (req, res) => res.render("forgot-password", { title: "Forgot Password", message: null });

/* ================= LOGIC METHODS ================= */

exports.postSignup = async (req, res) => {
    try {
        const { username, email, password, phone } = req.body;
        const cleanEmail = email.toLowerCase().trim();
        const existingUser = await User.findOne({ email: cleanEmail });
        if (existingUser) {
            if (existingUser.isVerified) return res.status(400).json({ success: false, message: "Email already registered." });
            await User.findByIdAndDelete(existingUser._id);
        }
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const avatarPath = req.file ? `/images/${req.file.filename}` : "/images/default-avatar.png";
        const newUser = new User({ username: username.trim(), email: cleanEmail, phone: phone || "", password, avatar: avatarPath, otp: otpCode, otpExpires: Date.now() + 10 * 60 * 1000 });
        await Promise.all([newUser.save(), sendOTPEmail(cleanEmail, otpCode)]);
        res.json({ success: true, redirectUrl: `/verify-otp?email=${encodeURIComponent(cleanEmail)}&type=signup` });
    } catch (err) {
        res.status(500).json({ success: false, message: "Registration failed." });
    }
};

exports.postLogin = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ $or: [{ username: username.trim() }, { email: username.toLowerCase().trim() }] }).select("+password");
        if (!user || !(await user.comparePassword(password))) return res.status(401).json({ success: false, message: "Invalid credentials." });
        if (!user.isVerified && user.role !== "admin") {
            const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
            user.otp = newOtp;
            user.otpExpires = Date.now() + 10 * 60 * 1000;
            await Promise.all([user.save(), sendOTPEmail(user.email, newOtp)]);
            return res.json({ success: false, isUnverified: true, redirectUrl: `/verify-otp?email=${encodeURIComponent(user.email)}&type=signup` });
        }
        return await proceedToLogin(user, req, res);
    } catch (err) {
        res.status(500).json({ success: false, message: "Login failed." });
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
        }
        return res.status(400).json({ success: false, message: "Invalid or expired OTP." });
    } catch (err) {
        res.status(500).json({ success: false, message: "Verification failed." });
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
        await Promise.all([user.save(), sendOTPEmail(user.email, newOtp)]);
        res.json({ success: true, message: "OTP Resent!" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Error resending OTP" });
    }
};

exports.postForgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) return res.status(404).json({ success: false, message: "Email not found." });
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otpCode;
        user.otpExpires = Date.now() + 10 * 60 * 1000;
        await Promise.all([user.save(), sendOTPEmail(user.email, otpCode)]);
        res.json({ success: true, redirectUrl: `/verify-otp?email=${encodeURIComponent(user.email)}&type=reset` });
    } catch (err) {
        res.status(500).json({ success: false, message: "Request failed." });
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
        res.json({ success: true, redirectUrl: "/login?verified=true" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Reset failed." });
    }
};

exports.logout = (req, res) => {
    res.clearCookie("token");
    res.redirect("/login");
};

// --- CRITICAL FIX: Add this at the bottom ---
module.exports = {
    getSignupPage: exports.getSignupPage,
    getLoginPage: exports.getLoginPage,
    getVerifyPage: exports.getVerifyPage,
    getForgotPasswordPage: exports.getForgotPasswordPage,
    postSignup: exports.postSignup,
    postLogin: exports.postLogin,
    postVerifyOTP: exports.postVerifyOTP,
    postResendOTP: exports.postResendOTP,
    postForgotPassword: exports.postForgotPassword,
    postResetPassword: exports.postResetPassword,
    logout: exports.logout
};