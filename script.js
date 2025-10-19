// ========================================
// 🎚️ 3-BAND EQUALIZER + PREAMP POPUP SCRIPT
// Handles the popup UI and communicates with content.js
// Each tab has its own EQ state (isolated via chrome.storage.session)
// ========================================

// Get slider elements
const bassControl = document.getElementById('bass');
const midControl = document.getElementById('mid');
const trebleControl = document.getElementById('treble');
const preampControl = document.getElementById('preamp');

// Get value display labels
const bassValLabel = document.getElementById('bassVal');
const midValLabel = document.getElementById('midVal');
const trebleValLabel = document.getElementById('trebleVal');
const preampValLabel = document.getElementById('preampVal');

let currentTabId = null;

// ====================================================
// 🔄 Load saved equalizer + preamp settings for this tab
// ====================================================
async function loadTabSettings(tabId) {
  const data = await chrome.storage.session.get([`eq_${tabId}`, `eq_custom_${tabId}`]);
  const settings = data[`eq_${tabId}`] || { bass: 0, mid: 0, treble: 0, preamp: 100 };
  const savedCustom = data[`eq_custom_${tabId}`];

  bassControl.value = settings.bass;
  midControl.value = settings.mid;
  trebleControl.value = settings.treble;
  preampControl.value = settings.preamp;

  // Initialize lastCustomValues with loaded custom sliders if exists
  lastCustomValues = savedCustom || { bass: settings.bass, mid: settings.mid, treble: settings.treble };

  updateValueLabels(settings);

  // Highlight custom button if current sliders match saved custom
  if (savedCustom &&
      savedCustom.bass === settings.bass &&
      savedCustom.mid === settings.mid &&
      savedCustom.treble === settings.treble) {
    customBtn.classList.add('active');
  } else {
    customBtn.classList.remove('active');
  }
}

// ====================================================
// 💾 Save equalizer + preamp settings (per tab)
// ====================================================
async function saveTabSettings(tabId, settings) {
  await chrome.storage.session.set({ [`eq_${tabId}`]: settings });
}

// ====================================================
// 📡 Send EQ + preamp settings to the tab’s content script
// ====================================================
function sendEQSettings() {
  if (!currentTabId) return;

  const eqSettings = {
    bass: Number(bassControl.value),
    mid: Number(midControl.value),
    treble: Number(trebleControl.value),
    preamp: Number(preampControl.value),
  };

  updateValueLabels(eqSettings);
  saveTabSettings(currentTabId, eqSettings);

  chrome.scripting.executeScript({
    target: { tabId: currentTabId },
    func: (settings) => {
      window.dispatchEvent(new CustomEvent('updateEqualizer', { detail: settings }));
    },
    args: [eqSettings],
  });
}

// ====================================================
// 🎨 Update numeric labels
// ====================================================
function updateValueLabels(values) {
  const colorValue = (val) =>
    val > 0 ? '#1db954' : val < 0 ? '#ff5c5c' : '#9e9e9e';

  bassValLabel.textContent = values.bass;
  midValLabel.textContent = values.mid;
  trebleValLabel.textContent = values.treble;
  preampValLabel.textContent = values.preamp;

  bassValLabel.style.color = colorValue(values.bass);
  midValLabel.style.color = colorValue(values.mid);
  trebleValLabel.style.color = colorValue(values.treble);
  preampValLabel.style.color = '#9e9e9e';
}

// ====================================================
// 🪟 When popup opens
// ====================================================
chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
  if (!tabs[0]?.id) return;
  currentTabId = tabs[0].id;

  await chrome.scripting.executeScript({
    target: { tabId: currentTabId },
    files: ['content.js'],
  });

  await loadTabSettings(currentTabId);
  sendEQSettings();
});

// ====================================================
// 🎛️ Slider event listeners
// ====================================================
[bassControl, midControl, trebleControl, preampControl].forEach((slider) => {
  slider.addEventListener('input', sendEQSettings);
});

// ====================================================
// ♻️ Animated Reset button (preamp excluded)
// ====================================================
function animateToZero(slider) {
  const steps = 15;
  const stepValue = (0 - slider.value) / steps;
  let count = 0;

  const interval = setInterval(() => {
    slider.value = parseFloat(slider.value) + stepValue;
    count++;

    if (count >= steps) {
      slider.value = 0; // ensure it lands exactly at 0
      clearInterval(interval);
      sendEQSettings();
    }
  }, 10);
}

document.getElementById('resetBtn').addEventListener('click', () => {
  ['bass', 'mid', 'treble'].forEach((id) =>
    animateToZero(document.getElementById(id))
  );

  // remove preset highlight
  document.querySelectorAll('.preset').forEach((b) => b.classList.remove('active'));
  customBtn.classList.remove('active');
});

// ====================================================
// 🎵 Preset equalizer profiles (preamp removed)
// ====================================================
const presets = {
  boostBass: { bass: 19, mid: -30, treble: -30 },
  boostMetal: { bass: 30, mid: 0, treble: 0 },
  boostPop: { bass: 0, mid: 11, treble: 30 },
  boostSoft: { bass: 0, mid: -30, treble: -30 },
};

// Animate a slider to a target value
function animateSliderTo(slider, target) {
  const steps = 15;
  const stepValue = (target - slider.value) / steps;
  let count = 0;

  const interval = setInterval(() => {
    slider.value = parseFloat(slider.value) + stepValue;
    count++;
    if (count >= steps) {
      slider.value = target;
      clearInterval(interval);
    }
    sendEQSettings();
  }, 10);
}

// ====================================================
// Custom button logic
// ====================================================
const customBtn = document.getElementById('customBtn');
let lastCustomValues = { bass: 0, mid: 0, treble: 0 };

// Whenever a slider is moved manually
[bassControl, midControl, trebleControl].forEach((slider) => {
  slider.addEventListener('input', () => {
    // Remove active from other presets
    document.querySelectorAll('.preset').forEach((b) => b.classList.remove('active'));

    // Highlight the custom button
    customBtn.classList.add('active');

    // Save current sliders as last custom values
    lastCustomValues = {
      bass: Number(bassControl.value),
      mid: Number(midControl.value),
      treble: Number(trebleControl.value),
    };

    // Persist last custom values to storage
    if (currentTabId) {
      chrome.storage.session.set({ [`eq_custom_${currentTabId}`]: lastCustomValues });
    }
  });
});

// Apply last custom values when Custom button clicked
customBtn.addEventListener('click', () => {
  animateSliderTo(bassControl, lastCustomValues.bass);
  animateSliderTo(midControl, lastCustomValues.mid);
  animateSliderTo(trebleControl, lastCustomValues.treble);

  document.querySelectorAll('.preset').forEach((b) => b.classList.remove('active'));
  customBtn.classList.add('active');
});

// ====================================================
// Apply preset buttons
// ====================================================
document.querySelectorAll('.preset').forEach((button) => {
  button.addEventListener('click', () => {
    const presetName = button.getAttribute('data-preset');
    const settings = presets[presetName];
    if (!settings) return;

    animateSliderTo(bassControl, settings.bass);
    animateSliderTo(midControl, settings.mid);
    animateSliderTo(trebleControl, settings.treble);

    document.querySelectorAll('.preset').forEach((b) => b.classList.remove('active'));
    button.classList.add('active');

    // Save presets as tab EQ settings
    if (currentTabId) {
      chrome.storage.session.set({ [`eq_${currentTabId}`]: { ...settings, preamp: preampControl.value } });
    }
  });
});
