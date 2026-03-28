'use strict';

const express = require('express');
// Using built-in fetch (Node 18+)
const { apiLimiter } = require('../middleware/rateLimiters');
const { aiGenerateValidator } = require('../middleware/validators');

const router = express.Router();

// POST /ai/generate - Proxy for Gemini API with Bulletproof Fallbacks
router.post('/generate', apiLimiter, aiGenerateValidator, async (req, res) => {
  try {
    const { prompt } = req.body;

    // --- Key Selection: Env Var > User Key 1 > User Key 2 ---
    const primaryKey = process.env.GEMINI_API_KEY;
    const fallbackKeys = [
      'AIzaSyCqtBswjVnjRq7IK5_quXboUjE7IASlgKw', // USER_KEY_1
      'AIzaSyBkLDRZS0plrYrxgqOijMUQ9HUuLBHWcco'  // USER_KEY_2 (Backup)
    ];
    
    const tryKeys = primaryKey ? [primaryKey, ...fallbackKeys] : fallbackKeys;
    const tryModels = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash-latest'];

    let lastError = null;

    for (const key of tryKeys) {
      for (const model of tryModels) {
        try {
          const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${key}`;
          
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
            })
          });

          if (response.ok) {
            const data = await response.json();
            return res.json(data); // ✨ SUCCESS!
          }
          
          const errData = await response.json();
          lastError = errData.error?.message || `Status ${response.status}`;
          console.warn(`Model ${model} failed with key ${key.slice(0, 8)}...: ${lastError}`);

        } catch (innerErr) {
          lastError = innerErr.message;
        }
      }
    }

    // If we're here, everything failed
    res.status(502).json({ 
      error: `All AI paths exhausted. Last error: ${lastError}. Please ensure the Gemini API is enabled for these keys.`
    });

  } catch (err) {
    console.error('AI Proxy Critical Error:', err);
    res.status(500).json({ error: 'Server error processing AI request.' });
  }
});

module.exports = router;
