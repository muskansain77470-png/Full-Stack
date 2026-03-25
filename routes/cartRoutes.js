const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const extractUser = require('../middlewares/extractUser'); 

// Middleware to block admins from using the cart
const blockAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        // If it's an AJAX request, send a JSON error instead of a redirect
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(403).json({ success: false, message: "Admins cannot place orders." });
        }
        return res.redirect('/admin/dashboard');
    }
    next();
};

// Apply middlewares to all cart routes
router.use(extractUser);
router.use(blockAdmin);

// --- ROUTES ---

// GET /cart (Renders the Shopping Bag page)
router.get('/', cartController.getCartPage);

// POST /cart/add (Matches the fetch call in product.ejs)
router.post('/add', cartController.addToCart);

// POST /cart/update-quantity
router.post('/update-quantity', cartController.updateQuantity);

// POST /cart/remove/:id
router.post('/remove/:id', cartController.removeItem);

module.exports = router;