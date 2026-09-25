// All spatial values use the original photograph: x rightwards, y downwards, 0..1.
// For another environment, replace assets and author these material regions first.
export const forestConfig = {
  imageAspect: 1672 / 941,
  overscan: 1.025,
  fps: 30,
  cycleSeconds: 180,
  hours: { min: 6, max: 19.5, initial: 8 },
  presets: { dawn: 6.5, morning: 8, noon: 12.5, dusk: 18.7 },
  pixels: { desktop: 1200000, mobile: 650000, minimum: 360000 },
  assets: { foliage: 'assets/foreground-bough.webp' },
  stream: { center: .49, horizon: .585, spread: .385 },
  foliage: { origin: [.59, -.095], size: [.52, .43] },
};

export function formatHour(hour) {
  const minutes = Math.round(hour * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

// Monotone reduction with hysteresis: keep a low-power device stable once it struggles.
export function createQualityController(initialPixels) {
  let pixels = initialPixels, samples = 0, missed = 0, lastChange = -Infinity;
  return {
    get pixels() { return pixels; },
    sample(frameMilliseconds, time) {
      // Visibility/resume resets exclude background waits. Even very slow foreground
      // frames must count, otherwise overloaded devices can never lower resolution.
      if (!Number.isFinite(frameMilliseconds) || frameMilliseconds <= 0) return false;
      samples++;
      if (frameMilliseconds > 48) missed++;
      if (samples < 90) return false;
      const struggling = missed / samples > .22;
      samples = missed = 0;
      if (!struggling || time - lastChange < 6 || pixels <= forestConfig.pixels.minimum) return false;
      pixels = Math.max(forestConfig.pixels.minimum, Math.round(pixels * .76));
      lastChange = time;
      return true;
    },
    reset() { samples = missed = 0; }
  };
}
