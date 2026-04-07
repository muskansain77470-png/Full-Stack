const jwt = require("jsonwebtoken");
const User = require("../models/User");

const extractUser = async (req, res, next) => {
    const token = req.cookies.token;
    
    // 1. If no token, set user to null and move to next middleware
    if (!token) {
        req.user = null;
        res.locals.user = null;
        return next();
    }

    try {
        // 2. Verify Token
        const secret = process.env.JWT_SECRET || "fullstack_cafe_secret_key";
        const decoded = jwt.verify(token, secret);
        
        // 3. Fetch fresh user data from DB
        const freshUser = await User.findById(decoded.id || decoded._id).lean();

        if (!freshUser) {
            req.user = null;
            res.locals.user = null;
            res.clearCookie("token");
            return next();
        }

        // 4. Payload normalization for consistency
        const userPayload = {
            ...freshUser,
            _id: freshUser._id.toString(), 
            id: freshUser._id.toString()
        };

        // 5. Attach to Request and Locals
        req.user = userPayload; 
        res.locals.user = userPayload; 
        
        next(); // Move to the next route or middleware

    } catch (err) {
        console.error("Global Auth Error:", err.message);
        req.user = null;
        res.locals.user = null;
        res.clearCookie("token"); 
        next();
    }
};

module.exports = extractUser;