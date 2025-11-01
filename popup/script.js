import { dom } from './dom.js';
import { loadTabSettings, saveDropdownOption, loadDropdownOption } from './state.js';
import { setCurrentTab, sendSingleEQUpdate, sendEQSettings } from './messaging.js';
import { updateValueLabels, setControlsEnabled } from './ui.js';
import { removeActivePresets, initPresetButtons } from './presets-handler.js';
import { initEQGraph, initBarGraph } from './visualizer.js';

// -------------------------------
// Helper: merge-save EQ value
// -------------------------------
async function saveEQValue(tabId, key, value) {
  const stored = await chrome.storage.session.get(`eq_${tabId}`);
  const currentEQ = stored[`eq_${tabId}`] || {};
  currentEQ[key] = value;
  await chrome.storage.session.set({ [`eq_${tabId}`]: currentEQ });
}

// -------------------------------
// Default EQ band frequencies
// -------------------------------
const DEFAULT_FREQUENCIES = {
  bass: 60,
  mid: 1000,
  treble: 12000
};

// -------------------------------
// Logarithmic mapping helpers
// -------------------------------
const minFreq = 20;
const maxFreq = 20000;

function percentToFreq(percent) {
  const logMin = Math.log10(minFreq);
  const logMax = Math.log10(maxFreq);
  return Math.round(Math.pow(10, logMin + (percent / 100) * (logMax - logMin)));
}

function freqToPercent(freq) {
  const logMin = Math.log10(minFreq);
  const logMax = Math.log10(maxFreq);
  return ((Math.log10(freq) - logMin) / (logMax - logMin)) * 100;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
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
    initBarGraph();
  } else {
    dom.toggleContainer.classList.add('disabled');
  }

  // Load previously saved settings
  const { eq, enabled, activePreset } = await loadTabSettings(tabId);

  // -------------------------------
  // Load saved or default frequencies
  // -------------------------------
  const savedFreqs = await chrome.storage.session.get([
    `freq_bass_${tabId}`,
    `freq_mid_${tabId}`,
    `freq_treble_${tabId}`
  ]);

  const currentFreqs = {
    bass: savedFreqs[`freq_bass_${tabId}`] || DEFAULT_FREQUENCIES.bass,
    mid: savedFreqs[`freq_mid_${tabId}`] || DEFAULT_FREQUENCIES.mid,
    treble: savedFreqs[`freq_treble_${tabId}`] || DEFAULT_FREQUENCIES.treble
  };

  // -------------------------------
  // Set initial slider positions
  // -------------------------------
  dom.bassControl.value   = eq.bass;
  dom.midControl.value    = eq.mid;
  dom.trebleControl.value = eq.treble;
  dom.preampControl.value = eq.preamp;
  dom.masterControl.value = eq.master;

  updateValueLabels(eq);
  setControlsEnabled(enabled);
  initPresetButtons(tabId);

  // ✅ initialize EQ Graph and capture handles
  const eqGraph = initEQGraph(dom); // returns { redrawEQGraph, updateEQFrequencies }

  // Restore active preset button
  dom.presetButtons.find(b => b.getAttribute('data-preset') === activePreset)?.classList.add('active');

  // Disable transition during setup
  dom.eqToggle.nextElementSibling.classList.add('no-transition');
  dom.eqToggle.checked = enabled;
  document.body.classList.remove('loading');
  requestAnimationFrame(() => dom.eqToggle.nextElementSibling.classList.remove('no-transition'));

  if (dom.eqToggle.checked) sendEQSettings();

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
  [dom.bassControl, dom.midControl, dom.trebleControl].forEach(slider => {
    slider.addEventListener('input', async (event) => {
      const id = event.target.id;
      const value = Number(event.target.value);

      updateValueLabels({ [id]: value });
      sendSingleEQUpdate(id, value);
      await saveEQValue(tabId, id, value);

      // 🔥 Update live EQ curve visually
      eqGraph.redrawEQGraph({
        bass: Number(dom.bassControl.value),
        mid: Number(dom.midControl.value),
        treble: Number(dom.trebleControl.value)
      });

      if (event.isTrusted) {
        removeActivePresets();
        dom.customBtn.classList.add('active');
        chrome.storage.session.set({ [`activePreset_${tabId}`]: 'custom' });
      }
    });
  });

  // Preamp + Master sliders
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
  // Right-click context menu
  // -------------------------------
  const contextMenu = document.getElementById('sliderMenu');
  const resetOption = document.getElementById('resetOption');
  let currentSlider = null;

  [dom.bassControl, dom.midControl, dom.trebleControl].forEach(slider => {
    slider.addEventListener('contextmenu', event => {
      event.preventDefault();
      currentSlider = slider;
      contextMenu.style.top = `${event.clientY}px`;
      contextMenu.style.left = `${event.clientX}px`;
      contextMenu.style.display = 'block';
    });
  });

  document.addEventListener('mousedown', event => {
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
      Number(dom.bassControl.value) === 0 &&
      Number(dom.midControl.value) === 0 &&
      Number(dom.trebleControl.value) === 0;

    removeActivePresets();

    if (allZero) {
      chrome.storage.session.set({ [`activePreset_${tabId}`]: 'reset' });
    } else {
      dom.customBtn.classList.add('active');
      chrome.storage.session.set({ [`activePreset_${tabId}`]: 'custom' });
    }

    // 🔥 Update EQ graph after reset
    eqGraph.redrawEQGraph({
      bass: Number(dom.bassControl.value),
      mid: Number(dom.midControl.value),
      treble: Number(dom.trebleControl.value)
    });
  });

  // 🔥 Draw graph with current EQ values
  eqGraph.redrawEQGraph(eq);

  // -------------------------------
  // Dropdown logic with persistence
  // -------------------------------
  const configContainer = document.getElementById('configSelect');
  if (configContainer) {
    const selected = configContainer.querySelector('.selected');
    const options = configContainer.querySelector('.options');

    const savedOption = await loadDropdownOption(tabId);
    selected.textContent = savedOption;
    selected.dataset.value = savedOption;

    const gainContainer = document.querySelector('.gain-container');
    const frequencyContainer = document.querySelector('.frequency-container');
    const qContainer = document.querySelector('.q-container');

    function showConfigOption(option) {
      gainContainer.style.display = option === 'gain' ? 'flex' : 'none';
      frequencyContainer.style.display = option === 'frequency' ? 'flex' : 'none';
      qContainer.style.display = option === 'quality' ? 'flex' : 'none';
    }

    showConfigOption(savedOption);

    selected.addEventListener('click', () => configContainer.classList.toggle('open'));

    options.querySelectorAll('div').forEach(option => {
      option.addEventListener('click', async () => {
        const value = option.dataset.value;
        selected.textContent = option.textContent;
        selected.dataset.value = value;
        configContainer.classList.remove('open');
        showConfigOption(value);
        await saveDropdownOption(tabId, value);
      });
    });
  }

  // -------------------------------
  // Frequency knobs (live graph update)
  // -------------------------------
  const knobs = [
    document.getElementById('freqKnob1'),
    document.getElementById('freqKnob2'),
    document.getElementById('freqKnob3')
  ];
  const labels = [
    document.getElementById('freqLabel1'),
    document.getElementById('freqLabel2'),
    document.getElementById('freqLabel3')
  ];
  const slider = document.querySelector('.freq-slider');
  let activeKnob = null;

  const initialFreqs = [currentFreqs.bass, currentFreqs.mid, currentFreqs.treble];
  initialFreqs.forEach((freq, i) => {
    const percent = freqToPercent(freq);
    const freqText = freq >= 1000 ? (freq / 1000).toFixed(1) + ' kHz' : freq + ' Hz';
    knobs[i].style.left = percent + '%';
    labels[i].style.left = percent + '%';
    labels[i].textContent = freqText;
  });

  dom.bassTextLabel.textContent = labels[0].textContent;
  dom.midTextLabel.textContent = labels[1].textContent;
  dom.trebleTextLabel.textContent = labels[2].textContent;

  knobs.forEach((knob, i) => {
    knob.addEventListener('mousedown', (e) => {
      e.preventDefault();
      activeKnob = i;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  });

  async function saveKnobFrequency(index, freq) {
    const key =
      index === 0 ? `freq_bass_${tabId}` :
      index === 1 ? `freq_mid_${tabId}` :
                    `freq_treble_${tabId}`;
    await chrome.storage.session.set({ [key]: freq });
  }

  function onMouseMove(e) {
    if (activeKnob === null) return;

    const sliderRect = slider.getBoundingClientRect();
    const relativeX = e.clientX - sliderRect.left;
    let percent = (relativeX / sliderRect.width) * 100;

    const min = activeKnob === 0 ? 0 : parseFloat(knobs[activeKnob - 1].style.left);
    const max = activeKnob === knobs.length - 1 ? 100 : parseFloat(knobs[activeKnob + 1].style.left);
    percent = clamp(percent, min + 1, max - 1);

    knobs[activeKnob].style.left = percent + '%';
    const freq = percentToFreq(percent);
    const freqText = freq >= 1000 ? (freq / 1000).toFixed(1) + ' kHz' : freq + ' Hz';

    labels[activeKnob].textContent = freqText;
    labels[activeKnob].style.left = percent + '%';

    switch (activeKnob) {
      case 0: dom.bassTextLabel.textContent = freqText; break;
      case 1: dom.midTextLabel.textContent = freqText; break;
      case 2: dom.trebleTextLabel.textContent = freqText; break;
    }

    saveKnobFrequency(activeKnob, freq);

    // 🔥 Live update EQ graph frequency response
    eqGraph.updateEQFrequencies({
      [activeKnob === 0 ? 'bass' : activeKnob === 1 ? 'mid' : 'treble']: freq
    });
  }

  function onMouseUp() {
    activeKnob = null;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }
});

// Close dropdowns when clicking outside
document.addEventListener('click', e => {
  document.querySelectorAll('.mode-container.open, .configurator-container.open').forEach(openContainer => {
    if (!openContainer.contains(e.target)) openContainer.classList.remove('open');
  });
});
