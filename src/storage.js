/**
 * storage.js - LocalStorage management for Bachelor Saviour V2
 */

const KEYS = {
    GEMINI_API_KEY: 'bs_v2_gemini_api_key',
    SAVED_RECIPES: 'bs_v2_saved_recipes'
};

export const Storage = {
    /**
     * Retrieves the legacy Gemini API key from localStorage.
     * @returns {string} The stored API key or an empty string if not found.
     */
    getGeminiKey() {
        return localStorage.getItem(KEYS.GEMINI_API_KEY) || '';
    },

    /**
     * Saves the legacy Gemini API key to localStorage.
     * @param {string} key - The API key to store.
     */
    setGeminiKey(key) {
        localStorage.setItem(KEYS.GEMINI_API_KEY, key);
    },

    /**
     * Removes the legacy Gemini API key from localStorage.
     */
    clearGeminiKey() {
        localStorage.removeItem(KEYS.GEMINI_API_KEY);
    },

    /**
     * Retrieves all user-saved recipes from localStorage.
     * @returns {Array<Object>} An array of saved recipe objects.
     */
    getSavedRecipes() {
        const raw = localStorage.getItem(KEYS.SAVED_RECIPES);
        return raw ? JSON.parse(raw) : [];
    },

    /**
     * Saves a new recipe to localStorage.
     * @param {string} title - The title of the recipe.
     * @param {string} content - The full Markdown content of the recipe.
     * @returns {Object} The newly created recipe object with ID and timestamp.
     */
    saveRecipe(title, content) {
        const recipes = this.getSavedRecipes();
        const newRecipe = {
            id: Date.now(),
            title,
            content,
            date: new Date().toISOString()
        };
        recipes.unshift(newRecipe);
        localStorage.setItem(KEYS.SAVED_RECIPES, JSON.stringify(recipes));
        return newRecipe;
    },

    /**
     * Deletes a specific recipe from localStorage by its ID.
     * @param {number} id - The unique timestamp ID of the recipe to delete.
     */
    deleteRecipe(id) {
        const recipes = this.getSavedRecipes().filter(r => r.id !== id);
        localStorage.setItem(KEYS.SAVED_RECIPES, JSON.stringify(recipes));
    }
};
