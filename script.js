let GEMINI_API_KEY = localStorage.getItem('geminiApiKey') || "";
function getApiUrl() {
    return `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
}

const themeToggle = document.getElementById('themeToggle');
if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add('light-mode');
}

themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    const mode = document.body.classList.contains('light-mode') ? 'light' : 'dark';
    localStorage.setItem('theme', mode);
});

let currentPage = 0;
let totalPages = 1;
let currentRecipeText = "";
let activeViewRecipe = "";
let isSharingMode = false;
let selectedForSharing = new Set();

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

document.getElementById('shareRecipeBtn').addEventListener('click', () => {
    const recipeToShare = currentRecipeText || activeViewRecipe;
    if (!recipeToShare) return;
    handleShare(getRecipeTitle(recipeToShare), recipeToShare);
});

function updateModalTitle() {
    const h2 = document.querySelector('#savedModal h2');
    const shareBtn = document.getElementById('shareAllRecipesBtn');
    const cancelBtn = document.getElementById('cancelShareModeBtn');
    
    if (isSharingMode) {
        h2.textContent = "Select Recipes 📤";
        h2.style.color = "#14b8a6";
        shareBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`;
        if(cancelBtn) cancelBtn.style.visibility = 'visible';
    } else {
        h2.textContent = "Your Saved Magic";
        h2.style.color = "";
        shareBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>`;
        if(cancelBtn) cancelBtn.style.visibility = 'hidden';
    }
}

document.getElementById('cancelShareModeBtn').addEventListener('click', () => {
    isSharingMode = false;
    selectedForSharing.clear();
    updateModalTitle();
    renderSavedList();
});

document.getElementById('shareAllRecipesBtn').addEventListener('click', () => {
    const saved = JSON.parse(localStorage.getItem('savedRecipes') || '[]');
    if (saved.length === 0) return;
    
    if (!isSharingMode) {
        isSharingMode = true;
        selectedForSharing.clear();
        updateModalTitle();
        renderSavedList();
    } else {
        if (selectedForSharing.size === 0) {
            alert("Please select at least one recipe to share.");
            return;
        }
        
        const recipesToShare = [];
        const indices = Array.from(selectedForSharing).sort((a,b) => a - b);
        for (let i of indices) {
            recipesToShare.push(`Recipe ${recipesToShare.length + 1}:\n${saved[i]}`);
        }
        const textToShare = recipesToShare.join('\n\n---\n\n');
        
        handleShare(recipesToShare.length > 1 ? "My Shared Recipes" : getRecipeTitle(saved[indices[0]]), textToShare);
        
        isSharingMode = false;
        selectedForSharing.clear();
        updateModalTitle();
        renderSavedList();
    }
});

function renderSavedList() {
    const saved = JSON.parse(localStorage.getItem('savedRecipes') || '[]');
    const list = document.getElementById('savedRecipesList');
    list.innerHTML = '';
    
    if (saved.length === 0) {
        list.innerHTML = `<div style="text-align: center; padding: 2rem 1rem; color: var(--text-light);"><div style="font-size: 3rem; margin-bottom: 1rem;">🫙</div><p>Your recipe book is empty!<br>Go cook some magic to fill it up.</p></div>`;
        return;
    }
    
    saved.forEach((recipe, index) => {
        const title = getRecipeTitle(recipe);
        
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
                document.getElementById('savedModal').classList.add('hidden');
                viewSpecificRecipe(recipe);
            }
        });
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-recipe-btn';
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.title = "Delete Recipe";
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            if(confirm(`Delete "${title}"?`)) {
                const currentSaved = JSON.parse(localStorage.getItem('savedRecipes') || '[]');
                currentSaved.splice(index, 1);
                localStorage.setItem('savedRecipes', JSON.stringify(currentSaved));
                selectedForSharing.clear();
                renderSavedList();
                if (currentSaved.length === 0) {
                    document.getElementById('savedModal').classList.add('hidden');
                }
            }
        };
        
        itemContainer.appendChild(btn);
        
        if (!isSharingMode) {
            itemContainer.appendChild(deleteBtn);
        }
        
        list.appendChild(itemContainer);
    });
}

document.getElementById('saveRecipeBtn').addEventListener('click', () => {
    if (!currentRecipeText) return;
    const saved = JSON.parse(localStorage.getItem('savedRecipes') || '[]');
    if (!saved.includes(currentRecipeText)) {
        saved.push(currentRecipeText);
        localStorage.setItem('savedRecipes', JSON.stringify(saved));
        const saveBtn = document.getElementById('saveRecipeBtn');
        saveBtn.innerHTML = '✔️';
        setTimeout(() => {
            saveBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path></svg>';
        }, 2000);
    } else {
        alert('Recipe is already saved!');
    }
});

document.getElementById('viewSavedBtn').addEventListener('click', () => {
    isSharingMode = false;
    selectedForSharing.clear();
    updateModalTitle();
    renderSavedList();
    
    document.getElementById('savedModal').classList.remove('hidden');
});

document.getElementById('closeSavedModalBtn').addEventListener('click', () => {
    document.getElementById('savedModal').classList.add('hidden');
});

document.getElementById('savedModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('savedModal')) {
        document.getElementById('savedModal').classList.add('hidden');
    }
});

function formatAndRenderRecipe(recipeText, container) {
    container.innerHTML = marked.parse(recipeText);
    
    // Inject active task checkers
    const uls = container.querySelectorAll('ul');
    uls.forEach(ul => {
        ul.style.listStyleType = 'none';
        ul.style.paddingLeft = '0';
        ul.querySelectorAll('li').forEach(li => {
            const text = li.innerHTML;
            li.innerHTML = `<label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer; margin-bottom: 0.5rem;"><input type="checkbox" style="margin-top: 4px; width: 1.4rem; height: 1.4rem; accent-color: #14b8a6; flex-shrink: 0; cursor: pointer;"> <span style="line-height: 1.5; transition: all 0.2s;">${text}</span></label>`;
            
            const checkbox = li.querySelector('input');
            const spanText = li.querySelector('span');
            checkbox.addEventListener('change', (e) => {
                if(e.target.checked) {
                    spanText.style.textDecoration = 'line-through';
                    spanText.style.opacity = '0.5';
                } else {
                    spanText.style.textDecoration = 'none';
                    spanText.style.opacity = '1';
                }
            });
        });
    });
}

function viewSpecificRecipe(recipe) {
    currentRecipeText = ""; 
    activeViewRecipe = recipe;
    
    const recipeContent = document.getElementById('recipeContent');
    formatAndRenderRecipe(recipe, recipeContent);
    
    document.getElementById('bookContainer').classList.remove('hidden');
    const recipeBook = document.getElementById('recipeBook');
    recipeBook.classList.remove('closed');
    recipeBook.classList.add('open');
    
    setTimeout(() => {
        currentPage = 0;
        updatePagination(recipeContent);
        recipeContent.style.transform = `translateX(0px)`;
    }, 150);
}

function updatePagination(recipeContent) {
    const scrollWidth = recipeContent.scrollWidth;
    totalPages = Math.max(1, Math.ceil(scrollWidth / 280));
    
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const saveBtn = document.getElementById('saveRecipeBtn');
    const shareBtn = document.getElementById('shareRecipeBtn');
    
    if (currentPage > 0) prevBtn.classList.remove('hidden');
    else prevBtn.classList.add('hidden');
    
    if (currentPage < totalPages - 1) {
        nextBtn.classList.remove('hidden');
        if(shareBtn) shareBtn.classList.add('hidden');
        if(saveBtn) saveBtn.classList.add('hidden');
    } else {
        nextBtn.classList.add('hidden');
        if(shareBtn) shareBtn.classList.remove('hidden');
        
        if (currentRecipeText) {
            saveBtn.classList.remove('hidden');
        } else {
            saveBtn.classList.add('hidden');
        }
    }
}

function triggerFlipAnimation(oldPage, newPage, direction) {
    const book = document.getElementById('recipeBook');
    const recipeContent = document.getElementById('recipeContent');
    const nextBtn = document.getElementById('nextPageBtn');
    const prevBtn = document.getElementById('prevPageBtn');
    const saveBtn = document.getElementById('saveRecipeBtn');
    const shareBtn = document.getElementById('shareRecipeBtn');
    
    nextBtn.style.pointerEvents = 'none';
    prevBtn.style.pointerEvents = 'none';
    if(saveBtn) saveBtn.style.pointerEvents = 'none';
    if(shareBtn) shareBtn.style.pointerEvents = 'none';

    const flipper = document.createElement('div');
    flipper.className = 'flipper-wrapper';
    flipper.style.zIndex = '10';
    flipper.style.animation = direction === 'next' ? 'turnNext 0.7s ease-in-out forwards' : 'turnPrev 0.7s ease-in-out forwards';
    
    const front = document.createElement('div');
    front.className = 'flipper-front';
    
    const back = document.createElement('div');
    back.className = 'flipper-back';
    
    const clonedContent = recipeContent.cloneNode(true);
    clonedContent.removeAttribute('id');
    
    if (direction === 'next') {
        clonedContent.style.transform = `translateX(-${oldPage * 280}px)`;
        recipeContent.style.transform = `translateX(-${newPage * 280}px)`;
    } else {
        clonedContent.style.transform = `translateX(-${newPage * 280}px)`;
    }
    
    front.appendChild(clonedContent);
    flipper.appendChild(front);
    flipper.appendChild(back);
    
    book.appendChild(flipper);
    
    flipper.addEventListener('animationend', () => {
        flipper.remove();
        if (direction === 'prev') {
            recipeContent.style.transform = `translateX(-${newPage * 280}px)`;
        }
        nextBtn.style.pointerEvents = 'auto';
        prevBtn.style.pointerEvents = 'auto';
        if(saveBtn) saveBtn.style.pointerEvents = 'auto';
        if(shareBtn) shareBtn.style.pointerEvents = 'auto';
    });
}

document.getElementById('prevPageBtn').addEventListener('click', () => {
    if (currentPage > 0) {
        const oldPage = currentPage;
        currentPage--;
        triggerFlipAnimation(oldPage, currentPage, 'prev');
        updatePagination(document.getElementById('recipeContent'));
    }
});

document.getElementById('nextPageBtn').addEventListener('click', () => {
    if (currentPage < totalPages - 1) {
        const oldPage = currentPage;
        currentPage++;
        triggerFlipAnimation(oldPage, currentPage, 'next');
        updatePagination(document.getElementById('recipeContent'));
    }
});

document.getElementById('addIngredientBtn').addEventListener('click', () => {
    const container = document.getElementById('ingredientsContainer');
    
    const wrapper = document.createElement('div');
    wrapper.className = 'input-wrapper has-remove';
    wrapper.style.marginTop = '0.75rem';
    wrapper.style.position = 'relative';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'ingredient-input';
    input.placeholder = 'Ingredient (e.g., Rice)';
    input.setAttribute('aria-label', 'Ingredient');
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-row-btn';
    removeBtn.innerHTML = '✖';
    removeBtn.title = 'Remove';
    removeBtn.onclick = () => wrapper.remove();
    
    wrapper.appendChild(input);
    wrapper.appendChild(removeBtn);
    container.appendChild(wrapper);
    input.focus();
});

document.getElementById('addRestrictionBtn').addEventListener('click', () => {
    const container = document.getElementById('restrictionsContainer');
    
    const wrapper = document.createElement('div');
    wrapper.className = 'input-wrapper has-remove';
    wrapper.style.marginTop = '0.75rem';
    wrapper.style.position = 'relative';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'restriction-input';
    input.placeholder = 'Dietary Filter (Optional, e.g., Dairy-Free)';
    input.setAttribute('aria-label', 'Dietary Filter');
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-row-btn';
    removeBtn.innerHTML = '✖';
    removeBtn.title = 'Remove';
    removeBtn.onclick = () => wrapper.remove();
    
    wrapper.appendChild(input);
    wrapper.appendChild(removeBtn);
    container.appendChild(wrapper);
    input.focus();
});

let selectedCuisine = "Any";

document.getElementById('cuisineBadge').addEventListener('click', () => {
    document.getElementById('cuisineModal').classList.remove('hidden');
});
document.getElementById('closeModalBtn').addEventListener('click', () => {
    document.getElementById('cuisineModal').classList.add('hidden');
});
document.getElementById('cuisineModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('cuisineModal')) {
        document.getElementById('cuisineModal').classList.add('hidden');
    }
});
const tags = document.querySelectorAll('.cuisine-tag');
tags.forEach(tag => {
    tag.addEventListener('click', () => {
        tags.forEach(t => t.classList.remove('active'));
        tag.classList.add('active');
        selectedCuisine = tag.getAttribute('data-cuisine');
        document.getElementById('cuisineBadge').innerHTML = tag.innerHTML;
    });
});

document.getElementById('addCustomRecipeBtn').addEventListener('click', () => {
    document.getElementById('customRecipeTitle').value = '';
    document.getElementById('customRecipeContent').value = '';
    document.getElementById('addRecipeModal').classList.remove('hidden');
});

document.getElementById('cancelAddRecipeBtn').addEventListener('click', () => {
    document.getElementById('addRecipeModal').classList.add('hidden');
});

document.getElementById('saveCustomRecipeBtn').addEventListener('click', () => {
    const title = document.getElementById('customRecipeTitle').value.trim();
    const content = document.getElementById('customRecipeContent').value.trim();
    
    if (!title || !content) {
        alert("Please provide both a title and recipe content!");
        return;
    }
    
    const formattedRecipe = `# ${title}\n\n${content}`;
    const saved = JSON.parse(localStorage.getItem('savedRecipes') || '[]');
    saved.push(formattedRecipe);
    localStorage.setItem('savedRecipes', JSON.stringify(saved));
    
    document.getElementById('addRecipeModal').classList.add('hidden');
    document.getElementById('viewSavedBtn').click();
});

document.getElementById('addRecipeModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('addRecipeModal')) {
        document.getElementById('addRecipeModal').classList.add('hidden');
    }
});

document.getElementById('cookButton').addEventListener('click', async () => {
    const inputElements = document.querySelectorAll('.ingredient-input');
    const ingredientValues = Array.from(inputElements).map(input => input.value.trim()).filter(val => val !== '');

    if (ingredientValues.length === 0) {
        alert("Please enter at least one ingredient to cook magic!");
        return;
    }

    const filterElements = document.querySelectorAll('.restriction-input');
    const filterValues = Array.from(filterElements).map(input => input.value.trim()).filter(val => val !== '');
    const filters = filterValues.length > 0 ? filterValues.join(', ') : 'None';

    const ingredients = ingredientValues.join(', ');
    let cuisineAddition = "";
    if (typeof selectedCuisine !== 'undefined' && selectedCuisine !== 'Any') {
        cuisineAddition = ` Cuisine style: ${selectedCuisine}.`;
    }
    const prompt = `Act as a creative master chef. Create a delicious recipe using some or all of these ingredients: ${ingredients}.${cuisineAddition} Dietary restrictions/filters: ${filters}. You can include other common pantry staples. Format the response cleanly in markdown. Include a catchy recipe title, a short ingredients list, and brief step-by-step instructions. Keep the entire recipe extremely short, crisp, and straight to the point without any extra fluff or introductions.`;

    const button = document.getElementById('cookButton');
    const bookContainer = document.getElementById('bookContainer');
    const recipeBook = document.getElementById('recipeBook');
    const recipeContent = document.getElementById('recipeContent');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const saveBtn = document.getElementById('saveRecipeBtn');
    const shareBtn = document.getElementById('shareRecipeBtn');

    button.disabled = true;
    button.textContent = "Baking Magic...";
    
    recipeContent.innerHTML = '';
    recipeContent.style.transform = `translateX(0px)`;
    currentPage = 0;
    prevBtn.classList.add('hidden');
    nextBtn.classList.add('hidden');
    if(saveBtn) saveBtn.classList.add('hidden');
    if(shareBtn) shareBtn.classList.add('hidden');

    bookContainer.classList.remove('hidden');
    recipeBook.classList.remove('open');
    recipeBook.classList.add('closed');
    
    startStoryLoader();

    setTimeout(() => {
        recipeBook.classList.remove('closed');
        recipeBook.classList.add('open');
    }, 100);

    const animationDuration = 1500;
    const startTime = Date.now();

    try {
        if (!GEMINI_API_KEY || GEMINI_API_KEY.trim() === "") {
            document.getElementById('apiSettingsModal').classList.remove('hidden');
            throw new Error("Please set your Gemini API Key in Settings first.");
        }

        const response = await fetch(getApiUrl(), {
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
            throw new Error(errorData.error?.message || "Failed to fetch recipe from Gemini API");
        }

        const data = await response.json();
        const recipeText = data.candidates[0].content.parts[0].text;
        currentRecipeText = recipeText;
        activeViewRecipe = recipeText;
        
        const elapsed = Date.now() - startTime;
        if (elapsed < animationDuration) {
            await new Promise(r => setTimeout(r, animationDuration - elapsed));
        }

        stopStoryLoader();
        
        formatAndRenderRecipe(recipeText, recipeContent);
        
        setTimeout(() => {
            updatePagination(recipeContent);
            recipeContent.style.transform = `translateX(0px)`;
        }, 150);

        const textNodes = recipeContent.querySelectorAll('h1, h2, h3, p, li, img');
        
        textNodes.forEach(node => {
            node.style.opacity = '0';
            node.style.transform = 'translateY(10px)';
            node.style.transition = 'all 0.4s ease-out';
        });

        let delay = 0;
        textNodes.forEach((node, index) => {
            setTimeout(() => {
                node.style.opacity = '1';
                node.style.transform = 'translateY(0)';
            }, delay);
            delay += 150; 
        });

    } catch (error) {
        stopStoryLoader();
        recipeContent.innerHTML = `
            <h2>Oops! Kitchen Error</h2>
            <p style="color: #ef4444;">${error.message}</p>
        `;
    } finally {
        button.disabled = false;
        button.textContent = "Cook Magic 😋";
    }
});

let storyInterval;
function startStoryLoader() {
    const loader = document.getElementById('storyLoader');
    const emojiEl = document.getElementById('storyEmoji');
    const textEl = document.getElementById('storyText');
    loader.classList.remove('hidden');
    let storyIndex = 0;
    const emojis = ["🤔", "📱", "🛒", "🥘", "😋"];
    const texts = ["Thinking of a recipe...", "Selecting ingredients...", "Picking from grocery racks...", "Cooking it up...", "Adding magic..."];
    emojiEl.textContent = emojis[0];
    textEl.textContent = texts[0];
    storyInterval = setInterval(() => {
        storyIndex = (storyIndex + 1) % emojis.length;
        emojiEl.textContent = emojis[storyIndex];
        textEl.textContent = texts[storyIndex];
    }, 1200);
}

function stopStoryLoader() {
    const loader = document.getElementById('storyLoader');
    loader.classList.add('hidden');
    if (storyInterval) clearInterval(storyInterval);
}

// API Settings Modal Logic
document.getElementById('apiSettingsBtn').addEventListener('click', () => {
    document.getElementById('geminiApiKeyInput').value = GEMINI_API_KEY;
    document.getElementById('apiSettingsModal').classList.remove('hidden');
});

document.getElementById('closeApiSettingsBtn').addEventListener('click', () => {
    document.getElementById('apiSettingsModal').classList.add('hidden');
});

document.getElementById('apiSettingsModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('apiSettingsModal')) {
        document.getElementById('apiSettingsModal').classList.add('hidden');
    }
});

document.getElementById('saveApiKeyBtn').addEventListener('click', () => {
    const key = document.getElementById('geminiApiKeyInput').value.trim();
    if (key) {
        localStorage.setItem('geminiApiKey', key);
        GEMINI_API_KEY = key;
        document.getElementById('apiSettingsModal').classList.add('hidden');
    } else {
        alert("Please enter a valid API Key.");
    }
});

// Clear All Ingredients Logic
document.getElementById('clearIngredientsBtn').addEventListener('click', () => {
    const container = document.getElementById('ingredientsContainer');
    const additionalInputs = container.querySelectorAll('.input-wrapper.has-remove');
    additionalInputs.forEach(wrapper => wrapper.remove());
    
    const firstInput = container.querySelector('.ingredient-input');
    if (firstInput) {
        firstInput.value = '';
        firstInput.focus();
    }
});

// Keyboard Navigation (Enter to add new row)
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        if (e.target.classList.contains('ingredient-input')) {
            e.preventDefault();
            document.getElementById('addIngredientBtn').click();
        } else if (e.target.classList.contains('restriction-input')) {
            e.preventDefault();
            document.getElementById('addRestrictionBtn').click();
        }
    }
});
