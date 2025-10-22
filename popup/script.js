import { dom } from './dom.js';
import { presets } from './presets.js';

let currentTabId = null;
let lastCustomValues = { bass: 0, mid: 0, treble: 0 };

// -------------------------------
// Update numeric labels & colors
// -------------------------------
function updateValueLabels(values) {
  const colorValue = (val) => (val > 0 ? '#d6c372' : val < 0 ? '#bec7c7' : '#2f2f2fff');

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
async function saveTabSettings(tabId, settings, presetName = null) {
  const data = { [`eq_${tabId}`]: settings };
  if (presetName !== null) data[`activePreset_${tabId}`] = presetName;
  await chrome.storage.session.set(data);
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
    `activePreset_${currentTabId}`,
  ]);

  const settings = data[`eq_${currentTabId}`] || { bass: 0, mid: 0, treble: 0, preamp: 100 };
  const savedCustom = data[`eq_custom_${currentTabId}`];
  const activePresetName = data[`activePreset_${currentTabId}`];

  // Set sliders to saved values
  dom.bassControl.value = settings.bass;
  dom.midControl.value = settings.mid;
  dom.trebleControl.value = settings.treble;
  dom.preampControl.value = settings.preamp;

  lastCustomValues = savedCustom || { bass: settings.bass, mid: settings.mid, treble: settings.treble };
  updateValueLabels(settings);

  // Restore active preset button
  removeActivePresets();
  if (activePresetName) {
    const btn = dom.presetButtons.find(b => b.getAttribute('data-preset') === activePresetName);
    if (btn) btn.classList.add('active');
  } else if (savedCustom) {
    if (
      savedCustom.bass === Number(dom.bassControl.value) &&
      savedCustom.mid === Number(dom.midControl.value) &&
      savedCustom.treble === Number(dom.trebleControl.value)
    ) {
      dom.customBtn.classList.add('active');
    }
  }

  // Initialize toggle
  const eqToggle = document.getElementById('eqToggle');
  eqToggle.checked = data[`eqEnabled_${currentTabId}`] || false;

  if (eqToggle.checked) sendEQSettings();

  eqToggle.addEventListener('change', () => {
    const enabled = eqToggle.checked;
    chrome.storage.session.set({ [`eqEnabled_${currentTabId}`]: enabled });
    chrome.runtime.sendMessage({ type: 'toggleChanged', enabled, tabId: currentTabId });

    if (enabled) sendEQSettings();
  });
});

// -------------------------------
// Event listeners for sliders
// -------------------------------
[dom.bassControl, dom.midControl, dom.trebleControl].forEach((slider) => {
  slider.addEventListener('input', () => {
    updateValueLabels({
      bass: Number(dom.bassControl.value),
      mid: Number(dom.midControl.value),
      treble: Number(dom.trebleControl.value),
      preamp: Number(dom.preampControl.value),
    });

    sendEQSettingsIfEnabled();

    // Manual change → activate Custom
    removeActivePresets();
    dom.customBtn.classList.add('active');

    lastCustomValues = {
      bass: Number(dom.bassControl.value),
      mid: Number(dom.midControl.value),
      treble: Number(dom.trebleControl.value),
    };

    chrome.storage.session.set({ [`eq_custom_${currentTabId}`]: lastCustomValues });
    chrome.storage.session.set({ [`activePreset_${currentTabId}`]: null });
  });
});

// -------------------------------
// Buttons
// -------------------------------
dom.resetBtn.addEventListener('click', () => {
  [dom.bassControl, dom.midControl, dom.trebleControl].forEach(animateToZero);

  updateValueLabels({
    bass: 0,
    mid: 0,
    treble: 0,
    preamp: Number(dom.preampControl.value),
  });

  chrome.storage.session.set({
    [`eq_${currentTabId}`]: {
      bass: 0,
      mid: 0,
      treble: 0,
      preamp: Number(dom.preampControl.value),
    },
    [`activePreset_${currentTabId}`]: null,
  });

  removeActivePresets();

  if (document.getElementById('eqToggle').checked) sendEQSettings();
});

// Custom button
dom.customBtn.addEventListener('click', () => {
  animateSliderTo(dom.bassControl, lastCustomValues.bass);
  animateSliderTo(dom.midControl, lastCustomValues.mid);
  animateSliderTo(dom.trebleControl, lastCustomValues.treble);

  removeActivePresets();
  dom.customBtn.classList.add('active');

  saveTabSettings(currentTabId, {
    bass: lastCustomValues.bass,
    mid: lastCustomValues.mid,
    treble: lastCustomValues.treble,
    preamp: Number(dom.preampControl.value),
  }, null);

  sendEQSettingsIfEnabled();
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

    updateValueLabels({
      bass: settings.bass,
      mid: settings.mid,
      treble: settings.treble,
      preamp: Number(dom.preampControl.value),
    });

    saveTabSettings(currentTabId, {
      bass: settings.bass,
      mid: settings.mid,
      treble: settings.treble,
      preamp: Number(dom.preampControl.value),
    }, presetName);

    removeActivePresets();
    button.classList.add('active');

    sendEQSettingsIfEnabled();
  });
});
