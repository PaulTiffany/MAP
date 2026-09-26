// A frame-only sticker renderer: no routes, world decisions, sounds or timers.
// The world owns each object's position and age; age only deforms its local pose.
import { forestConfig } from './scene-config.js';
import { stickerCatalog } from './lib/sticker-world/catalog.js';

const IMAGE_ASPECT = forestConfig.imageAspect;
const PARROT_ASSET = stickerCatalog['grey-parrot'].asset;
const LEAF_ASSET = stickerCatalog['forest-leaf'].asset;
const FLAP_FRAMES = [0, 1, 2, 1];
// Registration points measured before alpha trimming: matching torso centers
// for flight, then the perched bird's foot contact. Shared flight crop = no pop.
const FRAME_ANCHORS = PARROT_ASSET.anchors;
const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const smooth = (low, high, value) => {
  const t = clamp((value - low) / (high - low));
  return t * t * (3 - 2 * t);
};

function alphaBounds(scan, width, height) {
  const pixels = scan.getImageData(0, 0, width, height).data;
  let left = width, right = -1, top = height, bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3] < 32) continue;
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
  }
  if (right < left) throw new Error('Empty sticker asset');
  return { left, right, top, bottom };
}

function findFrames(atlas) {
  const columns = PARROT_ASSET.grid[0];
  const cellWidth = Math.floor(atlas.naturalWidth / columns);
  const cellHeight = Math.floor(atlas.naturalHeight / PARROT_ASSET.grid[1]);
  const scratch = document.createElement('canvas');
  scratch.width = cellWidth;
  scratch.height = cellHeight;
  const scan = scratch.getContext('2d', { willReadFrequently: true });
  const boxes = [];
  for (let i = 0; i < 4; i += 1) {
    scan.clearRect(0, 0, cellWidth, cellHeight);
    scan.drawImage(atlas, (i % columns) * cellWidth, Math.floor(i / columns) * cellHeight,
      cellWidth, cellHeight, 0, 0, cellWidth, cellHeight);
    boxes.push(alphaBounds(scan, cellWidth, cellHeight));
  }
  const flight = {
    left: Math.min(...boxes.slice(0, 3).map((box) => box.left)),
    right: Math.max(...boxes.slice(0, 3).map((box) => box.right)),
    top: Math.min(...boxes.slice(0, 3).map((box) => box.top)),
    bottom: Math.max(...boxes.slice(0, 3).map((box) => box.bottom)),
  };
  return boxes.map((box, index) => {
    const crop = index < 3 ? flight : box;
    const width = crop.right - crop.left + 1, height = crop.bottom - crop.top + 1;
    return {
      x: (index % columns) * cellWidth + crop.left,
      y: Math.floor(index / columns) * cellHeight + crop.top,
      width, height,
      anchorX: (FRAME_ANCHORS[index][0] * cellWidth - crop.left) / width,
      anchorY: (FRAME_ANCHORS[index][1] * cellHeight - crop.top) / height,
    };
  });
}

function findLeaf(image) {
  const scratch = document.createElement('canvas');
  scratch.width = image.naturalWidth;
  scratch.height = image.naturalHeight;
  const scan = scratch.getContext('2d', { willReadFrequently: true });
  scan.drawImage(image, 0, 0);
  const box = alphaBounds(scan, scratch.width, scratch.height);
  return { x: box.left, y: box.top, width: box.right - box.left + 1, height: box.bottom - box.top + 1 };
}

export function createFauna(canvas, _options = {}) {
  const ctx = canvas?.getContext('2d', { alpha: true });
  const assets = { parrot: { image: null, crop: null }, leaf: { image: null, crop: null } };
  const pending = new Set();
  let destroyed = false;
  let loading = null;

  function loadAsset(asset, url, crop) {
    return new Promise((resolve) => {
      const image = new Image();
      let finished = false;
      const finish = (success) => {
        if (finished) return;
        finished = true;
        image.onload = image.onerror = null;
        pending.delete(cancel);
        resolve(success);
      };
      const cancel = () => finish(false);
      pending.add(cancel);
      image.onload = () => {
        if (destroyed) return finish(false);
        try {
          asset.crop = crop(image);
          asset.image = image;
          finish(true);
        } catch { finish(false); }
      };
      image.onerror = () => finish(false);
      image.src = url;
    });
  }

  function load() {
    if (destroyed || !ctx) return Promise.resolve(false);
    if (!loading) loading = Promise.all([
      loadAsset(assets.parrot, PARROT_ASSET.url, findFrames),
      loadAsset(assets.leaf, LEAF_ASSET.url, findLeaf),
    ]).then((results) => results.every(Boolean));
    return loading;
  }

  function draw(state = {}) {
    if (!ctx || destroyed) return;
    const { hour = 8, rain = 0, wind = .4, width = canvas.clientWidth,
      height = canvas.clientHeight, pointer = [0, 0], quality = 1, worldFrame } = state;
    if (!(Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0)) return;
    const aspect = width / height;
    const cover = state.cover || [Math.min(1, aspect / IMAGE_ASPECT), Math.min(1, IMAGE_ASPECT / aspect)];
    const coverX = Math.max(.001, finite(cover[0] ?? cover.x, 1));
    const coverY = Math.max(.001, finite(cover[1] ?? cover.y, 1));
    const pointerX = finite(pointer[0] ?? pointer.x);
    const pointerY = finite(pointer[1] ?? pointer.y);
    const pixelBudget = Math.max(forestConfig.pixels.minimum, forestConfig.pixels.desktop *
      (typeof quality === 'number' ? clamp(finite(quality, 1), .3, 1) : quality === 'low' ? .5 : 1));
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
    if (!Array.isArray(worldFrame?.objects)) return;

    // Inverse of the plate's cover/parallax transform, including overscan.
    const project = (x, y) => [
      ((x - .5 - pointerX * .003 * coverX) * forestConfig.overscan / coverX + .5) * width,
      ((y - .5 - pointerY * .002 * coverY) * forestConfig.overscan / coverY + .5) * height,
    ];
    const sourceScale = height * forestConfig.overscan / coverY;
    const daylight = clamp(.48 + Math.sin(clamp((finite(hour, 8) - 5) / 15) * Math.PI) * .43
      - smooth(16, 19.5, finite(hour, 8)) * .13 - finite(rain) * .17, .24, 1);
    const lightFilter = `brightness(${daylight}) saturate(${.72 + daylight * .28})`;

    function parrot(object, size, age) {
      const flying = object.mode === 'flying';
      const wing = flying ? FLAP_FRAMES[Math.floor(age * 4.1 * 4) % 4] : 3;
      const drawHeight = size * (flying ? 1 : 1 + Math.sin(age * 2.15) * .0017);
      const attentiveTilt = flying ? 0 : Math.sin(age * .69) * .008
        + Math.pow(Math.max(0, Math.sin(age * .38 + .7)), 18) * .025;
      ctx.rotate(finite(object.angle) + attentiveTilt);
      ctx.scale(object.flip ? -1 : 1, 1);
      const { image, crop } = assets.parrot;
      if (crop && image) {
        const cell = crop[wing], drawWidth = drawHeight * cell.width / cell.height;
        ctx.filter = lightFilter;
        ctx.drawImage(image, cell.x, cell.y, cell.width, cell.height,
          -drawWidth * cell.anchorX, -drawHeight * cell.anchorY, drawWidth, drawHeight);
      } else {
        // Small, distant silhouette only when the optional atlas cannot load.
        ctx.scale(.55, .55);
        ctx.fillStyle = `rgb(${Math.round(72 * daylight)},${Math.round(78 * daylight)},${Math.round(72 * daylight)})`;
        ctx.beginPath(); ctx.ellipse(0, 0, drawHeight * .2, drawHeight * .07, -.12, 0, Math.PI * 2); ctx.fill();
        if (flying) {
          const lift = Math.sin(age * Math.PI * 8) * drawHeight * .25;
          ctx.beginPath(); ctx.moveTo(-drawHeight * .1, 0);
          ctx.quadraticCurveTo(-drawHeight * .26, -lift, -drawHeight * .47, -lift * .5);
          ctx.lineTo(-drawHeight * .13, drawHeight * .03);
          ctx.quadraticCurveTo(drawHeight * .2, -lift * .5, drawHeight * .39, -lift * .7);
          ctx.lineTo(drawHeight * .03, 0); ctx.fill();
        }
      }
    }

    function leaf(object, size, age) {
      const { image, crop } = assets.leaf;
      if (!image || !crop) return; // A missing optional leaf must not break the scene.
      const floating = object.mode === 'floating';
      const falling = object.mode === 'falling';
      const flutter = falling ? Math.sin(age * 6.1) * .42 + Math.sin(age * 2.6) * .18
        : floating ? Math.sin(age * 1.3) * .055 : 0;
      const fold = falling ? .2 + Math.abs(Math.cos(age * 3.7)) * .8 : 1;
      const drawWidth = size * crop.width / crop.height;
      const paint = () => ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height,
        -drawWidth * .5, -size * .5, drawWidth, size);
      if (floating) {
        ctx.save();
        ctx.translate(0, size * .12);
        ctx.rotate(-finite(object.angle) - flutter);
        ctx.scale(1, -.32);
        ctx.globalAlpha *= .14;
        ctx.filter = `brightness(${daylight * .5}) saturate(.5)`;
        paint();
        ctx.restore();
      }
      ctx.rotate(finite(object.angle) + flutter);
      // Heading flips face an animal along its route. A drifting leaf instead
      // keeps its own orientation: mirror-on-turn would snap its asymmetric
      // stem/veins even when the local flutter pose is almost fully unfolded.
      ctx.scale(fold, floating ? .38 : 1);
      ctx.filter = lightFilter;
      paint();
    }

    function butterfly(object, size, age) {
      const fluttering = object.mode === 'fluttering' || object.mode === 'flutter';
      const wingWidth = size * (fluttering ? .16 + Math.abs(Math.sin(age * 20)) * .84 : .38);
      ctx.rotate(finite(object.angle) + (fluttering ? Math.sin(age * .5) * .16 + finite(wind) * .08 : 0));
      ctx.scale(object.flip ? -1 : 1, 1);
      ctx.fillStyle = `rgb(${Math.round(133 * daylight)},${Math.round(98 * daylight)},${Math.round(48 * daylight)})`;
      ctx.beginPath(); ctx.ellipse(-wingWidth * .6, 0, wingWidth, size * .7, -.35, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(wingWidth * .6, 0, wingWidth, size * .7, .35, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#242c1b'; ctx.fillRect(-size * .11, -size * .5, size * .22, size);
    }

    // The world supplies back-to-front layer order. Do not reinterpret IDs,
    // invent extra actors, or mutate the frame; another scene may reuse these.
    for (const object of worldFrame.objects) {
      if (!object || !Array.isArray(object.position) || object.position.length !== 2 || !object.position.every(Number.isFinite)) continue;
      if (!['grey-parrot', 'forest-leaf', 'forest-butterfly', 'bank-butterfly'].includes(object.sticker)) continue;
      const size = finite(object.size) * sourceScale;
      const opacity = clamp(finite(object.opacity, 1));
      if (size <= 0 || opacity < .008) continue;
      const point = project(object.position[0], object.position[1]);
      if (point[0] < -size * 2 || point[0] > width + size * 2 || point[1] < -size * 2 || point[1] > height + size * 2) continue;
      ctx.save(); ctx.translate(point[0], point[1]); ctx.globalAlpha = opacity;
      const age = Math.max(0, finite(object.age));
      if (object.sticker === 'grey-parrot') parrot(object, size, age);
      else if (object.sticker === 'forest-leaf') leaf(object, size, age);
      else butterfly(object, size, age);
      ctx.restore();
    }
  }

  // Compatibility only: world event cursors now belong to the world kernel.
  function resetEvents() {}

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    for (const cancel of [...pending]) cancel();
    for (const asset of Object.values(assets)) { asset.image = null; asset.crop = null; }
    if (ctx) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); }
  }

  return { load, draw, resetEvents, destroy };
}
