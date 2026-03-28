const Cart = require("../models/cart");
const Product = require("../models/Product");
const Order = require("../models/Order");
const mongoose = require("mongoose");

/**
 * Helper: Yeh function cart ke har item ki quantity ka SUM nikalta hai.
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

// 1. Render Cart Page with PAGINATION
exports.getCartPage = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        
        // Pagination Logic
        const page = parseInt(req.query.page) || 1;
        const limit = 5; // Kitne unique items ek page par dikhane hain
        const skip = (page - 1) * limit;

        // Fetch the full cart to calculate total items and count
        const fullCart = await Cart.findOne({ userId }).populate('items.productId');
        
        if (!fullCart || fullCart.items.length === 0) {
            return res.render("cart", { 
                user: req.user, 
                cart: { items: [] },
                cartCount: 0,
                totalPages: 0,
                currentPage: page,
                title: "Shopping Bag | Full Stack Cafe"
            });
        }

        // Manually slice items for pagination since items are an array inside the document
        const paginatedItems = fullCart.items.slice(skip, skip + limit);
        const totalPages = Math.ceil(fullCart.items.length / limit);

        res.render("cart", { 
            user: req.user, 
            cart: { items: paginatedItems }, // Sirf current page ke items bhej rahe hain
            cartCount: calculateCartCount(fullCart),
            currentPage: page,
            totalPages: totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            title: "Shopping Bag | Full Stack Cafe"
        });
    } catch (err) {
        console.error("Cart Page Error:", err);
        res.status(500).send("Error loading cart");
    }
};

// 2. Add Item to Cart (AJAX with Stock Check)
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
                if (cart.items[itemIndex].quantity + 1 > product.stock) {
                    return res.status(400).json({ success: false, message: "Limit reached based on available stock." });
                }
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

// 3. Update Quantity (AJAX with Stock Check)
exports.updateQuantity = async (req, res) => {
    try {
        const { productId, change } = req.body; 
        const userId = req.user._id || req.user.id;
        
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

        let cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart) return res.status(404).json({ success: false, cartCount: 0 });

        const itemIndex = cart.items.findIndex(i => i.productId && i.productId._id.toString() === productId.toString());

        if (itemIndex > -1) {
            const product = cart.items[itemIndex].productId;
            const currentQty = cart.items[itemIndex].quantity;
            const newQty = currentQty + change;

            if (change > 0 && newQty > product.stock) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Only ${product.stock} items available.` 
                });
            }

            if (newQty > 0) {
                cart.items[itemIndex].quantity = newQty;
            } else {
                cart.items.splice(itemIndex, 1);
            }
            await cart.save();
        }

        res.json({ 
            success: true, 
            cartCount: calculateCartCount(cart)
        });
    } catch (err) {
        console.error("Update Qty Error:", err.message);
        res.status(500).json({ success: false, message: "Database error" });
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

        const pastOrder = await Order.findById(orderId).populate('items.productId');
        if (!pastOrder) return res.status(404).json({ success: false, message: "Order not found" });

        let cart = await Cart.findOne({ userId }) || new Cart({ userId: userId, items: [] });

        for (const item of pastOrder.items) {
            const product = item.productId;
            if (!product || product.stock <= 0) continue;

            const itemIndex = cart.items.findIndex(i => i.productId.toString() === product._id.toString());
            const requestedQty = item.quantity || 1;
            
            if (itemIndex > -1) {
                const totalPossible = Math.min(cart.items[itemIndex].quantity + requestedQty, product.stock);
                cart.items[itemIndex].quantity = totalPossible;
            } else {
                const totalPossible = Math.min(requestedQty, product.stock);
                cart.items.push({ productId: product._id, quantity: totalPossible });
            }
        }

        await cart.save();
        res.json({ success: true, cartCount: calculateCartCount(cart), message: "Items restored!" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Reorder failed", cartCount: 0 });
    }
};