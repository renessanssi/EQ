// 🟢 Immediately Invoked Function Expression (IIFE)
(() => {
  // Prevent multiple injections
  if (window.equalizerInjected) return;
  window.equalizerInjected = true;

  // 🎧 Create AudioContext
  const context = new AudioContext();

  // 🎛️ Create EQ filters
  const filters = {};

  filters.bass = context.createBiquadFilter();
  filters.bass.type = 'lowshelf';
  filters.bass.frequency.value = 60;

  filters.mid = context.createBiquadFilter();
  filters.mid.type = 'peaking';
  filters.mid.frequency.value = 1000;
  filters.mid.Q.value = 1;

  filters.treble = context.createBiquadFilter();
  filters.treble.type = 'highshelf';
  filters.treble.frequency.value = 12000;

  // 🎚️ Preamp gain node
  const preamp = context.createGain();
  preamp.gain.value = 1; // 100%

  // 🔗 Connect EQ chain: Bass -> Mid -> Treble -> Preamp -> Destination
  filters.bass.connect(filters.mid);
  filters.mid.connect(filters.treble);
  filters.treble.connect(preamp);
  preamp.connect(context.destination);

  // Set default EQ gains
  filters.bass.gain.value = 0;
  filters.mid.gain.value = 0;
  filters.treble.gain.value = 0;

  // ===============================
  // 🔌 Connect all existing media elements
  // ===============================
  function setupMediaElement(media) {
    if (media._equalizerSetup) return;
    media._equalizerSetup = true;

    const source = context.createMediaElementSource(media);
    source.connect(filters.bass);
  }

  [...document.querySelectorAll('audio, video')].forEach(setupMediaElement);

  // Observe for dynamically added audio/video elements
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.tagName === 'AUDIO' || node.tagName === 'VIDEO') {
          setupMediaElement(node);
        }
        if (node.querySelectorAll) {
          node.querySelectorAll('audio, video').forEach(setupMediaElement);
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // ===============================
  // 🔄 Listen for EQ updates from popup
  // ===============================
  window.addEventListener('updateEqualizer', (e) => {
    const settings = e.detail;
    if (!settings) return;

    filters.bass.gain.value = settings.bass ?? 0;
    filters.mid.gain.value = settings.mid ?? 0;
    filters.treble.gain.value = settings.treble ?? 0;

    // Apply preamp: convert 0–200 slider to 0–2 multiplier
    preamp.gain.value = (settings.preamp ?? 100) / 100;
  });

  // ==============================================
  // ▶️ Resume AudioContext on user interaction
  // ==============================================
  function resumeContext() {
    if (context.state === 'suspended') context.resume();
  }

  window.addEventListener('click', resumeContext);
  window.addEventListener('keydown', resumeContext);
})();
