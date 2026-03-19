const Cart = require("../models/cart");
const Product = require("../models/Product");
const mongoose = require("mongoose");

// 1. Render Cart Page
exports.getCartPage = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        // Populate product details so we can show names, prices, and images
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        
        res.render("cart", { 
            user: req.user, 
            cart: cart || { items: [] } 
        });
    } catch (err) {
        console.error("Cart Page Error:", err);
        res.status(500).send("Error loading cart");
    }
};

// 2. Add Item to Cart
exports.addToCart = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.user._id || req.user.id;

        const product = await Product.findById(productId);
        if (!product || product.stock <= 0) {
            return res.status(400).json({ success: false, message: "Item is Out of Stock" });
        }

        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({ userId, items: [{ productId, quantity: 1 }] });
        } else {
            const itemIndex = cart.items.findIndex(i => i.productId && i.productId.toString() === productId.toString());
            if (itemIndex > -1) { 
                cart.items[itemIndex].quantity += 1; 
            } else { 
                cart.items.push({ productId, quantity: 1 }); 
            }
        }

        await cart.save();
        const count = cart.items.reduce((acc, item) => acc + item.quantity, 0);
        
        res.json({ success: true, cartCount: count, message: "Added to bag!" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Database error" });
    }
};

// 3. Update Quantity (AJAX)
exports.updateQuantity = async (req, res) => {
    try {
        const { productId, action } = req.body;
        const userId = req.user._id || req.user.id;
        let cart = await Cart.findOne({ userId });

        if (!cart) return res.status(404).json({ success: false });

        const itemIndex = cart.items.findIndex(i => i.productId.toString() === productId);
        if (itemIndex > -1) {
            if (action === 'increase') {
                cart.items[itemIndex].quantity += 1;
            } else if (action === 'decrease' && cart.items[itemIndex].quantity > 1) {
                cart.items[itemIndex].quantity -= 1;
            }
            await cart.save();
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
};

// 4. Remove Item (AJAX)
exports.removeItem = async (req, res) => {
    try {
        const productId = req.params.id;
        const userId = req.user._id || req.user.id;

        await Cart.findOneAndUpdate(
            { userId },
            { $pull: { items: { productId: productId } } }
        );

        res.json({ success: true, message: "Item removed" });
    } catch (err) {
        res.status(500).json({ success: false });
    }
};