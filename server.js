require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const path = require("path");
const mongoose = require("mongoose");
const connectDB = require("./config/db");

// --- Route Imports ---
const productRoutes = require("./routes/productRoutes");
const authRoutes = require("./routes/authRoutes");
const orderRoutes = require("./routes/orderRoutes");
const adminRoutes = require("./routes/adminRoutes");
const supportRoutes = require("./routes/supportRoutes");
const cartRoutes = require("./routes/cartRoutes");

// --- Middleware & Model Imports ---
const extractUser = require("./middlewares/extractUser");
const Cart = require("./models/cart"); 

const app = express();

// 1. Database Connection & Error Handling
mongoose.set('strictPopulate', false); 
connectDB();

// Handle post-connection database errors
mongoose.connection.on('error', err => {
    console.error(`Mongoose Connection Error: ${err.message}`);
});

// 2. View Engine Setup (EJS)
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.disable('x-powered-by'); // Security: Hide Express header

// --- Middleware Pipeline ---

// Logger for terminal requests
app.use(morgan("dev"));

// Body parsers (Must be ABOVE routes)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Extract User info from JWT (Ensure this populates req.user)
app.use(extractUser);

// 3. Global Variables Middleware (Optimized)
app.use(async (req, res, next) => {
    res.locals.user = req.user || null;
    res.locals.cartCount = 0; 
    res.locals.path = req.path;

    // Faster Regex for skipping DB calls on assets
    const isStatic = /\.(jpg|jpeg|png|gif|css|js|ico|svg|woff2|map)$/i.test(req.path);
    
    // Only fetch cart if user is logged in and it's not a static file request
    if (!isStatic && req.user) {
        try {
            const userId = req.user._id || req.user.id;
            // Use projection to only fetch the items field to save memory
            const userCart = await Cart.findOne({ userId }, { items: 1 }).lean();
            
            if (userCart && userCart.items) {
                res.locals.cartCount = userCart.items.reduce((total, item) => total + item.quantity, 0);
            }
        } catch (err) { 
            console.error("Cart Middleware Error:", err.message);
            res.locals.cartCount = 0;
        }
    }
    next();
});

// --- Route Mounting ---

// Redirect root to products
app.get("/", (req, res) => res.redirect("/products"));

app.use("/", authRoutes);
app.use("/products", productRoutes); 
app.use("/cart", cartRoutes); 
app.use("/orders", orderRoutes);
app.use("/admin", adminRoutes); 
app.use("/support", supportRoutes);

// --- Error Handling ---

// 4. 404 Handler
app.use((req, res) => {
    res.status(404).render("404", { 
        title: "Page Not Found", 
        user: req.user || null,
        cartCount: res.locals.cartCount || 0 
    });
});

// 5. Global 500 Error Handler
app.use((err, req, res, next) => {
    console.error("Critical Server Error:", err.stack);
    
    // Check if we are in development to show error or production to hide it
    const message = process.env.NODE_ENV === 'development' ? err.message : "Something went wrong!";
    
    res.status(500).render("error", { 
        title: "Server Error",
        message: message,
        user: req.user || null,
        cartCount: res.locals.cartCount || 0
    });
});

// Server Initialization
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`🚀 FullStack Cafe is live at: http://localhost:${PORT}`);
});

// Handle unhandled promise rejections (e.g. DB connection issues)
process.on("unhandledRejection", (err) => {
    console.log(`Error: ${err.message}`);
    // Close server & exit process
    server.close(() => process.exit(1));
});