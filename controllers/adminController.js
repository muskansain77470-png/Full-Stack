const Product = require("../models/Product");
const Order = require("../models/Order");
const Support = require("../models/Support");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

/**
 * 1. Load Admin Dashboard
 */
exports.getDashboard = async (req, res) => {
    try {
        const [products, orders, supports] = await Promise.all([
            Product.find().sort({ createdAt: -1 }).lean(),
            Order.find()
                .populate('user', 'username email phone') 
                .populate('items.productId')
                .sort({ createdAt: -1 })
                .lean(),
            Support.find()
                .populate('user', 'username email')
                .sort({ createdAt: -1 })
                .lean()
        ]);

        const validOrders = orders.map(order => ({
            ...order,
            user: order.user || { username: "Guest User", email: "N/A", phone: "No Contact" }
        }));

        res.render("adminDashboard", {
            user: req.user,
            products: products || [],
            orders: validOrders || [],
            supports: supports || [],
            title: "Admin Command Center"
        });
    } catch (err) {
        console.error("Dashboard Loading Error:", err);
        res.status(500).send(`
            <div style="font-family: sans-serif; padding: 50px; text-align: center; background: #fff5f5; border-radius: 20px; margin: 50px; border: 1px solid #ffcdd2;">
                <h1 style="color: #d32f2f;">System Error</h1>
                <p style="color: #555;">Could not load management data: ${err.message}</p>
                <a href="/admin/dashboard" style="display: inline-block; margin-top: 20px; text-decoration: none; color: #fff; background: #1976d2; padding: 10px 20px; border-radius: 5px;">Retry</a>
            </div>
        `);
    }
};

/**
 * 2. Add New Product
 */
exports.addProduct = async (req, res) => {
    try {
        const { name, price, category, description, stock } = req.body;
        const imagePath = req.file ? req.file.filename : 'default-food.png';
        
        const newProduct = new Product({ 
            name: name.trim(), 
            price: parseFloat(price) || 0, 
            category, 
            description: description.trim(), 
            image: imagePath, 
            stock: parseInt(stock) || 0 
        });
        
        await newProduct.save();
        res.redirect("/admin/dashboard"); 
    } catch (err) {
        console.error("Add Product Error:", err);
        res.status(500).json({ success: false, message: "Failed to save product" });
    }
};

/**
 * 3. Update Product Stock (AJAX)
 */
exports.updateStock = async (req, res) => {
    try {
        const { productId, stock } = req.body;
        const stockValue = Math.max(0, parseInt(stock) || 0);
        
        const updated = await Product.findByIdAndUpdate(
            productId, 
            { stock: stockValue }, 
            { new: true }
        );

        if (!updated) return res.status(404).json({ success: false, message: "Product not found" });

        res.json({ success: true, currentStock: updated.stock });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

/**
 * 4. Delete Product (With Image Cleanup)
 */
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).send("Product not found");

        // FIX: Safer File Deletion
        if (product.image && product.image !== 'default-food.png') {
            const filePath = path.join(__dirname, "..", "public", "images", product.image);
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            } catch (fileErr) {
                console.warn("File deletion failed, proceeding with DB record removal:", fileErr.message);
            }
        }

        await Product.findByIdAndDelete(req.params.id);
        res.redirect("/admin/dashboard");
    } catch (err) {
        console.error("Delete Product Error:", err);
        res.status(500).send("Error deleting product");
    }
};

/**
 * 5. Update Order Status (AJAX)
 */
exports.updateOrderStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;
        const updatedOrder = await Order.findByIdAndUpdate(orderId, { status }, { new: true });
        
        if (!updatedOrder) return res.status(404).json({ success: false });

        res.json({ success: true, status: updatedOrder.status });
    } catch (err) {
        res.status(500).json({ success: false });
    }
};

/**
 * 6. Update Support Ticket Status (AJAX)
 */
exports.updateSupportStatus = async (req, res) => {
    try {
        const { supportId, status } = req.body;
        const updatedSupport = await Support.findByIdAndUpdate(supportId, { status }, { new: true });
        
        if (!updatedSupport) return res.status(404).json({ success: false });

        res.json({ success: true, currentStatus: updatedSupport.status });
    } catch (err) {
        res.status(500).json({ success: false });
    }
};

/**
 * 7. Delete Support Ticket
 */
exports.deleteSupport = async (req, res) => {
    try {
        await Support.findByIdAndDelete(req.params.id);
        res.redirect("/admin/dashboard");
    } catch (err) {
        res.status(500).send("Error removing ticket");
    }
};

/**
 * 8. Reply to Support Ticket via Email
 */
exports.replyToSupport = async (req, res) => {
    try {
        const { supportId, customerEmail, replyMessage, subject } = req.body;

        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            return res.status(500).json({ success: false, message: "SMTP Credentials Missing" });
        }

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        await transporter.sendMail({
            from: `"FullStack Cafe Support" <${process.env.EMAIL_USER}>`,
            to: customerEmail,
            subject: `Re: ${subject}`,
            html: `
                <div style="font-family: sans-serif; padding: 25px; border: 1px solid #f0f0f0; border-radius: 12px;">
                    <h2 style="color: #1e293b;">Support Ticket Response</h2>
                    <p>Original Issue: <strong>${subject}</strong></p>
                    <div style="margin: 20px 0; padding: 15px; border-left: 4px solid #0f172a; background: #f9fafb;">
                        ${replyMessage}
                    </div>
                    <p style="font-size: 12px; color: #94a3b8;">FullStack Cafe Command Center</p>
                </div>`
        });

        // Resolve ticket after email
        await Support.findByIdAndUpdate(supportId, { status: 'resolved' });
        
        res.json({ success: true, message: "Reply sent and ticket resolved." });
        
    } catch (err) {
        console.error("Email Error:", err);
        res.status(500).json({ success: false, message: "Check SMTP/Gmail App Password." });
    }
};