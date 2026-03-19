const express = require("express");
const router = express.Router();
const { getProductsPage, getProductsAPI } = require("../controllers/productController");

// PUBLIC: Renders the products.ejs page
router.get("/", getProductsPage);

// PUBLIC API: The endpoint your frontend script calls
router.get("/api", getProductsAPI);

module.exports = router;