(() => {
  if (window.equalizerInjected) return;
  window.equalizerInjected = true;

  // -------------------------------------
  // Create AudioContext & Filters
  // -------------------------------------
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

  // Connect filters in series
  filters.bass.connect(filters.mid);
  filters.mid.connect(filters.treble);
  filters.treble.connect(preamp);
  preamp.connect(context.destination);

  filters.bass.gain.value = 0;
  filters.mid.gain.value = 0;
  filters.treble.gain.value = 0;

  // -------------------------------------
  // Attach EQ to all media elements
  // -------------------------------------
  const mediaElements = new WeakSet();

  function setupMediaElement(media) {
    if (!media || media._equalizerSetup || !(media instanceof HTMLMediaElement)) return;
    try {
      const source = context.createMediaElementSource(media);
      source.connect(filters.bass);
      media._equalizerSetup = true;
      mediaElements.add(media);
    } catch (e) {
      // Some sites disallow connecting the same media twice — ignore safely
      console.warn('EQ: Media setup failed', e);
    }
  }

  // -------------------------------------
  // Recursive scanner for shadow DOMs
  // -------------------------------------
  function findMediaDeep(root = document) {
    if (!root.querySelectorAll) return;
    root.querySelectorAll('audio, video').forEach(setupMediaElement);
    root.querySelectorAll('*').forEach((el) => {
      if (el.shadowRoot) findMediaDeep(el.shadowRoot);
    });
  }

  // Initial scan
  findMediaDeep();

  // -------------------------------------
  // Watch for dynamically loaded media
  // -------------------------------------
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1) continue;
        findMediaDeep(node);
      }
    }
  });
  observer.observe(document, { childList: true, subtree: true });

  // -------------------------------------
  // Listen for EQ updates from background/popup
  // -------------------------------------
  window.addEventListener('updateEqualizer', (e) => {
    const settings = e.detail;
    if (!settings) return;

    filters.bass.gain.value = settings.bass ?? 0;
    filters.mid.gain.value = settings.mid ?? 0;
    filters.treble.gain.value = settings.treble ?? 0;

    // Logarithmic preamp adjustment
    preamp.gain.value = (settings.preamp === 0) ? 0 : Math.pow(10, ((settings.preamp - 1) - 100) / 100);
  });

  // -------------------------------------
  // Disable EQ (reset all gains)
  // -------------------------------------
  window.addEventListener('disableEqualizer', () => {
    filters.bass.gain.value = 0;
    filters.mid.gain.value = 0;
    filters.treble.gain.value = 0;
    preamp.gain.value = 1;
  });

  // -------------------------------------
  // Resume AudioContext on user interaction
  // -------------------------------------
  function resumeContext() {
    if (context.state === 'suspended') {
      context.resume();
    }
  }

  window.addEventListener('click', resumeContext, true);
  window.addEventListener('keydown', resumeContext, true);

  console.log('[EQ] Injected and observing media elements.');
})();
