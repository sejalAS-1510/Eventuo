/**
 * requireRole(["coordinator", "admin"])
 * Must be used AFTER the protect middleware so req.user is populated.
 */
const requireRole = (allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
    });
  }
  next();
};

module.exports = { requireRole };
