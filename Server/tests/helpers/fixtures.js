const request = require('supertest');
const app = require('../../src/app');

/**
 * Sign up a user and return { token, user }.
 * `overrides.role` is intentionally passed to verify the API ignores it.
 */
const signupUser = async (overrides = {}) => {
  const payload = {
    name: 'Test User',
    email: `test_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`,
    password: 'password123',
    department: 'CS',
    rollNumber: 'CS001',
    ...overrides,
  };
  const res = await request(app).post('/api/auth/signup').send(payload);
  return { token: res.body.token, user: res.body.user, res };
};

/**
 * Directly insert a user with a specific role using the User model,
 * then log in to get a valid JWT. Use for coordinator / admin fixtures.
 */
const createUserWithRole = async (role, overrides = {}) => {
  const User = require('../../src/models/User');
  const data = {
    name: `${role} User`,
    email: `${role}_${Date.now()}@example.com`,
    password: 'password123',
    role,
    department: 'CS',
    rollNumber: '',
    ...overrides,
  };
  const user = await User.create(data);
  // Log in to get a token (re-fetch with password via login)
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: data.email, password: data.password });
  return { token: res.body.token, user: res.body.user, dbUser: user };
};

/**
 * Create a future event via the API using a coordinator token.
 */
const createEvent = async (coordinatorToken, overrides = {}) => {
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // +7 days
  const deadline = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);   // +3 days
  const payload = {
    title: 'Test Event',
    description: 'A test event',
    venue: 'Room 101',
    date: futureDate.toISOString(),
    deadline: deadline.toISOString(),
    seats: 2,
    ...overrides,
  };
  const res = await request(app)
    .post('/api/events')
    .set('Authorization', `Bearer ${coordinatorToken}`)
    .send(payload);
  return { event: res.body.data, res };
};

module.exports = { signupUser, createUserWithRole, createEvent };
