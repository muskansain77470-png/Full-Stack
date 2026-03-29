const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Order = require("../models/Order");
const mongoose = require("mongoose");

/**
 * Helper: Cart ke total items ka count nikalne ke liye
 */
const calculateCartCount = (cart) => {
    if (!cart || !cart.items || !Array.isArray(cart.items)) return 0;
    return cart.items.reduce((acc, item) => acc + (parseInt(item.quantity) || 0), 0);
};

// 1. Render Cart Page (Fixed Pagination & Null Checks)
exports.getCartPage = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = 5;
        const skip = (page - 1) * limit;

        // Cart fetch karein aur products ko populate karein
        const fullCart = await Cart.findOne({ userId }).populate('items.productId');
        
        // Agar cart nahi hai ya items empty hain
        if (!fullCart || !fullCart.items || fullCart.items.length === 0) {
            return res.render("cart", { 
                user: req.user, 
                cart: { items: [] },
                cartCount: 0,
                totalPages: 0,
                currentPage: page,
                title: "Shopping Bag | FullStack Cafe"
            });
        }

        // Filter: Sirf wo items rakhein jinka product database mein exist karta hai
        const validItems = fullCart.items.filter(item => item.productId !== null);

        // Agar filtering ke baad items empty ho jayein
        if (validItems.length === 0) {
            return res.render("cart", { 
                user: req.user, 
                cart: { items: [] },
                cartCount: 0,
                totalPages: 0,
                currentPage: page,
                title: "Shopping Bag | FullStack Cafe"
            });
        }

        // Pagination slicing
        const paginatedItems = validItems.slice(skip, skip + limit);
        const totalPages = Math.ceil(validItems.length / limit);

        res.render("cart", { 
            user: req.user, 
            cart: { items: paginatedItems }, 
            cartCount: calculateCartCount(fullCart),
            currentPage: page,
            totalPages: totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            title: "Shopping Bag | FullStack Cafe"
        });
    } catch (err) {
        console.error("Cart Page Error:", err);
        res.status(500).render("404", { title: "Error Loading Cart", user: req.user });
    }
};

// 2. Add Item to Cart (AJAX with Stock Check)
exports.addToCart = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.user._id || req.user.id;

        if (!productId) return res.status(400).json({ success: false, message: "Product ID missing" });

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
                    return res.status(400).json({ success: false, message: "Maximum stock reached." });
                }
                cart.items[itemIndex].quantity += 1; 
            } else { 
                cart.items.push({ productId, quantity: 1 }); 
            }
        }

        await cart.save();
        res.json({ success: true, cartCount: calculateCartCount(cart), message: "Added to bag!" });
    } catch (err) {
        console.error("Add to Cart Error:", err);
        res.status(500).json({ success: false, message: "Server Error", cartCount: 0 });
    }
};

// 3. Update Quantity (AJAX with Stock Check)
exports.updateQuantity = async (req, res) => {
    try {
        const { productId, change } = req.body; 
        const userId = req.user._id || req.user.id;
        
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

        const itemIndex = cart.items.findIndex(i => i.productId && i.productId._id.toString() === productId.toString());

        if (itemIndex > -1) {
            const product = cart.items[itemIndex].productId;
            if (!product) {
                 cart.items.splice(itemIndex, 1);
            } else {
                const newQty = cart.items[itemIndex].quantity + change;

                if (change > 0 && newQty > product.stock) {
                    return res.status(400).json({ 
                        success: false, 
                        message: `Only ${product.stock} units available.` 
                    });
                }

                if (newQty > 0) {
                    cart.items[itemIndex].quantity = newQty;
                } else {
                    cart.items.splice(itemIndex, 1);
                }
            }
            await cart.save();
        }

        res.json({ 
            success: true, 
            cartCount: calculateCartCount(cart),
            message: "Quantity updated"
        });
    } catch (err) {
        console.error("Update Qty Error:", err);
        res.status(500).json({ success: false, message: "Server Error" });
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
        
        res.json({ success: true, cartCount: calculateCartCount(cart), message: "Item removed" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Remove failed" });
    }
};

// 5. Reorder Logic (Past Order to Cart)
exports.reorder = async (req, res) => {
    try {
        const orderId = req.params.orderId || req.body.orderId;
        const userId = req.user._id || req.user.id;

        const pastOrder = await Order.findById(orderId).populate('items.productId');
        if (!pastOrder) return res.status(404).json({ success: false, message: "Order not found" });

        let cart = await Cart.findOne({ userId }) || new Cart({ userId: userId, items: [] });

        for (const item of pastOrder.items) {
            const product = item.productId;
            if (!product || product.stock <= 0) continue;

            const itemIndex = cart.items.findIndex(i => i.productId && i.productId.toString() === product._id.toString());
            const requestedQty = item.quantity || 1;
            
            if (itemIndex > -1) {
                cart.items[itemIndex].quantity = Math.min(cart.items[itemIndex].quantity + requestedQty, product.stock);
            } else {
                cart.items.push({ productId: product._id, quantity: Math.min(requestedQty, product.stock) });
            }
        }

        await cart.save();
        res.json({ success: true, cartCount: calculateCartCount(cart), message: "Reordered successfully!" });
    } catch (err) {
        console.error("Reorder Error:", err);
        res.status(500).json({ success: false, message: "Reorder failed" });
    }
};