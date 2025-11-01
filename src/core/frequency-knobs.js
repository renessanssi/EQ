import { clamp, percentToFreq, freqToPercent, DEFAULT_FREQUENCIES } from './math-utils.js';
import { saveKnobFrequency } from './storage-helpers.js';
import { initEQGraph } from './visualizer.js';
import { dom } from './dom.js';

export async function initKnobs(tabId) {
  const knobs = [
    document.getElementById('freqKnob1'),
    document.getElementById('freqKnob2'),
    document.getElementById('freqKnob3'),
  ];
  const labels = [
    document.getElementById('freqLabel1'),
    document.getElementById('freqLabel2'),
    document.getElementById('freqLabel3'),
  ];
  const bandLabels = [
    document.getElementById('bandLabel1'),
    document.getElementById('bandLabel2'),
    document.getElementById('bandLabel3'),
  ];
  const slider = document.querySelector('.freq-slider');

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

  const initialFreqs = [currentFreqs.bass, currentFreqs.mid, currentFreqs.treble];
  initialFreqs.forEach((freq, i) => {
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

  let activeKnob = null;

  knobs.forEach((knob, i) => {
    knob.addEventListener('mousedown', (e) => {
      e.preventDefault();
      activeKnob = i;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  });

  const GAP_PERCENT = 5;

  function pushKnobs(index, percent, direction) {
    // direction: 1 = right, -1 = left
    const min = index === 0 ? 0 : parseFloat(knobs[index - 1].style.left) + GAP_PERCENT;
    const max = index === knobs.length - 1 ? 100 : parseFloat(knobs[index + 1].style.left) - GAP_PERCENT;

    const clamped = clamp(percent, min, max);
    knobs[index].style.left = clamped + '%';

    const freq = clamp(percentToFreq(clamped), 20, 20000);
    const freqText = freq >= 1000 ? (freq / 1000).toFixed(1) + ' kHz' : freq + ' Hz';
    labels[index].textContent = freqText;
    labels[index].style.left = clamped + '%';
    bandLabels[index].style.left = clamped + '%';

    if (index === 0) dom.bassTextLabel.textContent = freqText;
    if (index === 1) dom.midTextLabel.textContent = freqText;
    if (index === 2) dom.trebleTextLabel.textContent = freqText;

    saveKnobFrequency(
      tabId,
      index === 0 ? `freq_bass_${tabId}` : index === 1 ? `freq_mid_${tabId}` : `freq_treble_${tabId}`,
      freq
    );

    eqGraph.updateEQFrequencies({
      [index === 0 ? 'bass' : index === 1 ? 'mid' : 'treble']: freq,
    });

    // Push next knob if hitting limit
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
