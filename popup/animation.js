// -------------------------------
// Slider animation helpers
// -------------------------------

/**
 * Smoothly animates a slider from its current value to a target value
 * using requestAnimationFrame for smoother 60 FPS animation.
 * Dispatches 'input' events during the animation so listeners update live.
 *
 * @param {HTMLInputElement} slider - The range input element.
 * @param {number} target - Target slider value.
 * @param {number} [duration=150] - Animation duration in ms (default 150 ms).
 */
export function animateSliderTo(slider, target, duration = 150) {
  const start = performance.now();
  const initial = parseFloat(slider.value);
  const delta = target - initial;
  let finished = false;
  let frameId;

  function animate(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1); // Clamp 0–1
    const eased = easeInOutCubic(progress);           // Smooth easing

    slider.value = initial + delta * eased;
    slider.dispatchEvent(new Event('input'));

    if (progress < 1) {
      frameId = requestAnimationFrame(animate);
    } else {
      slider.value = target;
      slider.dispatchEvent(new Event('input'));
      finished = true;
    }
  }

  frameId = requestAnimationFrame(animate);

  // Graceful stop if popup closes, tab hidden, or extension unloads
  const stopAnimation = () => {
    if (!finished) {
      cancelAnimationFrame(frameId);
      slider.value = target;
      slider.dispatchEvent(new Event('input'));
    }
  };

  document.addEventListener('visibilitychange', stopAnimation, { once: true });
  window.addEventListener('unload', stopAnimation, { once: true });
}

/** Easing function for smoother motion (ease-in-out cubic) */
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
