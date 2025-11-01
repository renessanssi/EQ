// math-utils.js
export const DEFAULT_FREQUENCIES = {
  bass: 60,
  mid: 1000,
  treble: 12000,
};

const minFreq = 20;
const maxFreq = 20000;

export function percentToFreq(percent) {
  const logMin = Math.log10(minFreq);
  const logMax = Math.log10(maxFreq);
  return Math.round(Math.pow(10, logMin + (percent / 100) * (logMax - logMin)));
}

export function freqToPercent(freq) {
  const logMin = Math.log10(minFreq);
  const logMax = Math.log10(maxFreq);
  return ((Math.log10(freq) - logMin) / (logMax - logMin)) * 100;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
