(() => {
  if (window.equalizerInjected) return;
  window.equalizerInjected = true;

  const context = new AudioContext();

  // -------------------------------
  // Create nodes
  // -------------------------------
  const preamp = context.createGain();  // Preamp before EQ
  preamp.gain.value = 1;

  const filters = {
    bass: context.createBiquadFilter(),
    mid: context.createBiquadFilter(),
    treble: context.createBiquadFilter()
  };

  filters.bass.type = 'lowshelf';
  filters.bass.frequency.value = 60;
  filters.bass.gain.value = 0;

  filters.mid.type = 'peaking';
  filters.mid.frequency.value = 1000;
  filters.mid.Q.value = 1;
  filters.mid.gain.value = 0;

  filters.treble.type = 'highshelf';
  filters.treble.frequency.value = 12000;
  filters.treble.gain.value = 0;

  const master = context.createGain(); // Master after EQ
  master.gain.value = 1;

  // -------------------------------
  // Connect nodes: preamp -> EQ -> master -> destination
  // -------------------------------
  preamp.connect(filters.bass);
  filters.bass.connect(filters.mid);
  filters.mid.connect(filters.treble);
  filters.treble.connect(master);
  master.connect(context.destination);

  // -------------------------------
  // Handle media elements
  // -------------------------------
  const mediaElements = new Set();

  function setupMediaElement(media) {
    if (media._equalizerSetup) return;
    media._equalizerSetup = true;

    // Create source for AudioContext
    const source = context.createMediaElementSource(media);
    source.connect(preamp);
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

    preamp.gain.value = Math.pow(10, settings.preamp / 20);

    filters.bass.gain.value = settings.bass ?? 0;
    filters.mid.gain.value = settings.mid ?? 0;
    filters.treble.gain.value = settings.treble ?? 0;

    master.gain.value = (settings.master ?? 100) / 100;
  });

  // -------------------------------
  // Disable EQ (reset)
  // -------------------------------
  window.addEventListener('disableEqualizer', () => {
    preamp.gain.value = 1;

    filters.bass.gain.value = 0;
    filters.mid.gain.value = 0;
    filters.treble.gain.value = 0;
    
    master.gain.value = 1;
  });

  // -------------------------------
  // Resume AudioContext on user interaction
  // -------------------------------
  function resumeContext() {
    if (context.state === 'suspended') context.resume();
  }

  window.addEventListener('click', resumeContext);
  window.addEventListener('keydown', resumeContext);

  // -------------------------------
  // Expose nodes for debugging / graph
  // -------------------------------
  window._eqNodes = { context, preamp, filters, master };
})();
