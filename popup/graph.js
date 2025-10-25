import { dom } from './dom.js';

// -------------------------------
// Initialize & draw EQ Graph Canvas
// -------------------------------
export function initEQGraph() {
  // Prevent double injection
  if (window.eqCanvasInjected) return;
  window.eqCanvasInjected = true;

  const context = new (window.AudioContext || window.webkitAudioContext)();

  // Biquad filters for visual simulation (not actual audio filtering)
  const filters = {
    bass: context.createBiquadFilter(),
    mid: context.createBiquadFilter(),
    treble: context.createBiquadFilter(),
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

  // Canvas setup
  const canvas = document.getElementById('eqCanvas');
  const ctx = canvas.getContext('2d');

  // Frequency response setup
  const POINTS = 512;
  const freqs = new Float32Array(POINTS);
  const fmin = 20, fmax = 20000;
  for (let i = 0; i < POINTS; i++) {
    const frac = i / (POINTS - 1);
    freqs[i] = fmin * Math.pow(fmax / fmin, frac);
  }

  const mag = {
    bass: new Float32Array(POINTS),
    mid: new Float32Array(POINTS),
    treble: new Float32Array(POINTS),
  };

  let frequencyData = [];

  // -------------------------------
  // Helper functions
  // -------------------------------
  function dBtoLinear(db) {
    return Math.pow(10, db / 20);
  }

  function dbToY(db, top, bottom, plotH) {
    return ((top - db) / (top - bottom)) * plotH;
  }

  function freqToX(freq, plotW) {
    return (Math.log10(freq / 20) / Math.log10(20000 / 20)) * plotW;
  }

  // Connect sliders to filters visually
  function wireSlider(slider, valElem, onChange) {
    slider.addEventListener('input', (e) => {
      valElem.textContent = e.target.value;
      onChange(Number(e.target.value));
    });
  }

  wireSlider(dom.bassControl, dom.bassValLabel, (v) => (filters.bass.gain.value = v));
  wireSlider(dom.midControl, dom.midValLabel, (v) => (filters.mid.gain.value = v));
  wireSlider(dom.trebleControl, dom.trebleValLabel, (v) => (filters.treble.gain.value = v));

  function computeResponses() {
    filters.bass.getFrequencyResponse(freqs, mag.bass, new Float32Array(POINTS));
    filters.mid.getFrequencyResponse(freqs, mag.mid, new Float32Array(POINTS));
    filters.treble.getFrequencyResponse(freqs, mag.treble, new Float32Array(POINTS));
  }

  // -------------------------------
  // Draw Loop
  // -------------------------------
  function draw() {
    const w = (canvas.width = canvas.clientWidth * devicePixelRatio);
    const h = (canvas.height = canvas.clientHeight * devicePixelRatio);
    ctx.resetTransform();
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    const margin = { left: 0, right: 0, top: 0, bottom: 0 };
    const plotW = canvas.clientWidth;
    const plotH = canvas.clientHeight;

    // --- Bar Visualizer ---
    if (frequencyData.length) {
      const bufferLength = frequencyData.length;
      const barWidth = (plotW / bufferLength) * 1.5;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (frequencyData[i] / 255) * plotH;
        const hue = (i / bufferLength) * 360;
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        ctx.fillRect(x, plotH - barHeight, barWidth, barHeight);
        x += barWidth;
      }
    }

    // --- Frequency Grid ---
    const freqTicks = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let f of freqTicks) {
      const x = margin.left + freqToX(f, plotW);
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, margin.top + plotH);
    }
    ctx.stroke();

    // --- Decibel Grid ---
    const dbTop = 31, dbBottom = -31;
    ctx.beginPath();
    for (let db = dbTop; db >= dbBottom; db -= 6) {
      const y = margin.top + dbToY(db, dbTop, dbBottom, plotH);
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + plotW, y);
    }
    ctx.stroke();

    // --- EQ Curves ---
    computeResponses();
    function drawCurve(arr, color, width = 2) {
      ctx.beginPath();
      ctx.lineWidth = width;
      ctx.strokeStyle = color;
      for (let i = 0; i < POINTS; i++) {
        const x = margin.left + freqToX(freqs[i], plotW);
        const y = margin.top + dbToY(20 * Math.log10(arr[i]), dbTop, dbBottom, plotH);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    drawCurve(mag.treble, 'rgba(140,255,150,0.95)');
    drawCurve(mag.mid, 'rgba(90,170,255,0.95)');
    drawCurve(mag.bass, 'rgba(255,174,0,0.95)');

    requestAnimationFrame(draw);
  }

  // -------------------------------
  // Frequency Data Updater
  // -------------------------------
  function updateVisualizer() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs?.[0]?.id) return;
      chrome.tabs.sendMessage(tabs[0].id, { action: 'getFrequencyData' }, (response) => {
        if (response && response.data) {
          frequencyData = response.data;
        }
      });
    });
  }

  // Update frequency data every 50ms
  setInterval(updateVisualizer, 50);

  // Start draw loop
  draw();

  // -------------------------------
  // Public redraw function
  // -------------------------------
  window.redrawEQGraph = (settings) => {
    filters.bass.gain.value = settings.bass;
    filters.mid.gain.value = settings.mid;
    filters.treble.gain.value = settings.treble;
  };

  // Redraw on resize
  window.addEventListener('resize', () => {
    setTimeout(draw, 100);
  });
}
