module.exports = (role) => {
  return (req, res, next) => {
    // req.user is populated by the auth middleware above
    if (req.user && req.user.role !== role) {
      return res.status(403).json({
        message: `Access Denied: ${role} privileges required.`,
      });
    }
    next();
  };
};