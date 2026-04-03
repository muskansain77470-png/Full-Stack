const express = require("express");
const router = express.Router();
const path = require("path");
const multer = require("multer");
const authController = require("../controllers/authController");

// --- MULTER CONFIG ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(process.cwd(), "public", "images")),
    filename: (req, file, cb) => cb(null, 'user-' + Date.now() + path.extname(file.originalname))
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } 
});

// --- ROUTES ---

// GET Pages
router.get("/signup", authController.getSignupPage);
router.get("/login", authController.getLoginPage);
router.get("/logout", authController.logout);
router.get("/verify-otp", authController.getVerifyPage);
router.get("/forgot-password", authController.getForgotPasswordPage);

// POST Logic
router.post("/signup", upload.single("avatar"), authController.postSignup);
router.post("/login", authController.postLogin);
router.post("/verify-otp", authController.postVerifyOTP);
router.post("/resend-otp", authController.postResendOTP);
router.post("/forgot-password", authController.postForgotPassword);
router.post("/reset-password", authController.postResetPassword);

module.exports = router;