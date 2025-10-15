const bassControl = document.getElementById('bass');
const midControl = document.getElementById('mid');
const trebleControl = document.getElementById('treble');

const bassValLabel = document.getElementById('bassVal');
const midValLabel = document.getElementById('midVal');
const trebleValLabel = document.getElementById('trebleVal');

function sendEQSettings() {
  const eqSettings = {
    bass: Number(bassControl.value),
    mid: Number(midControl.value),
    treble: Number(trebleControl.value),
  };

  bassValLabel.textContent = eqSettings.bass;
  midValLabel.textContent = eqSettings.mid;
  trebleValLabel.textContent = eqSettings.treble;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0].id) return;
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      function: (settings) => {
        // Dispatch event to content script to update EQ
        window.dispatchEvent(new CustomEvent('updateEqualizer', { detail: settings }));
      },
      args: [eqSettings]
    });
  });
}

bassControl.addEventListener('input', sendEQSettings);
midControl.addEventListener('input', sendEQSettings);
trebleControl.addEventListener('input', sendEQSettings);

// When popup opens, inject content script into the current tab
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (!tabs[0].id) return;
  chrome.scripting.executeScript({
    target: { tabId: tabs[0].id },
    files: ['content.js']
  }).then(() => {
    sendEQSettings(); // send initial values after injecting
  }).catch(console.error);
});
