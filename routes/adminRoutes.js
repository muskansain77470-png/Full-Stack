const express = require("express");
const router = express.Router();
const path = require("path");
const multer = require("multer");
const adminController = require("../controllers/adminController");

// --- 1. ADMIN AUTH MIDDLEWARE ---
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        return next();
    } else {
        return res.status(403).render("404", { 
            title: "Access Denied", 
            message: "You do not have permission to view the Command Center.",
            user: req.user || null,
            cartCount: 0 
        });
    }
};

// --- 2. MULTER CONFIG ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(process.cwd(), "public", "images")); 
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'prod-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } 
});

// --- 3. ADMIN ROUTES ---

// Dashboard
router.get("/dashboard", isAdmin, adminController.getDashboard);

// Products
router.get("/add-product", isAdmin, adminController.getAddProductPage);
router.post("/products/add", isAdmin, upload.single("image"), adminController.addProduct);
router.post("/update-stock", isAdmin, adminController.updateStock);
router.get("/delete-product/:id", isAdmin, adminController.deleteProduct);

// Orders
router.post("/update-order-status", isAdmin, adminController.updateOrderStatus);

// Support (FIXED: Ensure these functions exist in Controller)
router.post("/update-support-status", isAdmin, adminController.updateSupportStatus);
router.get("/delete-support/:id", isAdmin, adminController.deleteSupport);
router.post("/reply-support", isAdmin, adminController.replyToSupport);

module.exports = router;