// dom.js
export const dom = {
  // --- Controls ---
  preampControl: document.getElementById('preamp'),
  bassControl: document.getElementById('bass'),
  midControl: document.getElementById('mid'),
  trebleControl: document.getElementById('treble'),
  masterControl: document.getElementById('master'),

  // --- Value labels ---
  preampValLabel: document.getElementById('preampVal'),
  bassValLabel: document.getElementById('bassVal'),
  midValLabel: document.getElementById('midVal'),
  trebleValLabel: document.getElementById('trebleVal'),
  masterValLabel: document.getElementById('masterVal'),

  // --- Buttons ---
  resetBtn: document.getElementById('resetBtn'),
  customBtn: document.getElementById('customBtn'),

  contextMenu: document.getElementById('sliderMenu'),
  resetOption: document.getElementById('resetOption'),
  disableOption: document.getElementById('disableOption'),

  // --- Dynamic elements ---
  get presetButtons() {
    return Array.from(document.querySelectorAll('.preset'));
  },

  // --- Containers ---
  visualizerContainer: document.querySelector('.visualizer-container'),
  modeContainer: document.querySelector('.mode-container'),
  configuratorContainer: document.querySelector('.configurator-container'),
  equalizerContainer: document.querySelector('.equalizer-container'),

  // --- Toggle ---
  toggleContainer: document.querySelector('.toggle-container')
};
