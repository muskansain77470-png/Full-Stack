const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    res.locals.user = null; // No token, no user
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach to request for controllers
    console.log("current user: ", decoded);
    res.locals.user = decoded; // Attach to locals for EJS templates
  } catch (err) {
    console.error("Global Auth Error:", err.message);
    res.locals.user = null;
    res.clearCookie("token");
  }
  next();
};