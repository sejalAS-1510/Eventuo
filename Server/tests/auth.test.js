process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';

const request = require('supertest');
const app = require('../src/app');
const db = require('./helpers/db');
const { signupUser } = require('./helpers/fixtures');

beforeAll(() => db.connect());
afterEach(() => db.clearDatabase());
afterAll(() => db.closeDatabase());

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/signup', () => {
  it('creates a student account and returns a token', async () => {
    const { res } = await signupUser({ name: 'Alice', email: 'alice@example.com' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('student');
    expect(res.body.user.password).toBeUndefined();
  });

  it('always assigns role "student" even when the client sends role "admin"', async () => {
    const { res } = await signupUser({
      email: 'hacker@example.com',
      role: 'admin', // should be ignored
    });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('student');
  });

  it('always assigns role "student" even when the client sends role "coordinator"', async () => {
    const { res } = await signupUser({
      email: 'coord@example.com',
      role: 'coordinator', // should be ignored
    });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('student');
  });

  it('returns 409 when the email is already registered', async () => {
    await signupUser({ email: 'dup@example.com' });
    const { res } = await signupUser({ email: 'dup@example.com' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('returns 422 when password is shorter than 6 characters', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      name: 'Short',
      email: 'short@example.com',
      password: '123',
    });

    expect(res.status).toBe(422);
  });

  it('never returns the password hash in the response', async () => {
    const { res } = await signupUser({ email: 'nopw@example.com' });
    expect(res.body.user.password).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await signupUser({ email: 'logintest@example.com', password: 'password123' });
  });

  it('returns a token and sanitized user on valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'logintest@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('logintest@example.com');
    expect(res.body.user.password).toBeUndefined();
  });

  it('returns 401 on wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'logintest@example.com',
      password: 'wrongpassword',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 when email does not exist', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(401);
  });
});
