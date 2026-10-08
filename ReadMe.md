# Eventuo

A MERN app for campus events. Coordinators publish events with seat limits and registration deadlines, students register and get ticket codes, and admins manage users.

## Features
- JWT authentication with three roles: student, coordinator, admin
- Public signup creates students only; coordinators are promoted by an admin
- Create, edit and delete events (coordinator/admin)
- Seat-limited registration with atomic seat counting, deadline checks and duplicate prevention
- Ticket codes, registration cancellation and attendee check-in
- Admin panel: stats, user role management
- Search, pagination, validation, rate limiting on auth routes
- Jest and Supertest API tests

## Tech Stack
MongoDB (Mongoose), Express.js, React (Vite), Node.js

## Setup
1. Clone the repo
2. Server: `cd server && npm install`, then copy `.env.example` to `.env` and fill in values
3. Client: `cd client && npm install`, then copy `.env.example` to `.env`
4. Seed demo users: `cd server && npm run seed`

## How to Run
- Server: `cd server && npm run dev` (http://localhost:5000)
- Client: `cd client && npm run dev` (http://localhost:5173)
- Tests: `cd server && npm test`

## Demo Accounts
|    Role     |          Email          |   Password  |
|-------------|-------------------------|-------------|
|    Admin    |    admin@eventuo.dev    |  Admin@123  |
| Coordinator | coordinator@eventuo.dev |  Coord@123  |
|   Student   |   student@eventuo.dev   | Student@123 |

## AI Tool Used
Kiro

## AI Development Experience
I built Eventuo step by step with Kiro, giving it one focused prompt per layer (models, auth, events, frontend, tests) and reviewing the generated code before committing. I ran the server and tests after each step and fixed problems myself.

1. **Data models:** Kiro generated the User, Event and EventRegistration Mongoose models, including password hashing, a deadline-before-date check and a unique index to prevent duplicate registrations.
2. **Auth and role middleware:** Kiro built JWT signup, login and me endpoints, role-based middleware, validation and rate limiting. Signup always creates a student.
3. **Event and registration routes:** Kiro implemented seat-limited registration using an atomic update, so concurrent requests can't overbook an event, plus deadline checks, cancellation and attendee check-in.
4. **Tests:** Kiro generated Jest and Supertest tests, including a concurrency test where multiple students register at once for a limited-seat event.
5. **Frontend:** Kiro generated the React app: auth context, protected routes, events page with search and pagination, coordinator dashboard and admin panel.

**Issue I fixed:** `connectDB()` was called without `await`, so the server accepted requests before MongoDB had connected, and the first requests failed with a Mongoose buffering timeout. I traced it to the startup code and changed it so the server only starts listening after the database connection succeeds.