import { dom }     from './dom.js';
import { presets } from './presets.js';

let currentTabId = null;
let lastCustomValues = { bass: 0, mid: 0, treble: 0 };

// Update numeric labels & color
function updateValueLabels(values) {
  const colorValue = (val) => val > 0 ? '#1db954' : val < 0 ? '#ff5c5c' : '#9e9e9e';

  dom.bassValLabel.textContent = values.bass;
  dom.midValLabel.textContent = values.mid;
  dom.trebleValLabel.textContent = values.treble;
  dom.preampValLabel.textContent = values.preamp;

  dom.bassValLabel.style.color = colorValue(values.bass);
  dom.midValLabel.style.color = colorValue(values.mid);
  dom.trebleValLabel.style.color = colorValue(values.treble);
  dom.preampValLabel.style.color = '#9e9e9e'; // preamp stays neutral
}

// Save EQ settings per tab
async function saveTabSettings(tabId, settings) {
  await chrome.storage.session.set({ [`eq_${tabId}`]: settings });
}

// Load EQ settings for a tab
async function loadTabSettings(tabId) {
  const data = await chrome.storage.session.get([`eq_${tabId}`, `eq_custom_${tabId}`]);
  const settings = data[`eq_${tabId}`] || { bass: 0, mid: 0, treble: 0, preamp: 100 };
  const savedCustom = data[`eq_custom_${tabId}`];

  dom.bassControl.value = settings.bass;
  dom.midControl.value = settings.mid;
  dom.trebleControl.value = settings.treble;
  dom.preampControl.value = settings.preamp;

  lastCustomValues = savedCustom || { bass: settings.bass, mid: settings.mid, treble: settings.treble };

  updateValueLabels(settings);

  // Highlight custom button if current sliders match saved custom
  if (savedCustom &&
      savedCustom.bass === settings.bass &&
      savedCustom.mid === settings.mid &&
      savedCustom.treble === settings.treble) {
    dom.customBtn.classList.add('active');
  } else {
    dom.customBtn.classList.remove('active');
  }
}

// Send EQ settings to content script
function sendEQSettings() {
  if (!currentTabId) return;

  const eqSettings = {
    bass: Number(dom.bassControl.value),
    mid: Number(dom.midControl.value),
    treble: Number(dom.trebleControl.value),
    preamp: Number(dom.preampControl.value),
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

// Animate slider to target value
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

// Animate slider to zero
function animateToZero(slider) {
  animateSliderTo(slider, 0);
}

// Remove highlight from all presets
function removeActivePresets() {
  dom.presetButtons.forEach((b) => b.classList.remove('active'));
  dom.customBtn.classList.remove('active');
}

// =====================
// INITIALIZE POPUP
// =====================
chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
  const tab = tabs[0];
  if (!tab?.id) return;
  currentTabId = tab.id;

  // Only run on http(s) pages
  if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: currentTabId },
        files: ['content.js'],
      });
    } catch (err) {
      console.error('Failed to inject content script:', err);
    }

    await loadTabSettings(currentTabId);
    sendEQSettings();
  } else {
    console.log('EQ cannot be applied on this page:', tab.url);
  }
});

// =====================
// EVENT LISTENERS
// =====================

// Sliders (send EQ + update custom button)
[dom.bassControl, dom.midControl, dom.trebleControl, dom.preampControl].forEach((slider) => {
  slider.addEventListener('input', () => {
    sendEQSettings();

    if (slider !== dom.preampControl) {
      removeActivePresets();
      dom.customBtn.classList.add('active');
      lastCustomValues = {
        bass: Number(dom.bassControl.value),
        mid: Number(dom.midControl.value),
        treble: Number(dom.trebleControl.value),
      };
      if (currentTabId) {
        chrome.storage.session.set({ [`eq_custom_${currentTabId}`]: lastCustomValues });
      }
    }
  });
});

// Reset button
dom.resetBtn.addEventListener('click', () => {
  [dom.bassControl, dom.midControl, dom.trebleControl].forEach(animateToZero);
  removeActivePresets();
});

// Custom button
dom.customBtn.addEventListener('click', () => {
  animateSliderTo(dom.bassControl, lastCustomValues.bass);
  animateSliderTo(dom.midControl, lastCustomValues.mid);
  animateSliderTo(dom.trebleControl, lastCustomValues.treble);
  removeActivePresets();
  dom.customBtn.classList.add('active');
});

// Preset buttons
dom.presetButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const presetName = button.getAttribute('data-preset');
    const settings = presets[presetName];
    if (!settings) return;

    animateSliderTo(dom.bassControl, settings.bass);
    animateSliderTo(dom.midControl, settings.mid);
    animateSliderTo(dom.trebleControl, settings.treble);

    removeActivePresets();
    button.classList.add('active');

    if (currentTabId) {
      chrome.storage.session.set({ [`eq_${currentTabId}`]: { ...settings, preamp: dom.preampControl.value } });
    }
  });
});
