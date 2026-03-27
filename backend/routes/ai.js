'use strict';

const express = require('express');
// Using built-in fetch (Node 18+)
const { apiLimiter } = require('../middleware/rateLimiters');
const { aiGenerateValidator } = require('../middleware/validators');

const router = express.Router();

// POST /ai/generate - Proxy for Gemini API
router.post('/generate', apiLimiter, aiGenerateValidator, async (req, res) => {
  try {
    const { prompt } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Gemini API key not configured on server.' });
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ error: errorData.error?.message || 'Failed to fetch from Gemini API' });
    }

    const data = await response.json();
    res.json(data);

  } catch (err) {
    console.error('AI Proxy Error:', err);
    res.status(500).json({ error: 'Server error processing AI request.' });
  }
});

module.exports = router;
