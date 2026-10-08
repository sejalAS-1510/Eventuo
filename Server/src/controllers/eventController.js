const crypto = require('crypto');
const { validationResult } = require('express-validator');
const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');

// ─── Helpers ────────────────────────────────────────────────────────────────

const validationError = (req, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const err = new Error(errors.array()[0].msg);
    err.statusCode = 422;
    return next(err);
  }
  return null;
};

/**
 * Generate a unique ticket code "TICKET-XXXXXX", retrying on DB collision.
 */
const generateTicketCode = async (maxRetries = 5) => {
  for (let i = 0; i < maxRetries; i++) {
    const code = `TICKET-${String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')}`;
    const exists = await EventRegistration.exists({ ticketCode: code });
    if (!exists) return code;
  }
  throw Object.assign(new Error('Could not generate a unique ticket code'), { statusCode: 500 });
};

// ─── GET /api/events ─────────────────────────────────────────────────────────

const getEvents = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.search) {
      filter.title = { $regex: req.query.search, $options: 'i' };
    }

    const [events, total] = await Promise.all([
      Event.find(filter)
        .sort({ date: 1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'name email'),
      Event.countDocuments(filter),
    ]);

    // For students, attach their ticket if registered
    let enriched = events.map((e) => e.toObject());
    if (req.user.role === 'student') {
      const eventIds = enriched.map((e) => e._id);
      const myRegs = await EventRegistration.find({
        event: { $in: eventIds },
        student: req.user._id,
      }).select('event ticketCode');

      const regMap = {};
      myRegs.forEach((r) => { regMap[r.event.toString()] = r.ticketCode; });

      enriched = enriched.map((e) => ({
        ...e,
        registeredTicket: regMap[e._id.toString()] || null,
      }));
    }

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: enriched,
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/events/:id ─────────────────────────────────────────────────────

const getEventById = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id).populate('createdBy', 'name email');
    if (!event) {
      return next(Object.assign(new Error('Event not found'), { statusCode: 404 }));
    }
    res.status(200).json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/events ────────────────────────────────────────────────────────

const createEvent = async (req, res, next) => {
  if (validationError(req, next)) return;

  try {
    const { title, description, venue, date, deadline, seats } = req.body;
    const event = await Event.create({
      title,
      description,
      venue,
      date,
      deadline,
      seats: seats ?? 50,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: event });
  } catch (err) {
    // Mongoose validation (e.g. deadline >= date)
    if (err.name === 'ValidationError') {
      err.statusCode = 422;
      err.message = Object.values(err.errors)[0].message;
    }
    next(err);
  }
};

// ─── PUT /api/events/:id ─────────────────────────────────────────────────────

const updateEvent = async (req, res, next) => {
  if (validationError(req, next)) return;

  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return next(Object.assign(new Error('Event not found'), { statusCode: 404 }));
    }

    // Only creator or admin
    if (event.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(Object.assign(new Error('Not authorised to update this event'), { statusCode: 403 }));
    }

    // Reject seats below current registeredCount
    if (req.body.seats !== undefined && req.body.seats < event.registeredCount) {
      return next(
        Object.assign(
          new Error(`Cannot reduce seats below current registration count (${event.registeredCount})`),
          { statusCode: 400 }
        )
      );
    }

    const allowed = ['title', 'description', 'venue', 'date', 'deadline', 'seats'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) event[field] = req.body[field];
    });

    await event.save();
    res.status(200).json({ success: true, data: event });
  } catch (err) {
    if (err.name === 'ValidationError') {
      err.statusCode = 422;
      err.message = Object.values(err.errors)[0].message;
    }
    next(err);
  }
};

// ─── DELETE /api/events/:id ──────────────────────────────────────────────────

const deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return next(Object.assign(new Error('Event not found'), { statusCode: 404 }));
    }

    // Only creator or admin
    if (event.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(Object.assign(new Error('Not authorised to delete this event'), { statusCode: 403 }));
    }

    // Cascade-delete registrations, then the event
    await EventRegistration.deleteMany({ event: event._id });
    await event.deleteOne();

    res.status(200).json({ success: true, message: 'Event and its registrations deleted' });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/events/:id/register ──────────────────────────────────────────

const registerForEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return next(Object.assign(new Error('Event not found'), { statusCode: 404 }));
    }

    const now = new Date();

    if (now > event.deadline) {
      return next(
        Object.assign(new Error('Registration deadline has passed'), { statusCode: 400 })
      );
    }

    if (now > event.date) {
      return next(Object.assign(new Error('This event has already taken place'), { statusCode: 400 }));
    }

    // Atomic capacity check + increment: only updates if seats are available
    const updated = await Event.findOneAndUpdate(
      { _id: event._id, $expr: { $lt: ['$registeredCount', '$seats'] } },
      { $inc: { registeredCount: 1 } },
      { new: true }
    );

    if (!updated) {
      return next(Object.assign(new Error('Event is fully booked'), { statusCode: 400 }));
    }

    // Create registration (with ticket-code collision retry)
    let registration;
    try {
      const ticketCode = await generateTicketCode();
      registration = await EventRegistration.create({
        event: event._id,
        student: req.user._id,
        ticketCode,
      });
    } catch (regErr) {
      // Roll back the seat increment if registration creation fails
      await Event.findByIdAndUpdate(event._id, { $inc: { registeredCount: -1 } });

      // Duplicate key on the compound index = student already registered
      if (regErr.code === 11000) {
        return next(
          Object.assign(new Error('You are already registered for this event'), { statusCode: 409 })
        );
      }
      return next(regErr);
    }

    res.status(201).json({
      success: true,
      message: 'Registered successfully',
      ticketCode: registration.ticketCode,
      data: registration,
    });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/events/:id/register ────────────────────────────────────────

const cancelRegistration = async (req, res, next) => {
  try {
    const registration = await EventRegistration.findOne({
      event: req.params.id,
      student: req.user._id,
    });

    if (!registration) {
      return next(
        Object.assign(new Error('You are not registered for this event'), { statusCode: 404 })
      );
    }

    await registration.deleteOne();
    await Event.findByIdAndUpdate(req.params.id, { $inc: { registeredCount: -1 } });

    res.status(200).json({ success: true, message: 'Registration cancelled' });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/events/:id/attendees ───────────────────────────────────────────

const getAttendees = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return next(Object.assign(new Error('Event not found'), { statusCode: 404 }));
    }

    // Only the event creator or an admin
    if (event.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(
        Object.assign(new Error('Not authorised to view attendees for this event'), { statusCode: 403 })
      );
    }

    const registrations = await EventRegistration.find({ event: event._id })
      .populate('student', 'name email rollNumber createdAt')
      .sort({ createdAt: 1 });

    res.status(200).json({ success: true, total: registrations.length, data: registrations });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  registerForEvent,
  cancelRegistration,
  getAttendees,
};
