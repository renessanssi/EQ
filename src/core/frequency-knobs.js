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
  const slider = document.querySelector('.freq-slider');

  const saved = await chrome.storage.session.get([
    `freq_bass_${tabId}`,
    `freq_mid_${tabId}`,
    `freq_treble_${tabId}`,
  ]);

  const currentFreqs = {
    bass: saved[`freq_bass_${tabId}`] || DEFAULT_FREQUENCIES.bass,
    mid: saved[`freq_mid_${tabId}`] || DEFAULT_FREQUENCIES.mid,
    treble: saved[`freq_treble_${tabId}`] || DEFAULT_FREQUENCIES.treble,
  };

  const eqGraph = initEQGraph(dom);
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

  let activeKnob = null;

  knobs.forEach((knob, i) => {
    knob.addEventListener('mousedown', (e) => {
      e.preventDefault();
      activeKnob = i;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  });

  function onMouseMove(e) {
    if (activeKnob === null) return;

    const rect = slider.getBoundingClientRect();
    let percent = ((e.clientX - rect.left) / rect.width) * 100;
    const min = activeKnob === 0 ? 0 : parseFloat(knobs[activeKnob - 1].style.left);
    const max =
      activeKnob === knobs.length - 1 ? 100 : parseFloat(knobs[activeKnob + 1].style.left);
    percent = clamp(percent, min + 1, max - 1);

    knobs[activeKnob].style.left = percent + '%';
    const freq = percentToFreq(percent);
    const freqText = freq >= 1000 ? (freq / 1000).toFixed(1) + ' kHz' : freq + ' Hz';

    labels[activeKnob].textContent = freqText;
    labels[activeKnob].style.left = percent + '%';

    if (activeKnob === 0) dom.bassTextLabel.textContent = freqText;
    if (activeKnob === 1) dom.midTextLabel.textContent = freqText;
    if (activeKnob === 2) dom.trebleTextLabel.textContent = freqText;

    const key =
      activeKnob === 0
        ? `freq_bass_${tabId}`
        : activeKnob === 1
        ? `freq_mid_${tabId}`
        : `freq_treble_${tabId}`;
    saveKnobFrequency(tabId, key, freq);

    eqGraph.updateEQFrequencies({
      [activeKnob === 0 ? 'bass' : activeKnob === 1 ? 'mid' : 'treble']: freq,
    });
  }

  function onMouseUp() {
    activeKnob = null;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }
}
