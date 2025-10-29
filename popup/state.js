// -------------------------------
// EQ state management (per tab)
// -------------------------------

/**
 * Save EQ settings for the given tab.
 * @param {number} tabId - The active tab ID.
 * @param {object} settings - EQ values (bass, mid, treble, preamp, master).
 * @param {string|null} [presetName=null] - Optional preset name to save.
 */
export async function saveTabSettings(tabId, settings, presetName = null) {
  const data = { [`eq_${tabId}`]: settings };
  if (presetName !== null) {
    data[`activePreset_${tabId}`] = presetName;
  }
  await chrome.storage.session.set(data);
}

/**
 * Load EQ, toggle state, and active preset for the given tab.
 * @param {number} tabId - The tab ID to load settings for.
 * @returns {Promise<{ eq: object, enabled: boolean, activePreset: string|null }>}
 */
export async function loadTabSettings(tabId) {
  const data = await chrome.storage.session.get([
    `eq_${tabId}`,
    `eqEnabled_${tabId}`,
    `activePreset_${tabId}`,
  ]);

  // Provide default EQ values if none saved yet
  const defaultEQ = { bass: 0, mid: 0, treble: 0, preamp: 0, master: 100 };
  const defaultactivePreset = "boostReset";

  return {
    eq: data[`eq_${tabId}`] || defaultEQ,
    enabled: data[`eqEnabled_${tabId}`] || false,
    activePreset: data[`activePreset_${tabId}`] || defaultactivePreset,
  };
}

/**
 * Save EQ toggle (enabled/disabled) for the tab.
 * @param {number} tabId
 * @param {boolean} enabled
 */
export async function saveToggleState(tabId, enabled) {
  await chrome.storage.session.set({ [`eqEnabled_${tabId}`]: enabled });
}

/**
 * Clear all EQ-related data for a given tab.
 * (Optional utility if you want a “clear all” feature later)
 * @param {number} tabId
 */
export async function clearTabSettings(tabId) {
  await chrome.storage.session.remove([
    `eq_${tabId}`,
    `eqEnabled_${tabId}`,
    `activePreset_${tabId}`,
  ]);
}
