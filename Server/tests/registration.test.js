process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const db = require('./helpers/db');
const { signupUser, createUserWithRole, createEvent } = require('./helpers/fixtures');
const Event = require('../src/models/Event');

beforeAll(() => db.connect());
afterEach(() => db.clearDatabase());
afterAll(() => db.closeDatabase());

// ─── helpers ─────────────────────────────────────────────────────────────────

const registerForEvent = (token, eventId) =>
  request(app)
    .post(`/api/events/${eventId}/register`)
    .set('Authorization', `Bearer ${token}`);

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/events/:id/register', () => {
  let coordinator, student, event;

  beforeEach(async () => {
    coordinator = await createUserWithRole('coordinator');
    student = await signupUser({ email: 'student@example.com' });
    const result = await createEvent(coordinator.token, { seats: 2 });
    if (!result.event) {
      throw new Error(`Event creation failed: ${JSON.stringify(result.res.body)}`);
    }
    event = result.event;
  });

  // ── Role guard ──────────────────────────────────────────────────────────────
  it('returns 403 when a coordinator tries to register', async () => {
    const res = await registerForEvent(coordinator.token, event._id);
    expect(res.status).toBe(403);
  });

  it('returns 403 when an admin tries to register', async () => {
    const admin = await createUserWithRole('admin');
    const res = await registerForEvent(admin.token, event._id);
    expect(res.status).toBe(403);
  });

  // ── Happy path ──────────────────────────────────────────────────────────────
  it('registers a student and returns a ticketCode', async () => {
    const res = await registerForEvent(student.token, event._id);
    expect(res.status).toBe(201);
    expect(res.body.ticketCode).toMatch(/^TICKET-\d{6}$/);
  });

  // ── Duplicate guard ─────────────────────────────────────────────────────────
  it('returns 409 on duplicate registration by the same student', async () => {
    await registerForEvent(student.token, event._id);
    const res = await registerForEvent(student.token, event._id);
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  // ── Deadline guard ──────────────────────────────────────────────────────────
  it('returns 400 when the registration deadline has passed', async () => {
    // Bypass the Mongoose pre-validate hook (which blocks deadline >= date)
    // by inserting directly with a real createdBy ObjectId.
    const pastDeadlineEvent = await Event.collection.insertOne({
      title: 'Past Deadline Event',
      description: 'desc',
      venue: 'hall',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      deadline: new Date(Date.now() - 60 * 1000), // 1 minute ago
      seats: 10,
      registeredCount: 0,
      createdBy: new mongoose.Types.ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await registerForEvent(
      student.token,
      pastDeadlineEvent.insertedId.toString()
    );
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/deadline/i);
  });

  // ── Capacity guard ──────────────────────────────────────────────────────────
  it('returns 400 when the event is fully booked', async () => {
    // seats = 2; register two different students first
    const s2 = await signupUser({ email: 's2@example.com' });
    const s3 = await signupUser({ email: 's3@example.com' });

    await registerForEvent(s2.token, event._id);
    await registerForEvent(s3.token, event._id);

    const res = await registerForEvent(student.token, event._id);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/fully booked/i);
  });

  // ── Concurrent capacity guard ───────────────────────────────────────────────
  it('never exceeds seat count under concurrent requests', async () => {
    // seats = 2; fire 6 concurrent registrations from different students
    const students = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        signupUser({ email: `concurrent${i}@example.com` })
      )
    );

    const results = await Promise.all(
      students.map((s) => registerForEvent(s.token, event._id))
    );

    const successful = results.filter((r) => r.status === 201);
    const fullyBooked = results.filter((r) => r.status === 400);

    // Exactly 2 should succeed (seats = 2), rest should be 400 or 409
    expect(successful.length).toBe(2);
    expect(fullyBooked.length + successful.length).toBe(6);

    // Verify the DB count matches reality
    const updatedEvent = await Event.findById(event._id);
    expect(updatedEvent.registeredCount).toBe(2);
  });
});
