import { dom } from './dom.js';
import { saveTabSettings } from './state.js';

// -------------------------------
// Current tab tracking
// -------------------------------
let currentTabId = null;

/**
 * Sets the currently active tab ID.
 * @param {number} id - The active tab’s ID.
 */
export function setCurrentTab(id) {
  currentTabId = id;
}

/**
 * Gets the currently active tab ID.
 * @returns {number|null} - Current tab ID.
 */
export function getCurrentTab() {
  return currentTabId;
}

// -------------------------------
// Send EQ settings to content.js
// -------------------------------

/**
 * Sends the current EQ slider values to the active tab’s content script.
 * Also saves the EQ values in session storage for persistence.
 */

export function sendSingleEQUpdate(type, value) {
  if (!currentTabId) return;

  const update = { [type]: value };

  chrome.scripting.executeScript({
    target: { tabId: currentTabId },
    func: (settings) => {
      // Dispatch only the changed value
      window.dispatchEvent(new CustomEvent('updateEqualizer', { detail: settings }));
    },
    args: [update],
  });
}

export function sendEQSettings() {
  if (!currentTabId) return;

  // Gather current EQ slider values
  const eqSettings = {
    bass: Number(dom.bassControl.value),
    mid: Number(dom.midControl.value),
    treble: Number(dom.trebleControl.value),
    preamp: Number(dom.preampControl.value),
    master: Number(dom.masterControl.value),
  };

  // Save settings for this tab
  saveTabSettings(currentTabId, eqSettings);

  // Dispatch the settings into the tab’s context
  chrome.scripting.executeScript({
    target: { tabId: currentTabId },
    func: (settings) => {
      window.dispatchEvent(new CustomEvent('updateEqualizer', { detail: settings }));
    },
    args: [eqSettings],
  });
}
