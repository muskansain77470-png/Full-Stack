const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Render Signup Page
exports.getSignupPage = (req, res) => {
    res.render("signup", { message: null });
};

// Handle Signup Logic
exports.postSignup = async (req, res) => {
    try {
        const { username, password, email, phone } = req.body;

        // Clean data to prevent false "already registered" errors
        const cleanEmail = email.toLowerCase().trim();
        const cleanUsername = username.trim();

        // 1. Check if Email already exists
        const existingEmail = await User.findOne({ email: cleanEmail });
        if (existingEmail) {
            return res.render("signup", { message: "Email is already registered. Try logging in." });
        }

        // 2. Check if Username already exists
        const existingUser = await User.findOne({ username: cleanUsername });
        if (existingUser) {
            return res.render("signup", { message: "Username is already taken." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const avatarPath = req.file ? `/${req.file.filename}` : "default-avatar.png";

        const newUser = new User({
            username: cleanUsername,
            email: cleanEmail,
            phone: phone ? phone.trim() : "",
            password: hashedPassword,
            avatar: avatarPath,
            role: "user", // Default role for new signups
        });

        await newUser.save();
        console.log("✅ New user registered:", cleanEmail);
        res.redirect("/login");
    } catch (err) {
        console.error("Signup Error:", err);
        // Catch Mongo Unique Constraint Errors (Code 11000)
        if (err.code === 11000) {
            return res.render("signup", { message: "User details already exist in database." });
        }
        res.render("signup", { message: "Error during signup: " + err.message });
    }
};

// Render Login Page
exports.getLoginPage = (req, res) => {
    res.render("login", { message: null });
};

// Handle Login Logic
exports.postLogin = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username: username.trim() });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.render("login", { message: "Invalid username or password" });
        }

        const payload = {
            id: user._id,
            name: user.username,
            role: user.role,
            avatar: user.avatar,
        };

        const secret = process.env.JWT_SECRET || "fullstack_cafe_secret_key";
        const token = jwt.sign(payload, secret, { expiresIn: "1d" });

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });

        // Role-based redirection
        if (user.role === "admin") {
            res.redirect("/admin/dashboard");
        } else {
            res.redirect("/products");
        }
    } catch (err) {
        res.render("login", { message: "Login error occurred." });
    }
};

// Handle Logout
exports.logout = (req, res) => {
    res.clearCookie("token");
    res.redirect("/login");
};