const mongoose = require('mongoose');

/**
 * GET /api/health
 * Returns server and database status.
 */
const healthCheck = (req, res) => {
  const dbState = mongoose.connection.readyState;
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const dbStatus = ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] || 'unknown';

  res.status(200).json({
    success: true,
    message: 'Eventuo API is running',
    environment: process.env.NODE_ENV,
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
};

module.exports = { healthCheck };
