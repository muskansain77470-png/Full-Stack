const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
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
 */
router.post("/cancel/:orderId", isAuthenticated, orderController.cancelOrder);

module.exports = router;