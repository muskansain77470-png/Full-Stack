const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const extractUser = require('../middlewares/extractUser'); 

// Middleware to block admins from using the cart
const blockAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        return res.redirect('/admin/dashboard');
    }
    next();
};

// Apply middlewares
router.use(extractUser);
router.use(blockAdmin);

// ROUTES
// GET /cart
router.get('/', cartController.getCartPage);

// POST /cart/add
router.post('/add', cartController.addToCart);

// POST /cart/update-quantity
router.post('/update-quantity', cartController.updateQuantity);

// POST /cart/remove/:id
router.post('/remove/:id', cartController.removeItem);

module.exports = router;