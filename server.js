require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const session = require("express-session"); 
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

/**
 * 1. Database Connection
 */
mongoose.set('strictPopulate', false); 
connectDB();

/**
 * 2. View Engine Setup
 */
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.disable('x-powered-by'); 

/**
 * 3. Global Middleware Pipeline
 */
app.use(morgan("dev")); 

app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 
app.use(cookieParser()); 

app.use(session({
    secret: process.env.SESSION_SECRET || 'cafe_secret_key',
    resave: false,
    saveUninitialized: false, 
    cookie: { 
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000 // 24 Hours
    }
}));

app.use(express.static(path.join(__dirname, "public")));

// Extract User info from JWT (Attaches user data to req.user)
app.use(extractUser);

/**
 * 4. Global Variables Middleware
 * Sets up data accessible in every EJS template automatically.
 */
app.use(async (req, res, next) => {
    // Default values for template rendering
    res.locals.user = req.user || null;
    res.locals.cartCount = 0; 
    res.locals.path = req.path;
    res.locals.message = null; 
    res.locals.email = req.query.email || "";
    res.locals.type = req.query.type || "signup";

    // Skip cart calculation for static files and auth pages to save performance
    const isStatic = /\.(jpg|jpeg|png|gif|css|js|ico|svg|woff2|map|webp|avif)$/i.test(req.path);
    const isAuthPath = ['/login', '/signup', '/logout', '/verify-otp'].includes(req.path);

    // Only calculate Cart Count for logged-in Customers (Admins don't have carts)
    if (!isStatic && !isAuthPath && req.user && req.user.role !== 'admin') {
        try {
            const rawId = req.user._id || req.user.id;
            
            if (rawId && mongoose.Types.ObjectId.isValid(rawId)) {
                // Use 'new' keyword for safety with different Mongoose versions
                const userId = new mongoose.Types.ObjectId(rawId);
                const userCart = await Cart.findOne({ userId }).lean();
                
                if (userCart && userCart.items && userCart.items.length > 0) {
                    res.locals.cartCount = userCart.items.reduce((total, item) => {
                        return total + (Number(item.quantity) || 0);
                    }, 0);
                }
            }
        } catch (err) { 
            console.error("Cart Count Middleware Error:", err.message);
            res.locals.cartCount = 0; 
        }
    }
    next();
});

/**
 * 5. Route Mounting
 */

// Home Path Redirect (Logic moved above general routes for priority)
app.get("/", (req, res) => {
    if (req.user) {
        return req.user.role === 'admin' 
            ? res.redirect("/admin/dashboard") 
            : res.redirect("/products");
    }
    res.redirect("/products");
});

app.use("/admin", adminRoutes); 
app.use("/products", productRoutes); 
app.use("/cart", cartRoutes); 
app.use("/orders", orderRoutes);
app.use("/support", supportRoutes);
app.use("/", authRoutes); 

/**
 * 6. 404 Error Handling
 */
app.use((req, res) => {
    res.status(404).render("404", { 
        title: "Page Not Found", 
        user: req.user || null,
        cartCount: res.locals.cartCount || 0,
        message: "The page you are looking for doesn't exist."
    });
});

/**
 * 7. Global Error Handling
 */
app.use((err, req, res, next) => {
    console.error("Critical Server Error:", err.stack);
    const status = err.status || 500;
    
    // AJAX/API Request error response
    if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
        return res.status(status).json({ success: false, message: "Internal Server Error" });
    }

    // Browser Friendly error page
    res.status(status).render("404", { 
        title: "Server Error",
        message: "Something went wrong! Our chefs are fixing the server. Please try again later.",
        user: req.user || null,
        cartCount: res.locals.cartCount || 0
    });
});

/**
 * 8. Server Initialization
 */
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`🚀 FullStack Cafe is live at: http://localhost:${PORT}`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
    console.error(`Unhandled Rejection: ${err.message}`);
    server.close(() => process.exit(1));
});