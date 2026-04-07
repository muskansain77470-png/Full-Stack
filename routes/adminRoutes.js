const express = require("express");
const router = express.Router();
const path = require("path");
const multer = require("multer");

const adminController = require("../controllers/adminController");
const Product = require("../models/Product");
const Order = require("../models/Order");

/**
 * 🔐 ADMIN AUTH MIDDLEWARE (FIXED)
 */
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === "admin") {
        return next();
    }
    return res.status(403).json({
        success: false,
        message: "Access Denied"
    });
};

/**
 * 📁 MULTER CONFIG
 */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(process.cwd(), "public", "images"));
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, "prod-" + unique + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }
});

/**
 * 📊 DASHBOARD
 */
router.get("/dashboard", isAdmin, adminController.getDashboard);

/**
 * 🛒 PRODUCT ROUTES
 */
router.get("/add-product", isAdmin, (req, res) => {
    res.render("add-product", { user: req.user, title: "Add Product" });
});

router.post("/products/add", isAdmin, upload.single("image"), adminController.addProduct);

router.get("/delete-product/:id", isAdmin, adminController.deleteProduct);

/**
 * 📦 UPDATE STOCK (FIXED)
 */
router.post("/products/update-stock", isAdmin, async (req, res) => {
    try {
        const { productId, stock } = req.body;

        const stockNum = parseInt(stock, 10);
        if (isNaN(stockNum) || stockNum < 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid stock value"
            });
        }

        const updated = await Product.findByIdAndUpdate(
            productId,
            { stock: stockNum },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        res.json({
            success: true,
            message: "Stock updated",
            product: updated
        });

    } catch (err) {
        console.error("Stock Error:", err);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

/**
 * 📦 UPDATE ORDER STATUS (FIXED)
 */
router.post("/orders/update-status", isAdmin, async (req, res) => {
    try {
        const { orderId, status } = req.body;

        const validStatuses = ["Pending", "Preparing", "Ready", "Delivered", "Cancelled"];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status"
            });
        }

        const updated = await Order.findByIdAndUpdate(
            orderId,
            { status },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        // 🔥 SOCKET EMIT
        const io = req.app.get("socketio");
        if (io && updated.userId) {
            io.to(updated.userId.toString()).emit("orderUpdate", {
                orderId,
                status,
                message: `Your order is now ${status}`
            });
        }

        res.json({
            success: true,
            message: `Status updated to ${status}`,
            order: updated
        });

    } catch (err) {
        console.error("Order Error:", err);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

/**
 * 💬 SUPPORT ROUTES
 */
router.post("/support/update-status", isAdmin, adminController.updateSupportStatus);
router.post("/reply-support", isAdmin, adminController.replyToSupport);

module.exports = router;