const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { isAuthenticated } = require("../middlewares/auth");

/**
 * Route: View all orders (Main Route for pagination)
 * URL: GET /orders?page=1
 */
router.get("/", isAuthenticated, orderController.getUserOrders);

/**
 * Route: View all orders for the logged-in user (Alias)
 * URL: GET /orders/my-orders
 */
router.get("/my-orders", isAuthenticated, orderController.getUserOrders);

/**
 * Route: Place a new order from the cart (Checkout)
 */
router.post("/checkout", isAuthenticated, orderController.createOrder);

/**
 * Route: Reorder a previous order
 * Updated :id to :orderId to match controller/frontend
 */
router.post("/reorder/:orderId", isAuthenticated, orderController.reorder);

/**
 * Route: Cancel an existing pending order
 * Updated :id to :orderId to match controller/frontend
 */
router.post("/cancel/:orderId", isAuthenticated, orderController.cancelOrder);

module.exports = router;