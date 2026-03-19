const Product = require('../models/Product');

// 1. Render the HTML page (EJS)
exports.getProductsPage = async (req, res) => {
    try {
        // Just render the page; the frontend fetch() will handle loading data
        res.render('products', { 
            user: req.user || null,
            title: "Menu | Full Stack Cafe" 
        });
    } catch (err) {
        res.status(500).send("Error loading menu page");
    }
};

// 2. JSON API for the frontend fetch()
// FIXED: Changed name to getProductsAPI to match the route import
exports.getProductsAPI = async (req, res) => {
    try {
        let { category, search, availability, sort, page = 1, limit = 8 } = req.query;
        
        // 1. Build Query Object
        let query = {};
        
        if (category && category !== 'all') {
            query.category = category;
        }
        
        if (search) {
            query.name = { $regex: search, $options: 'i' }; 
        }
        
        if (availability === 'inStock') {
            query.stock = { $gt: 0 };
        }

        // 2. Sorting Logic
        let sortQuery = { createdAt: -1 }; 
        if (sort === 'priceLow') sortQuery = { price: 1 };
        if (sort === 'priceHigh') sortQuery = { price: -1 };

        // 3. Execution with Pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        
        const products = await Product.find(query)
            .sort(sortQuery)
            .skip(skip)
            .limit(limitNum);

        const totalItems = await Product.countDocuments(query);

        res.json({
            success: true,
            products,
            totalItems,
            totalPages: Math.ceil(totalItems / limitNum),
            currentPage: pageNum
        });
    } catch (err) {
        console.error("API Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};