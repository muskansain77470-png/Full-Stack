const jwt = require("jsonwebtoken");

exports.isAuthenticated = (req, res, next) => {
  const token = req.cookies.token;
  
  // Check if request is AJAX/Fetch
  const isAjax = req.xhr || req.headers.accept.indexOf('json') > -1 || req.path.startsWith("/cart/add");

  if (!token) {
    if (isAjax) {
      return res.status(401).json({ success: false, message: "Please login first" });
    }
    return res.redirect("/login");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Isme user ID honi chahiye (e.g., decoded.id)
    next();
  } catch (err) {
    console.error("JWT Verification Failed:", err.message);
    res.clearCookie("token");
    if (isAjax) {
      return res.status(401).json({ success: false, message: "Session expired" });
    }
    return res.redirect("/login");
  }
};