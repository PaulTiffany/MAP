export const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));
export const lerp = (a, b, t) => a + (b - a) * t;

export const easings = Object.freeze({
  linear: t => t,
  smoothstep: t => t * t * (3 - 2 * t),
  smootherstep: t => t * t * t * (t * (t * 6 - 15) + 10),
  easeInOutCubic: t => t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2
});

export function localProgress(value, start = 0, end = 1, easing = 'linear') {
  const raw = end === start ? Number(value >= end) : clamp((value - start) / (end - start));
  return (easings[easing] || easings.linear)(raw);
}

export function sampleKeyframes(keyframes, value, easing = 'linear') {
  if (!Array.isArray(keyframes) || keyframes.length === 0) return undefined;
  if (keyframes.length === 1) return keyframes[0].value;

  if (value <= keyframes[0].at) return keyframes[0].value;
  const last = keyframes[keyframes.length - 1];
  if (value >= last.at) return last.value;

  let lo = 0;
  let hi = keyframes.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (keyframes[mid].at <= value) lo = mid;
    else hi = mid;
  }

  const a = keyframes[lo];
  const b = keyframes[hi];
  const t = localProgress(value, a.at, b.at, b.easing || a.easing || easing);
  if (typeof a.value === 'number' && typeof b.value === 'number') return lerp(a.value, b.value, t);
  return t < 0.5 ? a.value : b.value;
}

export function lodAlpha(scale, lod = {}) {
  const min = lod.min ?? -Infinity;
  const max = lod.max ?? Infinity;
  const fade = Math.max(0, lod.fade ?? 0);
  if (scale < min - fade || scale > max + fade) return 0;
  if (scale >= min && scale <= max) return 1;
  if (scale < min) return localProgress(scale, min - fade, min, 'smoothstep');
  return 1 - localProgress(scale, max, max + fade, 'smoothstep');
}
