module.exports = (req, res, next) => {
    // Check if user exists and has admin role
    if (req.user && req.user.role === 'admin') {
        return next();
    }
    // Agar admin nahi hai toh Access Denied page ya login par bhejein
    return res.status(403).render("accessDenied", { 
        message: "Only Admins are allowed to access this page.",
        user: req.user 
    });
};