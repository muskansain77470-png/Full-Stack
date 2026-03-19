const express = require("express");
const router = express.Router();
const path = require("path");
const multer = require("multer");
const adminController = require("../controllers/adminController");
const isAdmin = require("../middlewares/isAdmin");
const extractUser = require("../middlewares/extractUser");

// --- Multer Storage Configuration ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "../public/images")); 
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// --- Middleware ---
router.use(extractUser);
router.use(isAdmin);

// --- Admin Routes ---

// 1. Dashboard
router.get("/dashboard", adminController.getDashboard);

// 2. Add Product Page (Render)
router.get("/products/add", (req, res) => {
    res.render("addProduct", { user: req.user });
});

// 3. Add Product Action (POST)
router.post("/products/add", upload.single("image"), adminController.addProduct);

// 4. Delete Product Action
router.post("/products/delete/:id", adminController.deleteProduct);

// 5. Update Order Status (The line that was crashing)
router.post("/orders/update-status", adminController.updateOrderStatus);

module.exports = router;