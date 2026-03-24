require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fetch = require('node-fetch');

(async () => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASS;

  if (!email || !password) {
    console.error('❌ Error: TEST_USER_EMAIL and TEST_USER_PASS are required in .env');
    process.exit(1);
  }
  
  const response = await fetch('http://localhost:3001/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });


  const text = await response.text();
  console.log('Status:', response.status);
  console.log('Response:', text);
})();
