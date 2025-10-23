import { dom } from './dom.js';
import { presets } from './presets.js';

let currentTabId = null;

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
}

// -------------------------------
// Enable / disable controls based on toggle
// -------------------------------
function setControlsEnabled(enabled) {
  // Sliders
  [dom.bassControl, dom.midControl, dom.trebleControl, dom.preampControl].forEach(slider => {
    slider.disabled = !enabled;
  });

  // Buttons
  [dom.resetBtn, dom.customBtn, ...dom.presetButtons].forEach(btn => {
    btn.disabled = !enabled;
  });

  // Optional dim overlay
  const eqContainer = document.querySelector('.equalizer-container');
  if (eqContainer) {
    eqContainer.classList.toggle('disabled', !enabled);
  }
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
    `eqEnabled_${currentTabId}`,
    `activePreset_${currentTabId}`,
  ]);

  const settings = data[`eq_${currentTabId}`] || { bass: 0, mid: 0, treble: 0, preamp: 100 };
  const activePresetName = data[`activePreset_${currentTabId}`];

  // Set sliders to saved values
  dom.bassControl.value = settings.bass;
  dom.midControl.value = settings.mid;
  dom.trebleControl.value = settings.treble;
  dom.preampControl.value = settings.preamp;

  updateValueLabels(settings);

  // Restore active preset button
  removeActivePresets();
  if (activePresetName) {
    if (activePresetName === 'custom') {
      dom.customBtn.classList.add('active');
    } else {
      const btn = dom.presetButtons.find(b => b.getAttribute('data-preset') === activePresetName);
      if (btn) btn.classList.add('active');
    }
  }

  // Initialize toggle
  const eqToggle = document.getElementById('eqToggle');
  eqToggle.checked = data[`eqEnabled_${currentTabId}`] || false;

  // Enable / disable controls according to toggle
  setControlsEnabled(eqToggle.checked);

  if (eqToggle.checked) sendEQSettings();

  eqToggle.addEventListener('change', () => {
    const enabled = eqToggle.checked;
    chrome.storage.session.set({ [`eqEnabled_${currentTabId}`]: enabled });
    chrome.runtime.sendMessage({ type: 'toggleChanged', enabled, tabId: currentTabId });

    setControlsEnabled(enabled);

    if (enabled) sendEQSettings();
  });
});

// -------------------------------
// Preamp slider
// -------------------------------
dom.preampControl.addEventListener('input', () => {
  updateValueLabels({
    preamp: Number(dom.preampControl.value)
  });

  sendEQSettingsIfEnabled();
});

// -------------------------------
// Equalizer sliders
// -------------------------------
[dom.bassControl, dom.midControl, dom.trebleControl].forEach((slider) => {
  slider.addEventListener('input', () => {
    updateValueLabels({
      bass: Number(dom.bassControl.value),
      mid: Number(dom.midControl.value),
      treble: Number(dom.trebleControl.value)
    });

    sendEQSettingsIfEnabled();

    // Highlight Custom mode
    removeActivePresets();
    dom.customBtn.classList.add('active');

    // Save "custom" preset
    chrome.storage.session.set({ [`activePreset_${currentTabId}`]: 'custom' });
    saveTabSettings(currentTabId, {
      bass: Number(dom.bassControl.value),
      mid: Number(dom.midControl.value),
      treble: Number(dom.trebleControl.value)
    }, 'custom');
  });
});

// -------------------------------
// Reset button
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
    [`eq_${currentTabId}`]: { bass: 0, mid: 0, treble: 0, preamp: Number(dom.preampControl.value) },
    [`activePreset_${currentTabId}`]: null,
  });

  removeActivePresets();

  if (document.getElementById('eqToggle').checked) sendEQSettings();
});

// -------------------------------
// Preset buttons
// -------------------------------
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
