import { dom } from './dom.js';
import { loadTabSettings } from './state.js';
import { setCurrentTab, sendSingleEQUpdate } from './messaging.js';
import { updateValueLabels, setControlsEnabled } from './ui.js';
import { animateToZero } from './animation.js';
import { removeActivePresets, initPresetButtons } from './presets-handler.js';
import { initEQGraph, initBarGraph } from './visualizer.js';

// -------------------------------
// Initialize popup
// -------------------------------
chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {  
  const tab = tabs[0];
  if (!tab?.id) return;
  const tabId = tab.id;
  setCurrentTab(tabId);

  const { [`hasRun_${tabId}`]: hasRun } = await chrome.storage.session.get(`hasRun_${tabId}`);

  if (!hasRun) {
    if (tab.url.startsWith('http')) {
      await chrome.scripting.executeScript({target: { tabId: tab.id }, files: ['content.js']});
      await chrome.storage.session.set({ [`hasRun_${tabId}`]: true });

      initBarGraph();
    } else {
      dom.toggleContainer.classList.add('disabled');
    }
  }

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
  dom.eqToggle.checked = enabled;
  if (enabled) {
    for (const [key, value] of Object.entries(eq)) {
      sendSingleEQUpdate(key, value);
    }
  }

  // -------------------------------
  // Toggle ON/OFF handler
  // -------------------------------
  dom.eqToggle.addEventListener('change', () => {
    const isEnabled = dom.eqToggle.checked;
    setControlsEnabled(isEnabled);
    chrome.runtime.sendMessage({ type: 'toggleChanged', enabled: isEnabled, tabId });
    chrome.storage.session.set({ [`eqEnabled_${tabId}`]: isEnabled });
    for (const [key, value] of Object.entries(eq)) {
      sendSingleEQUpdate(key, value);
    }
  });

  // -------------------------------
  // Slider handlers
  // -------------------------------
  [dom.bassControl, dom.midControl, dom.trebleControl].forEach((slider) => {
    slider.addEventListener('input', (event) => {
      const id = event.target.id; // e.g., "bass", "mid", "treble"
      const value = Number(event.target.value);

      updateValueLabels({ [id]: value });

      if (eqToggle.checked) sendSingleEQUpdate(id, value);

      if (event.isTrusted) {
        removeActivePresets();
        dom.customBtn.classList.add('active');
        chrome.storage.session.set({ [`activePreset_${tabId}`]: 'custom' });
      }
    });
  });

  dom.preampControl.addEventListener('input', () => {
    const value = Number(dom.preampControl.value);
    updateValueLabels({ preamp: value });
    sendSingleEQUpdate('preamp', value);
  });

  dom.masterControl.addEventListener('input', () => {
    const value = Number(dom.masterControl.value);
    updateValueLabels({ master: value });
    sendSingleEQUpdate('master', value);
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
    for (const [key, value] of Object.entries(eq)) {
      sendSingleEQUpdate(key, value);
    }
  });

  // Ensure graph redraw
  if (window.redrawEQGraph) {
    window.redrawEQGraph(eq);
  }
});
