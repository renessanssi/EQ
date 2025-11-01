import { dom } from './dom.js';
import { updateValueLabels, setControlsEnabled } from './ui.js';
import { sendSingleEQUpdate, sendEQSettings } from './messaging.js';
import { removeActivePresets, initPresetButtons } from './presets-handler.js';
import { saveEQValue } from './storage-helpers.js';
import { loadTabSettings } from './state.js';
import { initEQGraph } from './visualizer.js';

export async function initEQControls(tabId) {
  const { eq, enabled, activePreset } = await loadTabSettings(tabId);

  // -------------------------
  // Initialize sliders
  // -------------------------
  dom.bassControl.value = eq.bass;
  dom.midControl.value = eq.mid;
  dom.trebleControl.value = eq.treble;
  dom.preampControl.value = eq.preamp;
  dom.masterControl.value = eq.master;

  updateValueLabels(eq);
  setControlsEnabled(enabled);

  // -------------------------
  // Presets
  // -------------------------
  initPresetButtons(tabId);
  dom.presetButtons
    .find((b) => b.getAttribute('data-preset') === activePreset)
    ?.classList.add('active');

  // -------------------------
  // EQ toggle
  // -------------------------
  dom.eqToggle.checked = enabled;
  if (enabled) sendEQSettings();

  dom.eqToggle.addEventListener('change', () => {
    const isEnabled = dom.eqToggle.checked;
    setControlsEnabled(isEnabled);
    chrome.runtime.sendMessage({ type: 'toggleChanged', enabled: isEnabled, tabId });
    chrome.storage.session.set({ [`eqEnabled_${tabId}`]: isEnabled });
    sendEQSettings();
  });

  // -------------------------
  // EQ graph
  // -------------------------
  const eqGraph = initEQGraph(dom);

  // -------------------------
  // Slider inputs (bass/mid/treble)
  // -------------------------
  [dom.bassControl, dom.midControl, dom.trebleControl].forEach((slider) => {
    slider.addEventListener('input', async (e) => {
      const id = e.target.id;
      const value = Number(e.target.value);

      updateValueLabels({ [id]: value });
      sendSingleEQUpdate(id, value);
      await saveEQValue(tabId, id, value);

      eqGraph.redrawEQGraph({
        bass: +dom.bassControl.value,
        mid: +dom.midControl.value,
        treble: +dom.trebleControl.value,
      });

      if (e.isTrusted) {
        removeActivePresets();
        dom.customBtn.classList.add('active');
        chrome.storage.session.set({ [`activePreset_${tabId}`]: 'custom' });
      }
    });
  });

  // -------------------------
  // Preamp & Master sliders
  // -------------------------
  [dom.preampControl, dom.masterControl].forEach((control) => {
    control.addEventListener('input', async (e) => {
      const id = e.target.id;
      const value = Number(e.target.value);

      updateValueLabels({ [id]: value });
      sendSingleEQUpdate(id, value);
      await saveEQValue(tabId, id, value);
    });
  });

  // -------------------------
  // Right-click reset menu
  // -------------------------
  let currentSlider = null;

  dom.sliders.slice(0, 3).forEach((slider) => { // bass/mid/treble only
    slider.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      currentSlider = slider;
      dom.contextMenu.style.top = `${e.clientY}px`;
      dom.contextMenu.style.left = `${e.clientX}px`;
      dom.contextMenu.style.display = 'block';
    });
  });

  document.addEventListener('mousedown', (e) => {
    if (!dom.contextMenu.contains(e.target)) dom.contextMenu.style.display = 'none';
  });

  dom.resetOption.addEventListener('click', async () => {
    if (!currentSlider) return;
    const id = currentSlider.id;
    currentSlider.value = 0;
    currentSlider.dispatchEvent(new Event('input', { bubbles: true }));
    updateValueLabels({ [id]: 0 });
    sendSingleEQUpdate(id, 0);
    await saveEQValue(tabId, id, 0);
    dom.contextMenu.style.display = 'none';

    const allZero =
      +dom.bassControl.value === 0 &&
      +dom.midControl.value === 0 &&
      +dom.trebleControl.value === 0;

    removeActivePresets();
    chrome.storage.session.set({
      [`activePreset_${tabId}`]: allZero ? 'reset' : 'custom',
    });

    eqGraph.redrawEQGraph({
      bass: +dom.bassControl.value,
      mid: +dom.midControl.value,
      treble: +dom.trebleControl.value,
    });
  });

  // -------------------------
  // Mid-Q slider
  // -------------------------
  const { midQSlider, midQValLabel } = dom;
  const savedMidQ = await chrome.storage.session.get(`midQ_${tabId}`);
  midQSlider.value = savedMidQ[`midQ_${tabId}`] ?? 1;
  midQValLabel.textContent = midQSlider.value;

  midQSlider.addEventListener('input', async (e) => {
    const value = Number(e.target.value);
    midQValLabel.textContent = value.toFixed(2);
    sendSingleEQUpdate('midQ', value);
    await chrome.storage.session.set({ [`midQ_${tabId}`]: value });
    eqGraph.redrawEQGraph({ midQ: value });
  });

  // -------------------------
  // Initial redraw
  // -------------------------
  eqGraph.redrawEQGraph(eq);
}
