import { dom } from './dom.js';
import { loadTabSettings } from './state.js';
import { setCurrentTab, sendSingleEQUpdate, sendEQSettings } from './messaging.js';
import { updateValueLabels, setControlsEnabled } from './ui.js';
import { removeActivePresets, initPresetButtons } from './presets-handler.js';
import { initEQGraph, initBarGraph } from './visualizer.js';

// Helper: merge-save EQ value
// -------------------------------
async function saveEQValue(tabId, key, value) {
  const stored = await chrome.storage.session.get(`eq_${tabId}`);
  const currentEQ = stored[`eq_${tabId}`] || {};
  currentEQ[key] = value;
  await chrome.storage.session.set({ [`eq_${tabId}`]: currentEQ });
}

// -------------------------------
// Initialize popup
// -------------------------------
chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
  const tab = tabs[0];
  if (!tab?.id) return;
  const tabId = tab.id;
  setCurrentTab(tabId);

  const { [`hasRun_${tabId}`]: hasRun } = await chrome.storage.session.get(`hasRun_${tabId}`);

  if (hasRun) {
    initBarGraph();
  } else if (tab.url.startsWith('http')) {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    await chrome.storage.session.set({ [`hasRun_${tabId}`]: true });
    initBarGraph(); // ✅ run after injecting content script
  } else {
    dom.toggleContainer.classList.add('disabled');
  }

  // Load previously saved settings
  const { eq, enabled, activePreset } = await loadTabSettings(tabId);

  // Set initial slider positions
  dom.bassControl.value   = eq.bass;
  dom.midControl.value    = eq.mid;
  dom.trebleControl.value = eq.treble;
  dom.preampControl.value = eq.preamp;
  dom.masterControl.value = eq.master;

  updateValueLabels(eq);
  setControlsEnabled(enabled);
  initPresetButtons(tabId);
  initEQGraph(dom);

  // Restore active preset button
  dom.presetButtons.find(b => b.getAttribute('data-preset') === activePreset)?.classList.add('active');
  // Deny animation
  dom.eqToggle.nextElementSibling.classList.add('no-transition');
  // Set toggle
  dom.eqToggle.checked = enabled;
  // Pass body
  document.body.classList.remove('loading');
  // Allow animation
  requestAnimationFrame(() => {
    dom.eqToggle.nextElementSibling.classList.remove('no-transition');
  });

  if (eqToggle.checked) sendEQSettings();

  // -------------------------------
  // Toggle ON/OFF handler
  // -------------------------------
  dom.eqToggle.addEventListener('change', () => {
    const isEnabled = dom.eqToggle.checked;
    setControlsEnabled(isEnabled);
    chrome.runtime.sendMessage({ type: 'toggleChanged', enabled: isEnabled, tabId });
    chrome.storage.session.set({ [`eqEnabled_${tabId}`]: isEnabled });
    sendEQSettings();
  });

  // -------------------------------
  // Slider handlers (bass/mid/treble)
  // -------------------------------
  [dom.bassControl, dom.midControl, dom.trebleControl].forEach((slider) => {
    slider.addEventListener('input', async (event) => {
      const id = event.target.id; // e.g., "bass", "mid", "treble"
      const value = Number(event.target.value);

      updateValueLabels({ [id]: value });
      sendSingleEQUpdate(id, value);
      await saveEQValue(tabId, id, value);

      if (event.isTrusted) {
        removeActivePresets();
        dom.customBtn.classList.add('active');
        chrome.storage.session.set({ [`activePreset_${tabId}`]: 'custom' });
      }
    });
  });

  // -------------------------------
  // Preamp + Master sliders
  // -------------------------------
  dom.preampControl.addEventListener('input', async () => {
    const value = Number(dom.preampControl.value);
    updateValueLabels({ preamp: value });
    sendSingleEQUpdate('preamp', value);
    await saveEQValue(tabId, 'preamp', value);
  });

  dom.masterControl.addEventListener('input', async () => {
    const value = Number(dom.masterControl.value);
    updateValueLabels({ master: value });
    sendSingleEQUpdate('master', value);
    await saveEQValue(tabId, 'master', value);
  });

  // -------------------------------
  // Right-click context menu for sliders
  // -------------------------------
  const contextMenu = document.getElementById('sliderMenu');
  const resetOption = document.getElementById('resetOption');
  let currentSlider = null;

  [dom.bassControl, dom.midControl, dom.trebleControl].forEach((slider) => {
    slider.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      currentSlider = slider;
      contextMenu.style.top = `${event.clientY}px`;
      contextMenu.style.left = `${event.clientX}px`;
      contextMenu.style.display = 'block';
    });
  });

  document.addEventListener('mousedown', (event) => {
    if (!contextMenu.contains(event.target)) {
      contextMenu.style.display = 'none';
    }
  });

  resetOption.addEventListener('click', async () => {
    if (!currentSlider) return;

    const id = currentSlider.id;
    currentSlider.value = 0;
    currentSlider.dispatchEvent(new Event('input', { bubbles: true }));

    updateValueLabels({ [id]: 0 });
    sendSingleEQUpdate(id, 0);
    await saveEQValue(tabId, id, 0);
    

    contextMenu.style.display = 'none';

    const allZero = 
    Number(dom.bassControl.value)   === 0  && 
    Number(dom.midControl.value)    === 0  && 
    Number(dom.trebleControl.value) === 0;
    
    removeActivePresets();

    if (allZero) {
      chrome.storage.session.set({ [`activePreset_${tabId}`]: 'reset' });
    } else
    {
      dom.customBtn.classList.add('active');
      chrome.storage.session.set({ [`activePreset_${tabId}`]: 'custom' });
    }
  });

  // -------------------------------
  // Ensure graph redraw
  // -------------------------------
  if (window.redrawEQGraph) {
    window.redrawEQGraph(eq);
  }
});

// Custom dropdown logic
document.querySelectorAll('.mode-container, .configurator-container').forEach(container => {
  const selected = container.querySelector('.selected');
  const options = container.querySelector('.options');

  selected.addEventListener('click', () => {
    container.classList.toggle('open');
  });

  options.querySelectorAll('div').forEach(option => {
    option.addEventListener('click', () => {
      selected.textContent = option.textContent;
      selected.dataset.value = option.dataset.value;
      container.classList.remove('open');
    });
  });
});

// Close all dropdowns when clicking outside
document.addEventListener('click', (e) => {
  document.querySelectorAll('.mode-container.open, .configurator-container.open').forEach(openContainer => {
    if (!openContainer.contains(e.target)) openContainer.classList.remove('open');
  });
});