const Product = require('../models/Product');
const Cart = require('../models/Cart');

/**
 * 1. Render the HTML page (EJS)
 * Sirf initial page structure load karta hai.
 */
exports.getProductsPage = async (req, res) => {
    try {
        res.render('products', { 
            user: req.user || null,
            title: "Menu | Full Stack Cafe" 
        });
    } catch (err) {
        console.error("Page Render Error:", err);
        res.status(500).send("Error loading menu page");
    }
};

/**
 * 2. JSON API for Frontend Fetch (Filtering & Search)
 */
exports.getProductsAPI = async (req, res) => {
    try {
        let { category, search, availability, sort, page = 1, limit = 8 } = req.query;
        
        let query = {};
        
        // Category Filter
        if (category && category !== 'all') {
            query.category = { $regex: new RegExp(`^${category}$`, 'i') };
        }
        
        // Search Filter
        if (search) {
            query.name = { $regex: search, $options: 'i' }; 
        }
        
        // Stock Availability Filter
        if (availability === 'inStock') {
            query.stock = { $gt: 0 };
        }

        // Sorting Logic
        let sortQuery = { createdAt: -1 }; 
        if (sort === 'priceLow') sortQuery = { price: 1 };
        if (sort === 'priceHigh') sortQuery = { price: -1 };
        if (sort === 'latest') sortQuery = { createdAt: -1 };

        // Pagination
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        
        const [products, totalItems] = await Promise.all([
            Product.find(query).sort(sortQuery).skip(skip).limit(limitNum).lean(),
            Product.countDocuments(query)
        ]);

        res.json({
            success: true,
            products,
            totalItems,
            totalPages: Math.ceil(totalItems / limitNum) || 1,
            currentPage: pageNum
        });
    } catch (err) {
        console.error("API Error:", err);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

/**
 * 3. FIXED: Add to Bag Logic (Database Persistent)
 * User login hai toh DB mein save karega, warna error dega.
 */
exports.addToCart = async (req, res) => {
    try {
        // Validation: User logged in hona chahiye
        if (!req.user) {
            return res.status(401).json({ success: false, message: "Please login to add items!" });
        }

        const { productId } = req.body;
        const userId = req.user._id || req.user.id;

        // 1. Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found!" });
        }

        if (product.stock <= 0) {
            return res.status(400).json({ success: false, message: "Item is Out of Stock!" });
        }

        // 2. Find User's Cart in Database
        let cart = await Cart.findOne({ userId });

        if (!cart) {
            // Cart nahi hai toh naya banao
            cart = new Cart({
                userId,
                items: [{ 
                    productId, 
                    quantity: 1, 
                    price: product.price,
                    name: product.name,
                    image: product.image 
                }]
            });
        } else {
            // Check if item already exists in cart
            const itemIndex = cart.items.findIndex(p => p.productId.toString() === productId);

            if (itemIndex > -1) {
                // Item exists, quantity badhao
                cart.items[itemIndex].quantity += 1;
            } else {
                // Naya item add karo
                cart.items.push({ 
                    productId, 
                    quantity: 1, 
                    price: product.price,
                    name: product.name,
                    image: product.image 
                });
            }
        }

        await cart.save();

        // 3. Total items count for Navbar badge
        const totalCartItems = cart.items.reduce((total, item) => total + item.quantity, 0);

        res.json({
            success: true,
            message: `${product.name} added to your bag!`,
            cartCount: totalCartItems
        });

    } catch (err) {
        console.error("Add to Cart Error:", err.message);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};