const express = require("express");
const router = express.Router();
const path = require("path");
const multer = require("multer");
const adminController = require("../controllers/adminController");

/**
 * Custom Middleware: isAdmin
 * Ensures only users with the 'admin' role can proceed.
 */
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        console.warn(`Unauthorized access attempt by: ${req.user ? req.user.email : 'Guest'}`);
        res.status(403).render("404", { 
            title: "Access Denied", 
            message: "You do not have permission to view the Command Center.",
            user: req.user || null,
            cartCount: 0 
        });
    }
};

// --- Multer Storage Configuration ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Ensures path compatibility across different OS environments
        cb(null, path.join(process.cwd(), "public", "images")); 
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'prod-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files (JPG, PNG, WebP) are allowed!'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB Limit
});

// --- ADMIN ROUTES ---

// 1. Dashboard Core
router.get("/dashboard", isAdmin, adminController.getDashboard);

// 2. Inventory & Product Management
router.post("/products/update-stock", isAdmin, adminController.updateStock);
router.post("/add-product", isAdmin, upload.single("image"), adminController.addProduct);
router.get("/delete-product/:id", isAdmin, adminController.deleteProduct);

// 3. Order Management
// Matches the AJAX URL in adminDashboard.ejs
router.post("/orders/update-status", isAdmin, adminController.updateOrderStatus);

// 4. Support Ticket Management
// Matches the AJAX URL in adminDashboard.ejs
router.post("/support/update-status", isAdmin, adminController.updateSupportStatus);
router.get("/delete-support/:id", isAdmin, adminController.deleteSupport);
router.post("/reply-support", isAdmin, adminController.replyToSupport);

module.exports = router;