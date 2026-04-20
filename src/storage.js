/**
 * storage.js - LocalStorage management for Bachelor Saviour V2
 */

const KEYS = {
    GEMINI_API_KEY: 'bs_v2_gemini_api_key',
    SAVED_RECIPES: 'bs_v2_saved_recipes'
};

export const Storage = {
    getGeminiKey() {
        return localStorage.getItem(KEYS.GEMINI_API_KEY) || '';
    },

    setGeminiKey(key) {
        localStorage.setItem(KEYS.GEMINI_API_KEY, key);
    },

    clearGeminiKey() {
        localStorage.removeItem(KEYS.GEMINI_API_KEY);
    },

    getSavedRecipes() {
        const raw = localStorage.getItem(KEYS.SAVED_RECIPES);
        return raw ? JSON.parse(raw) : [];
    },

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

    deleteRecipe(id) {
        const recipes = this.getSavedRecipes().filter(r => r.id !== id);
        localStorage.setItem(KEYS.SAVED_RECIPES, JSON.stringify(recipes));
    }
};
