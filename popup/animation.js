// -------------------------------
// Slider animation helpers
// -------------------------------

/**
 * Smoothly animates a slider from its current value to a target value.
 * Dispatches 'input' events during the animation so listeners update live.
 * @param {HTMLInputElement} slider - The range input element.
 * @param {number} target - Target slider value.
 * @param {number} [duration=150] - Animation duration in ms (default 150ms).
 */
export function animateSliderTo(slider, target, duration = 150) {
  const steps = 15;
  const stepValue = (target - slider.value) / steps;
  let count = 0;

  const interval = setInterval(() => {
    slider.value = parseFloat(slider.value) + stepValue;
    slider.dispatchEvent(new Event('input'));
    count++;
    if (count >= steps) {
      slider.value = target;
      slider.dispatchEvent(new Event('input'));
      clearInterval(interval);
    }
  }, duration / steps);
}

/**
 * Animates a slider smoothly back to zero.
 * @param {HTMLInputElement} slider
 */
export function animateToZero(slider) {
  animateSliderTo(slider, 0);
}
