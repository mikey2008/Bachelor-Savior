'use strict';

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authenticate = require('./middleware/authenticate');
const { apiLimiter } = require('./middleware/rateLimiters');
const authRouter = require('./routes/auth');
const recipesRouter = require('./routes/recipes');
const aiRouter      = require('./routes/ai');


const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: true, // Allow ALL origins dynamically
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Public routes
app.use('/auth', authRouter);

// Public API routes (with rate limiting)
app.use('/api/ai', apiLimiter, aiRouter);

// Protected API routes (ONLY for private recipes)
app.use('/api/recipes', authenticate, recipesRouter);


// Health check
app.get('/', (req, res) => res.send('Bachelor Savior backend is running'));

app.listen(PORT, () => {
  console.log(`🚀 Server v1.0.3: MODEL HUNTER MODE ON`);
  console.log(`✨ Redundant API paths activated (v1 & v1beta).`);
});
