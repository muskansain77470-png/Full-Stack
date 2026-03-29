require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const session = require("express-session"); 
const MongoStore = require("connect-mongo"); // Fixed Import
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
 * 2. View Engine & Security Setup
 */
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.disable('x-powered-by'); 

// Socket.io instance accessible in routes
app.set("socketio", io);

/**
 * 3. Global Middleware Pipeline
 */
app.use(morgan("dev")); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 
app.use(cookieParser()); 

// Serving static files
app.use(express.static(path.join(__dirname, "public")));

/**
 * FIXED: Universal MongoStore Initialization
 * Handles both new (create()) and old (new MongoStore()) syntax
 */
const sessionStore = (typeof MongoStore.create === 'function') 
    ? MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        collectionName: 'sessions',
        ttl: 24 * 60 * 60,
        autoRemove: 'native'
    })
    : new MongoStore({
        mongoUrl: process.env.MONGO_URI,
        collection: 'sessions',
        ttl: 24 * 60 * 60
    });

app.use(session({
    secret: process.env.SESSION_SECRET || 'cafe_secret_key',
    resave: false,
    saveUninitialized: false, 
    store: sessionStore,
    cookie: { 
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 
    }
}));

// Extract User info from JWT
app.use(extractUser);

/**
 * 4. Global Variables & Optimized Cart Count Middleware
 */
app.use(async (req, res, next) => {
    res.locals.user = req.user || null;
    res.locals.cartCount = 0; 
    res.locals.path = req.path;
    res.locals.message = null; 
    res.locals.email = req.query.email || "";
    res.locals.type = req.query.type || "signup";

    const isAuthPath = ['/login', '/signup', '/logout', '/verify-otp'].includes(req.path);

    if (!isAuthPath && req.user && req.user.role !== 'admin') {
        try {
            const userId = req.user._id || req.user.id;
            const userCart = await Cart.findOne({ userId }).select('items').lean();
            if (userCart && userCart.items) {
                res.locals.cartCount = userCart.items.reduce((total, item) => total + (Number(item.quantity) || 0), 0);
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
 * 7. Error Handling
 */
app.use((req, res) => {
    const isApiRequest = req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1);
    if (isApiRequest) {
        return res.status(404).json({ success: false, message: "Route not found" });
    }
    res.status(404).render("404", { 
        title: "404 - Not Found", 
        message: "The page you are looking for doesn't exist.",
        user: req.user || null,
        cartCount: res.locals.cartCount || 0
    });
});

app.use((err, req, res, next) => {
    console.error("CRITICAL ERROR:", err.message);
    const status = err.status || 500;
    const isApiRequest = req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1);

    if (isApiRequest) {
        return res.status(status).json({ success: false, message: "Internal Server Error" });
    }

    res.status(status).render("404", { 
        title: status === 500 ? "Server Error" : "Not Found",
        message: "Something went wrong. Our chefs are on it!",
        user: req.user || null,
        cartCount: res.locals.cartCount || 0
    });
});

/**
 * 8. Server Initialization
 */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 FullStack Cafe is live at: http://localhost:${PORT}`);
});