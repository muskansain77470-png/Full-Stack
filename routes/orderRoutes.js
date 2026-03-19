const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { isAuthenticated } = require("../middlewares/auth"); 

// Sahi URL: /orders/my-orders
router.get("/my-orders", isAuthenticated, orderController.getUserOrders);

// Sahi URL: /orders/checkout
router.post("/checkout", isAuthenticated, orderController.createOrder);

module.exports = router;