const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { isAuthenticated } = require("../middlewares/auth");

/**
 * Route: View all orders for the logged-in user
 * URL: GET /orders/my-orders
 */
router.get("/my-orders", isAuthenticated, orderController.getUserOrders);

/**
 * Route: Place a new order from the cart (Checkout)
 * URL: POST /orders/checkout
 */
router.post("/checkout", isAuthenticated, orderController.createOrder);

/**
 * Route: Reorder a previous order
 * URL: POST /orders/reorder/:id
 * This matches the fetch call in your userOrders.ejs
 */
router.post("/reorder/:id", isAuthenticated, orderController.reorder);

/**
 * Route: Cancel an existing pending order
 * URL: POST /orders/cancel/:id
 */
router.post("/cancel/:id", isAuthenticated, orderController.cancelOrder);

module.exports = router;