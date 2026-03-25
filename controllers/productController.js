const Product = require('../models/Product');

// 1. Render the HTML page (EJS)
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

// 2. JSON API for the frontend fetch()
exports.getProductsAPI = async (req, res) => {
    try {
        let { category, search, availability, sort, page = 1, limit = 8 } = req.query;
        
        let query = {};
        
        if (category && category !== 'all') {
            query.category = { $regex: new RegExp(`^${category}$`, 'i') };
        }
        
        if (search) {
            query.name = { $regex: search, $options: 'i' }; 
        }
        
        if (availability === 'inStock') {
            query.stock = { $gt: 0 };
        }

        let sortQuery = { createdAt: -1 }; 
        if (sort === 'priceLow') sortQuery = { price: 1 };
        if (sort === 'priceHigh') sortQuery = { price: -1 };
        if (sort === 'latest') sortQuery = { createdAt: -1 };

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

// 3. FIXED: Add to Bag Logic
// This function must match the route in your cartRoutes.js (e.g., /cart/add)
exports.addToCart = async (req, res) => {
    try {
        const { productId } = req.body;

        // 1. Check if product exists and is in stock
        const product = await Product.findById(productId);
        if (!product || product.stock <= 0) {
            return res.status(400).json({ success: false, message: "Out of Stock!" });
        }

        // 2. Initialize cart in session if empty
        if (!req.session.cart) {
            req.session.cart = [];
        }

        // 3. Update quantity if item exists, else push new
        const itemIndex = req.session.cart.findIndex(item => item.productId === productId);
        if (itemIndex > -1) {
            req.session.cart[itemIndex].quantity += 1;
        } else {
            req.session.cart.push({
                productId: productId,
                name: product.name,
                price: product.price,
                image: product.image,
                quantity: 1
            });
        }

        // 4. Calculate total items for the navbar badge
        const totalCartItems = req.session.cart.reduce((total, item) => total + item.quantity, 0);

        // 5. Return success (This triggers the Toast in product.ejs)
        res.json({
            success: true,
            message: `${product.name} added to bag!`,
            cartCount: totalCartItems
        });

    } catch (err) {
        console.error("Add to Cart Error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};