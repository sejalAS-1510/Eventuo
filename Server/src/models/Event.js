const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Event description is required'],
    },
    venue: {
      type: String,
      required: [true, 'Venue is required'],
    },
    date: {
      type: Date,
      required: [true, 'Event date is required'],
    },
    deadline: {
      type: Date,
      required: [true, 'Registration deadline is required'],
    },
    seats: {
      type: Number,
      required: [true, 'Seats count is required'],
      default: 50,
      min: [1, 'There must be at least 1 seat'],
    },
    registeredCount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Event creator is required'],
    },
  },
  { timestamps: true }
);

// Validate that the registration deadline falls before the event date
eventSchema.pre('validate', function (next) {
  if (this.deadline && this.date && this.deadline >= this.date) {
    this.invalidate(
      'deadline',
      'Registration deadline must be before the event date'
    );
  }
  next();
});

module.exports = mongoose.model('Event', eventSchema);
