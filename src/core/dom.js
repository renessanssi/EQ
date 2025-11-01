// dom.js
export const dom = {
  // -------------------------
  // Main EQ Controls
  // -------------------------
  preampControl: document.getElementById('preamp'),
  bassControl: document.getElementById('bass'),
  midControl: document.getElementById('mid'),
  trebleControl: document.getElementById('treble'),
  masterControl: document.getElementById('master'),
  midQSlider: document.getElementById('midQ'),

  // -------------------------
  // Main Text Labels
  // -------------------------
  preampTextLabel: document.getElementById('preampText'),
  bassTextLabel: document.getElementById('bassText'),
  midTextLabel: document.getElementById('midText'),
  trebleTextLabel: document.getElementById('trebleText'),
  masterTextLabel: document.getElementById('masterText'),

  // -------------------------
  // Value Labels
  // -------------------------
  preampValLabel: document.getElementById('preampVal'),
  bassValLabel: document.getElementById('bassVal'),
  midValLabel: document.getElementById('midVal'),
  trebleValLabel: document.getElementById('trebleVal'),
  masterValLabel: document.getElementById('masterVal'),
  midQValLabel: document.getElementById('midQVal'),

  // -------------------------
  // Frequency Knobs & Labels
  // -------------------------
  freqKnob1: document.getElementById('freqKnob1'),
  freqKnob2: document.getElementById('freqKnob2'),
  freqKnob3: document.getElementById('freqKnob3'),

  freqLabel1: document.getElementById('freqLabel1'),
  freqLabel2: document.getElementById('freqLabel2'),
  freqLabel3: document.getElementById('freqLabel3'),

  bandLabel1: document.getElementById('bandLabel1'),
  bandLabel2: document.getElementById('bandLabel2'),
  bandLabel3: document.getElementById('bandLabel3'),

  // -------------------------
  // Buttons
  // -------------------------
  resetBtn: document.getElementById('resetBtn'),
  customBtn: document.getElementById('customBtn'),
  contextMenu: document.getElementById('sliderMenu'),
  resetOption: document.getElementById('resetOption'),

  // -------------------------
  // Presets
  // -------------------------
  get presetButtons() {
    return Array.from(document.querySelectorAll('.preset'));
  },

  // -------------------------
  // Containers
  // -------------------------
  visualizerContainer: document.querySelector('.visualizer-container'),
  modeContainer: document.querySelector('.mode-container'),
  configuratorContainer: document.querySelector('.configurator-container'),
  equalizerContainer: document.querySelector('.equalizer-container'),
  toggleContainer: document.querySelector('.toggle-container'),

  // -------------------------
  // Toggles
  // -------------------------
  eqToggle: document.getElementById('eqToggle'),

  // -------------------------
  // Grouped Collections
  // -------------------------
  get sliders() {
    return [
      this.bassControl,
      this.midControl,
      this.trebleControl,
      this.preampControl,
      this.masterControl,
      this.midQSlider,
    ];
  },

  get freqKnobs() {
    return [this.freqKnob1, this.freqKnob2, this.freqKnob3];
  },

  get freqLabels() {
    return [this.freqLabel1, this.freqLabel2, this.freqLabel3];
  },

  get bandLabels() {
    return [this.bandLabel1, this.bandLabel2, this.bandLabel3];
  },

  get buttons() {
    return [this.resetBtn, this.customBtn, ...this.presetButtons];
  },

  get containers() {
    return [
      this.visualizerContainer,
      this.modeContainer,
      this.configuratorContainer,
      this.equalizerContainer,
    ];
  },

  get labels() {
    return [
      this.bassValLabel,
      this.midValLabel,
      this.trebleValLabel,
      this.preampValLabel,
      this.masterValLabel,
      this.midQValLabel,
    ];
  },

  get texts() {
    return [
      this.bassTextLabel,
      this.midTextLabel,
      this.trebleTextLabel,
      this.preampTextLabel,
      this.masterTextLabel,
    ];
  },
};
