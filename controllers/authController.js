const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendOTP = require("../utils/sendEmail");

// --- RENDER METHODS (GET) ---

exports.getSignupPage = (req, res) => {
    res.render("signup", { message: null });
};

exports.getLoginPage = (req, res) => {
    const message = req.query.verified === 'true' ? "Success! Account verified. Please login." : null;
    res.render("login", { message });
};

exports.getVerifyPage = (req, res) => {
    const { email, type } = req.query;
    res.render("verify-otp", { 
        email: email || "", 
        message: null, 
        type: type || 'signup' 
    });
};

exports.getForgotPasswordPage = (req, res) => {
    res.render("forgot-password", { message: null });
};

// --- LOGIC METHODS (POST) ---

/**
 * FIXED SIGNUP LOGIC
 * Handles duplicate checks and unverified user overwrites
 */
exports.postSignup = async (req, res) => {
    try {
        const { username, password, email, phone } = req.body;
        const cleanEmail = email.toLowerCase().trim();
        const cleanUsername = username.trim();

        // 1. Check if user exists
        const existingUser = await User.findOne({ 
            $or: [{ email: cleanEmail }, { username: cleanUsername }] 
        });
        
        if (existingUser) {
            // Agar user verified hai, toh error dikhao
            if (existingUser.isVerified) {
                const msg = "User already exists with this email or username.";
                if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                    return res.status(400).json({ success: false, message: msg });
                }
                return res.render("signup", { message: msg });
            } 
            
            // Agar user verified NAHI hai, toh purana unverified record delete karke naya banane do
            // Isse "User already exists" wala error nahi aayega naye users ke liye
            await User.findByIdAndDelete(existingUser._id);
        }

        // 2. Hash Password & Prepare Data
        const hashedPassword = await bcrypt.hash(password, 10);
        const avatarPath = req.file ? `/images/${req.file.filename}` : "/images/default-avatar.png";
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = Date.now() + 10 * 60 * 1000; 

        // 3. Create New User
        const newUser = new User({
            username: cleanUsername,
            email: cleanEmail,
            phone: phone ? phone.trim() : "",
            password: hashedPassword,
            avatar: avatarPath,
            role: "user", 
            isVerified: false,
            otp: otpCode,
            otpExpires: otpExpiry
        });

        await newUser.save();
        await sendOTP(cleanEmail, otpCode);
        
        const redirectUrl = `/verify-otp?email=${cleanEmail}&type=signup`;
        
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.json({ success: true, redirectUrl });
        }
        res.redirect(redirectUrl);

    } catch (err) {
        console.error("Signup Error:", err);
        const errorMsg = err.code === 11000 ? "Email or Username already taken." : err.message;
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(500).json({ success: false, message: errorMsg });
        }
        res.render("signup", { message: errorMsg });
    }
};

exports.postLogin = async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const user = await User.findOne({ 
            username: { $regex: new RegExp(`^${username.trim()}$`, "i") } 
        }).select("+password");

        if (!user) {
            const msg = "Invalid username or password.";
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(401).json({ success: false, message: msg });
            }
            return res.render("login", { message: msg });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            const msg = "Invalid username or password.";
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(401).json({ success: false, message: msg });
            }
            return res.render("login", { message: msg });
        }

        // --- JWT TOKEN GENERATION ---
        const payload = { id: user._id, name: user.username, role: user.role, avatar: user.avatar };
        const secret = process.env.JWT_SECRET || "fullstack_cafe_secret_key";
        const token = jwt.sign(payload, secret, { expiresIn: "1d" });

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 24 * 60 * 60 * 1000
        });

        // Redirect based on verification status
        if (!user.isVerified && user.role !== "admin") {
            const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
            user.otp = newOtp;
            user.otpExpires = Date.now() + 10 * 60 * 1000;
            await user.save();
            await sendOTP(user.email, newOtp);

            const verifyUrl = `/verify-otp?email=${user.email}&type=signup`;
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({ success: true, redirectUrl: verifyUrl });
            }
            return res.redirect(verifyUrl);
        }

        const redirectUrl = user.role === "admin" ? "/admin/dashboard" : "/products";
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.json({ success: true, redirectUrl });
        }
        return res.redirect(redirectUrl);

    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ success: false, message: "Server error during login." });
    }
};

exports.postForgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const cleanEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: cleanEmail });

        if (!user) {
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(404).json({ success: false, message: "Email not found." });
            }
            return res.render("forgot-password", { message: "No account found." });
        }

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otpCode;
        user.otpExpires = Date.now() + 10 * 60 * 1000;
        await user.save();

        await sendOTP(user.email, otpCode);

        const redirectUrl = `/verify-otp?email=${user.email}&type=reset`;
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.json({ success: true, redirectUrl });
        }
        return res.redirect(redirectUrl);

    } catch (err) {
        return res.status(500).json({ success: false, message: "Server error." });
    }
};

exports.postVerifyOTP = async (req, res) => {
    try {
        const { email, otp, type } = req.body;
        const user = await User.findOne({ email: email.toLowerCase().trim() });

        if (!user) return res.render("verify-otp", { email, message: "User not found.", type });

        if (user.otp === otp && user.otpExpires > Date.now()) {
            user.otp = undefined;
            user.otpExpires = undefined;
            
            if (type === 'reset') {
                await user.save();
                return res.render("reset-password", { email: user.email, message: null });
            } else {
                user.isVerified = true;
                await user.save();
                return res.redirect("/login?verified=true");
            }
        } else {
            const msg = user.otpExpires < Date.now() ? "OTP Expired." : "Invalid OTP.";
            return res.render("verify-otp", { email, message: msg, type });
        }
    } catch (err) {
        res.render("verify-otp", { email: req.body.email, message: "Error.", type: req.body.type });
    }
};

exports.postResendOTP = async (req, res) => {
    try {
        const { email, type } = req.body;
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = newOtp;
        user.otpExpires = Date.now() + 10 * 60 * 1000;
        await user.save();

        await sendOTP(user.email, newOtp);
        return res.json({ success: true, message: "New code sent!" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Error resending OTP" });
    }
};

exports.postResetPassword = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        user.password = await bcrypt.hash(password, 10);
        user.isVerified = true; 
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        return res.json({ success: true, redirectUrl: "/login?verified=true" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Reset failed." });
    }
};

exports.logout = (req, res) => {
    res.clearCookie("token");
    res.redirect("/login");
};