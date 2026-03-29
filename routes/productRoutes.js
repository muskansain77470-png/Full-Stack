const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const extractUser = require('../middlewares/extractUser');

/**
 * MIDDLEWARE: extractUser
 * This ensures that for every request in this router, 
 * req.user is populated if a valid token exists.
 * Useful for showing "Add to Bag" or "Admin Edit" buttons in products.ejs.
 */
router.use(extractUser);

/**
 * @route   GET /products
 * @desc    Renders the main products page (products.ejs)
 * @access  Public
 */
router.get("/", productController.getProductsPage);

/**
 * @route   GET /products/api
 * @desc    Returns products as JSON for AJAX filtering/searching
 * @access  Public
 */
router.get("/api", productController.getProductsAPI);

/**
 * @route   GET /products/:id
 * @desc    Renders individual product details (optional but recommended)
 * @access  Public
 */
// router.get("/:id", productController.getProductById);

module.exports = router;