// Actors share the scene clock; this module never schedules a frame or a timer.
// Coordinates are authored against the 1672 x 941 photograph, top left = (0, 0).
import { forestConfig } from './scene-config.js';

const IMAGE_ASPECT = forestConfig.imageAspect;
const ATLAS_URL = new URL('./assets/grey-parrot-atlas.webp', import.meta.url);
const FLAP_FRAMES = [0, 1, 2, 1];
// Registration points measured on the generated atlas, before alpha trimming:
// three matching torso centers, then the perched bird's foot contact point.
const FRAME_ANCHORS = [[.57, .77], [.58, .76], [.57, .29], [.59, .85]];
const CYCLE = 48;
const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
const smooth = (low, high, value) => {
  const t = clamp((value - low) / (high - low));
  return t * t * (3 - 2 * t);
};
const seed = (value) => {
  const n = Math.sin(value * 127.1 + 311.7) * 43758.5453;
  return n - Math.floor(n);
};

export function createFauna(canvas, { onCall = () => {} } = {}) {
  const ctx = canvas?.getContext('2d', { alpha: true });
  let image = null;
  let frames = null;
  let ready = false;
  let destroyed = false;
  let loading = null;
  let finishLoading = null;
  let previousTime = null;
  let suppressEvents = true;
  const delivered = new Set();

  // Find transparent padding once, while loading. Flight cells use a shared
  // crop so that changing wing pose cannot change the apparent body scale.
  function findFrames(atlas) {
    const cellWidth = Math.floor(atlas.naturalWidth / 2);
    const cellHeight = Math.floor(atlas.naturalHeight / 2);
    const scratch = document.createElement('canvas');
    scratch.width = cellWidth;
    scratch.height = cellHeight;
    const scan = scratch.getContext('2d', { willReadFrequently: true });
    const boxes = [];
    for (let i = 0; i < 4; i += 1) {
      scan.clearRect(0, 0, cellWidth, cellHeight);
      scan.drawImage(atlas, (i % 2) * cellWidth, Math.floor(i / 2) * cellHeight,
        cellWidth, cellHeight, 0, 0, cellWidth, cellHeight);
      const pixels = scan.getImageData(0, 0, cellWidth, cellHeight).data;
      let left = cellWidth, right = 0, top = cellHeight, bottom = 0;
      for (let y = 0; y < cellHeight; y += 1) {
        for (let x = 0; x < cellWidth; x += 1) {
          if (pixels[(y * cellWidth + x) * 4 + 3] < 32) continue;
          left = Math.min(left, x); right = Math.max(right, x);
          top = Math.min(top, y); bottom = Math.max(bottom, y);
        }
      }
      if (left > right) throw new Error('Empty bird atlas cell');
      boxes.push({ left, right, top, bottom });
    }
    const flight = {
      left: Math.min(...boxes.slice(0, 3).map((box) => box.left)),
      right: Math.max(...boxes.slice(0, 3).map((box) => box.right)),
      top: Math.min(...boxes.slice(0, 3).map((box) => box.top)),
      bottom: Math.max(...boxes.slice(0, 3).map((box) => box.bottom)),
    };
    return boxes.map((box, index) => {
      const crop = index < 3 ? flight : box;
      return {
        x: (index % 2) * cellWidth + crop.left,
        y: Math.floor(index / 2) * cellHeight + crop.top,
        width: crop.right - crop.left + 1,
        height: crop.bottom - crop.top + 1,
        anchorX: (FRAME_ANCHORS[index][0] * cellWidth - crop.left) / (crop.right - crop.left + 1),
        anchorY: (FRAME_ANCHORS[index][1] * cellHeight - crop.top) / (crop.bottom - crop.top + 1),
      };
    });
  }

  function load() {
    if (loading) return loading;
    if (destroyed || !ctx) return Promise.resolve(false);
    loading = new Promise((resolve) => {
      const atlas = new Image();
      image = atlas;
      finishLoading = resolve;
      atlas.onload = () => {
        if (destroyed) return resolve(false);
        try { frames = findFrames(atlas); }
        catch { frames = null; }
        ready = true;
        suppressEvents = true;
        finishLoading = null;
        resolve(Boolean(frames));
      };
      atlas.onerror = () => {
        if (destroyed) return resolve(false);
        // An unavailable asset leaves a small, distant bird fallback.
        frames = null;
        ready = true;
        suppressEvents = true;
        finishLoading = null;
        resolve(false);
      };
      atlas.src = ATLAS_URL.href;
    });
    return loading;
  }

  function resetEvents(time) {
    previousTime = Number.isFinite(time) ? time : null;
    suppressEvents = true;
  }

  function deliver(id, time, now, state, actor) {
    if (delivered.has(id) || time <= previousTime || time > now) return;
    delivered.add(id);
    // The callback is a cue, not an audio player. The sound engine decides
    // whether audio is unlocked and maps distance onto gain and filtering.
    if (state.paused || state.hour < 5.5 || state.hour > 19 || state.rain > .85) return;
    try {
      onCall({ id, kind: 'parrot', pan: clamp(actor.pan, -1, 1),
        distance: actor.distance, strength: actor.strength * (1 - state.rain * .65) });
    } catch { /* Audio availability must never interrupt the picture. */ }
  }

  function draw(state) {
    if (!ctx || destroyed) return;
    const { time = 0, hour = 8, rain = 0, wind = .4, paused = false,
      width = canvas.clientWidth, height = canvas.clientHeight,
      pointer = [0, 0], quality = 1 } = state;
    if (!(width > 0 && height > 0) || !Number.isFinite(time)) return;
    const aspect = width / height;
    const cover = state.cover || [Math.min(1, aspect / IMAGE_ASPECT), Math.min(1, IMAGE_ASPECT / aspect)];
    const coverX = Math.max(.001, cover[0] ?? cover.x ?? 1);
    const coverY = Math.max(.001, cover[1] ?? cover.y ?? 1);
    const pointerX = pointer[0] ?? pointer.x ?? 0;
    const pointerY = pointer[1] ?? pointer.y ?? 0;
    const pixelBudget = Math.max(forestConfig.pixels.minimum, forestConfig.pixels.desktop *
      (typeof quality === 'number' ? clamp(quality, .3, 1) : quality === 'low' ? .5 : 1));
    const ratio = Math.min(globalThis.devicePixelRatio || 1, quality === 'low' || quality < .75 ? 1 : 1.5,
      Math.sqrt(pixelBudget / (width * height)));
    const pixelWidth = Math.max(1, Math.round(width * ratio));
    const pixelHeight = Math.max(1, Math.round(height * ratio));
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    ctx.setTransform(pixelWidth / width, 0, 0, pixelHeight / height, 0, 0);
    ctx.clearRect(0, 0, width, height);
    if (!ready) { previousTime = time; return; }

    // Inverse of the photograph's cover/parallax transform, including overscan.
    const project = (x, y) => [
      ((x - .5 - pointerX * .003 * coverX) * forestConfig.overscan / coverX + .5) * width,
      ((y - .5 - pointerY * .002 * coverY) * forestConfig.overscan / coverY + .5) * height,
    ];
    const sourceScale = height * forestConfig.overscan / coverY;
    const noon = Math.sin(clamp((hour - 5) / 15) * Math.PI);
    const dusk = smooth(16, 19.5, hour);
    const daylight = clamp(.48 + noon * .43 - dusk * .13 - rain * .17, .24, 1);
    const activity = (1 - rain * .72) * (1 - dusk * .62);
    const cycle = Math.floor(time / CYCLE);
    const localTime = time - cycle * CYCLE;
    const cycleSeed = seed(cycle + 7);
    const flightStart = 6 + (cycle === 0 ? 0 : cycleSeed * 5);
    const flightAllowed = rain < .65 || cycle % 2 === 0;

    function sprite(index, x, y, sourceHeight, alpha = 1, flip = false, angle = 0, footAnchor = false) {
      if (alpha < .008) return;
      const point = project(x, y);
      const drawHeight = sourceHeight * sourceScale;
      if (point[0] < -drawHeight || point[0] > width + drawHeight || point[1] < -drawHeight || point[1] > height + drawHeight) return;
      ctx.save();
      ctx.translate(point[0], point[1]);
      ctx.rotate(angle);
      ctx.scale(flip ? -1 : 1, 1);
      ctx.globalAlpha = alpha;
      if (frames && image) {
        const cell = frames[index];
        const drawWidth = drawHeight * cell.width / cell.height;
        ctx.filter = `brightness(${daylight}) saturate(${.72 + daylight * .28})`;
        // All flight poses keep their torso in exactly the same place. Their
        // wings extend above/below that point rather than shifting the bird.
        ctx.drawImage(image, cell.x, cell.y, cell.width, cell.height,
          -drawWidth * cell.anchorX, -drawHeight * cell.anchorY, drawWidth, drawHeight);
      } else {
        // Deliberately distant and small if the generated sprite cannot load.
        ctx.scale(.55, .55);
        ctx.fillStyle = `rgb(${Math.round(72 * daylight)},${Math.round(78 * daylight)},${Math.round(72 * daylight)})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, drawHeight * .2, drawHeight * .07, -.12, 0, Math.PI * 2);
        ctx.fill();
        if (!footAnchor) {
          const lift = Math.sin(time * Math.PI * 8) * drawHeight * .25;
          ctx.beginPath(); ctx.moveTo(-drawHeight * .1, 0);
          ctx.quadraticCurveTo(-drawHeight * .26, -lift, -drawHeight * .47, -lift * .5);
          ctx.lineTo(-drawHeight * .13, drawHeight * .03);
          ctx.quadraticCurveTo(drawHeight * .2, -lift * .5, drawHeight * .39, -lift * .7);
          ctx.lineTo(drawHeight * .03, 0); ctx.fill();
        }
      }
      ctx.restore();
    }

    // Foot contact at the crest of the right-hand fallen log. Subpixel body
    // breathing and occasional attentive tilts preserve that contact point.
    const attention = Math.pow(Math.max(0, Math.sin(time * .38 + .7)), 18);
    const breathing = Math.sin(time * 2.15) * .0017;
    sprite(3, .703, .700, .057 * (1 + breathing), 1, false,
      Math.sin(time * .69) * .008 + attention * .025, true);

    // One or two parrots pass through the middle-distance opening, rather than
    // crossing the two enormous foreground trunks. Brief fades at the opening
    // boundaries make their path disappear into the vegetation naturally.
    if (flightAllowed) {
      const birdCount = cycle % 3 === 1 || rain > .5 ? 1 : 2;
      for (let bird = 0; bird < birdCount; bird += 1) {
        const age = localTime - flightStart - bird * .82;
        const duration = 5.9 + bird * .55;
        if (age < 0 || age > duration) continue;
        const progress = age / duration;
        const reverse = cycle % 2 !== 0;
        const x = reverse ? .672 - progress * .376 : .296 + progress * .376;
        const y = .454 - Math.sin(progress * Math.PI) * .085 + bird * .028 + cycleSeed * .025;
        const opening = smooth(.296, .332, x) * (1 - smooth(.626, .672, x));
        const distance = .69 + Math.sin(progress * Math.PI) * .08;
        const opacity = opening * smooth(0, .12, progress) * (1 - smooth(.88, 1, progress));
        const wing = FLAP_FRAMES[Math.floor((age * 4.1 + bird * .27) * 4) % 4];
        sprite(wing, x, y + Math.sin(age * 25.8) * .0008,
          .052 * (1 - distance * .35), opacity * (1 - rain * .22), reverse,
          -.10 * Math.cos(progress * Math.PI) * (reverse ? -1 : 1));
      }
    }

    // Tiny, brown/ochre forest butterflies stay close to the shaded bank.
    // No glow and no full-screen particle swarm: three bodies at most.
    const butterflyCount = quality === 'low' || quality < .75 ? 1 : 3;
    for (let i = 0; i < butterflyCount; i += 1) {
      const visibility = activity * smooth(.2, .55, Math.sin(time * .15 + i * 2.1) * .5 + .5);
      if (visibility < .04) continue;
      const centers = [[.387, .662], [.605, .641], [.343, .601]];
      const x = centers[i][0] + Math.sin(time * .49 + i * 3.3) * .013 + Math.sin(time * 1.39 + i) * .0025;
      const y = centers[i][1] + Math.cos(time * .61 + i * 4) * .012 + Math.sin(time * 1.17 + i) * .002;
      const point = project(x, y);
      const size = sourceScale * (.0021 + i * .00012);
      const wingWidth = size * (.16 + Math.abs(Math.sin(time * (18 + i * 2) + i)) * .84);
      ctx.save(); ctx.translate(point[0], point[1]);
      ctx.rotate(Math.sin(time * .5 + i) * .45 + wind * .12);
      ctx.globalAlpha = visibility * .85;
      ctx.fillStyle = i === 1 ? `rgb(${Math.round(168 * daylight)},${Math.round(119 * daylight)},${Math.round(57 * daylight)})`
        : `rgb(${Math.round(108 * daylight)},${Math.round(80 * daylight)},${Math.round(42 * daylight)})`;
      ctx.beginPath(); ctx.ellipse(-wingWidth * .6, 0, wingWidth, size * .7, -.35, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(wingWidth * .6, 0, wingWidth, size * .7, .35, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#242c1b'; ctx.fillRect(-size * .11, -size * .5, size * .22, size);
      ctx.restore();
    }

    const delta = previousTime === null ? 0 : time - previousTime;
    const continuous = !suppressEvents && previousTime !== null && delta > 0 && delta < .75 && !paused;
    if (continuous) {
      const soundState = { hour, rain, paused };
      deliver(`perched-${cycle}`, cycle * CYCLE + 3.8, time, soundState,
        { pan: .41, distance: .28, strength: .55 });
      if (flightAllowed) deliver(`flight-${cycle}`, cycle * CYCLE + flightStart + 2.1, time, soundState,
        { pan: cycle % 2 ? .15 : -.15, distance: .77, strength: .39 });
      if (cycle % 2 === 0) deliver(`canopy-${cycle}`, cycle * CYCLE + 28.4, time, soundState,
        { pan: -.55, distance: .94, strength: .2 });
    }
    previousTime = time;
    suppressEvents = paused;
    // Deduplication stays bounded during multi-hour ambient playback.
    if (delivered.size > 96) {
      for (const id of delivered) {
        if (Number(id.slice(id.lastIndexOf('-') + 1)) < cycle - 4) delivered.delete(id);
      }
    }
  }

  function destroy() {
    destroyed = true;
    if (image) { image.onload = null; image.onerror = null; }
    finishLoading?.(false);
    finishLoading = null;
    image = null;
    frames = null;
    delivered.clear();
    if (ctx) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); }
  }

  return { load, draw, resetEvents, destroy };
}
