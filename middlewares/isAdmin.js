/**
 * Middleware: isAdmin
 * Protects routes from non-admin users.
 * Ensure this is used AFTER extractUser in your routes.
 */
module.exports = (req, res, next) => {
    // 1. Check if user is logged in at all
    if (!req.user) {
        console.warn(`Blocked: Anonymous access attempt to ${req.path}`);
        return res.status(401).redirect("/login");
    }

    // 2. Check for the 'admin' role
    // Note: This works perfectly now because extractUser.js fetches fresh data from DB
    if (req.user.role === 'admin') {
        return next();
    }

    // 3. Handle logged-in users who are NOT admins
    console.warn(`Access Denied: User ${req.user.email} attempted to access ${req.path}`);
    
    // You can render a specific '403' or 'accessDenied' page
    return res.status(403).render("accessDenied", { 
        title: "Forbidden",
        message: "This area is restricted to Café Administrators only.",
        user: req.user // Pass user info to keep the header working
    });
};