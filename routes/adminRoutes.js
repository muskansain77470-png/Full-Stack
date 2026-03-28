const express = require("express");
const router = express.Router();
const path = require("path");
const multer = require("multer");
const adminController = require("../controllers/adminController");

/**
 * 1. Custom Middleware: isAdmin
 * Ensure only authorized admins can access these routes.
 */
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        return next();
    } else {
        console.warn(`🚨 Unauthorized access attempt by: ${req.user ? req.user.email : 'Guest'}`);
        // Redirecting to 404 with a specific message for security/access denial
        return res.status(403).render("404", { 
            title: "Access Denied", 
            message: "You do not have permission to view the Command Center.",
            user: req.user || null,
            cartCount: 0 
        });
    }
};

/**
 * 2. Multer Storage Configuration
 * Handles product image uploads with unique filenames.
 */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // process.cwd() ensures we start from the project root
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

/**
 * A. Dashboard Core (Supports Pagination)
 * URL Example: /admin/dashboard?orderPage=1&productPage=2
 */
router.get("/dashboard", isAdmin, adminController.getDashboard);

/**
 * B. Inventory & Product Management
 */
// Render form to add product
router.get("/add-product", isAdmin, adminController.getAddProductPage); 

// Logic to add product
router.post("/products/add", isAdmin, upload.single("image"), adminController.addProduct);

// AJAX route for stock updates
router.post("/products/update-stock", isAdmin, adminController.updateStock);

// Delete product route
router.get("/delete-product/:id", isAdmin, adminController.deleteProduct);

/**
 * C. Order Management
 */
// AJAX route for order status (preparing, delivering, etc.)
router.post("/orders/update-status", isAdmin, adminController.updateOrderStatus);

/**
 * D. Support Ticket Management
 */
// AJAX route for ticket status
router.post("/support/update-status", isAdmin, adminController.updateSupportStatus);

// Delete ticket
router.get("/delete-support/:id", isAdmin, adminController.deleteSupport);

// Reply to customer via Email
router.post("/reply-support", isAdmin, adminController.replyToSupport);

module.exports = router;