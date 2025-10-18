// ========================================
// 🎚️ 3-BAND EQUALIZER POPUP SCRIPT
// Handles the popup UI and communicates with content.js
// Each tab has its own EQ state (isolated via chrome.storage.session)
// ========================================

// Get slider elements from the popup HTML
const bassControl = document.getElementById('bass');
const midControl = document.getElementById('mid');
const trebleControl = document.getElementById('treble');

// Get the value display labels beside the sliders
const bassValLabel = document.getElementById('bassVal');
const midValLabel = document.getElementById('midVal');
const trebleValLabel = document.getElementById('trebleVal');

// Store the current active browser tab’s ID
let currentTabId = null;

// ====================================================
// 🔄 Load saved equalizer settings for this specific tab
// ====================================================
async function loadTabSettings(tabId) {
  // Get EQ settings stored in Chrome’s session storage for this tab
  const data = await chrome.storage.session.get(`eq_${tabId}`);

  // If no saved data, default to flat EQ
  const settings = data[`eq_${tabId}`] || { bass: 0, mid: 0, treble: 0 };

  // Update slider positions
  bassControl.value = settings.bass;
  midControl.value = settings.mid;
  trebleControl.value = settings.treble;

  // Update numeric labels
  bassValLabel.textContent = settings.bass;
  midValLabel.textContent = settings.mid;
  trebleValLabel.textContent = settings.treble;
}

// ====================================================
// 💾 Save equalizer settings (per tab, not global)
// ====================================================
async function saveTabSettings(tabId, settings) {
  // Save under a unique key like "eq_123" (123 = tabId)
  await chrome.storage.session.set({ [`eq_${tabId}`]: settings });
}

// ====================================================
// 📡 Send EQ settings to the tab’s content script
// ====================================================
function sendEQSettings() {
  // Make sure we have an active tab
  if (!currentTabId) return;

  // Gather slider values and convert them to numbers
  const eqSettings = {
    bass: Number(bassControl.value),
    mid: Number(midControl.value),
    treble: Number(trebleControl.value),
  };

  // Update displayed values in the popup UI
  bassValLabel.textContent = eqSettings.bass;
  midValLabel.textContent = eqSettings.mid;
  trebleValLabel.textContent = eqSettings.treble;

  // Save the settings for this specific tab
  saveTabSettings(currentTabId, eqSettings);

  // Use chrome.scripting to send EQ settings into the active tab
  chrome.scripting.executeScript({
    target: { tabId: currentTabId },
    func: (settings) => {
      // Inside the tab’s environment:
      // Dispatch a custom event that content.js listens to
      window.dispatchEvent(new CustomEvent('updateEqualizer', { detail: settings }));
    },
    args: [eqSettings],
  });
}

// ====================================================
// 🪟 When popup opens
// ====================================================
chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
  // Get the current tab ID
  if (!tabs[0]?.id) return;
  currentTabId = tabs[0].id;

  // Make sure content.js is running in that tab
  await chrome.scripting.executeScript({
    target: { tabId: currentTabId },
    files: ['content.js'],
  });

  // Load saved settings (if any) for this tab
  await loadTabSettings(currentTabId);

  // Immediately sync popup and EQ
  sendEQSettings();
});

// ====================================================
// 🎛️ Slider event listeners (real-time updates)
// ====================================================
bassControl.addEventListener('input', sendEQSettings);
midControl.addEventListener('input', sendEQSettings);
trebleControl.addEventListener('input', sendEQSettings);

// ====================================================
// ♻️ Reset button (restore flat EQ)
// ====================================================
document.getElementById('resetBtn').addEventListener('click', () => {
  // Reset sliders to neutral position
  bassControl.value = midControl.value = trebleControl.value = 0;
  sendEQSettings(); // Apply the reset instantly
});

// ====================================================
// 🎵 Preset equalizer profiles
// ====================================================
// Each preset defines gain values for bass, mid, and treble bands
const presets = {
  boostBass:    { bass: 19, mid: -30, treble: -30 },
  boostMetal:   { bass: 30, mid: 0,  treble: 0 },
  boostPop:     { bass: 0,  mid: 11, treble: 30 },
  cancelNoise:  { bass: 0,  mid: -30, treble: -30 },
};

// Find all preset buttons and set up click handlers
document.querySelectorAll('.preset').forEach((button) => {
  button.addEventListener('click', () => {
    const presetName = button.getAttribute('data-preset'); // e.g., "boostBass"
    const settings = presets[presetName];
    if (settings) {
      // Apply the preset to sliders
      bassControl.value = settings.bass;
      midControl.value = settings.mid;
      trebleControl.value = settings.treble;

      // Send updated settings to the tab
      sendEQSettings();
    }
  });
});
