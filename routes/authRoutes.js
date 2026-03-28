const express = require("express");
const router = express.Router();
const path = require("path");
const multer = require("multer");
const authController = require("../controllers/authController");

// --- 1. MULTER CONFIGURATION ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Ensure this folder exists: public/images
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
        cb(new Error('Only image files (PNG/JPG) are allowed!'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB Limit
});

// --- 2. AUTHENTICATION ROUTES ---

// Signup GET
router.get("/signup", authController.getSignupPage);

// Signup POST (Fixed Field Name and Error Handling)
router.post("/signup", (req, res, next) => {
    // CHANGED: 'avatar' to 'profilePicture' to match your EJS form field
    upload.single("profilePicture")(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            // Handle Multer-specific errors (like file size)
            return res.render("signup", { 
                message: "Image is too large. Please upload a file under 2MB.", 
                user: null 
            });
        } else if (err) {
            // Handle custom filter errors (like wrong file type)
            return res.render("signup", { 
                message: err.message, 
                user: null 
            });
        }
        // If no upload errors, move to the controller logic
        next();
    });
}, authController.postSignup);

// Login & Logout
router.get("/login", authController.getLoginPage);
router.post("/login", authController.postLogin);
router.get("/logout", authController.logout);

// Verification & OTP
router.get("/verify-otp", authController.getVerifyPage);
router.post("/verify-otp", authController.postVerifyOTP);
router.post("/resend-otp", authController.postResendOTP);

// Password Reset Flow
router.get("/forgot-password", authController.getForgotPasswordPage);
router.post("/forgot-password", authController.postForgotPassword);
router.post("/reset-password", authController.postResetPassword);

// --- 3. DEVELOPMENT HELPERS ---
router.get("/check-session", (req, res) => {
    res.json({
        hasUserInRequest: !!req.user,
        user: req.user || "No user detected",
        session: req.session,
        cookies: req.cookies
    });
});

module.exports = router;