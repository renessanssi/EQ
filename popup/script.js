import { dom } from './dom.js';
import { loadTabSettings } from './state.js';
import { setCurrentTab, sendEQSettings } from './messaging.js';
import { updateValueLabels, setControlsEnabled } from './ui.js';
import { animateToZero } from './animation.js';
import { removeActivePresets, initPresetButtons } from './presets-handler.js';
import { initEQGraph } from './graph.js';

// -------------------------------
// Inject content.js
// -------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  // Get current active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.id) return;

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
