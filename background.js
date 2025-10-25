// -------------------------------
// Global badge state per tab
// -------------------------------
const tabBadgeState = {}; // { tabId: true/false }

// Initialize badge for new tabs or on install
const initBadge = () => {
  chrome.action.setBadgeText({ text: 'off' });
  chrome.action.setBadgeBackgroundColor({ color: '#646464' });
};

chrome.runtime.onInstalled.addListener(initBadge);
chrome.runtime.onStartup.addListener(initBadge);

// -------------------------------
// Helper: Inject content.js & apply EQ
// -------------------------------
async function injectAndApplyEQ(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js'],
    });

    const eqData = await chrome.storage.session.get(`eq_${tabId}`);
    const settings = eqData[`eq_${tabId}`] || { bass: 0, mid: 0, treble: 0, preamp: 0, master: 100 };

    await chrome.scripting.executeScript({
      target: { tabId },
      func: (eqSettings) => {
        window.dispatchEvent(new CustomEvent('updateEqualizer', { detail: eqSettings }));
      },
      args: [settings],
    });
  } catch (err) {
    console.error('Failed to inject/apply EQ:', err);
  }
}

// -------------------------------
// Helper: Disable EQ
// -------------------------------
async function disableEQ(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        window.dispatchEvent(new CustomEvent('disableEqualizer'));
      },
    });
  } catch (err) {
    console.error('Failed to disable EQ:', err);
  }
}

// -------------------------------
// Listen for toggle changes from popup
// -------------------------------
chrome.runtime.onMessage.addListener(async (message, sender) => {
  if (message.type === 'toggleChanged' && message.tabId !== undefined) {
    const tabId = message.tabId;
    const enabled = message.enabled;

    // Save in memory map immediately
    tabBadgeState[tabId] = enabled;

    // Update badge immediately
    chrome.action.setBadgeText({ tabId, text: enabled ? 'on' : 'off' });

    // Save to session storage for persistence across reloads
    await chrome.storage.session.set({ [`eqEnabled_${tabId}`]: enabled });

    if (enabled) {
      await injectAndApplyEQ(tabId);
    } else {
      await disableEQ(tabId);
    }
  }
});

// -------------------------------
// Apply EQ automatically on page load if toggle is ON
// -------------------------------
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!tab.url || !tab.url.startsWith('http')) return;

  // 1️⃣ Get toggle state from memory map first
  let enabled = tabBadgeState[tabId];

  // 2️⃣ If not in memory, fallback to session storage
  if (enabled === undefined) {
    const data = await chrome.storage.session.get(`eqEnabled_${tabId}`);
    enabled = data[`eqEnabled_${tabId}`] || false;
    tabBadgeState[tabId] = enabled; // cache it for future
  }

  // 3️⃣ Immediately set badge based on toggle state
  chrome.action.setBadgeText({ tabId, text: enabled ? 'on' : 'off' });

  // 4️⃣ Inject/apply EQ only after page fully loads
  if (enabled && changeInfo.status === 'complete') {
    await injectAndApplyEQ(tabId);
  }
});
