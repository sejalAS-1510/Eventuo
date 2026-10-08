/**
 * Seed script — creates three demo users (admin, coordinator, student).
 * Run with:  npm run seed
 *
 * Safe to re-run: skips users whose email already exists.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');

const SEED_USERS = [
  {
    name: 'Admin User',
    email: 'admin@eventuo.dev',
    password: 'Admin@123',
    role: 'admin',
    department: 'Administration',
    rollNumber: '',
  },
  {
    name: 'Event Coordinator',
    email: 'coordinator@eventuo.dev',
    password: 'Coord@123',
    role: 'coordinator',
    department: 'Computer Science',
    rollNumber: '',
  },
  {
    name: 'Demo Student',
    email: 'student@eventuo.dev',
    password: 'Student@123',
    role: 'student',
    department: 'Computer Science',
    rollNumber: 'CS2024001',
  },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    for (const userData of SEED_USERS) {
      const exists = await User.findOne({ email: userData.email });
      if (exists) {
        console.log(`⚠  Skipping ${userData.email} — already exists`);
        continue;
      }

      // Create directly; the pre-save hook hashes the password automatically
      await User.create(userData);
      console.log(`✓  Created ${userData.role}: ${userData.email}`);
    }

    console.log('\nSeed complete.');
    console.log('─────────────────────────────────────');
    console.log('  admin@eventuo.dev       Admin@123');
    console.log('  coordinator@eventuo.dev Coord@123');
    console.log('  student@eventuo.dev     Student@123');
    console.log('─────────────────────────────────────');
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

seed();
