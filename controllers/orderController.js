const Order = require("../models/Order");
const Cart = require("../models/cart");
const Product = require("../models/Product");

/**
 * 1. Create New Order (Checkout)
 */
exports.createOrder = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const cart = await Cart.findOne({ userId }).populate("items.productId");

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: "Cart is empty!" });
        }

        let calculatedTotal = 0;
        const orderItems = cart.items.map(item => {
            if (!item.productId) {
                throw new Error("Some products are no longer available.");
            }
            const itemPrice = item.productId.price;
            calculatedTotal += (itemPrice * item.quantity);
            
            return {
                productId: item.productId._id,
                quantity: item.quantity,
                price: itemPrice
            };
        });

        const newOrder = new Order({
            user: userId,
            items: orderItems,
            totalAmount: calculatedTotal,
            status: "Pending",
            displayDate: new Date().toLocaleDateString("en-IN")
        });

        await newOrder.save();

        for (const item of cart.items) {
            await Product.findByIdAndUpdate(
                item.productId._id, 
                { $inc: { stock: -item.quantity } }
            );
        }

        await Cart.findOneAndDelete({ userId });
        res.status(201).json({ success: true, message: "Order placed successfully!" });
    } catch (err) {
        console.error("Order Placement Error:", err);
        res.status(500).json({ success: false, message: err.message || "Server Error" });
    }
};

/**
 * 2. FEATURE: Reorder Logic (CRITICAL: Added 'exports' here to fix the crash)
 */
exports.reorder = async (req, res) => {
    try {
        const orderId = req.params.id;
        const userId = req.user.id || req.user._id;

        const oldOrder = await Order.findOne({ _id: orderId, user: userId }).populate("items.productId");

        if (!oldOrder) {
            return res.status(404).json({ success: false, message: "Original order not found!" });
        }

        // Verify stock for reorder items
        for (const item of oldOrder.items) {
            if (!item.productId || item.productId.stock < item.quantity) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Item ${item.productId ? item.productId.name : 'Unknown'} is out of stock.` 
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
            status: "Pending",
            displayDate: new Date().toLocaleDateString("en-IN")
        });

        await newOrder.save();

        for (const item of oldOrder.items) {
            await Product.findByIdAndUpdate(
                item.productId._id,
                { $inc: { stock: -item.quantity } }
            );
        }

        res.json({ success: true, message: "Reorder successful!" });
    } catch (err) {
        console.error("Reorder Error:", err);
        res.status(500).json({ success: false, message: "Reorder failed on server." });
    }
};

/**
 * 3. FEATURE: Cancel Order
 */
exports.cancelOrder = async (req, res) => {
    try {
        const orderId = req.params.id;
        const userId = req.user.id || req.user._id;

        const order = await Order.findOne({ _id: orderId, user: userId });

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found!" });
        }

        if (order.status.toLowerCase() !== "pending") {
            return res.status(400).json({ 
                success: false, 
                message: `Order status is '${order.status}', cannot cancel.` 
            });
        }

        for (const item of order.items) {
            if (item.productId) {
                await Product.findByIdAndUpdate(
                    item.productId, 
                    { $inc: { stock: item.quantity } }
                );
            }
        }

        order.status = "Cancelled";
        await order.save();

        res.json({ success: true, message: "Order cancelled successfully!" });
    } catch (err) {
        console.error("Cancel Error Detail:", err);
        res.status(500).json({ success: false, message: "Cancellation failed." });
    }
};

/**
 * 4. User Orders Display
 */
exports.getUserOrders = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        
        const orders = await Order.find({ user: userId })
            .populate("items.productId")
            .sort({ createdAt: -1 })
            .lean();

        const formattedOrders = orders.map(order => ({
            ...order,
            statusClass: 
                order.status === "Pending" ? "bg-orange-100 text-orange-700" : 
                order.status === "Delivered" ? "bg-green-100 text-green-700" : 
                order.status === "Cancelled" ? "bg-red-100 text-red-700" : 
                "bg-blue-100 text-blue-700"
        }));

        res.render("userOrders", { orders: formattedOrders, user: req.user });
    } catch (err) {
        console.error("Order Page Error:", err);
        res.status(500).send("Error loading orders page.");
    }
};