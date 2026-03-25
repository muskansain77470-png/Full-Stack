const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async (req, res, next) => {
    const token = req.cookies.token;
    
    // 1. Agar token nahi hai toh null set karke aage badho
    if (!token) {
        req.user = null;
        res.locals.user = null;
        return next();
    }

    try {
        // 2. Token Verify karein
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "fullstack_cafe_secret_key");
        
        // 3. THE FIX: Fetch fresh user data from DB
        // .lean() performance ke liye achha hai, par _id handle karna padta hai
        const freshUser = await User.findById(decoded.id || decoded._id).lean();

        if (!freshUser) {
            req.user = null;
            res.locals.user = null;
            res.clearCookie("token");
            return next();
        }

        // 4. Payload normalization
        // Mongoose ObjectId ko string mein convert karna zaroori hai
        const userPayload = {
            ...freshUser,
            _id: freshUser._id.toString(), 
            id: freshUser._id.toString()
        };

        // 5. Request aur Locals mein attach karein
        req.user = userPayload; 
        res.locals.user = userPayload; 
        
        // Console log for debugging (Check karein ki role 'admin' aa raha hai ya nahi)
        // console.log("User Authenticated:", userPayload.email, "Role:", userPayload.role);
        
        next();

    } catch (err) {
        // 6. Agar token invalid ya expire ho jaye
        console.error("Global Auth Error:", err.message);
        req.user = null;
        res.locals.user = null;
        res.clearCookie("token"); 
        next();
    }
};