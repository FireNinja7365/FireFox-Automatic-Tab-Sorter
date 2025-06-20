// background.js - V16 (Final Default Order)

browser.action.onClicked.addListener(() => { browser.runtime.openOptionsPage(); });

const normalizeUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('about:') || url.startsWith('moz-extension:')) return url;
  return url.replace(/^(https?:\/\/)?(www\.)?/, '');
};

const isNewTab = (url) => (url || '') === 'about:newtab';
const isSpecialTab = (url) => {
  const u = url || '';
  return (u.startsWith('about:') || u.startsWith('moz-extension:')) && !isNewTab(u);
};

async function sortTabs() {
  try {
    const settings = await browser.storage.sync.get({
      favorites: [], favoriteSortDirection: 'a-z', regularSortDirection: 'a-z',
      sortOrder: ['newtab', 'special', 'favorites', 'normal'],
      isSpecialExcluded: false, limitNewtab: false
    });

    let allTabs = await browser.tabs.query({ currentWindow: true });

    // --- NEW: Limit New Tab Logic ---
    if (settings.limitNewtab) {
      const newTabs = allTabs.filter(tab => isNewTab(tab.url));
      
      // We only act if there is more than one "new tab" open.
      if (newTabs.length > 1) {
        // --- CORE FIX ---
        // Sort the 'newtab' pages by their ID. Lower ID = older tab.
        newTabs.sort((a, b) => a.id - b.id);
        
        // The tabs to close are all of them EXCEPT the last one (the newest).
        const tabsToClose = newTabs.slice(0, -1).map(tab => tab.id);
        
        await browser.tabs.remove(tabsToClose);
        
        // Re-fetch the tab list as it's now changed.
        allTabs = await browser.tabs.query({ currentWindow: true });
      }
    }
    
    const pinnedTabs = allTabs.filter(tab => tab.pinned);
    let unpinnedTabs = allTabs.filter(tab => !tab.pinned);

    if (settings.isSpecialExcluded) {
      unpinnedTabs = unpinnedTabs.filter(tab => !isSpecialTab(tab.url));
    }
    
    const getTabType = (url) => {
      if (!url || url === 'about:blank') return 'blank';
      if (isNewTab(url)) return 'newtab';
      if (isSpecialTab(url)) return 'special';
      const isFavorite = settings.favorites.some(fav => normalizeUrl(url).startsWith(normalizeUrl(fav)));
      if (isFavorite) return 'favorites';
      return 'normal';
    };

    unpinnedTabs.sort((a, b) => {
      const aType = getTabType(a.url);
      const bType = getTabType(b.url);
      
      const aPriority = aType === 'blank' ? 99 : settings.sortOrder.indexOf(aType);
      const bPriority = bType === 'blank' ? 99 : settings.sortOrder.indexOf(bType);

      if (aPriority !== bPriority) return aPriority - bPriority;
      
      const category = aType;
      let direction = 'a-z';
      if (category === 'favorites') direction = settings.favoriteSortDirection;
      else if (category === 'normal' || category === 'special') direction = settings.regularSortDirection;
      
      const cleanA = normalizeUrl(a.url);
      const cleanB = normalizeUrl(b.url);
      
      return direction === 'z-a' ? cleanB.localeCompare(cleanA) : cleanA.localeCompare(cleanB);
    });

    const sortedTabIds = unpinnedTabs.map(tab => tab.id);
    if (sortedTabIds.length === 0) return;

    await browser.tabs.move(sortedTabIds, { index: pinnedTabs.length });
    console.log("Tabs sorted with improved newtab cleanup (v10).");

  } catch (error) {
    console.error("Critical error in sortTabs function:", error);
  }
}

// --- Event Listeners ---
browser.tabs.onCreated.addListener(sortTabs);
browser.tabs.onUpdated.addListener((tabId, changeInfo) => { if (changeInfo.url) sortTabs(); });
browser.storage.onChanged.addListener((changes, area) => {
  const settingsKeys = ['favorites', 'sortOrder', 'isSpecialExcluded', 'limitNewtab', 'favoriteSortDirection', 'regularSortDirection'];
  if (area === 'sync' && settingsKeys.some(key => key in changes)) {
    console.log("Settings changed, re-sorting tabs.");
    sortTabs();
  }
});
sortTabs();