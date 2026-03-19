const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const multer = require("multer");

// Configure Multer for avatar uploads
const upload = multer({ dest: "public/uploads/" });

router.get("/signup", authController.getSignupPage);
router.post("/signup", upload.single("avatar"), authController.postSignup);

router.get("/login", authController.getLoginPage);
router.post("/login", authController.postLogin);

router.get("/logout", authController.logout);

module.exports = router;