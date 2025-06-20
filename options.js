// options.js - V16 (Final Default Order)

document.addEventListener('DOMContentLoaded', () => {

  // --- 1. Element References (Unchanged) ---
  const themeToggle = document.getElementById('theme-toggle-checkbox');
  const form = document.getElementById('add-favorite-form');
  const input = document.getElementById('favorite-url-input');
  const favoritesList = document.getElementById('favorites-list');
  const favoriteSortSelect = document.getElementById('favorite-sort-select');
  const regularSortSelect = document.getElementById('regular-sort-select');
  const sortOrderList = document.getElementById('sort-order-list');
  const excludeSpecialCheckbox = document.getElementById('exclude-special-checkbox');
  const limitNewtabCheckbox = document.getElementById('limit-newtab-checkbox');
  const removeDuplicatesBtn = document.getElementById('remove-duplicates-btn');

  // --- 2. Helper Functions (Unchanged) ---
  async function saveSetting(key, value) { try { await browser.storage.sync.set({ [key]: value }); } catch (e) { console.error(`Error saving ${key}:`, e); } }
  const normalizeUrl = (url) => { if (!url) return ''; if (url.startsWith('about:') || url.startsWith('moz-extension:')) return url; return url.replace(/^(https?:\/\/)?(www\.)?/, ''); };

  // --- 3. Logic Functions ---
  
  // **CORE FIX**: The logic in this function is now inverted.
  function applyTheme(isDark) {
    if (isDark) {
      // To get the default dark theme, we REMOVE the light theme attribute.
      document.body.removeAttribute('data-theme');
    } else {
      // To get the light theme, we ADD the light theme attribute.
      document.body.dataset.theme = 'light';
    }
  }

  // (All other logic functions are completely unchanged)
  function renderFavorites(favorites = []) { /* ... */ }
  async function addFavorite(event) { /* ... */ }
  async function removeFavorite(urlToRemove) { /* ... */ }
  function initializeDragAndDrop() { /* ... */ }
  function getDragAfterElement(container, y) { /* ... */ }
  async function handleRemoveDuplicates() { /* ... */ }
  // (Copy/paste the other functions from V14 here)
  function renderFavorites(favorites = []) {
    favoritesList.innerHTML = ''; if (!favorites || favorites.length === 0) { const li = document.createElement('li'); li.textContent = 'No favorites added yet.'; favoritesList.appendChild(li); return; }
    favorites.forEach(url => {
      const li = document.createElement('li'); const urlSpan = document.createElement('span'); urlSpan.textContent = url;
      const removeButton = document.createElement('button'); removeButton.textContent = 'Remove'; removeButton.onclick = () => removeFavorite(url);
      li.appendChild(urlSpan); li.appendChild(removeButton); favoritesList.appendChild(li);
    });
  }
  async function addFavorite(event) {
    event.preventDefault(); const newFavorite = input.value.trim(); if (!newFavorite) return;
    try {
      const data = await browser.storage.sync.get({ favorites: [] }); if (!data.favorites.includes(newFavorite)) { await saveSetting('favorites', [...data.favorites, newFavorite]); await loadSettings(); }
      input.value = '';
    } catch (e) { console.error("Error adding favorite:", e); }
  }
  async function removeFavorite(urlToRemove) {
    try {
      const data = await browser.storage.sync.get({ favorites: [] }); const updatedFavorites = data.favorites.filter(url => url !== urlToRemove); await saveSetting('favorites', updatedFavorites); await loadSettings();
    } catch (e) { console.error("Error removing favorite:", e); }
  }
  function initializeDragAndDrop() {
    const draggables = [...sortOrderList.querySelectorAll('li')];
    draggables.forEach(draggable => {
      draggable.addEventListener('dragstart', () => draggable.classList.add('dragging'));
      draggable.addEventListener('dragend', () => {
        draggable.classList.remove('dragging');
        const newOrder = [...sortOrderList.querySelectorAll('li')].map(li => li.dataset.category);
        saveSetting('sortOrder', newOrder);
      });
    });
    sortOrderList.addEventListener('dragover', e => {
      e.preventDefault();
      const afterElement = getDragAfterElement(sortOrderList, e.clientY);
      const dragging = document.querySelector('.dragging');
      if (afterElement == null) { sortOrderList.appendChild(dragging); } else { sortOrderList.insertBefore(dragging, afterElement); }
    });
  }
  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('li:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect(); const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) { return { offset: offset, element: child }; } else { return closest; }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }
  async function handleRemoveDuplicates() {
    const fullMessage = "This will close all duplicate tabs in the current window.\n\nFor each duplicated URL, the oldest tab will be kept. Pinned tabs will be ignored.\n\nThis action cannot be undone. Are you sure you want to proceed?";
    const confirmation = window.confirm(fullMessage);
    if (!confirmation) return;
    try {
      const allTabs = await browser.tabs.query({ currentWindow: true });
      const unpinnedTabs = allTabs.filter(tab => !tab.pinned);
      const urlMap = new Map();
      const tabsToClose = [];
      for (const tab of unpinnedTabs) {
        const normalizedUrl = normalizeUrl(tab.url);
        if (!normalizedUrl || normalizedUrl.startsWith('about:')) continue;
        if (!urlMap.has(normalizedUrl)) urlMap.set(normalizedUrl, []);
        urlMap.get(normalizedUrl).push(tab);
      }
      for (const tabs of urlMap.values()) {
        if (tabs.length > 1) {
          tabs.sort((a, b) => a.id - b.id);
          tabs.slice(1).forEach(dup => tabsToClose.push(dup.id));
        }
      }
      if (tabsToClose.length > 0) {
        await browser.tabs.remove(tabsToClose);
        alert(`Successfully closed ${tabsToClose.length} duplicate tab(s).`);
      } else {
        alert("No duplicate tabs found.");
      }
    } catch (error) { console.error("Error removing duplicate tabs:", error); }
  }


  async function loadSettings() {
    try {
      const settings = await browser.storage.sync.get({
        favorites: [], favoriteSortDirection: 'a-z', regularSortDirection: 'a-z',
        sortOrder: ['newtab', 'special', 'favorites', 'normal'], isSpecialExcluded: false, limitNewtab: false,
        isDarkMode: true
      });
      
      applyTheme(settings.isDarkMode);
      themeToggle.checked = settings.isDarkMode;

      renderFavorites(settings.favorites);
      favoriteSortSelect.value = settings.favoriteSortDirection;
      regularSortSelect.value = settings.regularSortDirection;
      excludeSpecialCheckbox.checked = settings.isSpecialExcluded;
      limitNewtabCheckbox.checked = settings.limitNewtab;
      
      const container = sortOrderList;
      settings.sortOrder.forEach(category => {
        const el = container.querySelector(`[data-category=${category}]`);
        if (el) container.appendChild(el);
      });
    } catch (e) {
      console.error("Error loading settings:", e);
    }
  }

  // --- 4. Initialization and Event Listeners (Unchanged) ---
  themeToggle.addEventListener('change', () => {
    const isDark = themeToggle.checked;
    applyTheme(isDark);
    saveSetting('isDarkMode', isDark);
  });
  form.addEventListener('submit', addFavorite);
  favoriteSortSelect.addEventListener('change', () => saveSetting('favoriteSortDirection', favoriteSortSelect.value));
  regularSortSelect.addEventListener('change', () => saveSetting('regularSortDirection', regularSortSelect.value));
  excludeSpecialCheckbox.addEventListener('change', () => saveSetting('isSpecialExcluded', excludeSpecialCheckbox.checked));
  limitNewtabCheckbox.addEventListener('change', () => saveSetting('limitNewtab', limitNewtabCheckbox.checked));
  removeDuplicatesBtn.addEventListener('click', handleRemoveDuplicates);
  
  loadSettings();
  initializeDragAndDrop();

});