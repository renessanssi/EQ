(() => {
  if (window.equalizerInjected) return;
  window.equalizerInjected = true;

  const context = new AudioContext();

  // -------------------------------
  // Create nodes
  // -------------------------------
  const preamp = context.createGain();
  preamp.gain.value = 1;

  const filters = {
    bass: context.createBiquadFilter(),
    mid: context.createBiquadFilter(),
    treble: context.createBiquadFilter(),
  };

  filters.bass.type = 'lowshelf';
  filters.bass.frequency.value = 60;

  filters.mid.type = 'peaking';
  filters.mid.frequency.value = 1000;
  filters.mid.Q.value = 1;

  filters.treble.type = 'highshelf';
  filters.treble.frequency.value = 12000;

  const master = context.createGain();
  master.gain.value = 1;

  // -------------------------------
  // Analyzer setup for frequency data
  // -------------------------------
  const analyser = context.createAnalyser();
  analyser.fftSize = 256;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  // Connect EQ → Master → Analyser → Destination
  preamp.connect(filters.bass);
  filters.bass.connect(filters.mid);
  filters.mid.connect(filters.treble);
  filters.treble.connect(master);
  master.connect(analyser);
  analyser.connect(context.destination);

  // -------------------------------
  // Handle <audio> / <video> elements
  // -------------------------------
  const mediaElements = new Set();

  function setupMediaElement(media) {
    if (media._equalizerSetup) return;
    media._equalizerSetup = true;

    try {
      const source = context.createMediaElementSource(media);
      source.connect(preamp);
      mediaElements.add(media);
    } catch (err) {
      console.warn('Equalizer: Failed to attach to media element', err);
    }
  }

  document.querySelectorAll('audio, video').forEach(setupMediaElement);
  
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.tagName === 'AUDIO' || node.tagName === 'VIDEO') {
          setupMediaElement(node);
        } else if (node.querySelectorAll) {
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
    const s = e.detail;
    if (!s) return;

    if (s.bassFreq !== undefined) filters.bass.frequency.value = s.bassFreq;
    if (s.midFreq !== undefined) filters.mid.frequency.value = s.midFreq;
    if (s.trebleFreq !== undefined) filters.treble.frequency.value = s.trebleFreq;

    // existing gain updates
    if (s.preamp !== undefined) preamp.gain.value = Math.pow(10, s.preamp / 20);
    if (s.bass !== undefined) filters.bass.gain.value = s.bass;
    if (s.mid !== undefined) filters.mid.gain.value = s.mid;
    if (s.treble !== undefined) filters.treble.gain.value = s.treble;
    if (s.master !== undefined) master.gain.value = s.master / 100;
  });



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
  // Respond to popup data requests
  // -------------------------------
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getFrequencyData") {
      analyser.getByteFrequencyData(dataArray);
      sendResponse({ data: Array.from(dataArray) });
    }
    return true;
  });
})();
