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

  customBtn: document.getElementById('customBtn'),
  resetBtn: document.getElementById('resetBtn'),
  presetButtons: document.querySelectorAll('.preset')
};