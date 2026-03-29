const Product = require("../models/Product");
const Order = require("../models/Order");
const Support = require("../models/Support");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

exports.getDashboard = async (req, res) => {
    try {
        const limit = 10; 
        const orderPage = parseInt(req.query.orderPage) || 1;
        const productPage = parseInt(req.query.productPage) || 1;
        const supportPage = parseInt(req.query.supportPage) || 1;

        const [products, totalProducts, orders, totalOrders, supports, totalSupports] = await Promise.all([
            Product.find().sort({ createdAt: -1 }).skip((productPage - 1) * limit).limit(limit).lean(),
            Product.countDocuments(),
            Order.find().populate('user', 'username email phone').populate('items.productId').sort({ createdAt: -1 }).skip((orderPage - 1) * limit).limit(limit).lean(),
            Order.countDocuments(),
            Support.find().populate('user', 'username email').sort({ createdAt: -1 }).skip((supportPage - 1) * limit).limit(limit).lean(),
            Support.countDocuments()
        ]);

        const validOrders = (orders || []).map(order => ({
            ...order,
            user: order.user || { username: "Guest User", email: "N/A", phone: "No Contact" }
        }));

        res.render("adminDashboard", {
            user: req.user,
            title: "Admin Command Center",
            products: products || [],
            orders: validOrders,
            supports: supports || [],
            pagination: { 
                orders: { current: orderPage, total: Math.ceil(totalOrders / limit) || 1 },
                products: { current: productPage, total: Math.ceil(totalProducts / limit) || 1 },
                supports: { current: supportPage, total: Math.ceil(totalSupports / limit) || 1 }
            }
        });
    } catch (err) {
        res.status(500).send("Critical Error loading dashboard.");
    }
};

exports.getAddProductPage = (req, res) => {
    res.render("add-product", { title: "Add Product", user: req.user, cartCount: 0 });
};

exports.addProduct = async (req, res) => {
    try {
        const { name, price, category, description, stock } = req.body;
        const imagePath = req.file ? req.file.filename : 'default-food.png';
        const newProduct = new Product({ 
            name: name.trim(), price: parseFloat(price) || 0, 
            category, description: description.trim(), 
            image: imagePath, stock: parseInt(stock) || 0 
        });
        await newProduct.save();
        res.redirect("/admin/dashboard"); 
    } catch (err) {
        res.status(500).send("Failed to save product");
    }
};

exports.updateStock = async (req, res) => {
    try {
        const { productId, stock } = req.body;
        const updated = await Product.findByIdAndUpdate(productId, { stock: Math.max(0, parseInt(stock)) }, { new: true });
        res.json({ success: true, currentStock: updated.stock });
    } catch (err) {
        res.status(500).json({ success: false });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (product && product.image !== 'default-food.png') {
            const filePath = path.join(process.cwd(), "public", "images", product.image);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        await Product.findByIdAndDelete(req.params.id);
        res.redirect("/admin/dashboard");
    } catch (err) {
        res.status(500).send("Error deleting product");
    }
};

exports.updateOrderStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;
        const updatedOrder = await Order.findByIdAndUpdate(orderId, { status }, { new: true });
        res.json({ success: true, status: updatedOrder.status });
    } catch (err) {
        res.status(500).json({ success: false });
    }
};

// FIXED: This was missing and causing the crash
exports.updateSupportStatus = async (req, res) => {
    try {
        const { supportId, status } = req.body;
        await Support.findByIdAndUpdate(supportId, { status });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
};

exports.deleteSupport = async (req, res) => {
    try {
        await Support.findByIdAndDelete(req.params.id);
        res.redirect("/admin/dashboard");
    } catch (err) {
        res.status(500).send("Error removing ticket");
    }
};

exports.replyToSupport = async (req, res) => {
    try {
        const { supportId, customerEmail, replyMessage, subject } = req.body;
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
        });
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: customerEmail,
            subject: `Re: ${subject}`,
            text: replyMessage
        });
        await Support.findByIdAndUpdate(supportId, { status: 'resolved' });
        res.json({ success: true, message: "Reply sent!" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Email failed." });
    }
};