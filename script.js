/**
 * Bachelor Savior - Frontend Logic
 * Implements secure JWT-based authentication, fetchWithAuth helper,
 * and UI state management (Theme, Modals, Profile Menu, Recipe CRUD).
 */

const SUPABASE_URL = 'https://srwwiytlwqcgzcvkzmck.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_fmHb6GceyN95eDzRMwKBKA_qFJ1WbC7'; // Updated to new standard publishable key
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3001' 
    : 'https://bachelor-savior-api.onrender.com';

let currentUser = null;
let currentRecipeText = "";
let activeViewRecipe = null;
let isSharingMode = false;
let selectedForSharing = new Set();
let currentPage = 0;
let totalPages = 1;
let selectedCuisine = 'Any';

// --- Security Helpers ---
function sanitizeError(error) {
    const msg = error.message || String(error);
    if (msg.includes('fetch') || msg.includes('NetworkError')) return 'Connection to kitchen lost. Check your internet.';
    if (msg.includes('401')) return 'Session expired. Please login again.';
    if (msg.includes('403')) return 'Permission denied. Check if the server is allowed to speak to the AI.';
    if (msg.includes('429')) return 'Too many recipe requests. Slow down!';
    
    // Show exactly what the server said
    if (msg.length > 0) return `Backend Error: ${msg}`;
    
    return 'Something went wrong. Please try again later.';
}

/**
 * Enhanced fetch wrapper that handles:
 * 1. Automatic inclusion of Access Token (Bearer)
 * 2. Automatic Refresh Token logic on 401
 * 3. Graceful session expiry handling
 */
/**
 * Fetch wrapper for AI generation (Legacy backend proxy)
 */
async function fetchWithAuth(url, options = {}) {
    if (!options.headers) options.headers = {};
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        options.headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    return fetch(API_BASE + url, options);
}

// --- UI Elements ---
const themeToggle = document.getElementById('themeToggle');
const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');
const profileBtn = document.getElementById('profileBtn');
const profileDropdown = document.getElementById('profileDropdown');

// Use specific IDs for dropdown containers
const dropdownAuth = document.getElementById('dropdownAuth');
const dropdownUser = document.getElementById('dropdownUser');
const dropdownEmailSpan = document.getElementById('dropdownEmailSpan');

// --- Initialization ---

// Theme check
if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add('light-mode');
}
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
});

// Profile Toggle
if (profileBtn) {
    profileBtn.onclick = (e) => {
        e.stopPropagation();
        if (profileDropdown) {
            const isHidden = profileDropdown.style.display === 'none';
            profileDropdown.style.display = isHidden ? 'flex' : 'none';
        }
    };
}

// Close dropdown on click outside
document.addEventListener('click', (e) => {
    if (profileDropdown && !profileDropdown.contains(e.target) && e.target !== profileBtn) {
        profileDropdown.style.display = 'none';
    }
});

// --- Auth Logic ---

async function checkAuth() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) {
            currentUser = user;
            updateAuthUI();
            loadSavedRecipes();
            return true;
        }
    } catch (e) { console.error('Auth check failed', e); }
    currentUser = null;
    updateAuthUI();
    return false;
}

function updateAuthUI() {
    if (currentUser) {
        if (dropdownAuth) dropdownAuth.style.display = 'none';
        if (dropdownUser) dropdownUser.style.display = 'flex';
        if (dropdownEmailSpan) dropdownEmailSpan.textContent = currentUser.email;
    } else {
        if (dropdownAuth) dropdownAuth.style.display = 'flex';
        if (dropdownUser) dropdownUser.style.display = 'none';
        if (dropdownEmailSpan) dropdownEmailSpan.textContent = '';
    }
}

async function login(email, password) {
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        currentUser = data.user;
        updateAuthUI();
        if (loginModal) loginModal.classList.add('hidden');
        if (profileDropdown) profileDropdown.style.display = 'none';
        loadSavedRecipes();
        return true;
    } catch (e) { alert(e.message || 'Login failed'); }
    return false;
}

async function register(email, password) {
    try {
        const { data, error } = await supabaseClient.auth.signUp({ email, password });
        if (error) throw error;
        
        alert('Registration successful! Please check your email to verify your account.');
        if (registerModal) registerModal.classList.add('hidden');
        return true;
    } catch (e) { alert(e.message || 'Registration failed'); }
    return false;
}

async function logout() {
    try {
        await supabaseClient.auth.signOut();
    } catch (e) { console.error('Logout failed', e); }
    currentUser = null;
    updateAuthUI();
    if (profileDropdown) profileDropdown.style.display = 'none';
    renderSavedList();
}

// --- UI Helpers ---

async function handleShare(title, text) {
    if (navigator.share) {
        try {
            await navigator.share({ title, text });
        } catch (err) {
            if (err.name !== 'AbortError') copyToClipboard(text);
        }
    } else {
        copyToClipboard(text);
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert("Copied to clipboard!");
    }).catch(err => {
        alert("Failed to copy: " + err);
    });
}

function getRecipeTitle(recipeText) {
    const lines = recipeText.split('\n');
    for (let line of lines) {
        if (line.trim().match(/^#+\s/)) {
            return line.replace(/^#+\s*/, '').replace(/\*/g, '').trim();
        }
    }
    return "Magical Recipe";
}

function updateModalTitle() {
    const h2 = document.querySelector('#savedModal h2');
    const shareBtn = document.getElementById('shareAllRecipesBtn');
    const cancelBtn = document.getElementById('cancelShareModeBtn');
    
    if (h2) {
        if (isSharingMode) {
            h2.textContent = "Select Recipes 📤";
            h2.style.color = "#14b8a6";
            if(shareBtn) shareBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`;
            if(cancelBtn) cancelBtn.style.visibility = 'visible';
        } else {
            h2.textContent = "Your Saved Magic";
            h2.style.color = "";
            if(shareBtn) shareBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>`;
            if(cancelBtn) cancelBtn.style.visibility = 'hidden';
        }
    }
}

// --- DOM Event Listeners ---

window.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});

document.querySelectorAll('.close-modal-x').forEach(btn => {
    btn.onclick = () => {
        if (loginModal) loginModal.classList.add('hidden');
        if (registerModal) registerModal.classList.add('hidden');
    }
});

// Cuisine Selector Toggle
const cuisineBadge = document.getElementById('cuisineBadge');
const cuisineModal = document.getElementById('cuisineModal');
const closeModalBtn = document.getElementById('closeModalBtn');

if (cuisineBadge) {
    cuisineBadge.onclick = () => {
        if (cuisineModal) cuisineModal.classList.remove('hidden');
    };
}

if (closeModalBtn) {
    closeModalBtn.onclick = () => {
        if (cuisineModal) cuisineModal.classList.add('hidden');
    };
}

// Cuisine Tag selection
document.querySelectorAll('.cuisine-tag').forEach(tag => {
    tag.onclick = () => {
        // Remove active from all
        document.querySelectorAll('.cuisine-tag').forEach(t => t.classList.remove('active'));
        // Add to clicked
        tag.classList.add('active');
        // Update selection
        selectedCuisine = tag.getAttribute('data-cuisine');
        // Update badge
        if (cuisineBadge) cuisineBadge.textContent = tag.textContent;
        // Auto-close
        if (cuisineModal) cuisineModal.classList.add('hidden');
    };
});

// Use IDs that match index.html
const lBtn = document.getElementById('loginBtn');
const rBtn = document.getElementById('registerBtn');
const loBtn = document.getElementById('logoutBtn');

if (lBtn) lBtn.onclick = () => { if(loginModal) loginModal.classList.remove('hidden'); };
if (rBtn) rBtn.onclick = () => { if(registerModal) registerModal.classList.remove('hidden'); };
if (loBtn) loBtn.onclick = logout;

const sTr = document.getElementById('switchToRegister');
const sTl = document.getElementById('switchToLogin');
if(sTr) sTr.onclick = (e) => { e.preventDefault(); loginModal.classList.add('hidden'); registerModal.classList.remove('hidden'); };
if(sTl) sTl.onclick = (e) => { e.preventDefault(); registerModal.classList.add('hidden'); loginModal.classList.remove('hidden'); };

const slBtn = document.getElementById('submitLoginBtn');
if(slBtn) slBtn.onclick = () => {
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPassword').value;
    if (email && pass) login(email, pass);
};

const srBtn = document.getElementById('submitRegisterBtn');
if(srBtn) srBtn.onclick = () => {
    const email = document.getElementById('registerEmail').value;
    const pass = document.getElementById('registerPassword').value;
    if (email && pass) register(email, pass);
};

// --- Recipe Logic ---

let savedRecipes = [];

async function loadSavedRecipes() {
    if (!currentUser) return;
    try {
        const { data, error } = await supabaseClient
            .from('recipes')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        savedRecipes = data;
        renderSavedList();
    } catch (e) { console.error('Failed to load recipes', e); }
}

function renderSavedList() {
    const list = document.getElementById('savedRecipesList');
    if (!list) return;
    list.innerHTML = '';
    
    if (!currentUser) {
        list.innerHTML = `<div style="text-align: center; padding: 2rem 1rem; color: var(--text-light);"><p>Please login to see your saved recipes.</p></div>`;
        return;
    }

    if (savedRecipes.length === 0) {
        list.innerHTML = `<div style="text-align: center; padding: 2rem 1rem; color: var(--text-light);"><div style="font-size: 3rem; margin-bottom: 1rem;">🫙</div><p>Your recipe book is empty!<br>Go cook some magic to fill it up.</p></div>`;
        return;
    }
    
    savedRecipes.forEach((recipe, index) => {
        const title = recipe.title;
        const itemContainer = document.createElement('div');
        itemContainer.style.position = 'relative';
        itemContainer.style.width = '100%';
        
        const btn = document.createElement('button');
        btn.className = 'saved-recipe-item';
        btn.style.width = '100%';
        btn.style.paddingRight = '3rem';
        
        if (isSharingMode && selectedForSharing.has(index)) {
            btn.classList.add('selected-for-share');
        }
        
        btn.textContent = title;
        btn.addEventListener('click', () => {
            if (isSharingMode) {
                if (selectedForSharing.has(index)) {
                    selectedForSharing.delete(index);
                    btn.classList.remove('selected-for-share');
                } else {
                    selectedForSharing.add(index);
                    btn.classList.add('selected-for-share');
                }
            } else {
                const sModal = document.getElementById('savedModal');
                if(sModal) sModal.classList.add('hidden');
                viewSpecificRecipe(recipe.content);
            }
        });
        
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-recipe-btn';
        editBtn.innerHTML = '✏️';
        editBtn.title = 'Edit Recipe';
        editBtn.onclick = (e) => {
            e.stopPropagation();
            editingRecipeId = recipe.id;
            if (customRecipeTitle) customRecipeTitle.value = recipe.title;
            if (customRecipeContent) customRecipeContent.value = recipe.content;
            const h2 = addRecipeModal.querySelector('h2');
            if (h2) h2.textContent = 'Edit Your Recipe';
            if (saveCustomRecipeBtn) saveCustomRecipeBtn.textContent = 'Update Recipe';
            if (addRecipeModal) addRecipeModal.classList.remove('hidden');
            const sModal = document.getElementById('savedModal');
            if(sModal) sModal.classList.add('hidden');
        };

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-recipe-btn';
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.onclick = async (e) => {
            e.stopPropagation();
            if(confirm(`Delete "${title}"?`)) {
                try {
                    const { error } = await supabaseClient
                        .from('recipes')
                        .delete()
                        .eq('id', recipe.id);
                    if (error) throw error;
                    loadSavedRecipes();
                } catch (err) { alert(err.message || 'Delete failed'); }
            }
        };
        
        itemContainer.appendChild(btn);
        if (!isSharingMode) {
            itemContainer.appendChild(editBtn);
            itemContainer.appendChild(deleteBtn);
        }
        list.appendChild(itemContainer);
    });
}

function formatAndRenderRecipe(recipeText, container) {
    if(!container) return;
    if (typeof marked === 'undefined') { container.textContent = recipeText; return; }
    
    const rawHtml = marked.parse(recipeText);
    container.innerHTML = typeof DOMPurify !== 'undefined'
        ? DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } })
        : rawHtml;
    
    // Inject checklist checkboxes
    container.querySelectorAll('ul').forEach(ul => {
        ul.style.listStyleType = 'none';
        ul.style.paddingLeft = '0';
        ul.querySelectorAll('li').forEach(li => {
            const text = li.innerHTML;
            li.innerHTML = `<label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer; margin-bottom: 0.5rem;"><input type="checkbox" style="margin-top: 4px; width: 1.4rem; height: 1.4rem; accent-color: #14b8a6; flex-shrink: 0; cursor: pointer;"> <span style="line-height: 1.5;">${text}</span></label>`;
            const cb = li.querySelector('input');
            const span = li.querySelector('span');
            cb.addEventListener('change', (e) => {
                span.style.textDecoration = e.target.checked ? 'line-through' : 'none';
                span.style.opacity = e.target.checked ? '0.5' : '1';
            });
        });
    });
}

function viewSpecificRecipe(recipe) {
    currentRecipeText = ""; 
    activeViewRecipe = recipe;
    const recipeContent = document.getElementById('recipeContent');
    formatAndRenderRecipe(recipe, recipeContent);
    
    const bContainer = document.getElementById('bookContainer');
    const rBook = document.getElementById('recipeBook');
    if(bContainer) bContainer.classList.remove('hidden');
    if(rBook) { rBook.classList.remove('closed'); rBook.classList.add('open'); }
    
    setTimeout(() => {
        currentPage = 0;
        updatePagination(recipeContent);
        if(recipeContent) recipeContent.style.transform = `translateX(0px)`;
    }, 150);
}

function updatePagination(recipeContent) {
    if(!recipeContent) return;
    const scrollWidth = recipeContent.scrollWidth;
    totalPages = Math.max(1, Math.ceil(scrollWidth / 280));
    
    const pb = document.getElementById('prevPageBtn');
    const nb = document.getElementById('nextPageBtn');
    const sb = document.getElementById('saveRecipeBtn');
    const shb = document.getElementById('shareRecipeBtn');
    
    if(pb) pb.classList.toggle('hidden', currentPage <= 0);
    
    if (currentPage < totalPages - 1) {
        if(nb) nb.classList.remove('hidden');
        if(shb) shb.classList.add('hidden');
        if(sb) sb.classList.add('hidden');
    } else {
        if(nb) nb.classList.add('hidden');
        if(shb) shb.classList.remove('hidden');
        
        const isActuallySaved = savedRecipes.some(r => r.content === activeViewRecipe);
        if(sb) {
            sb.classList.toggle('hidden', !activeViewRecipe || isActuallySaved);
            sb.onclick = saveCurrentRecipe;
        }
    }
}

async function saveCurrentRecipe() {
    if (!currentUser) {
        alert("Please login to save recipes.");
        loginModal.classList.remove('hidden');
        return;
    }
    
    const title = getRecipeTitle(activeViewRecipe);
    try {
        const { error } = await supabaseClient
            .from('recipes')
            .insert({
                user_id: currentUser.id,
                title: title,
                content: activeViewRecipe
            });
        
        if (error) throw error;
        
        alert("Recipe saved!");
        loadSavedRecipes();
        updatePagination(document.getElementById('recipeContent'));
    } catch (err) { alert(err.message || "Failed to save recipe"); }
}

// Additional Event Handlers
const saBtn = document.getElementById('shareAllRecipesBtn');
if(saBtn) saBtn.onclick = () => {
    if (savedRecipes.length === 0) return;
    if (!isSharingMode) {
        isSharingMode = true;
        selectedForSharing.clear();
        updateModalTitle();
        renderSavedList();
    } else {
        if (selectedForSharing.size === 0) { alert("Select at least one recipe."); return; }
        const text = Array.from(selectedForSharing).sort((a,b) => a-b)
            .map((idx, i) => `Recipe ${i+1}:\n${savedRecipes[idx].content}`).join('\n\n---\n\n');
        handleShare("Shared Recipes", text);
        isSharingMode = false;
        updateModalTitle();
        renderSavedList();
    }
};

const cookBtn = document.getElementById('cookButton');
if(cookBtn) cookBtn.onclick = async () => {
    const ingredients = Array.from(document.querySelectorAll('.ingredient-input'))
        .map(i => i.value.trim()).filter(v => v);
    if(ingredients.length === 0) { alert("Add ingredients!"); return; }
    
    const filters = Array.from(document.querySelectorAll('.restriction-input'))
        .map(i => i.value.trim()).filter(v => v).join(', ') || 'None';
        
    const cuisine = typeof selectedCuisine !== 'undefined' ? selectedCuisine : 'Any';
    const prompt = `Act as a master chef. Create a recipe using: ${ingredients.join(', ')}. Style: ${cuisine}. Filters: ${filters}. Markdown format. Brief.`;
    
    cookBtn.disabled = true;
    cookBtn.textContent = "Cooking...";
    
    const recipeContent = document.getElementById('recipeContent');
    const bookContainer = document.getElementById('bookContainer');
    const recipeBook = document.getElementById('recipeBook');
    
    if(recipeContent) { recipeContent.innerHTML = ''; recipeContent.style.transform = 'translateX(0)'; }
    if(bookContainer) bookContainer.classList.remove('hidden');
    if(recipeBook) { recipeBook.classList.remove('open'); recipeBook.classList.add('closed'); }
    
    startStoryLoader();
    setTimeout(() => { if(recipeBook) { recipeBook.classList.remove('closed'); recipeBook.classList.add('open'); } }, 100);

    try {
        const response = await supabaseClient.functions.invoke('generate-recipe', {
            body: { prompt }
        });
        
        let { data, error } = response;
        
        if (error) {
            // If function returned a 4xx/5xx, check if we got a JSON error body
            // Some versions of the JS SDK put the JSON response in 'data' even if 'error' is set
            if (data && data.error) {
                throw new Error(data.error);
            }
            // Check if error message is just the generic SDK one, and try to get better context
            let msg = error.message || "Unknown error";
            throw new Error(msg);
        }
        
        if (!data || !data.candidates || !data.candidates[0]) {
            throw new Error("AI returned empty results. Try a different prompt.");
        }
        
        const text = data.candidates[0].content.parts[0].text;
        currentRecipeText = text;
        activeViewRecipe = text;
        
        stopStoryLoader();
        formatAndRenderRecipe(text, recipeContent);
        setTimeout(() => updatePagination(recipeContent), 150);
    } catch(err) {
        stopStoryLoader();
        console.error("Function Error Detail:", err);
        if(recipeContent) {
            recipeContent.innerHTML = `<h2>Error</h2><p>${err.message}</p>`;
        }
    } finally {
         cookBtn.disabled = false;
         cookBtn.textContent = "Cook Magic 😋";
    }
};

// Generic close modal clicking outside
window.onclick = (e) => {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(m => { if(e.target === m) m.classList.add('hidden'); });
};

// --- Story Loader Helpers ---
let storyInterval;
function startStoryLoader() {
    const loader = document.getElementById('storyLoader');
    if(!loader) return;
    loader.classList.remove('hidden');
    const emojis = ['🥗', '🥘', '🍲', '🍳', '🥣', '🍛'];
    const texts = ["Mixing flavors...", "Chopping veggies...", "Sizzling pans...", "Tasting sauces..."];
    let i = 0;
    storyInterval = setInterval(() => {
        const e = document.getElementById('storyEmoji');
        const t = document.getElementById('storyText');
        if(e) e.textContent = emojis[i % emojis.length];
        if(t) t.textContent = texts[i % texts.length];
        i++;
    }, 1500);
}
function stopStoryLoader() {
    clearInterval(storyInterval);
    const loader = document.getElementById('storyLoader');
    if(loader) loader.classList.add('hidden');
}

const addRecipeModal = document.getElementById('addRecipeModal');
const addCustomRecipeBtn = document.getElementById('addCustomRecipeBtn');
const cancelAddRecipeBtn = document.getElementById('cancelAddRecipeBtn');
const saveCustomRecipeBtn = document.getElementById('saveCustomRecipeBtn');
const customRecipeTitle = document.getElementById('customRecipeTitle');
const customRecipeContent = document.getElementById('customRecipeContent');

let editingRecipeId = null;

// Manual Add Logic
if (addCustomRecipeBtn) {
    addCustomRecipeBtn.onclick = () => {
        if (!currentUser) { loginModal.classList.remove('hidden'); return; }
        editingRecipeId = null;
        if (customRecipeTitle) customRecipeTitle.value = '';
        if (customRecipeContent) customRecipeContent.value = '';
        const h2 = addRecipeModal.querySelector('h2');
        if (h2) h2.textContent = 'Add Your Recipe';
        if (saveCustomRecipeBtn) saveCustomRecipeBtn.textContent = 'Save Recipe';
        addRecipeModal.classList.remove('hidden');
    };
}

if (cancelAddRecipeBtn) {
    cancelAddRecipeBtn.onclick = () => {
        addRecipeModal.classList.add('hidden');
    };
}

if (saveCustomRecipeBtn) {
    saveCustomRecipeBtn.onclick = async () => {
        const title = customRecipeTitle.value.trim();
        const content = customRecipeContent.value.trim();
        if (!title || !content) { alert("Please fill in both title and content."); return; }

        try {
            saveCustomRecipeBtn.disabled = true;
            saveCustomRecipeBtn.textContent = editingRecipeId ? "Updating..." : "Saving...";
            
            let result;
            if (editingRecipeId) {
                result = await supabaseClient
                    .from('recipes')
                    .update({ title, content })
                    .eq('id', editingRecipeId);
            } else {
                result = await supabaseClient
                    .from('recipes')
                    .insert({ user_id: currentUser.id, title, content });
            }

            if (result.error) throw result.error;

            addRecipeModal.classList.add('hidden');
            loadSavedRecipes();
        } catch (err) { alert(err.message || "Failed to save recipe"); }
        finally {
            saveCustomRecipeBtn.disabled = false;
            saveCustomRecipeBtn.textContent = "Save Recipe";
        }
    };
}

// Add Ingredient/Restriction Row logic
const addIBtn = document.getElementById('addIngredientBtn');
if(addIBtn) addIBtn.onclick = () => {
    const container = document.getElementById('ingredientsContainer');
    const div = document.createElement('div');
    div.className = 'input-wrapper has-remove';
    div.style.marginTop = '0.75rem';
    div.innerHTML = `<input type="text" class="ingredient-input" placeholder="Ingredient"><button class="remove-row-btn" onclick="this.parentElement.remove()">✖</button>`;
    container.appendChild(div);
};

const addRBtn = document.getElementById('addRestrictionBtn');
if(addRBtn) addRBtn.onclick = () => {
    const container = document.getElementById('restrictionsContainer');
    const div = document.createElement('div');
    div.className = 'input-wrapper has-remove';
    div.style.marginTop = '0.75rem';
    div.innerHTML = `<input type="text" class="restriction-input" placeholder="Filter"><button class="remove-row-btn" onclick="this.parentElement.remove()">✖</button>`;
    container.appendChild(div);
};
