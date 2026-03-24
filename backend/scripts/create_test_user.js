require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../db/database');
const bcrypt = require('bcryptjs');

(async () => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASS;

  if (!email || !password) {
    console.error('❌ Error: TEST_USER_EMAIL and TEST_USER_PASS are required in .env');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);


  // Check if user already exists
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    console.log('User already exists with id', existing.id);
    process.exit(0);
  }
  db.prepare(`
    INSERT INTO users (email, password_hash, is_verified, verify_token, verify_token_expires)
    VALUES (?, ?, 1, NULL, NULL)
  `).run(email, passwordHash);
  console.log('Test user created and verified.');
})();
