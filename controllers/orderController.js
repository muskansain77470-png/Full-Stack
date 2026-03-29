const Order = require("../models/Order"); 
const Cart = require("../models/Cart"); 
const Product = require("../models/Product");
const mongoose = require("mongoose");

/**
 * 1. Create New Order (Checkout)
 */
exports.createOrder = async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({ success: false, message: "Session expired. Please login again." });
        }

        const currentUserId = req.user._id; 
        const cart = await Cart.findOne({ userId: currentUserId }).populate("items.productId");

        if (!cart || !cart.items || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: "Cart is empty!" });
        }

        let calculatedTotal = 0;
        const orderItems = [];

        for (const item of cart.items) {
            if (!item.productId) {
                return res.status(400).json({ success: false, message: "Some products are no longer available." });
            }

            if (item.productId.stock < item.quantity) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Sorry, ${item.productId.name} only has ${item.productId.stock} units left.` 
                });
            }

            calculatedTotal += (item.productId.price * item.quantity);
            orderItems.push({
                productId: item.productId._id,
                quantity: item.quantity,
                price: item.productId.price 
            });

            // Stock update
            await Product.findByIdAndUpdate(item.productId._id, { $inc: { stock: -item.quantity } });
        }

        const newOrder = new Order({
            user: currentUserId, 
            items: orderItems,
            totalAmount: calculatedTotal,
            status: "Pending" // Capital P used consistently
        });

        await newOrder.save();
        await Cart.findOneAndDelete({ userId: currentUserId });
        
        res.status(201).json({ success: true, message: "Order placed successfully! ☕" });

    } catch (err) {
        console.error("Order Placement Error:", err);
        res.status(500).json({ success: false, message: "Server error during checkout." });
    }
};

/**
 * 2. Reorder Logic
 */
exports.reorder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user._id;

        const oldOrder = await Order.findOne({ _id: orderId, user: userId }).populate("items.productId");

        if (!oldOrder) {
            return res.status(404).json({ success: false, message: "Original order not found!" });
        }

        let cart = await Cart.findOne({ userId }) || new Cart({ userId, items: [] });

        for (const item of oldOrder.items) {
            const product = item.productId;
            if (!product || product.stock <= 0) continue;

            const itemIndex = cart.items.findIndex(i => i.productId && i.productId.toString() === product._id.toString());
            
            if (itemIndex > -1) {
                cart.items[itemIndex].quantity += 1;
            } else {
                cart.items.push({ productId: product._id, quantity: 1 });
            }
        }

        await cart.save();
        res.json({ success: true, message: "Items added back to your bag!" });
    } catch (err) {
        console.error("Reorder Error:", err);
        res.status(500).json({ success: false, message: "Could not restore items." });
    }
};

/**
 * 3. Cancel Order (FIXED Logic)
 */
exports.cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user._id;

        // 1. Order ko find karein
        const order = await Order.findOne({ _id: orderId, user: userId });

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found!" });
        }

        // 2. Status check (Case-insensitive check using toLowerCase)
        // Taaki agar DB mein 'pending' ho ya 'Pending', dono handle ho jayein
        if (order.status.toLowerCase() !== "pending") {
            return res.status(400).json({ 
                success: false, 
                message: `Order cannot be cancelled. Current status: ${order.status}` 
            });
        }

        // 3. Stock Restore Karo (Promise.all is faster for multiple items)
        await Promise.all(order.items.map(async (item) => {
            if (item.productId) {
                return Product.findByIdAndUpdate(item.productId, { 
                    $inc: { stock: item.quantity } 
                });
            }
        }));

        // 4. Status update karo
        order.status = "Cancelled";
        await order.save();

        return res.json({ success: true, message: "Order cancelled and stock restored successfully." });

    } catch (err) {
        console.error("Cancel Error:", err);
        return res.status(500).json({ success: false, message: "Cancellation failed: " + err.message });
    }
};

/**
 * 4. User Orders Display
 */
exports.getUserOrders = async (req, res) => {
    try {
        const userId = req.user._id;
        const page = Math.max(1, parseInt(req.query.page) || 1); 
        const limit = 5; 
        const skip = (page - 1) * limit;

        const totalOrders = await Order.countDocuments({ user: userId });
        const totalPages = Math.ceil(totalOrders / limit) || 1;

        const orders = await Order.find({ user: userId })
            .populate("items.productId")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const getStatusStyles = (status) => {
            const currentStatus = status || "Pending";
            const styles = {
                "Pending": "bg-orange-100 text-orange-700",
                "Preparing": "bg-blue-100 text-blue-700",
                "Ready": "bg-purple-100 text-purple-700",
                "Delivered": "bg-green-100 text-green-700",
                "Cancelled": "bg-red-100 text-red-700"
            };
            return styles[currentStatus] || "bg-gray-100 text-gray-700";
        };

        const formattedOrders = orders.map(order => ({
            ...order,
            displayDate: new Date(order.createdAt).toLocaleString("en-IN", {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            }),
            statusClass: getStatusStyles(order.status)
        }));

        res.render("userOrders", { 
            title: "My Orders | FullStack Cafe",
            orders: formattedOrders, 
            user: req.user,
            currentPage: page,
            totalPages: totalPages,
            hasPreviousPage: page > 1,
            hasNextPage: page < totalPages,
            nextPage: page + 1,
            previousPage: page - 1
        });
    } catch (err) {
        console.error("Order Page Error:", err);
        res.status(500).render("404", { title: "Server Error", user: req.user || null });
    }
};