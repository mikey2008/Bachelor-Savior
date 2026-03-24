require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const http = require('http');

const email = process.env.TEST_USER_EMAIL;
const password = process.env.TEST_USER_PASS;

if (!email || !password) {
  console.error('❌ Error: TEST_USER_EMAIL and TEST_USER_PASS are required in .env');
  process.exit(1);
}

const loginData = JSON.stringify({ email, password });



const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body:', body);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(loginData);
req.end();
