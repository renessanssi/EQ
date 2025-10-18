const bassControl = document.getElementById('bass');
const midControl = document.getElementById('mid');
const trebleControl = document.getElementById('treble');

const bassValLabel = document.getElementById('bassVal');
const midValLabel = document.getElementById('midVal');
const trebleValLabel = document.getElementById('trebleVal');

// Load saved settings from localStorage (popup side)
function loadSavedSettings() {
  const saved = localStorage.getItem('equalizerSettings');
  if (saved) {
    try {
      const settings = JSON.parse(saved);
      bassControl.value = settings.bass ?? 0;
      midControl.value = settings.mid ?? 0;
      trebleControl.value = settings.treble ?? 0;

      bassValLabel.textContent = settings.bass ?? 0;
      midValLabel.textContent = settings.mid ?? 0;
      trebleValLabel.textContent = settings.treble ?? 0;
    } catch (e) {
      console.error("Error parsing saved settings:", e);
    }
  }
}

// Send settings to content script and store in localStorage
function sendEQSettings() {
  const eqSettings = {
    bass: Number(bassControl.value),
    mid: Number(midControl.value),
    treble: Number(trebleControl.value),
  };

  // Update UI
  bassValLabel.textContent = eqSettings.bass;
  midValLabel.textContent = eqSettings.mid;
  trebleValLabel.textContent = eqSettings.treble;

  // Save to localStorage (popup-side copy for UI consistency)
  localStorage.setItem('equalizerSettings', JSON.stringify(eqSettings));

  // Send to content script
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.id) return;
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      function: (settings) => {
        window.dispatchEvent(new CustomEvent('updateEqualizer', { detail: settings }));
      },
      args: [eqSettings]
    });
  });
}

// Add event listeners to sliders
bassControl.addEventListener('input', sendEQSettings);
midControl.addEventListener('input', sendEQSettings);
trebleControl.addEventListener('input', sendEQSettings);

// On popup open, load UI values and inject content script
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (!tabs[0]?.id) return;
  chrome.scripting.executeScript({
    target: { tabId: tabs[0].id },
    files: ['content.js']
  }).then(() => {
    loadSavedSettings(); // Load UI with saved settings
    sendEQSettings();    // Send current values to content script
  }).catch(console.error);
});

// Reset button logic, sets all values to zero.
const resetBtn = document.getElementById('resetBtn');

resetBtn.addEventListener('click', () => {
  bassControl.value = 0;
  midControl.value = 0;
  trebleControl.value = 0;

  sendEQSettings(); // Reuse the function that updates values and UI
});

const presets = {
  boostBass: { bass: 19, mid: -30, treble: -30 },
  boostMetal: { bass: 30, mid: 0, treble: 0 },
  boostPop: { bass: 0, mid: 11, treble: 30 },
  cancelNoise: { bass: 0, mid: -30, treble: -30 }
};

document.querySelectorAll('.preset').forEach(button => {
  button.addEventListener('click', () => {
    const presetName = button.getAttribute('data-preset');
    const settings = presets[presetName];

    if (settings) {
      bassControl.value = settings.bass;
      midControl.value = settings.mid;
      trebleControl.value = settings.treble;

      sendEQSettings(); // Update UI and filters
    }
  });
});
