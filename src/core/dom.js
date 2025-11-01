// dom.js
export const dom = {
  // Controls
  preampControl: document.getElementById('preamp'),
  bassControl: document.getElementById('bass'),
  midControl: document.getElementById('mid'),
  trebleControl: document.getElementById('treble'),
  masterControl: document.getElementById('master'),

  // Texts
  preampTextLabel: document.getElementById('preampText'),
  bassTextLabel: document.getElementById('bassText'),
  midTextLabel: document.getElementById('midText'),
  trebleTextLabel: document.getElementById('trebleText'),
  masterTextLabel: document.getElementById('masterText'),
  // Labels
  preampValLabel: document.getElementById('preampVal'),
  bassValLabel: document.getElementById('bassVal'),
  midValLabel: document.getElementById('midVal'),
  trebleValLabel: document.getElementById('trebleVal'),
  masterValLabel: document.getElementById('masterVal'),

  // Buttons
  resetBtn: document.getElementById('resetBtn'),
  customBtn: document.getElementById('customBtn'),
  contextMenu: document.getElementById('sliderMenu'),
  resetOption: document.getElementById('resetOption'),

  // Dynamic
  get presetButtons() {
    return Array.from(document.querySelectorAll('.preset'));
  },

  // Containers
  visualizerContainer: document.querySelector('.visualizer-container'),
  modeContainer: document.querySelector('.mode-container'),
  configuratorContainer: document.querySelector('.configurator-container'),
  equalizerContainer: document.querySelector('.equalizer-container'),

  // Toggle
  toggleContainer: document.querySelector('.toggle-container'),
  eqToggle: document.getElementById('eqToggle'),

  // ---- Grouped collections ----
  get sliders() {
    return [
      this.bassControl,
      this.midControl,
      this.trebleControl,
      this.preampControl,
      this.masterControl,
    ];
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
