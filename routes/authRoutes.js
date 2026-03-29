const express = require("express");
const router = express.Router();
const path = require("path");
const multer = require("multer");
const authController = require("../controllers/authController");

// --- 1. MULTER CONFIGURATION ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(process.cwd(), "public", "images")); 
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'user-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file && file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files (PNG/JPG/JPEG) are allowed!'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB Limit
});

// --- 2. AUTHENTICATION ROUTES ---

// Render Pages (GET)
router.get("/signup", authController.getSignupPage);
router.get("/login", authController.getLoginPage);
router.get("/logout", authController.logout);
router.get("/verify-otp", authController.getVerifyPage);
router.get("/forgot-password", authController.getForgotPasswordPage);

// Logic Routes (POST) - FIXED FOR JSON/FETCH

// Signup with Multer Error Handling FIXED
router.post("/signup", (req, res, next) => {
    upload.single("profilePicture")(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            let errorMsg = "Image too large. Max 5MB allowed.";
            if (err.code === 'LIMIT_UNEXPECTED_FILE') errorMsg = "Field name mismatch.";
            // FIXED: Sending JSON instead of res.render
            return res.status(400).json({ success: false, message: errorMsg });
        } else if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }
        next();
    });
}, authController.postSignup);

// Login
router.post("/login", authController.postLogin);

// Verification & OTP
router.post("/verify-otp", authController.postVerifyOTP);
router.post("/resend-otp", authController.postResendOTP);

// Password Reset
router.post("/forgot-password", authController.postForgotPassword);
router.post("/reset-password", authController.postResetPassword);

// Development Helpers
router.get("/check-session", (req, res) => {
    res.json({
        user: req.user || "No user detected",
        cookies: req.cookies
    });
});

module.exports = router;