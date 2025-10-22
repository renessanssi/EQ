// js/dom.js
export const dom = {
  bassControl: document.getElementById('bass'),
  midControl: document.getElementById('mid'),
  trebleControl: document.getElementById('treble'),
  preampControl: document.getElementById('preamp'),

  bassValLabel: document.getElementById('bassVal'),
  midValLabel: document.getElementById('midVal'),
  trebleValLabel: document.getElementById('trebleVal'),
  preampValLabel: document.getElementById('preampVal'),

  resetBtn: document.getElementById('resetBtn'),
  customBtn: document.getElementById('customBtn'),

  // Always get the current preset buttons from the DOM
  get presetButtons() {
    return Array.from(document.querySelectorAll('.preset'));
  }
};
