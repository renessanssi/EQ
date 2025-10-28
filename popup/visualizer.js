// -------------------------------
// EQ Graph (frequency response lines)
// -------------------------------
export function initEQGraph(dom) {
  if (window.eqLinesInjected) return;
  window.eqLinesInjected = true;

  const context = new (window.AudioContext || window.webkitAudioContext)();

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

  const canvas = document.getElementById('eqCanvas');
  const ctx = canvas.getContext('2d');

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

  function dbToY(db, top, bottom, plotH) {
    return ((top - db) / (top - bottom)) * plotH;
  }

  function freqToX(freq, plotW) {
    return (Math.log10(freq / 20) / Math.log10(20000 / 20)) * plotW;
  }

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

  function draw() {
    const w = (canvas.width = canvas.clientWidth * devicePixelRatio);
    const h = (canvas.height = canvas.clientHeight * devicePixelRatio);
    ctx.resetTransform();
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    const plotW = canvas.clientWidth;
    const plotH = canvas.clientHeight;
    const dbTop = 31, dbBottom = -31;

    // Frequency grid
    const freqTicks = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let f of freqTicks) {
      const x = freqToX(f, plotW);
      ctx.moveTo(x, 0);
      ctx.lineTo(x, plotH);
    }
    ctx.stroke();

    // Decibel grid
    ctx.beginPath();
    for (let db = dbTop; db >= dbBottom; db -= 6) {
      const y = dbToY(db, dbTop, dbBottom, plotH);
      ctx.moveTo(0, y);
      ctx.lineTo(plotW, y);
    }
    ctx.stroke();

    // EQ Curves
    computeResponses();

    function drawCurve(arr, color, width = 2) {
      // Compute path
      const path = new Path2D();
      for (let i = 0; i < POINTS; i++) {
        const x = freqToX(freqs[i], plotW);
        const y = dbToY(20 * Math.log10(arr[i]), dbTop, dbBottom, plotH);
        if (i === 0) path.moveTo(x, y);
        else path.lineTo(x, y);
      }

      // ---- GLOW LAYER ----
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.lineWidth = width + 1;
      ctx.strokeStyle = color;
      ctx.globalCompositeOperation = 'lighter';
      ctx.stroke(path);
      ctx.restore();
    }

    drawCurve(mag.treble, 'rgba(140,255,150,0.95)');
    drawCurve(mag.mid, 'rgba(90,170,255,0.95)');
    drawCurve(mag.bass, 'rgba(255,174,0,0.95)');

    requestAnimationFrame(draw);
  }

  draw();

  // Public updater
  window.redrawEQGraph = (settings) => {
    filters.bass.gain.value = settings.bass;
    filters.mid.gain.value = settings.mid;
    filters.treble.gain.value = settings.treble;
  };
}

// -------------------------------
// Bar Graph Visualizer (separate)
// -------------------------------
export function initBarGraph() {
  if (window.barGraphInjected) return;
  window.barGraphInjected = true;

  const canvas = document.getElementById('barCanvas');
  const ctx = canvas.getContext('2d');
  let frequencyData = [];
  let stop = false;

  function drawBars() {
    if (stop) return;

    const w = (canvas.width = canvas.clientWidth * devicePixelRatio);
    const h = (canvas.height = canvas.clientHeight * devicePixelRatio);
    ctx.resetTransform();
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    if (frequencyData.length) {
      const bufferLength = frequencyData.length;
      const barWidth = (canvas.clientWidth / bufferLength) * 1.5;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (frequencyData[i] / 255) * canvas.clientHeight;
        const hue = (i / bufferLength) * 360;
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        ctx.fillRect(x, canvas.clientHeight - barHeight, barWidth, barHeight);
        x += barWidth;
      }
    }

    requestAnimationFrame(drawBars);
  }

  function updateData() {
    if (stop) return;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs?.[0]?.id) return;
      chrome.tabs.sendMessage(tabs[0].id, { action: 'getFrequencyData' }, (response) => {
        if (response && response.data) {
          frequencyData = response.data;
        }
      });
    });

    requestAnimationFrame(updateData);
  }

  drawBars();
  updateData();
  
  window.addEventListener("beforeunload", () => {
    stop = true;
  });
}