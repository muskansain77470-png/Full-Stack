const Product = require("../models/Product");
const Order = require("../models/Order");
const fs = require("fs");
const path = require("path");

/**
 * 1. Admin Dashboard Logic (Data Fetching & Rendering)
 */
exports.getDashboard = async (req, res) => {
    try {
        const limit = 20; // Thoda zyada data dikhane ke liye
        const orderPage = Math.max(1, parseInt(req.query.orderPage) || 1);
        const productPage = Math.max(1, parseInt(req.query.productPage) || 1);

        // Fetching data parallelly for speed
        const [products, totalProducts, orders, totalOrders] = await Promise.all([
            Product.find()
                .sort({ createdAt: -1 })
                .skip((productPage - 1) * limit)
                .limit(limit)
                .lean(),
            Product.countDocuments(),
            Order.find()
                .populate("user", "username email phone")
                .populate("items.productId")
                .sort({ createdAt: -1 })
                .skip((orderPage - 1) * limit)
                .limit(limit)
                .lean(),
            Order.countDocuments()
        ]);

        // Guest user safety mapping
        const mappedOrders = (orders || []).map(order => ({
            ...order,
            user: order.user || { 
                username: "Guest User", 
                email: "N/A", 
                phone: "N/A" 
            }
        }));

        res.render("adminDashboard", {
            user: req.user,
            title: "Command Center | Admin",
            products: products || [],
            orders: mappedOrders,
            supports: [], 
            cartCount: 0,
            pagination: {
                orders: { 
                    current: orderPage, 
                    total: Math.ceil(totalOrders / limit) || 1 
                },
                products: { 
                    current: productPage, 
                    total: Math.ceil(totalProducts / limit) || 1 
                }
            }
        });

    } catch (err) {
        console.error("❌ Dashboard Error:", err.message);
        res.status(500).render("404", { 
            title: "Error", 
            message: "Dashboard load nahi ho saka: " + err.message,
            user: req.user 
        });
    }
};

/**
 * 2. Add New Product (Form Submission)
 */
exports.addProduct = async (req, res) => {
    try {
        const { name, price, category, description, stock } = req.body;
        
        const productData = new Product({
            name: name.trim(),
            price: parseFloat(price) || 0,
            category: category,
            description: description.trim(),
            image: req.file ? req.file.filename : "default-food.png",
            stock: parseInt(stock) || 0
        });

        await productData.save();
        console.log(`✅ Product Added: ${name}`);
        res.redirect("/admin/dashboard");

    } catch (err) {
        console.error("❌ addProduct Error:", err.message);
        res.status(500).send("Product add karne mein error: " + err.message);
    }
};

/**
 * 3. Delete Product & Cleanup Image
 */
exports.deleteProduct = async (req, res) => {
    try {
        const targetId = req.params.id;
        const product = await Product.findById(targetId);

        if (product && product.image && product.image !== "default-food.png") {
            const imagePath = path.join(process.cwd(), "public", "images", product.image);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await Product.findByIdAndDelete(targetId);
        res.redirect("/admin/dashboard");

    } catch (err) {
        console.error("❌ deleteProduct Error:", err.message);
        res.status(500).send("Delete failed: " + err.message);
    }
};

/**
 * 5. Update Product Stock (FIXED)
 * This handles the "Update" button in your Menu & Stock tab
 */
exports.updateStock = async (req, res) => {
    try {
        const { productId, stock } = req.body;
        const updatedProduct = await Product.findByIdAndUpdate(
            productId, 
            { stock: parseInt(stock) }, 
            { new: true }
        );

        if (!updatedProduct) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        return res.json({ success: true, message: "Stock updated successfully!" });
    } catch (err) {
        console.error("❌ updateStock Error:", err.message);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

/**
 * 6. Update Order Status (FIXED)
 * This handles the dropdown status change in your Live Orders tab
 */
exports.updateOrderStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;
        const updatedOrder = await Order.findByIdAndUpdate(
            orderId, 
            { status: status }, 
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        return res.json({ success: true, message: "Order status updated!" });
    } catch (err) {
        console.error("❌ updateOrderStatus Error:", err.message);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

/**
 * 4. Support Handlers (Ticket System)
 */
exports.updateSupportStatus = async (req, res) => {
    try {
        // Future Support Model Logic Here
        return res.json({ success: true, message: "Ticket status updated!" });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.replyToSupport = async (req, res) => {
    try {
        // Future Nodemailer Logic Here
        return res.json({ success: true, message: "Reply sent to customer email." });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Reply failed" });
    }
};