import { presets } from './presets.js';
import { dom } from './dom.js';
import { animateSliderTo } from './animation.js';
import { saveTabSettings } from './state.js';
import { sendEQSettings } from './messaging.js';
import { updateValueLabels } from './ui.js';

// -------------------------------
// Preset button management
// -------------------------------

/**
 * Removes the "active" class from all preset buttons.
 */
export function removeActivePresets() {
  dom.presetButtons.forEach((btn) => btn.classList.remove('active'));
}

/**
 * Initializes all preset buttons to handle clicks.
 * When a preset is clicked:
 *  - Its EQ values animate into place.
 *  - The UI updates.
 *  - Settings are saved to session storage.
 *  - The active preset button is highlighted.
 *
 * @param {number} currentTabId - The active tab’s ID.
 */
export function initPresetButtons(currentTabId) {
  dom.presetButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const presetName = button.getAttribute('data-preset');
      const settings = presets[presetName];
      if (!settings) return;

      // Animate sliders to preset positions
      animateSliderTo(dom.bassControl, settings.bass);
      animateSliderTo(dom.midControl, settings.mid);
      animateSliderTo(dom.trebleControl, settings.treble);

      // Update label colors & numbers
      updateValueLabels({
        bass: settings.bass,
        mid: settings.mid,
        treble: settings.treble,
      });

      // Save the new EQ + preset name
      saveTabSettings(currentTabId, {
        bass: settings.bass,
        mid: settings.mid,
        treble: settings.treble,
        preamp: Number(dom.preampControl.value),
        master: Number(dom.masterControl.value),
      }, presetName);

      // Highlight active preset button
      removeActivePresets();
      button.classList.add('active');

      // Send updated EQ if enabled
      sendEQSettings();
    });
  });
}
