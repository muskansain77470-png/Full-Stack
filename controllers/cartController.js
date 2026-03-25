const Cart = require("../models/cart");
const Product = require("../models/Product");
const Order = require("../models/Order");
const mongoose = require("mongoose");

/**
 * Helper: Yeh function cart ke har item ki quantity ka SUM nikalta hai.
 * Example: Pizza (Qty: 2) + Rasmalai (Qty: 1) = Cart Count (3)
 */
const calculateCartCount = (cart) => {
    if (!cart || !cart.items || !Array.isArray(cart.items) || cart.items.length === 0) {
        return 0;
    }
    return cart.items.reduce((acc, item) => {
        const qty = parseInt(item.quantity) || 0;
        return acc + qty;
    }, 0); 
};

// 1. Render Cart Page
exports.getCartPage = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        
        res.render("cart", { 
            user: req.user, 
            cart: cart || { items: [] },
            cartCount: calculateCartCount(cart),
            title: "Shopping Bag | Full Stack Cafe"
        });
    } catch (err) {
        console.error("Cart Page Error:", err);
        res.status(500).send("Error loading cart");
    }
};

// 2. Add Item to Cart (AJAX)
exports.addToCart = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.user._id || req.user.id;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Please login again." });
        }

        const product = await Product.findById(productId);
        if (!product || product.stock <= 0) {
            return res.status(400).json({ success: false, message: "Item is Out of Stock" });
        }

        let cart = await Cart.findOne({ userId });
        
        if (!cart) {
            cart = new Cart({ userId: userId, items: [{ productId, quantity: 1 }] });
        } else {
            const itemIndex = cart.items.findIndex(i => i.productId && i.productId.toString() === productId.toString());
            
            if (itemIndex > -1) { 
                cart.items[itemIndex].quantity += 1; 
            } else { 
                cart.items.push({ productId, quantity: 1 }); 
            }
        }

        await cart.save();
        res.json({ success: true, cartCount: calculateCartCount(cart), message: "Added to bag!" });
    } catch (err) {
        console.error("Add to Cart Error:", err.message);
        res.status(500).json({ success: false, message: "Database error", cartCount: 0 });
    }
};

// 3. Update Quantity (AJAX) - FIXED FOR VALIDATION ERROR
exports.updateQuantity = async (req, res) => {
    try {
        const { productId, action } = req.body;
        const userId = req.user._id || req.user.id;
        
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

        let cart = await Cart.findOne({ userId });
        if (!cart) return res.status(404).json({ success: false, cartCount: 0 });

        const itemIndex = cart.items.findIndex(i => i.productId && i.productId.toString() === productId.toString());

        if (itemIndex > -1) {
            if (action === 'increase') {
                cart.items[itemIndex].quantity += 1;
            } else if (action === 'decrease' && cart.items[itemIndex].quantity > 1) {
                cart.items[itemIndex].quantity -= 1;
            }

            // CRITICAL FIX: Explicitly setting userId again to prevent "userId is required" validation error
            cart.userId = userId; 
            await cart.save();
        }

        const totalItemsCount = calculateCartCount(cart);

        res.json({ 
            success: true, 
            cartCount: totalItemsCount, // Updates navbar badge to (3) if total qty is 3
            newQuantity: cart.items[itemIndex].quantity 
        });
    } catch (err) {
        console.error("Update Qty Error:", err.message);
        res.status(500).json({ success: false, message: "Database error", cartCount: 0 });
    }
};

// 4. Remove Item (AJAX)
exports.removeItem = async (req, res) => {
    try {
        const productId = req.params.id;
        const userId = req.user._id || req.user.id;
        
        const cart = await Cart.findOneAndUpdate(
            { userId }, 
            { $pull: { items: { productId } } }, 
            { new: true }
        );
        
        res.json({ success: true, cartCount: calculateCartCount(cart) });
    } catch (err) {
        res.status(500).json({ success: false, cartCount: 0 });
    }
};

// 5. Reorder Logic
exports.reorder = async (req, res) => {
    try {
        const { orderId } = req.body;
        const userId = req.user._id || req.user.id;

        const pastOrder = await Order.findById(orderId);
        if (!pastOrder) return res.status(404).json({ success: false, message: "Order not found" });

        let cart = await Cart.findOne({ userId }) || new Cart({ userId: userId, items: [] });

        for (const item of pastOrder.items) {
            const itemIndex = cart.items.findIndex(i => i.productId.toString() === item.productId.toString());
            if (itemIndex > -1) {
                cart.items[itemIndex].quantity += (item.quantity || 1);
            } else {
                cart.items.push({ productId: item.productId, quantity: (item.quantity || 1) });
            }
        }

        await cart.save();
        res.json({ success: true, cartCount: calculateCartCount(cart), message: "Items restored!" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Reorder failed", cartCount: 0 });
    }
};