import { dom } from './dom.js';
import { loadTabSettings } from './state.js';
import { setCurrentTab, sendEQSettings } from './messaging.js';
import { updateValueLabels, setControlsEnabled } from './ui.js';
import { animateToZero } from './animation.js';
import { removeActivePresets, initPresetButtons } from './presets-handler.js';
import { initEQGraph, initBarGraph } from './visualizer.js';

// -------------------------------
// Inject content.js
// -------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  // Get current active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.id || !tab.url) return;
  
  // Only run on http or https pages
  if (!tab.url.startsWith("http://") && !tab.url.startsWith("https://")) return;  

  // Inject content.js dynamically
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js']
  });
});

// -------------------------------
// Initialize popup
// -------------------------------
chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
  const tab = tabs[0];
  if (!tab?.id) return;
  const tabId = tab.id;
  setCurrentTab(tabId);

  // Load previously saved settings
  const { eq, enabled, activePreset } = await loadTabSettings(tabId);

  // Set initial slider positions
  dom.bassControl.value = eq.bass;
  dom.midControl.value = eq.mid;
  dom.trebleControl.value = eq.treble;
  dom.preampControl.value = eq.preamp;
  dom.masterControl.value = eq.master;

  updateValueLabels(eq);
  setControlsEnabled(enabled);
  initPresetButtons(tabId);
  initEQGraph(dom);
  if (tab.url.startsWith("http://") || tab.url.startsWith("https://")) initBarGraph();

  // Restore active preset button
  removeActivePresets();
  if (activePreset) {
    if (activePreset === 'custom') {
      dom.customBtn.classList.add('active');
    } else {
      const btn = dom.presetButtons.find(b => b.getAttribute('data-preset') === activePreset);
      if (btn) btn.classList.add('active');
    }
  }

  // Initialize toggle state
  const eqToggle = document.getElementById('eqToggle');
  eqToggle.checked = enabled;
  if (enabled) sendEQSettings();

  // -------------------------------
  // Toggle ON/OFF handler
  // -------------------------------
  eqToggle.addEventListener('change', () => {
    const isEnabled = eqToggle.checked;
    chrome.storage.session.set({ [`eqEnabled_${tabId}`]: isEnabled });
    chrome.runtime.sendMessage({ type: 'toggleChanged', enabled: isEnabled, tabId });
    setControlsEnabled(isEnabled);
    if (isEnabled) sendEQSettings();
  });

  // -------------------------------
  // Slider handlers
  // -------------------------------
  dom.preampControl.addEventListener('input', () => {
    updateValueLabels({ preamp: Number(dom.preampControl.value) });
    if (eqToggle.checked) sendEQSettings();
  });

  dom.masterControl.addEventListener('input', () => {
    updateValueLabels({ master: Number(dom.masterControl.value) });
    if (eqToggle.checked) sendEQSettings();
  });

  [dom.bassControl, dom.midControl, dom.trebleControl].forEach((slider) => {
    slider.addEventListener('input', (event) => {
      updateValueLabels({
        bass: Number(dom.bassControl.value),
        mid: Number(dom.midControl.value),
        treble: Number(dom.trebleControl.value)
      });

      if (eqToggle.checked) sendEQSettings();

      if (event.isTrusted) {
        removeActivePresets();
        dom.customBtn.classList.add('active');
        chrome.storage.session.set({ [`activePreset_${tabId}`]: 'custom' });
      }
    });
  });

  // -------------------------------
  // Reset button
  // -------------------------------
  dom.resetBtn.addEventListener('click', () => {
    [dom.bassControl, dom.midControl, dom.trebleControl].forEach(animateToZero);
    updateValueLabels({ bass: 0, mid: 0, treble: 0 });

    chrome.storage.session.set({
      [`eq_${tabId}`]: { bass: 0, mid: 0, treble: 0 },
      [`activePreset_${tabId}`]: null,
    });

    removeActivePresets();
    if (eqToggle.checked) sendEQSettings();
  });

  // Ensure graph redraw
  if (window.redrawEQGraph) {
    window.redrawEQGraph(eq);
  }
});

// script.js

const modeSelect = document.querySelector('.mode-container');
const configSelect = document.querySelector('.configurator-container');

// Define options for each mode
const optionsByMode = {
  bands: [
    { value: 'gain', text: 'Gain (dB)' },
    { value: 'frequency', text: 'Frequency (Hz)' },
    { value: 'slope', text: 'Slope (Q)' }
  ],
  filters: [
    { value: 'frequency', text: 'Frequency (Hz)' },
    { value: 'slope', text: 'Slope (Q)' }
  ],
  effects: [
    { value: 'gain', text: 'Gain (dB)' }
  ]
};

// Containers
const bandContainer = document.querySelector('.band-container');
const passContainer = document.querySelector('.pass-container');
const effectContainer = document.querySelector('.effect-container');

// Function to update configurator options
function updateConfiguratorOptions() {
  const selectedMode = modeSelect.value;

  // Clear existing options
  configSelect.innerHTML = '';

  // Add new options
  optionsByMode[selectedMode].forEach(opt => {
    const optionElement = document.createElement('option');
    optionElement.value = opt.value;
    optionElement.textContent = opt.text;
    configSelect.appendChild(optionElement);
  });
}

// Function to update container visibility
function updateContainers() {
  const mode = modeSelect.value;

  // Hide all by default
  bandContainer.style.display = 'none';
  passContainer.style.display = 'none';
  effectContainer.style.display = 'none';

  if (mode === 'bands') {
    bandContainer.style.display = 'flex';
  } else if (mode === 'filters') {
    passContainer.style.display = 'flex';
  } else if (mode === 'effects') {
    effectContainer.style.display = 'flex';
  }
}

// Initialize on page load
updateConfiguratorOptions();
updateContainers();

// Listen for mode changes
modeSelect.addEventListener('change', () => {
  updateConfiguratorOptions();
  updateContainers();
});
