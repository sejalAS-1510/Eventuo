const { validationResult } = require('express-validator');
const User = require('../models/User');
const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');

// ─── GET /api/admin/stats ────────────────────────────────────────────────────

const getStats = async (req, res, next) => {
  try {
    const [totalUsers, totalEvents, totalRegistrations] = await Promise.all([
      User.countDocuments(),
      Event.countDocuments(),
      EventRegistration.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      data: { totalUsers, totalEvents, totalRegistrations },
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/admin/users ────────────────────────────────────────────────────

const getUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: users,
    });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/admin/users/:id/role ────────────────────────────────────────

const changeRole = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const err = new Error(errors.array()[0].msg);
    err.statusCode = 422;
    return next(err);
  }

  try {
    // Block an admin from changing their own role
    if (req.params.id === req.user._id.toString()) {
      return next(
        Object.assign(new Error('You cannot change your own role'), { statusCode: 403 })
      );
    }

    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return next(Object.assign(new Error('User not found'), { statusCode: 404 }));
    }

    user.role = req.body.role;
    await user.save();

    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/admin/users/:id ─────────────────────────────────────────────

const deleteUser = async (req, res, next) => {
  try {
    // Block self-deletion
    if (req.params.id === req.user._id.toString()) {
      return next(
        Object.assign(new Error('You cannot delete your own account'), { statusCode: 403 })
      );
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return next(Object.assign(new Error('User not found'), { statusCode: 404 }));
    }

    // Block deleting the last admin
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return next(
          Object.assign(
            new Error('Cannot delete the last remaining admin account'),
            { statusCode: 400 }
          )
        );
      }
    }

    // Find all registrations for this student, then decrement each event's count
    const registrations = await EventRegistration.find({ student: user._id }).select('event');

    if (registrations.length > 0) {
      const eventIds = registrations.map((r) => r.event);

      // Decrement registeredCount for every event this user was registered to
      await Event.updateMany(
        { _id: { $in: eventIds } },
        { $inc: { registeredCount: -1 } }
      );

      await EventRegistration.deleteMany({ student: user._id });
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: `User "${user.name}" deleted along with ${registrations.length} registration(s)`,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getStats, getUsers, changeRole, deleteUser };
