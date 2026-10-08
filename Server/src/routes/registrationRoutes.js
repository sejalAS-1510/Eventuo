const express = require('express');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { checkIn, getMyRegistrations } = require('../controllers/registrationController');

const router = express.Router();

// My registrations (student)
router.get('/me', protect, requireRole(['student']), getMyRegistrations);

// Check-in by ticket code (coordinator or admin)
router.patch(
  '/:ticketCode/check-in',
  protect,
  requireRole(['coordinator', 'admin']),
  checkIn
);

module.exports = router;
