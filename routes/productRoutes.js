const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const extractUser = require('../middlewares/extractUser');

// Apply extractUser so the "Add to Bag" button knows if the user is logged in
router.use(extractUser);

// PUBLIC: Renders the products.ejs page at /products
router.get("/", productController.getProductsPage);

// PUBLIC API: Used by fetch() in product.ejs to load/filter items
router.get("/api", productController.getProductsAPI);

module.exports = router;