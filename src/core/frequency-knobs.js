import { sendSingleEQUpdate } from './messaging.js';
import { clamp, percentToFreq, freqToPercent, DEFAULT_FREQUENCIES } from './math-utils.js';
import { saveKnobFrequency } from './storage-helpers.js';
import { initEQGraph } from './visualizer.js';
import { dom } from './dom.js';

export async function initKnobs(tabId) {
  const knobs = dom.freqKnobs;
  const labels = dom.freqLabels;
  const bandLabels = dom.bandLabels;
  const slider = document.querySelector('.freq-slider'); // slider track

  // -------------------------
  // Load saved frequencies
  // -------------------------
  const saved = await chrome.storage.session.get([
    `freq_bass_${tabId}`,
    `freq_mid_${tabId}`,
    `freq_treble_${tabId}`,
  ]);

  const currentFreqs = {
    bass: saved[`freq_bass_${tabId}`] ?? DEFAULT_FREQUENCIES.bass,
    mid: saved[`freq_mid_${tabId}`] ?? DEFAULT_FREQUENCIES.mid,
    treble: saved[`freq_treble_${tabId}`] ?? DEFAULT_FREQUENCIES.treble,
  };

  const eqGraph = initEQGraph(dom);
  eqGraph.updateEQFrequencies(currentFreqs);

  // -------------------------
  // Set initial knob positions
  // -------------------------
  [currentFreqs.bass, currentFreqs.mid, currentFreqs.treble].forEach((freq, i) => {
    const percent = freqToPercent(freq);
    const freqText = freq >= 1000 ? (freq / 1000).toFixed(1) + ' kHz' : freq + ' Hz';
    knobs[i].style.left = percent + '%';
    labels[i].style.left = percent + '%';
    labels[i].textContent = freqText;
    bandLabels[i].style.left = percent + '%';
  });

  dom.bassTextLabel.textContent = labels[0].textContent;
  dom.midTextLabel.textContent = labels[1].textContent;
  dom.trebleTextLabel.textContent = labels[2].textContent;

  // -------------------------
  // Dragging state
  // -------------------------
  let activeKnob = null;
  const GAP_PERCENT = 5; // minimum distance between knobs

  // -------------------------
  // Mouse events
  // -------------------------
  knobs.forEach((knob, i) => {
    knob.addEventListener('mousedown', (e) => {
      e.preventDefault();
      activeKnob = i;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  });

  function pushKnobs(index, percent, direction) {
    const min = index === 0 ? 0 : parseFloat(knobs[index - 1].style.left) + GAP_PERCENT;
    const max = index === knobs.length - 1 ? 100 : parseFloat(knobs[index + 1].style.left) - GAP_PERCENT;

    const clamped = clamp(percent, min, max);
    knobs[index].style.left = clamped + '%';

    const freq = clamp(percentToFreq(clamped), 20, 20000);
    const freqText = freq >= 1000 ? (freq / 1000).toFixed(1) + ' kHz' : freq + ' Hz';
    labels[index].textContent = freqText;
    labels[index].style.left = clamped + '%';
    bandLabels[index].style.left = clamped + '%';

    // Update main EQ text labels
    if (index === 0) dom.bassTextLabel.textContent = freqText;
    if (index === 1) dom.midTextLabel.textContent = freqText;
    if (index === 2) dom.trebleTextLabel.textContent = freqText;

    // Save frequency
    saveKnobFrequency(
      tabId,
      index === 0 ? `freq_bass_${tabId}` : index === 1 ? `freq_mid_${tabId}` : `freq_treble_${tabId}`,
      freq
    );

    // Update visual EQ graph
    eqGraph.updateEQFrequencies({
      [index === 0 ? 'bass' : index === 1 ? 'mid' : 'treble']: freq,
    });

    // Send frequency to content script
    const type = index === 0 ? 'bassFreq' : index === 1 ? 'midFreq' : 'trebleFreq';
    sendSingleEQUpdate(type, freq);

    // Push next/previous knob if hitting limit
    if (direction === 1 && index < knobs.length - 1 && clamped >= max) {
      pushKnobs(index + 1, percent, direction);
    }
    if (direction === -1 && index > 0 && clamped <= min) {
      pushKnobs(index - 1, percent, direction);
    }
  }

  function onMouseMove(e) {
    if (activeKnob === null) return;
    const rect = slider.getBoundingClientRect();
    const percent = ((e.clientX - rect.left) / rect.width) * 100;
    const direction = percent > parseFloat(knobs[activeKnob].style.left) ? 1 : -1;
    pushKnobs(activeKnob, percent, direction);
  }

  function onMouseUp() {
    activeKnob = null;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }
}
