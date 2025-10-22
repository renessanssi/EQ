import { dom } from './dom.js';
import { presets } from './presets.js';

let currentTabId = null;
let lastCustomValues = { bass: 0, mid: 0, treble: 0 };

// -------------------------------
// Update numeric labels & colors
// -------------------------------
function updateValueLabels(values) {
  const colorValue = (val) => (val > 0 ? '	#d6c372' : val < 0 ? '#bec7c7' : '#2f2f2fff');

  dom.bassValLabel.textContent = values.bass;
  dom.midValLabel.textContent = values.mid;
  dom.trebleValLabel.textContent = values.treble;
  dom.preampValLabel.textContent = values.preamp;

  dom.bassValLabel.style.color = colorValue(values.bass);
  dom.midValLabel.style.color = colorValue(values.mid);
  dom.trebleValLabel.style.color = colorValue(values.treble);
}

// -------------------------------
// Save EQ settings per tab
// -------------------------------
async function saveTabSettings(tabId, settings) {
  await chrome.storage.session.set({ [`eq_${tabId}`]: settings });
}

// -------------------------------
// Send EQ to content.js
// -------------------------------
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

// -------------------------------
// Only send if EQ toggle is ON
// -------------------------------
function sendEQSettingsIfEnabled() {
  if (document.getElementById('eqToggle').checked) {
    sendEQSettings();
  }
}

// -------------------------------
// Slider animation helpers
// -------------------------------
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
    sendEQSettingsIfEnabled();
  }, 10);
}

function animateToZero(slider) {
  animateSliderTo(slider, 0);
}

// -------------------------------
// Preset helpers
// -------------------------------
function removeActivePresets() {
  dom.presetButtons.forEach((b) => b.classList.remove('active'));
  dom.customBtn.classList.remove('active');
}

// -------------------------------
// Initialize popup
// -------------------------------
chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
  const tab = tabs[0];
  if (!tab?.id) return;
  currentTabId = tab.id;

  const data = await chrome.storage.session.get([
    `eq_${currentTabId}`,
    `eq_custom_${currentTabId}`,
    `eqEnabled_${currentTabId}`,
  ]);

  const settings = data[`eq_${currentTabId}`] || { bass: 0, mid: 0, treble: 0, preamp: 100 };
  const savedCustom = data[`eq_custom_${currentTabId}`];

  // Set sliders to saved values
  dom.bassControl.value = settings.bass;
  dom.midControl.value = settings.mid;
  dom.trebleControl.value = settings.treble;
  dom.preampControl.value = settings.preamp;

  lastCustomValues = savedCustom || { bass: settings.bass, mid: settings.mid, treble: settings.treble };
  updateValueLabels(settings);

  if (savedCustom &&
      savedCustom.bass === settings.bass &&
      savedCustom.mid === settings.mid &&
      savedCustom.treble === settings.treble) {
    dom.customBtn.classList.add('active');
  }

  // Initialize toggle
  const eqToggle = document.getElementById('eqToggle');
  eqToggle.checked = data[`eqEnabled_${currentTabId}`] || false;

  // Apply current settings immediately if toggle is ON
  if (eqToggle.checked) sendEQSettings();

  eqToggle.addEventListener('change', () => {
    const enabled = eqToggle.checked;
    chrome.storage.session.set({ [`eqEnabled_${currentTabId}`]: enabled });
    chrome.runtime.sendMessage({ type: 'toggleChanged', enabled, tabId: currentTabId });

    // Send current settings immediately when turning ON
    if (enabled) sendEQSettings();
  });
});

// -------------------------------
// Event listeners for sliders
// -------------------------------
[dom.bassControl, dom.midControl, dom.trebleControl, dom.preampControl].forEach((slider) => {
  slider.addEventListener('input', () => {
    // Always update labels and internal state
    updateValueLabels({
      bass: Number(dom.bassControl.value),
      mid: Number(dom.midControl.value),
      treble: Number(dom.trebleControl.value),
      preamp: Number(dom.preampControl.value),
    });

    // Only send EQ if toggle ON
    sendEQSettingsIfEnabled();

    // Update custom preset tracking
    if (slider !== dom.preampControl) {
      removeActivePresets();
      dom.customBtn.classList.add('active');
      lastCustomValues = {
        bass: Number(dom.bassControl.value),
        mid: Number(dom.midControl.value),
        treble: Number(dom.trebleControl.value),
      };
      chrome.storage.session.set({ [`eq_custom_${currentTabId}`]: lastCustomValues });
    }
  });
});

// -------------------------------
// Buttons
// -------------------------------
dom.resetBtn.addEventListener('click', () => {
  // Reset sliders to zero with animation
  [dom.bassControl, dom.midControl, dom.trebleControl].forEach(animateToZero);

  // Update labels immediately
  updateValueLabels({
    bass: 0,
    mid: 0,
    treble: 0,
    preamp: Number(dom.preampControl.value), // keep preamp unchanged
  });

  // Save reset values to session storage
  chrome.storage.session.set({
    [`eq_${currentTabId}`]: {
      bass: 0,
      mid: 0,
      treble: 0,
      preamp: Number(dom.preampControl.value),
    }
  });

  // Remove active state from presets
  removeActivePresets();

  // Only send to content.js if toggle ON
  if (document.getElementById('eqToggle').checked) {
    sendEQSettings();
  }
});

dom.customBtn.addEventListener('click', () => {
  animateSliderTo(dom.bassControl, lastCustomValues.bass);
  animateSliderTo(dom.midControl, lastCustomValues.mid);
  animateSliderTo(dom.trebleControl, lastCustomValues.treble);

  removeActivePresets();
  dom.customBtn.classList.add('active');

  sendEQSettingsIfEnabled();
});

dom.presetButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const presetName = button.getAttribute('data-preset');
    const settings = presets[presetName];
    if (!settings) return;

    // Animate sliders to preset values
    animateSliderTo(dom.bassControl, settings.bass);
    animateSliderTo(dom.midControl, settings.mid);
    animateSliderTo(dom.trebleControl, settings.treble);

    // Update labels immediately (so user sees changes even if toggle off)
    updateValueLabels({
      bass: settings.bass,
      mid: settings.mid,
      treble: settings.treble,
      preamp: Number(dom.preampControl.value),
    });

    // Save preset values to session (always)
    chrome.storage.session.set({
      [`eq_${currentTabId}`]: {
        bass: settings.bass,
        mid: settings.mid,
        treble: settings.treble,
        preamp: Number(dom.preampControl.value),
      }
    });

    // Remove active state from other presets
    removeActivePresets();
    button.classList.add('active');

    // Only send to content.js if EQ toggle is ON
    if (document.getElementById('eqToggle').checked) {
      sendEQSettings();
    }
  });
});
