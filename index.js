require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const session = require("express-session"); 
const path = require("path");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const http = require("http"); 
const { Server } = require("socket.io"); 

// --- Route Imports ---
const productRoutes = require("./routes/productRoutes");
const authRoutes = require("./routes/authRoutes");
const orderRoutes = require("./routes/orderRoutes");
const adminRoutes = require("./routes/adminRoutes");
const supportRoutes = require("./routes/supportRoutes");
const cartRoutes = require("./routes/cartRoutes");

// --- Middleware & Model Imports ---
const extractUser = require("./middlewares/extractUser");
const Cart = require("./models/Cart"); 

const app = express();
const server = http.createServer(app); 
const io = new Server(server); 

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

// Socket.io instance accessible in routes via req.app.get("socketio")
app.set("socketio", io);

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
        maxAge: 24 * 60 * 60 * 1000 
    }
}));

// Serving static files from 'public' folder
app.use(express.static(path.join(__dirname, "public")));

// Extract User info from JWT
app.use(extractUser);

/**
 * 4. Global Variables & Cart Count Middleware
 */
app.use(async (req, res, next) => {
    // Default values for EJS templates
    res.locals.user = req.user || null;
    res.locals.cartCount = 0; 
    res.locals.path = req.path;
    res.locals.message = null; 
    res.locals.email = req.query.email || "";
    res.locals.type = req.query.type || "signup";

    // Optimization: Skip cart logic for static files and auth routes
    const isStatic = /\.(jpg|jpeg|png|gif|css|js|ico|svg|woff2|map|webp|avif)$/i.test(req.path);
    const isAuthPath = ['/login', '/signup', '/logout', '/verify-otp'].includes(req.path);

    if (!isStatic && !isAuthPath && req.user && req.user.role !== 'admin') {
        try {
            const userId = req.user._id || req.user.id;
            if (userId && mongoose.Types.ObjectId.isValid(userId)) {
                const userCart = await Cart.findOne({ userId }).lean();
                if (userCart && userCart.items) {
                    res.locals.cartCount = userCart.items.reduce((total, item) => total + (Number(item.quantity) || 0), 0);
                }
            }
        } catch (err) { 
            console.error("Cart Middleware Error:", err.message);
        }
    }
    next();
});

/**
 * 5. Socket.io Connection Logic
 */
io.on("connection", (socket) => {
    socket.on("join", (userId) => {
        socket.join(userId);
    });
});

/**
 * 6. Route Mounting
 */
app.get("/", (req, res) => {
    if (req.user) {
        return req.user.role === 'admin' ? res.redirect("/admin/dashboard") : res.redirect("/products");
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
 * 7. 404 Error Handling (FIXED: Handling JSON vs HTML)
 */
app.use((req, res) => {
    const status = 404;
    // Agar fetch request hai toh JSON bhejo
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(status).json({ success: false, message: "Route not found" });
    }
    // Normal browser request ke liye render karo
    res.status(status).render("404", { 
        title: "404 - Not Found", 
        message: "The page you are looking for doesn't exist.",
        user: req.user || null,
        cartCount: res.locals.cartCount || 0
    });
});

/**
 * 8. Global 500 Error Handling (FIXED: Robust JSON response)
 */
app.use((err, req, res, next) => {
    console.error("CRITICAL ERROR:", err.stack);
    const status = err.status || 500;

    // JSON detection for Fetch/AJAX calls
    const isApiRequest = req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1) || req.path.startsWith('/signup') || req.path.startsWith('/login');

    if (isApiRequest) {
        return res.status(status).json({ 
            success: false, 
            message: err.message || "Internal Server Error" 
        });
    }

    try {
        res.status(status).render("404", { 
            title: status === 500 ? "Server Error" : "Not Found",
            message: status === 500 ? "Our chefs are fixing the server!" : "Page not found.",
            user: req.user || null,
            cartCount: res.locals.cartCount || 0
        });
    } catch (renderError) {
        res.status(500).send("Something went wrong. Please check back later.");
    }
});

/**
 * 9. Server Initialization
 */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 FullStack Cafe is live at: http://localhost:${PORT}`);
});

process.on("unhandledRejection", (err) => {
    console.error(`Unhandled Rejection: ${err.message}`);
    server.close(() => process.exit(1));
});