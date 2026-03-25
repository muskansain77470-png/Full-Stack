const express = require("express");
const router = express.Router();
const path = require("path");
const multer = require("multer");
const authController = require("../controllers/authController");

// --- 1. MULTER CONFIGURATION FOR AVATARS ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(process.cwd(), "public", "images")); 
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file && file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed for profile pictures!'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB Limit
});

// --- 2. AUTHENTICATION ROUTES ---

// Signup
router.get("/signup", authController.getSignupPage);

// Signup POST with Multer error handling wrapper
router.post("/signup", (req, res, next) => {
    upload.single("avatar")(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.render("signup", { message: "Image too large. Please keep it under 2MB.", user: null });
        } else if (err) {
            return res.render("signup", { message: err.message, user: null });
        }
        next();
    });
}, authController.postSignup);

// Verification & OTP
router.get("/verify-otp", authController.getVerifyPage);
router.post("/verify-otp", authController.postVerifyOTP);
router.post("/resend-otp", authController.postResendOTP);

// Login & Logout
router.get("/login", authController.getLoginPage);
router.post("/login", authController.postLogin);
router.get("/logout", authController.logout);

// Password Reset Flow
router.get("/forgot-password", authController.getForgotPasswordPage);
router.post("/forgot-password", authController.postForgotPassword);
router.post("/reset-password", authController.postResetPassword);

// --- 3. DEVELOPMENT HELPERS ---
/**
 * Route to check session status during development.
 * Useful for debugging Login/Admin role issues.
 */
router.get("/check-session", (req, res) => {
    res.json({
        hasUserInRequest: !!req.user,
        user: req.user || "No user detected",
        session: req.session,
        cookies: req.cookies
    });
});

module.exports = router;