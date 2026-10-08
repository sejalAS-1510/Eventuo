const EventRegistration = require('../models/EventRegistration');

// ─── PATCH /api/registrations/:ticketCode/check-in ──────────────────────────

const checkIn = async (req, res, next) => {
  try {
    const registration = await EventRegistration.findOne({
      ticketCode: req.params.ticketCode,
    }).populate('event', 'title date createdBy');

    if (!registration) {
      return next(Object.assign(new Error('Ticket not found'), { statusCode: 404 }));
    }

    if (registration.status === 'attended') {
      return next(Object.assign(new Error('Ticket has already been checked in'), { statusCode: 400 }));
    }

    registration.status = 'attended';
    await registration.save();

    res.status(200).json({
      success: true,
      message: 'Check-in successful',
      data: registration,
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/registrations/me ───────────────────────────────────────────────

const getMyRegistrations = async (req, res, next) => {
  try {
    const registrations = await EventRegistration.find({ student: req.user._id })
      .populate('event', 'title description venue date deadline seats registeredCount createdBy')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      total: registrations.length,
      data: registrations,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { checkIn, getMyRegistrations };
