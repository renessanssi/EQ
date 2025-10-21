// Initialize badge globally
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

    const eqData = await chrome.storage.session.get([`eq_${tabId}`, `eq_custom_${tabId}`]);
    const settings = eqData[`eq_${tabId}`] || { bass: 0, mid: 0, treble: 0, preamp: 100 };

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

    // Update badge
    chrome.action.setBadgeText({ tabId, text: enabled ? 'on' : 'off' });
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#646464' });

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
  if (changeInfo.status !== 'complete') return;
  if (!tab.url || !tab.url.startsWith('http')) return;

  const data = await chrome.storage.session.get(`eqEnabled_${tabId}`);
  const enabled = data[`eqEnabled_${tabId}`];

  // Update badge
  chrome.action.setBadgeText({ tabId, text: enabled ? 'on' : 'off' });
  chrome.action.setBadgeBackgroundColor({ tabId, color: '#646464' });

  if (enabled) {
    await injectAndApplyEQ(tabId);
  }
});
