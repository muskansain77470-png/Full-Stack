const jwt = require("jsonwebtoken");

/**
 * Authentication Middleware
 * Ensures the user is logged in by verifying the JWT token stored in cookies.
 */
exports.isAuthenticated = (req, res, next) => {
    const token = req.cookies.token;
    
    // Check if the request is an AJAX/Fetch request or a JSON-based API call
    const isAjax = req.xhr || 
                   (req.headers.accept && req.headers.accept.indexOf('json') > -1) || 
                   req.path.startsWith("/cart/add") ||
                   req.path.startsWith("/orders/checkout");

    // 1. Check if token exists
    if (!token) {
        if (isAjax) {
            return res.status(401).json({ 
                success: false, 
                message: "Authentication required. Please login first." 
            });
        }
        return res.redirect("/login");
    }

    try {
        // 2. Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        /**
         * IMPORTANT FIX: 
         * We ensure req.user has an _id property.
         * If your JWT payload uses 'id', we map it to '_id' to match MongoDB/Controller expectations.
         */
        req.user = {
            ...decoded,
            _id: decoded._id || decoded.id 
        };

        next();
    } catch (err) {
        console.error("JWT Verification Failed:", err.message);
        
        // Clear invalid or expired cookie
        res.clearCookie("token");

        if (isAjax) {
            return res.status(401).json({ 
                success: false, 
                message: "Session expired. Please log in again." 
            });
        }
        return res.redirect("/login");
    }
};