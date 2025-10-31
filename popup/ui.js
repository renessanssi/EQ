import { dom } from './dom.js';

// -------------------------------
// Update numeric labels & colors
// -------------------------------
// helper function
function formatSigned(value) {
  if (value > 0) return `+${value}`;
  if (value < 0) return `${value}`;
  return "0";
}
/**
 * Updates the displayed EQ values and color-codes them.
 * @param {object} values - Any subset of { bass, mid, treble, preamp, master }
 */
export function updateValueLabels(values) {
  const colorValue = (val) =>
    val > 0 ? '#3eff7f' : val < 0 ? '#ff4a4a' : '#2f2f2fff';

  if (values.bass !== undefined) {
    dom.bassValLabel.textContent = formatSigned(values.bass);
    dom.bassValLabel.style.color = colorValue(values.bass);
  }

  if (values.mid !== undefined) {
    dom.midValLabel.textContent = formatSigned(values.mid);
    dom.midValLabel.style.color = colorValue(values.mid);
  }

  if (values.treble !== undefined) {
    dom.trebleValLabel.textContent = formatSigned(values.treble);
    dom.trebleValLabel.style.color = colorValue(values.treble);
  }

  if (values.preamp !== undefined) {
    dom.preampValLabel.textContent = formatSigned(values.preamp);
    dom.preampValLabel.style.color = colorValue(values.preamp);
  }
  if (values.master !== undefined) {
    dom.masterValLabel.textContent = values.master;
  }
}

// -------------------------------
// Enable / disable UI controls
// -------------------------------

/**
 * Enables or disables all EQ controls (sliders, buttons, visualizer).
 * Visually dims the disabled state.
 * @param {boolean} enabled
 */
export function setControlsEnabled(enabled) {
  // Sliders
  [
    dom.bassControl,
    dom.midControl,
    dom.trebleControl,
    dom.preampControl,
    dom.masterControl,
  ].forEach((control) => {
    control.disabled = !enabled;
  });

  // Buttons (presets, reset, custom)
  [dom.resetBtn, dom.customBtn, ...dom.presetButtons].forEach((btn) => {
    btn.disabled = !enabled;
  });

  dom.visualizerContainer.classList.toggle('disabled', !enabled);
  dom.modeContainer.classList.toggle('disabled', !enabled);
  dom.configuratorContainer.classList.toggle('disabled', !enabled);
  dom.equalizerContainer.classList.toggle('disabled', !enabled);

  document.body.classList.toggle("inactive", !enabled);

  // Fade labels slightly when disabled
  [
    dom.bassValLabel,
    dom.midValLabel,
    dom.trebleValLabel,
    dom.preampValLabel,
    dom.masterValLabel,
  ].forEach((label) => {
    label.classList.toggle('disabled', !enabled);
  });
}
