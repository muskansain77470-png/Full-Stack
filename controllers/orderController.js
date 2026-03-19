const Order = require("../models/Order");
const Cart = require("../models/cart");

// Ye function checkout handle karta hai
exports.createOrder = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const cart = await Cart.findOne({ userId }).populate("items.productId");

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: "Cart khali hai!" });
        }

        const totalAmount = cart.items.reduce((acc, item) => acc + (item.productId.price * item.quantity), 0);

        const newOrder = new Order({
            user: userId,
            items: cart.items.map(item => ({
                productId: item.productId._id,
                quantity: item.quantity
            })),
            totalAmount,
            status: "Pending"
        });

        await newOrder.save();
        await Cart.findOneAndDelete({ userId });

        // Success response bhej rahe hain taaki frontend redirect kar sake
        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// Ye function Order Page open karta hai
exports.getUserOrders = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const rawOrders = await Order.find({ user: userId }).populate("items.productId").sort({ createdAt: -1 });

        const orders = rawOrders.map(order => ({
            ...order._doc,
            displayDate: new Date(order.createdAt).toLocaleDateString("en-IN"),
            statusClass: order.status === "Pending" ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"
        }));

        // Render the EJS file
        res.render("userOrders", { orders, user: req.user });
    } catch (err) {
        res.status(500).send("Error loading orders page.");
    }
};