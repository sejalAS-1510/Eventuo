const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Sign a JWT with userId, role, and name; expires in JWT_EXPIRES_IN (default 7d).
 */
const signToken = (user) =>
  jwt.sign(
    { userId: user._id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

/**
 * Return a user object safe to send to the client (no password hash).
 */
const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  department: user.department,
  rollNumber: user.rollNumber,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

// ─── Controllers ────────────────────────────────────────────────────────────

/**
 * POST /api/auth/signup
 */
const signup = async (req, res, next) => {
  // express-validator errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const err = new Error(errors.array()[0].msg);
    err.statusCode = 422;
    return next(err);
  }

  const { name, email, password, department, rollNumber } = req.body;

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      const err = new Error('An account with that email already exists');
      err.statusCode = 409;
      return next(err);
    }

    // Role is ALWAYS "student" – ignore anything the client sends
    const user = await User.create({
      name,
      email,
      password,
      role: 'student',
      department: department || '',
      rollNumber: rollNumber || '',
    });

    const token = signToken(user);

    res.status(201).json({
      success: true,
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const err = new Error(errors.array()[0].msg);
    err.statusCode = 422;
    return next(err);
  }

  const { email, password } = req.body;

  try {
    // Explicitly select password back in (schema has select: false)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      return next(err);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      return next(err);
    }

    const token = signToken(user);

    res.status(200).json({
      success: true,
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me  (protected)
 */
const getMe = (req, res) => {
  // req.user is already populated by the protect middleware (no password)
  res.status(200).json({
    success: true,
    user: sanitizeUser(req.user),
  });
};

module.exports = { signup, login, getMe };
