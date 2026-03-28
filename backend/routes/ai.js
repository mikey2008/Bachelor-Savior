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
    
    const tryModels = [
      'gemini-2.0-flash',        // User's key specifically listed this!
      'gemini-2.0-flash-lite', 
      'gemini-1.5-flash', 
      'gemini-1.5-pro'
    ];
    const tryVersions = ['v1beta', 'v1']; // Try both API versions

    let lastError = null;

    for (const key of tryKeys) {
      if (!key || key.includes('placeholder')) continue;
      
      for (const model of tryModels) {
        for (const version of tryVersions) {
          try {
            const apiUrl = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${key}`;
            
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
              console.log(`✨ AI Success: Used ${model} (${version}) with key ${key.slice(0, 8)}...`);
              return res.json(data); 
            }
            
            const errData = await response.json();
            lastError = errData.error?.message || `Status ${response.status}`;
            console.warn(`[Cycle 2] ${model} (${version}) failed: ${lastError}`);

          } catch (innerErr) {
            lastError = innerErr.message;
          }
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
