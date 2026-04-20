/**
 * gemini.js - AI Logic for Bachelor Saviour V2
 *
 * Uses Groq API (free, fast, llama-3.3-70b) as primary,
 * with Gemini as fallback if a Gemini key is also stored.
 */

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

export const GeminiAI = {
    /**
     * Attempts to generate a recipe using the Groq API first. If it fails or is unconfigured,
     * falls back to the Gemini API if a legacy key is provided.
     * @param {string} prompt - The assembled prompt string containing ingredients and filters.
     * @param {string} apiKey - The legacy Gemini API key (fallback only).
     * @returns {Promise<string>} The generated recipe text in Markdown format.
     * @throws {Error} If both APIs fail or no API key is configured.
     */
    async generateRecipe(prompt, apiKey) {
        // --- Try Groq first (free, no user quota) ---
        const groqKey = localStorage.getItem('bs_v2_groq_key');
        if (groqKey) {
            try {
                return await this._callGroq(prompt, groqKey);
            } catch (e) {
                console.warn('Groq failed, trying Gemini...', e.message);
            }
        }

        // --- Fallback: Gemini direct (requires user's key) ---
        if (apiKey) {
            return await this._callGemini(prompt, apiKey);
        }

        throw new Error('No API key configured. Please set up a key via the Profile button.');
    },

    /**
     * Makes a direct API call to Groq's Llama-3.3-70b-versatile model.
     * @param {string} prompt - The user's cooking prompt.
     * @param {string} groqKey - The user's Groq API key from localStorage.
     * @returns {Promise<string>} The generated recipe content.
     * @private
     */
    async _callGroq(prompt, groqKey) {
        const res = await fetch(GROQ_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${groqKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert chef who creates simple, delicious recipes for bachelors with limited ingredients. Output in clean Markdown format with emojis.'
                    },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 1024
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || `Groq error: ${res.status}`);
        
        const text = data.choices?.[0]?.message?.content;
        if (!text) throw new Error('Empty response from Groq');
        return text;
    },

    /**
     * Makes a fallback API call to Google's Gemini models.
     * Iterates through a list of candidate models until one succeeds.
     * @param {string} prompt - The user's cooking prompt.
     * @param {string} apiKey - The user's Gemini API key from localStorage.
     * @returns {Promise<string>} The generated recipe content.
     * @throws {Error} Quota errors, invalid key errors, or general generation failures.
     * @private
     */
    async _callGemini(prompt, apiKey) {
        const candidates = [
            { model: 'gemini-1.5-flash-latest', version: 'v1beta' },
            { model: 'gemini-2.0-flash', version: 'v1beta' },
        ];

        let lastErr = null;
        for (const c of candidates) {
            try {
                const url = `https://generativelanguage.googleapis.com/${c.version}/models/${c.model}:generateContent?key=${apiKey}`;
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
                    })
                });

                const data = await res.json();
                if (res.ok) {
                    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) return text;
                }

                const errMsg = data?.error?.message || `Status ${res.status}`;
                if (res.status === 429) throw new Error('⏳ Gemini quota exceeded. Please wait 60s.');
                if (res.status === 400) throw new Error(`Invalid API Key. ${errMsg}`);
                lastErr = errMsg;
            } catch (e) {
                if (e.message.includes('quota') || e.message.includes('Invalid')) throw e;
                lastErr = e.message;
            }
        }
        throw new Error(lastErr || 'Gemini generation failed.');
    }
};
