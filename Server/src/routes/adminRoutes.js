const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { getStats, getUsers, changeRole, deleteUser } = require('../controllers/adminController');

const router = express.Router();

// All admin routes require a valid JWT AND the "admin" role
router.use(protect, requireRole(['admin']));

// Stats
router.get('/stats', getStats);

// Users
router.get('/users', getUsers);

router.patch(
  '/users/:id/role',
  [
    body('role')
      .isIn(['student', 'coordinator', 'admin'])
      .withMessage('Role must be student, coordinator or admin'),
  ],
  changeRole
);

router.delete('/users/:id', deleteUser);

module.exports = router;
