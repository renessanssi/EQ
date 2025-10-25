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

  // --- Dynamic elements ---
  get presetButtons() {
    return Array.from(document.querySelectorAll('.preset'));
  }
};
