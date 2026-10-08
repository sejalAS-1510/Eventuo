const mongoose = require('mongoose');

const eventRegistrationSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event reference is required'],
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required'],
    },
    ticketCode: {
      type: String,
      required: [true, 'Ticket code is required'],
      unique: true,
    },
    status: {
      type: String,
      enum: ['registered', 'attended'],
      default: 'registered',
    },
  },
  { timestamps: true }
);

// Prevent a student from registering for the same event twice
eventRegistrationSchema.index({ event: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('EventRegistration', eventRegistrationSchema);
