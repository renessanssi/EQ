// storage-helpers.js
export async function saveEQValue(tabId, key, value) {
  const stored = await chrome.storage.session.get(`eq_${tabId}`);
  const currentEQ = stored[`eq_${tabId}`] || {};
  currentEQ[key] = value;
  await chrome.storage.session.set({ [`eq_${tabId}`]: currentEQ });
}

export async function saveKnobFrequency(tabId, key, freq) {
  await chrome.storage.session.set({ [key]: freq });
}
