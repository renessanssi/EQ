(() => {
  if (window.equalizerInjected) return; // Prevent multiple injections
  window.equalizerInjected = true;

  const context = new AudioContext();
  const filters = {};

  // Create filters
  filters.bass = context.createBiquadFilter();
  filters.bass.type = 'lowshelf';
  filters.bass.frequency.value = 60;
  filters.bass.gain.value = 0;

  filters.mid = context.createBiquadFilter();
  filters.mid.type = 'peaking';
  filters.mid.frequency.value = 1000;
  filters.mid.Q.value = 1;
  filters.mid.gain.value = 0;

  filters.treble = context.createBiquadFilter();
  filters.treble.type = 'highshelf';
  filters.treble.frequency.value = 12000;
  filters.treble.gain.value = 0;

  // Connect filters in series
  filters.bass.connect(filters.mid);
  filters.mid.connect(filters.treble);
  filters.treble.connect(context.destination);

  // Hook up all existing <audio> and <video> elements
  function setupMediaElement(media) {
    if (media._equalizerSetup) return; // already hooked
    media._equalizerSetup = true;

    // Create MediaElementSource for this element
    const source = context.createMediaElementSource(media);

    // Connect source -> filters chain
    source.connect(filters.bass);
  }

  // Setup on existing media elements
  const mediaElements = [...document.querySelectorAll('audio, video')];
  mediaElements.forEach(setupMediaElement);

  // Listen for future media elements added dynamically
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.tagName === 'AUDIO' || node.tagName === 'VIDEO') {
          setupMediaElement(node);
        }
        // Also check descendants
        if (node.querySelectorAll) {
          node.querySelectorAll('audio, video').forEach(setupMediaElement);
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Update filters when the popup sends new settings
  window.addEventListener('updateEqualizer', e => {
    const settings = e.detail;
    if (!settings) return;

    filters.bass.gain.value = settings.bass || 0;
    filters.mid.gain.value = settings.mid || 0;
    filters.treble.gain.value = settings.treble || 0;
  });

  // Resume context on user interaction (required by browsers)
  function resumeContext() {
    if (context.state === 'suspended') {
      context.resume();
    }
  }
  window.addEventListener('click', resumeContext);
  window.addEventListener('keydown', resumeContext);
})();
