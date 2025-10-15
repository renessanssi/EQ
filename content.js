(() => {
  if (window.equalizerInjected) return;
  window.equalizerInjected = true;

  const context = new AudioContext();
  const filters = {};

  // Create filters
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

  // Load previous settings from localStorage
  const savedSettings = JSON.parse(localStorage.getItem('equalizerSettings'));
  filters.bass.gain.value = savedSettings?.bass ?? 0;
  filters.mid.gain.value = savedSettings?.mid ?? 0;
  filters.treble.gain.value = savedSettings?.treble ?? 0;

  // Connect filters
  filters.bass.connect(filters.mid);
  filters.mid.connect(filters.treble);
  filters.treble.connect(context.destination);

  // Hook up media
  function setupMediaElement(media) {
    if (media._equalizerSetup) return;
    media._equalizerSetup = true;

    const source = context.createMediaElementSource(media);
    source.connect(filters.bass);
  }

  [...document.querySelectorAll('audio, video')].forEach(setupMediaElement);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.tagName === 'AUDIO' || node.tagName === 'VIDEO') {
          setupMediaElement(node);
        }
        if (node.querySelectorAll) {
          node.querySelectorAll('audio, video').forEach(setupMediaElement);
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Listen for updates from popup
  window.addEventListener('updateEqualizer', e => {
    const settings = e.detail;
    if (!settings) return;

    filters.bass.gain.value = settings.bass ?? 0;
    filters.mid.gain.value = settings.mid ?? 0;
    filters.treble.gain.value = settings.treble ?? 0;

    localStorage.setItem('equalizerSettings', JSON.stringify(settings));
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
