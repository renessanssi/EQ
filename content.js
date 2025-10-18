// 🟢 Immediately Invoked Function Expression (IIFE)
// This makes sure our script runs only once per page
(() => {
  // Prevent multiple injections (if popup is reopened, etc.)
  if (window.equalizerInjected) return;
  window.equalizerInjected = true;

  // 🎧 Create a single AudioContext for the page
  const context = new AudioContext();

  // 🎛️ Object to store all EQ filters
  const filters = {};

  // =========================
  // 🎚️ CREATE 3 FILTER BANDS
  // =========================

  // 🔊 Bass filter — boosts or cuts low frequencies (~60 Hz)
  filters.bass = context.createBiquadFilter();
  filters.bass.type = 'lowshelf';
  filters.bass.frequency.value = 60;

  // 🎶 Mid filter — affects middle frequencies (~1 kHz)
  filters.mid = context.createBiquadFilter();
  filters.mid.type = 'peaking';
  filters.mid.frequency.value = 1000;
  filters.mid.Q.value = 1; // How wide the frequency range is

  // 🔈 Treble filter — boosts or cuts high frequencies (~12 kHz)
  filters.treble = context.createBiquadFilter();
  filters.treble.type = 'highshelf';
  filters.treble.frequency.value = 12000;

  // ================================
  // ⚙️ INITIAL (DEFAULT) SETTINGS
  // ================================
  filters.bass.gain.value = 0;
  filters.mid.gain.value = 0;
  filters.treble.gain.value = 0;

  // ==========================
  // 🔗 CONNECT FILTER CHAIN
  // ==========================
  // All audio will flow like this:
  // MediaElement -> Bass -> Mid -> Treble -> Speakers
  filters.bass.connect(filters.mid);
  filters.mid.connect(filters.treble);
  filters.treble.connect(context.destination);

  // ===============================
  // 🎥 CONNECT AUDIO/VIDEO ELEMENTS
  // ===============================

  /**
   * Connects an <audio> or <video> element to the equalizer chain.
   * Ensures each element is only connected once.
   */
  function setupMediaElement(media) {
    if (media._equalizerSetup) return; // Already connected
    media._equalizerSetup = true;

    // Create a MediaElementSource for the element
    const source = context.createMediaElementSource(media);

    // Connect it into the EQ filter chain
    source.connect(filters.bass);
  }

  // Apply to all media elements currently in the page
  [...document.querySelectorAll('audio, video')].forEach(setupMediaElement);

  // ===========================================
  // 👀 WATCH FOR NEW AUDIO/VIDEO ELEMENTS ADDED
  // ===========================================
  // Some websites (e.g., YouTube, Spotify web) load players dynamically
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        // Directly added <audio> or <video> element
        if (node.tagName === 'AUDIO' || node.tagName === 'VIDEO') {
          setupMediaElement(node);
        }

        // If a container element is added, check inside it
        if (node.querySelectorAll) {
          node.querySelectorAll('audio, video').forEach(setupMediaElement);
        }
      }
    }
  });

  // Start observing the whole document for added nodes
  observer.observe(document.body, { childList: true, subtree: true });

  // ===========================================
  // 🔄 RECEIVE UPDATES FROM POPUP (EQ CHANGES)
  // ===========================================
  window.addEventListener('updateEqualizer', (e) => {
    const settings = e.detail;
    if (!settings) return;

    // Apply new gain (volume) values to each band
    filters.bass.gain.value = settings.bass ?? 0;
    filters.mid.gain.value = settings.mid ?? 0;
    filters.treble.gain.value = settings.treble ?? 0;
  });

  // ==============================================
  // ▶️ AUTO-RESUME CONTEXT (required by browsers)
  // ==============================================
  // Browsers often suspend AudioContext until the user interacts
  function resumeContext() {
    if (context.state === 'suspended') context.resume();
  }

  // Resume when user clicks or presses any key
  window.addEventListener('click', resumeContext);
  window.addEventListener('keydown', resumeContext);
})();
