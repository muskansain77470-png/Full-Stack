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

// --- Middleware & Model Imports ---
const extractUser = require("./middlewares/extractUser");
const Cart = require("./models/Cart"); 

// --- Route Imports ---
const productRoutes = require("./routes/productRoutes");
const authRoutes = require("./routes/authRoutes");
const orderRoutes = require("./routes/orderRoutes");
const adminRoutes = require("./routes/adminRoutes");
const supportRoutes = require("./routes/supportRoutes");
const cartRoutes = require("./routes/cartRoutes");

const app = express();
const server = http.createServer(app); 

/**
 * 1. Socket.io Setup
 */
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Pass socket.io to req object so controllers can use it
app.set("socketio", io);

mongoose.set('strictPopulate', false); 

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

// Serving static files - FIX: Make sure images are accessible
app.use(express.static(path.join(__dirname, "public")));
// Extra safety for images folder
app.use("/images", express.static(path.join(__dirname, "public/images")));

app.use(session({
    secret: process.env.SESSION_SECRET || 'cafe_secret_key',
    resave: false,
    saveUninitialized: false, 
    cookie: { 
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 
    }
}));

app.use(extractUser);

/**
 * 4. Global Variables & Locals
 */
app.use(async (req, res, next) => {
    res.locals.user = req.user || null;
    res.locals.cartCount = 0; 
    res.locals.path = req.path;
    res.locals.message = null; 
    res.locals.email = req.query.email || "";
    res.locals.type = req.query.type || "signup";

    const isStatic = /\.(jpg|jpeg|png|gif|css|js|ico|svg|woff2|map|webp|avif)$/i.test(req.path);
    const isAuthPath = ['/login', '/signup', '/logout', '/verify-otp'].includes(req.path);

    if (mongoose.connection.readyState === 1 && !isStatic && !isAuthPath && req.user && req.user.role !== 'admin') {
        try {
            const userId = req.user._id || req.user.id;
            const userCart = await Cart.findOne({ userId }).lean();
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
    console.log("New Client Connected:", socket.id);
    socket.on("join", (userId) => {
        if (userId) {
            socket.join(userId);
            console.log(`User ${userId} joined room.`);
        }
    });
    socket.on("disconnect", () => console.log("User Disconnected"));
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
    res.status(404).render("404", { 
        title: "404 - Not Found", 
        message: "The page you are looking for doesn't exist.",
        user: req.user || null,
        cartCount: res.locals.cartCount || 0
    });
});

app.use((err, req, res, next) => {
    console.error("CRITICAL ERROR:", err.stack);
    res.status(500).render("404", { 
        title: "Server Error",
        message: "Our chefs are fixing the server!",
        user: req.user || null,
        cartCount: res.locals.cartCount || 0
    });
});

/**
 * 8. Server Initialization
 */
const PORT = process.env.PORT || 3000;
const startServer = async () => {
    try {
        await connectDB(); 
        server.listen(PORT, () => {
            console.log(`🚀 FullStack Cafe is live at: http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error("❌ Failed to start server:", err.message);
        process.exit(1);
    }
};

startServer();