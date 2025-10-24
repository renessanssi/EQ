// dom.js

export const dom = {
  preampControl: document.getElementById('preamp'),

  bassControl: document.getElementById('bass'),
  midControl: document.getElementById('mid'),
  trebleControl: document.getElementById('treble'),

  masterControl: document.getElementById('master'),

  preampValLabel: document.getElementById('preampVal'),

  bassValLabel: document.getElementById('bassVal'),
  midValLabel: document.getElementById('midVal'),
  trebleValLabel: document.getElementById('trebleVal'),
  
  masterValLabel: document.getElementById('masterVal'),

  resetBtn: document.getElementById('resetBtn'),
  customBtn: document.getElementById('customBtn'),

  // Always get the current preset buttons from the DOM
  get presetButtons() {
    return Array.from(document.querySelectorAll('.preset'));
  }
};
