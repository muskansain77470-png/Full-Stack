const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");

// Middleware: Ensure user is logged in
const { isAuthenticated } = require("../middlewares/auth"); 

/**
 * @route   GET /orders/my-orders
 * @desc    Display the orders page for the logged-in user
 */
router.get("/my-orders", isAuthenticated, orderController.getUserOrders);

/**
 * @route   POST /orders/checkout
 * @desc    Create a new order from cart
 */
router.post("/checkout", isAuthenticated, orderController.createOrder);

/**
 * @route   POST /orders/reorder/:orderId
 * @desc    Reorder a previous transaction (Restores items to cart)
 */
router.post("/reorder/:orderId", isAuthenticated, orderController.reorder);

/**
 * @route   POST /orders/cancel/:orderId
 * @desc    Cancel a pending order and restore stock
 * NOTE: Agar fetch API se problem aa rahi hai, toh ensure karein ki frontend POST hi bhej raha hai.
 */
router.post("/cancel/:orderId", isAuthenticated, orderController.cancelOrder);

// Backup Route (Sirf tab use karein agar frontend POST request handle nahi kar pa raha)
// router.get("/cancel/:orderId", isAuthenticated, orderController.cancelOrder);

module.exports = router;