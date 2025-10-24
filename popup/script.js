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
    slider.dispatchEvent(new Event('input'));
    count++;
    if (count >= steps) {
      slider.value = target;
      slider.dispatchEvent(new Event('input'));
      clearInterval(interval);
    }
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
  [dom.bassControl, dom.midControl, dom.trebleControl, dom.preampControl].forEach(slider => {
    slider.disabled = !enabled;
  });

  [dom.resetBtn, dom.customBtn, ...dom.presetButtons].forEach(btn => {
    btn.disabled = !enabled;
  });

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

  // ✅ Force graph redraw when popup reopens
  if (window.eqGraphInjected && typeof window.redrawEQGraph === 'function') {
    window.redrawEQGraph(settings);
  }

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
  slider.addEventListener('input', (event) => {
    updateValueLabels({
      bass: Number(dom.bassControl.value),
      mid: Number(dom.midControl.value),
      treble: Number(dom.trebleControl.value)
    });

    sendEQSettingsIfEnabled();

    if (event.isTrusted) {
      removeActivePresets();
      dom.customBtn.classList.add('active');
      chrome.storage.session.set({ [`activePreset_${currentTabId}`]: 'custom' });
      saveTabSettings(currentTabId, {
        bass: Number(dom.bassControl.value),
        mid: Number(dom.midControl.value),
        treble: Number(dom.trebleControl.value)
      }, 'custom');
    }
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

// -------------------------------
// Graph initialization
// -------------------------------
if (!window.eqGraphInjected) {
  window.eqGraphInjected = true;

  const context = new (window.AudioContext || window.webkitAudioContext)();
  const filters = {
    bass: context.createBiquadFilter(),
    mid: context.createBiquadFilter(),
    treble: context.createBiquadFilter()
  };

  filters.bass.type = 'lowshelf';
  filters.bass.frequency.value = 60;
  filters.bass.gain.value = 0;

  filters.mid.type = 'peaking';
  filters.mid.frequency.value = 1000;
  filters.mid.Q.value = 1;
  filters.mid.gain.value = 0;

  filters.treble.type = 'highshelf';
  filters.treble.frequency.value = 12000;
  filters.treble.gain.value = 0;

  const preamp = context.createGain();
  preamp.gain.value = 1;

  const canvas = document.getElementById('eqCanvas');
  const ctx = canvas.getContext('2d');

  const POINTS = 512;
  const freqs = new Float32Array(POINTS);
  const fmin = 20, fmax = 20000;
  for (let i = 0; i < POINTS; i++) {
    const frac = i / (POINTS - 1);
    freqs[i] = fmin * Math.pow(fmax / fmin, frac);
  }
  const mag = {
    bass: new Float32Array(POINTS),
    mid: new Float32Array(POINTS),
    treble: new Float32Array(POINTS)
  };

  function dBtoLinear(db) { return Math.pow(10, db / 20); }
  function dbToY(db, top, bottom, plotH) { return ((top - db) / (top - bottom)) * plotH; }
  function freqToX(freq, plotW) { return (Math.log10(freq / 20) / Math.log10(20000 / 20)) * plotW; }

  function wireSlider(slider, valElem, onChange) {
    slider.addEventListener('input', e => {
      valElem.textContent = e.target.value;
      onChange(Number(e.target.value));
      draw();
    });
  }

  wireSlider(dom.preampControl, dom.preampValLabel, v => preamp.gain.value = dBtoLinear((v - 100) / 10));
  wireSlider(dom.bassControl, dom.bassValLabel, v => filters.bass.gain.value = v);
  wireSlider(dom.midControl, dom.midValLabel, v => filters.mid.gain.value = v);
  wireSlider(dom.trebleControl, dom.trebleValLabel, v => filters.treble.gain.value = v);

  function computeResponses() {
    filters.bass.getFrequencyResponse(freqs, mag.bass, new Float32Array(POINTS));
    filters.mid.getFrequencyResponse(freqs, mag.mid, new Float32Array(POINTS));
    filters.treble.getFrequencyResponse(freqs, mag.treble, new Float32Array(POINTS));
  }

  function draw() {
    computeResponses();

    const w = canvas.width = canvas.clientWidth * devicePixelRatio;
    const h = canvas.height = canvas.clientHeight * devicePixelRatio;
    ctx.resetTransform();
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    const margin = { left: 0, right: 0, top: 20, bottom: 20 };
    const plotW = canvas.clientWidth - margin.left - margin.right;
    const plotH = canvas.clientHeight - margin.top - margin.bottom;

    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    ctx.fillRect(margin.left, margin.top, plotW, plotH);

    const freqTicks = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let f of freqTicks) {
      const x = margin.left + freqToX(f, plotW);
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, margin.top + plotH);
    }
    ctx.stroke();

    const dbTop = 30, dbBottom = -30;
    ctx.beginPath();
    for (let db = dbTop; db >= dbBottom; db -= 6) {
      const y = margin.top + dbToY(db, dbTop, dbBottom, plotH);
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + plotW, y);
    }
    ctx.stroke();

    function drawCurve(arr, color, width = 2) {
      ctx.beginPath();
      ctx.lineWidth = width;
      ctx.strokeStyle = color;
      for (let i = 0; i < POINTS; i++) {
        const x = margin.left + freqToX(freqs[i], plotW);
        const y = margin.top + dbToY(20 * Math.log10(arr[i]), dbTop, dbBottom, plotH);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    drawCurve(mag.treble, 'rgba(140,255,150,0.95)');
    drawCurve(mag.mid, 'rgba(90,170,255,0.95)');
    drawCurve(mag.bass, 'rgba(255,174,0,0.95)');
  }

  // ✅ Allow popup to trigger redraw later
  window.redrawEQGraph = (settings) => {
    filters.bass.gain.value = settings.bass;
    filters.mid.gain.value = settings.mid;
    filters.treble.gain.value = settings.treble;
    preamp.gain.value = (settings.preamp ?? 100) / 100;
    draw();
  };

  draw();
  window.addEventListener('resize', () => { setTimeout(draw, 100); });
}
