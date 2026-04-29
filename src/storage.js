/**
 * storage.js - Storage management for Bachelor Saviour V2
 * Supports both LocalStorage (fallback) and Supabase Backend (primary).
 */

const BACKEND_URL = 'http://localhost:3000/api'; // Change this for production

const KEYS = {
    GEMINI_API_KEY: 'bs_v2_gemini_api_key',
    SAVED_RECIPES: 'bs_v2_saved_recipes'
};

export const Storage = {
    // --- API Key Management (Local Only) ---
    getGeminiKey() {
        return localStorage.getItem(KEYS.GEMINI_API_KEY) || '';
    },
    setGeminiKey(key) {
        localStorage.setItem(KEYS.GEMINI_API_KEY, key);
    },
    clearGeminiKey() {
        localStorage.removeItem(KEYS.GEMINI_API_KEY);
    },

    // --- Recipe Management (Hybrid: Backend + Local Fallback) ---

    /**
     * Retrieves all user-saved recipes.
     * Tries the backend first, falls back to localStorage if offline or failed.
     * @returns {Promise<Array<Object>>}
     */
    async getSavedRecipes() {
        try {
            const res = await fetch(`${BACKEND_URL}/recipes`);
            if (res.ok) {
                const remoteRecipes = await res.json();
                // Sync to local for offline use
                localStorage.setItem(KEYS.SAVED_RECIPES, JSON.stringify(remoteRecipes));
                return remoteRecipes;
            }
        } catch (e) {
            console.warn('Backend unavailable, using localStorage fallback.');
        }

        const raw = localStorage.getItem(KEYS.SAVED_RECIPES);
        return raw ? JSON.parse(raw) : [];
    },

    /**
     * Saves a new recipe to the backend and localStorage.
     * @param {string} title
     * @param {string} content
     * @returns {Promise<Object>}
     */
    async saveRecipe(title, content) {
        const localData = {
            id: Date.now(),
            title,
            content,
            date: new Date().toISOString()
        };

        try {
            const res = await fetch(`${BACKEND_URL}/recipes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content })
            });
            if (res.ok) return await res.json();
        } catch (e) {
            console.warn('Failed to save to backend. Saving locally only.');
        }

        // Local fallback
        const recipes = JSON.parse(localStorage.getItem(KEYS.SAVED_RECIPES) || '[]');
        recipes.unshift(localData);
        localStorage.setItem(KEYS.SAVED_RECIPES, JSON.stringify(recipes));
        return localData;
    },

    /**
     * Deletes a specific recipe.
     * @param {number|string} id
     */
    async deleteRecipe(id) {
        try {
            await fetch(`${BACKEND_URL}/recipes/${id}`, { method: 'DELETE' });
        } catch (e) {
            console.warn('Failed to delete from backend.');
        }

        // Local fallback cleanup
        const recipes = JSON.parse(localStorage.getItem(KEYS.SAVED_RECIPES) || '[]');
        const filtered = recipes.filter(r => r.id != id);
        localStorage.setItem(KEYS.SAVED_RECIPES, JSON.stringify(filtered));
    }
};
