const Order = require("../models/order"); // lowercase 'order' check karein model file name ke mutabik
const Cart = require("../models/cart");
const Product = require("../models/product");

/**
 * 1. Create New Order (Checkout)
 */
exports.createOrder = async (req, res) => {
    try {
        const userId = req.user._id; 
        const cart = await Cart.findOne({ userId }).populate("items.productId");

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: "Cart is empty!" });
        }

        let calculatedTotal = 0;
        const orderItems = [];

        // Validate items and check availability
        for (const item of cart.items) {
            if (!item.productId) {
                return res.status(400).json({ success: false, message: "Some products in your cart are no longer available." });
            }
            if (item.productId.stock < item.quantity) {
                return res.status(400).json({ success: false, message: `${item.productId.name} is out of stock!` });
            }

            calculatedTotal += (item.productId.price * item.quantity);
            orderItems.push({
                productId: item.productId._id,
                quantity: item.quantity,
                price: item.productId.price
            });
        }

        const newOrder = new Order({
            user: userId, // Match your Schema field name
            items: orderItems,
            totalAmount: calculatedTotal,
            status: "Pending"
        });

        await newOrder.save();

        // Atomic update for stock
        const stockUpdates = cart.items.map(item => 
            Product.findByIdAndUpdate(item.productId._id, { $inc: { stock: -item.quantity } })
        );
        await Promise.all(stockUpdates);

        // Clear Cart
        await Cart.findOneAndDelete({ userId });
        
        res.status(201).json({ success: true, message: "Order placed successfully! ☕" });
    } catch (err) {
        console.error("Order Placement Error:", err);
        res.status(500).json({ success: false, message: "Failed to place order." });
    }
};

/**
 * 2. Reorder Logic
 * Updated: Matches route parameter :orderId
 */
exports.reorder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user._id;

        const oldOrder = await Order.findOne({ _id: orderId, user: userId }).populate("items.productId");

        if (!oldOrder) {
            return res.status(404).json({ success: false, message: "Original order not found!" });
        }

        // Verify stock for all items first
        for (const item of oldOrder.items) {
            if (!item.productId || item.productId.stock < item.quantity) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Item ${item.productId ? item.productId.name : 'Unknown'} is currently unavailable.` 
                });
            }
        }

        const newOrder = new Order({
            user: userId,
            items: oldOrder.items.map(item => ({
                productId: item.productId._id,
                quantity: item.quantity,
                price: item.productId.price
            })),
            totalAmount: oldOrder.totalAmount,
            status: "Pending"
        });

        await newOrder.save();

        // Update stock
        const stockUpdates = oldOrder.items.map(item => 
            Product.findByIdAndUpdate(item.productId._id, { $inc: { stock: -item.quantity } })
        );
        await Promise.all(stockUpdates);

        res.json({ success: true, message: "Reordered successfully!" });
    } catch (err) {
        console.error("Reorder Error:", err);
        res.status(500).json({ success: false, message: "Server error during reorder." });
    }
};

/**
 * 3. Cancel Order
 * Updated: Matches route parameter :orderId
 */
exports.cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user._id;

        const order = await Order.findOne({ _id: orderId, user: userId });

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found!" });
        }

        if (order.status !== "Pending") {
            return res.status(400).json({ success: false, message: "Only pending orders can be cancelled." });
        }

        // Restore stock
        const restoreStock = order.items.map(item => 
            Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } })
        );
        await Promise.all(restoreStock);

        order.status = "Cancelled";
        await order.save();

        res.json({ success: true, message: "Order cancelled successfully!" });
    } catch (err) {
        console.error("Cancel Error:", err);
        res.status(500).json({ success: false, message: "Cancellation failed." });
    }
};

/**
 * 4. User Orders Display with PAGINATION
 */
exports.getUserOrders = async (req, res) => {
    try {
        const userId = req.user._id;
        
        // Pagination Logic
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

        // Format data for the view
        const formattedOrders = orders.map(order => ({
            ...order,
            displayDate: new Date(order.createdAt).toLocaleString("en-IN", {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            }),
            statusClass: 
                order.status === "Pending" ? "bg-orange-100 text-orange-700" : 
                order.status === "Delivered" ? "bg-green-100 text-green-700" : 
                order.status === "Cancelled" ? "bg-red-100 text-red-700" : 
                "bg-blue-100 text-blue-700"
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
        res.status(500).render("404", { 
            title: "Server Error",
            message: "Error loading your orders.",
            user: req.user || null,
            cartCount: res.locals.cartCount || 0
        });
    }
};