const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protect routes: reads Bearer token, verifies it, and attaches the full
 * user document (minus password) to req.user.
 */
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Not authorised, no token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Re-fetch so we always have the latest user state; password excluded
    req.user = await User.findById(decoded.userId).select('-password');

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User no longer exists' });
    }

    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Not authorised, invalid token' });
  }
};

module.exports = { protect };
