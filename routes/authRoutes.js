const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// --- ROUTES ---

// GET Pages
router.get("/signup", authController.getSignupPage);
router.get("/login", authController.getLoginPage);
router.get("/logout", authController.logout);
router.get("/verify-otp", authController.getVerifyPage);
router.get("/forgot-password", authController.getForgotPasswordPage);

// POST Logic
/**
 * FIXED: Removed 'multer' middleware because the frontend is sending 
 * standard JSON and we are using a default avatar in the controller.
 */
router.post("/signup", authController.postSignup);

router.post("/login", authController.postLogin);
router.post("/verify-otp", authController.postVerifyOTP);
router.post("/resend-otp", authController.postResendOTP);
router.post("/forgot-password", authController.postForgotPassword);
router.post("/reset-password", authController.postResetPassword);

module.exports = router;