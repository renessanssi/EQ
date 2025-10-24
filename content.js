(() => {
  if (window.equalizerInjected) return;
  window.equalizerInjected = true;

  const context = new AudioContext();
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

  const preamp = context.createGain();
  preamp.gain.value = 1;

  filters.bass.connect(filters.mid);
  filters.mid.connect(filters.treble);
  filters.treble.connect(preamp);
  preamp.connect(context.destination);

  filters.bass.gain.value = 0;
  filters.mid.gain.value = 0;
  filters.treble.gain.value = 0;

  // -------------------------------
  // Connect all existing media elements
  // -------------------------------
  const mediaElements = new Set();

  function setupMediaElement(media) {
    if (media._equalizerSetup) return;
    media._equalizerSetup = true;

    const source = context.createMediaElementSource(media);
    source.connect(filters.bass);
    mediaElements.add(media);
  }

  document.querySelectorAll('audio, video').forEach(setupMediaElement);

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

  // -------------------------------
  // Listen for EQ updates
  // -------------------------------
  window.addEventListener('updateEqualizer', (e) => {
    const settings = e.detail;
    if (!settings) return;

    filters.bass.gain.value = settings.bass ?? 0;
    filters.mid.gain.value = settings.mid ?? 0;
    filters.treble.gain.value = settings.treble ?? 0;
    preamp.gain.value = Math.pow(10, ((settings.preamp ?? 100) - 100) / 100);
  });

  // -------------------------------
  // Disable EQ
  // -------------------------------
  window.addEventListener('disableEqualizer', () => {
    filters.bass.gain.value = 0;
    filters.mid.gain.value = 0;
    filters.treble.gain.value = 0;
    preamp.gain.value = Math.pow(10, ((settings.preamp ?? 100) - 100) / 100);
  });

  // Resume AudioContext on user interaction
  function resumeContext() {
    if (context.state === 'suspended') context.resume();
  }

  window.addEventListener('click', resumeContext);
  window.addEventListener('keydown', resumeContext);
})();
