import { Storage } from './storage.js';
import { GeminiAI } from './gemini.js';

const GROQ_KEY = 'bs_v2_groq_key';

// --- State ---
/** @type {string} Currently selected cuisine filter */
let selectedCuisine = 'Any';
/** @type {string} The full markdown text of the currently displayed recipe */
let currentRecipe = '';
/** @type {number} Zero-indexed current page number in the recipe book */
let currentPage = 0;
/** @type {number} Total number of pages for the current recipe */
let totalPages = 1;

// --- DOM Elements ---
const cookBtn = document.getElementById('cookButton');
const ingredientsContainer = document.getElementById('ingredientsContainer');
const restrictionsContainer = document.getElementById('restrictionsContainer');
const bookContainer = document.getElementById('bookContainer');
const recipeBook = document.getElementById('recipeBook');
const recipeContent = document.getElementById('recipeContent');
const storyLoader = document.getElementById('storyLoader');
const themeToggle = document.getElementById('themeToggle');

// Modals
const apiKeyModal = document.getElementById('apiKeyModal');
const manualAddModal = document.getElementById('manualAddModal');
const cuisineModal = document.getElementById('cuisineModal');
const savedModal = document.getElementById('savedModal');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    applyTheme();
});

/**
 * Binds all static event listeners to DOM elements upon initialization.
 */
function setupEventListeners() {
    // Theme
    themeToggle.addEventListener('click', toggleTheme);

    // Profile & API Key (Groq)
    document.getElementById('profileBtn').onclick = () => {
        const currentKey = localStorage.getItem(GROQ_KEY) || '';
        if (currentKey) document.getElementById('apiKeyInput').value = currentKey;
        toggleModal('apiKeyModal', false);
    };

    // API Key Actions
    document.getElementById('closeApiKeyBtn').onclick = () => toggleModal('apiKeyModal', true);
    document.getElementById('saveApiKeyBtn').onclick = () => {
        const key = document.getElementById('apiKeyInput').value.trim();
        if (key) {
            localStorage.setItem(GROQ_KEY, key);
            toggleModal('apiKeyModal', true);
            alert('Groq API Key saved! Cook Magic is ready.');
        } else {
            alert('Please enter a key.');
        }
    };

    // Manual Add Modal
    document.getElementById('addManualBtn').onclick = () => toggleModal('manualAddModal', false);
    document.getElementById('closeManualBtn').onclick = () => toggleModal('manualAddModal', true);
    document.getElementById('saveManualBtn').onclick = handleManualSave;

    // View Saved
    document.getElementById('viewSavedBtn').onclick = () => {
        renderSavedList();
        toggleModal('savedModal', false);
    };
    document.getElementById('closeSavedModalBtn').onclick = () => toggleModal('savedModal', true);

    // Add Dynamic Inputs
    document.getElementById('addIngredientBtn').onclick = () => addDynamicRow(ingredientsContainer, 'Ingredient', 'ingredient-input');
    document.getElementById('addRestrictionBtn').onclick = () => addDynamicRow(restrictionsContainer, 'Filter', 'restriction-input');

    // Clear All (matching your screenshot logic)
    document.getElementById('clearIngredientsBtn').onclick = () => {
        ingredientsContainer.innerHTML = `
            <div class="input-wrapper has-badge">
                <input type="text" class="ingredient-input" placeholder="Ingredient (e.g., Chicken)">
                <button id="cuisineBadge" class="cuisine-badge">🌍 Any</button>
            </div>
        `;
        document.getElementById('cuisineBadge').onclick = () => toggleModal('cuisineModal', false);
    };

    document.getElementById('cuisineBadge').onclick = () => toggleModal('cuisineModal', false);
    document.getElementById('closeModalBtn').onclick = () => toggleModal('cuisineModal', true);
    
    document.querySelectorAll('.cuisine-tag').forEach(tag => {
        tag.onclick = () => {
            document.querySelectorAll('.cuisine-tag').forEach(t => t.classList.remove('active'));
            tag.classList.add('active');
            selectedCuisine = tag.dataset.cuisine;
            document.getElementById('cuisineBadge').textContent = tag.textContent;
            toggleModal('cuisineModal', true);
        };
    });

    // Cooking
    cookBtn.onclick = handleCooking;

    // Pagination
    document.getElementById('prevPageBtn').onclick = () => paginate(-1);
    document.getElementById('nextPageBtn').onclick = () => paginate(1);
    document.getElementById('saveRecipeBtn').onclick = saveRecipe;
    document.getElementById('shareRecipeBtn').onclick = shareRecipe;
}

// --- Logic ---

/**
 * Toggles the visibility of a modal element.
 * @param {string} id - The DOM ID of the modal element.
 * @param {boolean} hide - If true, adds the 'hidden' class; otherwise removes it.
 */
function toggleModal(id, hide) {
    const el = document.getElementById(id);
    if (hide) el.classList.add('hidden');
    else el.classList.remove('hidden');
}

/**
 * Toggles the light/dark mode theme and saves the preference to localStorage.
 */
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
}

/**
 * Applies the saved theme preference from localStorage on page load.
 */
function applyTheme() {
    if (localStorage.getItem('theme') === 'light') {
        document.body.classList.add('light-mode');
    }
}

/**
 * Main handler for generating a recipe. Reads user inputs, initiates the AI
 * generation process, updates UI states, and handles errors or quotas.
 * @async
 */
async function handleCooking() {
    if (cookBtn.disabled) return;
    
    const ingredients = getInputs('.ingredient-input');
    if (ingredients.length === 0) return alert('Add some ingredients first!');

    const apiKey = localStorage.getItem(GROQ_KEY) || Storage.getGeminiKey();
    if (!apiKey) {
        toggleModal('apiKeyModal', false);
        return;
    }

    const filters = getInputs('.restriction-input').join(', ') || 'None';
    
    // UI Setup
    cookBtn.disabled = true;
    cookBtn.textContent = 'Cooking...';
    recipeContent.innerHTML = '';
    recipeContent.style.transform = 'translateX(0)';
    bookContainer.classList.remove('hidden');
    recipeBook.classList.remove('open');
    recipeBook.classList.add('closed');
    startStoryLoader();
    
    await new Promise(resolve => setTimeout(resolve, 150));
    recipeBook.classList.remove('closed');
    recipeBook.classList.add('open');

    const prompt = `Act as a master chef. Create a creative recipe using: ${ingredients.join(', ')}. Cuisine: ${selectedCuisine}. Filters: ${filters}. Markdown format with emojis.`;

    try {
        const text = await GeminiAI.generateRecipe(prompt, apiKey);
        currentRecipe = text;
        renderRecipe(text);
    } catch (err) {
        const isQuota = err.message.includes('quota') || err.message.includes('429') || err.message.includes('⏳');
        recipeContent.innerHTML = `
            <div style="padding: 1rem; line-height: 1.5; font-size: 0.9rem;">
                <h3 style="color: #ef4444; margin-bottom: 0.75rem;">Chef's Alert</h3>
                <p style="color: #333; margin-bottom: 1rem;">${err.message}</p>
                <button id="retryCookBtn" style="width:100%; padding: 0.7rem; background: #14b8a6; border: none; color: white; border-radius: 8px; cursor: pointer; font-weight: 600; margin-bottom: 0.5rem;">
                    ${isQuota ? 'Retry in 60s' : 'Retry Cooking'}
                </button>
                <button id="resetKeyInError" style="width:100%; padding: 0.7rem; background: #e2e8f0; border: none; color: #333; border-radius: 8px; cursor: pointer;">Change API Key</button>
            </div>
        `;

        const retryBtn = document.getElementById('retryCookBtn');
        if (isQuota) {
            retryBtn.disabled = true;
            retryBtn.style.opacity = '0.5';
            let t = 60;
            const iv = setInterval(() => {
                t--;
                retryBtn.textContent = `Retry in ${t}s`;
                if (t <= 0) {
                    clearInterval(iv);
                    retryBtn.disabled = false;
                    retryBtn.style.opacity = '1';
                    retryBtn.textContent = 'Retry Cooking';
                }
            }, 1000);
        }

        retryBtn.onclick = handleCooking;
        document.getElementById('resetKeyInError').onclick = () => {
            Storage.clearGeminiKey();
            localStorage.removeItem('bs_v2_working_model');
            toggleModal('apiKeyModal', false);
        };
    } finally {
        stopStoryLoader();
        cookBtn.disabled = false;
        cookBtn.textContent = 'Cook Magic 😋';
    }
}

/**
 * Extracts and trims values from all input elements matching a selector.
 * @param {string} selector - The CSS selector for the input elements.
 * @returns {string[]} An array of non-empty input values.
 */
function getInputs(selector) {
    return Array.from(document.querySelectorAll(selector)).map(i => i.value.trim()).filter(v => v);
}

/**
 * Dynamically adds a new input row for ingredients or restrictions.
 * @param {HTMLElement} container - The container to append the new row to.
 * @param {string} placeholder - The placeholder text for the input.
 * @param {string} className - The CSS class for the input element.
 */
function addDynamicRow(container, placeholder, className) {
    const div = document.createElement('div');
    div.className = 'input-wrapper has-remove';
    div.style.marginTop = '0.75rem';
    div.innerHTML = `
        <input type="text" class="${className}" placeholder="${placeholder}">
        <button class="remove-btn" style="position: absolute; right: 1rem; background: none; border: none; color: var(--red); cursor: pointer;">✖</button>
    `;
    div.querySelector('.remove-btn').onclick = () => div.remove();
    container.appendChild(div);
}

// --- Story Loader ---
/** @type {number|null} Interval ID for the story loading animation */
let _storyInterval = null;

/**
 * Starts the cycling emoji and text animation while generating a recipe.
 */
function startStoryLoader() {
    stopStoryLoader();
    const loader = document.getElementById('storyLoader');
    if (!loader) return;
    loader.classList.remove('hidden');
    const emojis = ['🥗', '🥘', '🍲', '🍳', '🥣', '🍛', '🫕', '🥧'];
    const texts = ['Mixing flavors...', 'Chopping veggies...', 'Sizzling pans...', 'Tasting the sauce...', 'Plating with love...', 'Consulting the chef...'];
    let i = 0;
    const emojiEl = document.getElementById('storyEmoji');
    const textEl = document.getElementById('storyText');
    _storyInterval = setInterval(() => {
        if (emojiEl) emojiEl.textContent = emojis[i % emojis.length];
        if (textEl) textEl.textContent = texts[i % texts.length];
        i++;
    }, 1200);
}

/**
 * Stops and hides the cycling emoji animation.
 */
function stopStoryLoader() {
    clearInterval(_storyInterval);
    const loader = document.getElementById('storyLoader');
    if (loader) loader.classList.add('hidden');
}

// --- Global pages store ---
/** @type {string[]} Array of HTML strings representing the pages of the recipe */
let recipePages = [];

/**
 * Parses markdown text, prepares the pagination, and renders the first page.
 * @param {string} text - The raw Markdown text of the recipe.
 */
function renderRecipe(text) {
    currentPage = 0;
    recipePages = buildRecipePages(text);

    // Show page 0
    recipeContent.innerHTML = recipePages[0] || '';
    wireCheckboxes();

    // Update left page title
    const titleMatch = text.match(/^#+\s*(.+)/m);
    const title = titleMatch ? titleMatch[1].replace(/[*_`#]/g, '').trim() : 'Secret Recipe';
    const leftPage = document.getElementById('leftPageContent');
    if (leftPage) {
        leftPage.innerHTML = `
            <div class="recipe-title-left">${title}</div>
            <p>A magical recipe<br>crafted just for you</p>
            <p style="font-size:1.8rem; margin-top:1rem;">🍽️</p>
        `;
    }

    updatePaginationUI();
}

/**
 * Attaches event listeners to checklist items so they stroke-through on click.
 */
function wireCheckboxes() {
    recipeContent.querySelectorAll('.check-item').forEach(item => {
        const cb = item.querySelector('input[type="checkbox"]');
        const label = item.querySelector('.check-label');
        if (!cb || !label) return;
        cb.onchange = () => {
            label.style.textDecoration = cb.checked ? 'line-through' : 'none';
            label.style.opacity = cb.checked ? '0.4' : '1';
        };
    });
}

/**
 * Parses the Markdown recipe and splits it into logical HTML pages (chunks).
 * @param {string} text - The raw Markdown text of the recipe.
 * @returns {string[]} Array of safe HTML strings, one for each page.
 */
function buildRecipePages(text) {
    if (!window.marked) return [`<p style="font-size:0.85rem;">${text}</p>`];
    if (!window.DOMPurify) {
        console.error('Security Alert: DOMPurify not loaded. Aborting render to prevent XSS.');
        return [`<p style="color:red; font-size:0.85rem;">Security error: Please reload the page.</p>`];
    }

    const raw = window.marked.parse(text);
    const safe = window.DOMPurify.sanitize(raw);

    const wrapper = document.createElement('div');
    wrapper.innerHTML = safe;

    // Extract li innerHTML items from a list element
    function extractItems(listEl) {
        return Array.from(listEl.querySelectorAll('li')).map(li => li.innerHTML);
    }

    const children = Array.from(wrapper.children);
    let recipeTitle = '';
    let ingredientItems = [];
    let stepItems = [];
    let mode = 'intro';

    children.forEach(el => {
        const tag = el.tagName?.toLowerCase();
        const txt = el.textContent?.toLowerCase() || '';

        if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
            const t = el.textContent.replace(/[#*_`]/g, '').trim();
            if (!recipeTitle && (tag === 'h1' || tag === 'h2')) { recipeTitle = t; return; }
            if (txt.includes('ingredient')) { mode = 'ingredients'; return; }
            if (txt.includes('instruction') || txt.includes('step') || txt.includes('direction') || txt.includes('method')) { mode = 'steps'; return; }
        }

        if (tag === 'ul' || tag === 'ol') {
            const items = extractItems(el);
            // ol (ordered) = steps, ul (unordered) = ingredients by default
            // But also: if the items are long sentences, they're likely steps
            const avgLen = items.reduce((s, i) => s + i.replace(/<[^>]+>/g,'').length, 0) / (items.length || 1);
            const looksLikeSteps = tag === 'ol' || avgLen > 60;

            if (mode === 'steps' || looksLikeSteps) {
                mode = 'steps';
                stepItems.push(...items);
            } else {
                ingredientItems.push(...items);
                mode = 'ingredients';
            }
        }
    });

    // Fallback: if nothing parsed, return one raw page
    if (!ingredientItems.length && !stepItems.length) {
        return [wrapper.innerHTML];
    }

    const ITEMS_PER_PAGE = 5;
    const pages = [];

    // Helper: build a page HTML string
    function makePage(heading, emoji, items) {
        const lis = items.map(inner => `
            <li class="check-item">
                <label>
                    <input type="checkbox">
                    <span class="check-label">${inner}</span>
                </label>
            </li>`).join('');
        return `
            <p class="page-section-title">${emoji} ${heading}</p>
            <ul style="list-style:none; padding:0; margin:0;">${lis}</ul>
        `;
    }

    // Chunk ingredients across pages (short items → more per page)
    const INGR_PER_PAGE = 7;
    const ingredTotal = Math.ceil(ingredientItems.length / INGR_PER_PAGE);
    for (let i = 0; i < ingredientItems.length; i += INGR_PER_PAGE) {
        const chunk = ingredientItems.slice(i, i + INGR_PER_PAGE);
        const pn = Math.floor(i / INGR_PER_PAGE) + 1;
        const label = ingredTotal > 1 ? `Ingredients (${pn}/${ingredTotal})` : 'Ingredients';
        pages.push(makePage(label, '🛒', chunk));
    }

    // Chunk steps across pages (long items → fewer per page)
    const STEPS_PER_PAGE = 3;
    const stepsTotal = Math.ceil(stepItems.length / STEPS_PER_PAGE);
    for (let i = 0; i < stepItems.length; i += STEPS_PER_PAGE) {
        const chunk = stepItems.slice(i, i + STEPS_PER_PAGE);
        const pn = Math.floor(i / STEPS_PER_PAGE) + 1;
        const label = stepsTotal > 1 ? `Steps (${pn}/${stepsTotal})` : 'Steps';
        pages.push(makePage(label, '👨‍🍳', chunk));
    }

    return pages;
}

/**
 * Updates the visibility of pagination controls and the page number indicator.
 */
function updatePaginationUI() {
    totalPages = recipePages.length || 1;

    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const saveBtn = document.getElementById('saveRecipeBtn');
    const shareBtn = document.getElementById('shareRecipeBtn');
    const indicator = document.getElementById('pageIndicator');

    if (prevBtn) prevBtn.classList.toggle('hidden', currentPage <= 0);
    if (indicator) indicator.textContent = `${currentPage + 1} / ${totalPages}`;

    if (currentPage < totalPages - 1) {
        if (nextBtn) nextBtn.classList.remove('hidden');
        if (saveBtn) saveBtn.classList.add('hidden');
        if (shareBtn) shareBtn.classList.add('hidden');
    } else {
        if (nextBtn) nextBtn.classList.add('hidden');
        if (saveBtn) saveBtn.classList.remove('hidden');
        if (shareBtn) shareBtn.classList.remove('hidden');
    }
}

/** @type {boolean} State flag indicating if a 3D page flip animation is active */
let _flipping = false;

/**
 * Animates a 3D page turn to navigate through the recipe book.
 * @param {number} dir - Direction to turn (-1 for previous, 1 for next).
 */
function paginate(dir) {
    if (_flipping) return;
    totalPages = recipePages.length || 1;
    const next = Math.max(0, Math.min(totalPages - 1, currentPage + dir));
    if (next === currentPage) return;

    _flipping = true;

    // Flip out
    recipeContent.classList.add('flip-out');
    setTimeout(() => {
        currentPage = next;
        recipeContent.innerHTML = recipePages[currentPage] || '';
        wireCheckboxes();
        recipeContent.classList.remove('flip-out');
        recipeContent.classList.add('flip-in');

        setTimeout(() => {
            recipeContent.classList.remove('flip-in');
            _flipping = false;
            updatePaginationUI();
        }, 200);
    }, 200);
}


/**
 * Saves the current recipe to localStorage via the Storage utility.
 */
function saveRecipe() {
    if (!currentRecipe) return;
    Storage.saveRecipe(getTitle(currentRecipe), currentRecipe);
    alert('Recipe saved!');
}

/**
 * Handles the manual saving of a user-entered recipe from the modal.
 */
function handleManualSave() {
    const title = document.getElementById('manualTitle').value.trim();
    const content = document.getElementById('manualContent').value.trim();
    if (!title || !content) return alert('Title and Content required.');
    Storage.saveRecipe(title, content);
    alert('Recipe added manually!');
    toggleModal('manualAddModal', true);
}

/**
 * Shares the current recipe using the Web Share API or falls back to clipboard.
 */
function shareRecipe() {
    const text = `Bachelor Saviour Recipe:\n\n${currentRecipe}`;
    if (navigator.share) navigator.share({ title: 'New Recipe', text }).catch(() => copyToClip(text));
    else copyToClip(text);
}

/**
 * Copies text to the user's clipboard.
 * @param {string} text - The text to copy.
 */
function copyToClip(text) {
    navigator.clipboard.writeText(text).then(() => alert('Copied!'));
}

/**
 * Extracts a recipe title from the first header line of a markdown string.
 * @param {string} text - The raw Markdown text.
 * @returns {string} The formatted recipe title.
 */
function getTitle(text) {
    return text.split('\n')[0].replace(/[#*]/g, '').trim() || 'Magical Recipe';
}

/**
 * Renders the list of saved recipes in the Saved Recipes modal.
 */
function renderSavedList() {
    const list = document.getElementById('savedRecipesList');
    const recipes = Storage.getSavedRecipes();
    list.innerHTML = recipes.length ? '' : '<p style="text-align: center; color: var(--text-light);">No recipes saved.</p>';
    recipes.forEach(r => {
        const div = document.createElement('div');
        div.style.cssText = 'padding: 1rem; border: 1px solid var(--border); border-radius: 12px; margin-bottom: 0.75rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center; background: var(--bg-color);';
        div.innerHTML = `<span>${r.title}</span><button class="del-btn" style="background:none; border:none; cursor:pointer;">🗑️</button>`;
        div.onclick = (e) => {
            if (e.target.classList.contains('del-btn')) {
                if (confirm('Delete?')) { Storage.deleteRecipe(r.id); renderSavedList(); }
            } else {
                currentRecipe = r.content;
                renderRecipe(r.content);
                bookContainer.classList.remove('hidden');
                recipeBook.classList.add('open');
                toggleModal('savedModal', true);
            }
        };
        list.appendChild(div);
    });
}
