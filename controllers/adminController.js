const Product = require("../models/Product");
const Order = require("../models/Order");
const fs = require("fs");
const path = require("path");

// 1. Load Admin Dashboard
exports.getDashboard = async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        
        // Populate user details to show who ordered (e.g., name and email)
        const orders = await Order.find()
            .populate('user', 'name email') 
            .sort({ createdAt: -1 });

        res.render("adminDashboard", {
            user: req.user,
            products: products,
            orders: orders
        });
    } catch (err) {
        console.error("Dashboard Error:", err);
        res.status(500).send("Error loading dashboard data.");
    }
};

// 2. Add New Product
exports.addProduct = async (req, res) => {
    try {
        const { name, price, category, description, stock } = req.body;
        
        // Handle file upload or default image
        let imagePath = req.file ? req.file.filename : 'default-food.png';

        const newProduct = new Product({ 
            name, 
            price: parseFloat(price) || 0, 
            category, 
            description, 
            image: imagePath,
            stock: parseInt(stock) || 0 
        });

        await newProduct.save();
        res.redirect("/admin/dashboard"); 
    } catch (err) {
        console.error("Add Product Error:", err);
        // If upload failed, we should delete the uploaded file to keep storage clean
        if (req.file) {
            const uploadedPath = path.join(__dirname, "../public/images", req.file.filename);
            if (fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
        }
        res.status(500).send("Failed to add product. Ensure all fields are valid.");
    }
};

// 3. Update Stock (AJAX/API)
exports.updateStock = async (req, res) => {
    try {
        const { productId, stock } = req.body; 
        
        if (!productId) {
            return res.status(400).json({ success: false, message: "Product ID is required" });
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            productId, 
            { stock: Math.max(0, parseInt(stock) || 0) }, // Prevent negative stock
            { new: true }
        );

        if (!updatedProduct) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        res.json({ 
            success: true, 
            message: "Stock updated successfully", 
            currentStock: updatedProduct.stock 
        });
    } catch (err) {
        console.error("Stock Update Error:", err);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// 4. Delete Product and its Image
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).send("Product not found");
        }

        // 1. Delete associated image file from disk
        if (product.image && product.image !== 'default-food.png') {
            // Updated path logic to be more robust
            const filePath = path.join(__dirname, "..", "public", "images", product.image);
            
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            } catch (fileErr) {
                console.warn("Image file not found on disk, but continuing with DB deletion.");
            }
        }
        
        // 2. Delete from Database
        await Product.findByIdAndDelete(req.params.id);
        res.redirect("/admin/dashboard");

    } catch (err) {
        console.error("Delete Error:", err);
        res.status(500).send("Error deleting product");
    }
};

// 5. Update Order Status (AJAX support)
exports.updateOrderStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;

        if (!orderId || !status) {
            return res.status(400).json({ success: false, message: "Order ID and status required" });
        }

        const updatedOrder = await Order.findByIdAndUpdate(
            orderId, 
            { status: status },
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }
        
        res.json({ 
            success: true, 
            message: `Order status changed to ${status}`,
            updatedStatus: updatedOrder.status
        });
    } catch (err) {
        console.error("Update Status Error:", err);
        res.status(500).json({ success: false, message: "Error updating status" });
    }
};