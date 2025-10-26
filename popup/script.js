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

// Prevent default browser context menu on sliders
document.addEventListener("contextmenu", (e) => {
  if (e.target.matches('input[type="range"]')) {
    e.preventDefault();
    openSliderOptions(e.target, e.pageX, e.pageY);
  }
});

function openSliderOptions(slider, x, y) {
  // Remove any previous menu
  document.querySelector(".slider-menu")?.remove();

  const menu = document.createElement("div");
  menu.className = "slider-menu";
  menu.innerHTML = `
    <button data-action="reset">Reset</button>

    <div class="submenu-parent">
      <button>Configurate ▸</button>
      <div class="submenu">
        <button data-action="configGain">Gain</button>
        <button data-action="configFrequency">Frequency</button>
        <button data-action="configSlope">Q</button>
      </div>
    </div>

    <div class="submenu-parent">
      <button>Configurate all ▸</button>
      <div class="submenu">
        <button data-action="configAllGain">Gain</button>
        <button data-action="configAllFrequency">Frequency</button>
        <button data-action="configAllSlope">Q</button>
      </div>
    </div>
  `;

  document.body.appendChild(menu);
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;

  // References
  const gainContainer = document.querySelector(".gain-container");
  const frequencyContainer = document.querySelector(".frequency-container");
  const qContainer = document.querySelector(".q-container");

  // Helper to hide all config groups first
  const hideAllGroups = () => {
    gainContainer.style.display = "none";
    frequencyContainer.style.display = "none";
    qContainer.style.display = "none";
  };

  // Handle option clicks
  menu.addEventListener("click", (e) => {
    const action = e.target.dataset.action;
    if (!action) return;

    hideAllGroups(); // Always start hidden

    switch (action) {
      case "configGain":
      case "configAllGain":
        gainContainer.style.display = "flex";
        break;

      case "configFrequency":
      case "configAllFrequency":
        frequencyContainer.style.display = "flex";
        break;

      case "configSlope":
      case "configAllSlope":
        qContainer.style.display = "flex";
        break;
    }

    // Close the menu after selection
    menu.remove();
  });

  // Close the menu when clicking outside
  document.addEventListener(
    "click",
    (ev) => {
      if (!menu.contains(ev.target)) menu.remove();
    },
    { once: true }
  );
}
