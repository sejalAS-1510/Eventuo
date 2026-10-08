const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  registerForEvent,
  cancelRegistration,
  getAttendees,
} = require('../controllers/eventController');

const router = express.Router();

// ─── Validation rules ────────────────────────────────────────────────────────

const eventValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('venue').notEmpty().withMessage('Venue is required'),
  body('date').isISO8601().withMessage('A valid event date is required').toDate(),
  body('deadline').isISO8601().withMessage('A valid registration deadline is required').toDate(),
  body('seats')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Seats must be a positive integer'),
];

const updateEventValidation = [
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('description').optional().notEmpty().withMessage('Description cannot be empty'),
  body('venue').optional().notEmpty().withMessage('Venue cannot be empty'),
  body('date').optional().isISO8601().withMessage('A valid event date is required').toDate(),
  body('deadline')
    .optional()
    .isISO8601()
    .withMessage('A valid registration deadline is required')
    .toDate(),
  body('seats')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Seats must be a positive integer'),
];

// ─── Routes ──────────────────────────────────────────────────────────────────

// List & create
router
  .route('/')
  .get(protect, getEvents)
  .post(protect, requireRole(['coordinator', 'admin']), eventValidation, createEvent);

// Single event
router
  .route('/:id')
  .get(protect, getEventById)
  .put(protect, requireRole(['coordinator', 'admin']), updateEventValidation, updateEvent)
  .delete(protect, requireRole(['coordinator', 'admin']), deleteEvent);

// Registration
router
  .route('/:id/register')
  .post(protect, requireRole(['student']), registerForEvent)
  .delete(protect, requireRole(['student']), cancelRegistration);

// Attendee list (creator or admin)
router.get('/:id/attendees', protect, requireRole(['coordinator', 'admin']), getAttendees);

module.exports = router;
