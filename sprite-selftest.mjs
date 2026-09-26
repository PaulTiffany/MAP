// Dependency-free renderer contract checks; these are not pixel/GPU screenshot tests.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = (await readFile(new URL('./fauna.js', import.meta.url), 'utf8'))
  .replace(/^import .*;\r?\n/gm, '').replace('export function createFauna', 'function createFauna');
const config = { imageAspect: 1672 / 941, overscan: 1.025, pixels: { desktop: 1200000, minimum: 360000 } };
const catalog = {
  'grey-parrot': { asset: { url: 'parrot.webp', grid: [2, 2], anchors: [[.57, .77], [.58, .76], [.57, .29], [.59, .85]] } },
  'forest-leaf': { asset: { url: 'leaf.webp' } },
};

function harness({ noContext = false } = {}) {
  const operations = [], images = [];
  function context(record = false) {
    const value = {};
    for (const method of ['setTransform', 'clearRect', 'save', 'restore', 'translate', 'rotate', 'scale',
      'drawImage', 'beginPath', 'ellipse', 'fill', 'moveTo', 'quadraticCurveTo', 'lineTo', 'fillRect']) {
      value[method] = (...args) => {
        if (record) operations.push([method, ...args.map((arg) => arg instanceof FakeImage ? arg.src : arg)]);
      };
    }
    value.getImageData = (_x, _y, width, height) => ({ data: new Uint8ClampedArray(width * height * 4).fill(255) });
    return value;
  }
  class FakeImage {
    constructor() { this.naturalWidth = 8; this.naturalHeight = 8; images.push(this); }
  }
  const ctx = context(true);
  const canvas = { width: 0, height: 0, clientWidth: 1000, clientHeight: 562.799043,
    getContext: () => noContext ? null : ctx };
  const sandbox = { forestConfig: config, stickerCatalog: catalog, Image: FakeImage, devicePixelRatio: 3,
    document: { createElement: () => ({ getContext: () => context() }) } };
  vm.createContext(sandbox);
  vm.runInContext(`${source}\nthis.create = createFauna;`, sandbox);
  let calls = 0;
  const renderer = sandbox.create(canvas, { onCall: () => calls++ });
  return { renderer, canvas, operations, images, get calls() { return calls; } };
}

const object = (sticker, mode, x, size) => Object.freeze({ id: sticker, sticker,
  position: Object.freeze([x, .5]), size, layer: 1, mode, age: 2, progress: .2, angle: .1, opacity: .8, flip: false });
const objects = Object.freeze([
  object('grey-parrot', 'flying', .4, .045),
  object('forest-leaf', 'falling', .5, .04),
  object('forest-butterfly', 'fluttering', .6, .003),
  object('stream-water', 'flowing', .5, 1),
]);
const state = { hour: 8, rain: 0, wind: .4, pointer: [0, 0], quality: 1,
  worldFrame: Object.freeze({ objects }) };
const test = harness();
const loaded = test.renderer.load();
assert.equal(test.renderer.load(), loaded, 'load is idempotent');
assert.deepEqual(test.images.map((item) => item.src), ['parrot.webp', 'leaf.webp']);
for (const image of test.images) image.onload();
assert.equal(await loaded, true);
test.renderer.draw(state);
assert.equal(test.operations.filter((op) => op[0] === 'drawImage').length, 2, 'only atlas + leaf assets rendered');
assert.equal(test.operations.filter((op) => op[0] === 'translate').length, 3, 'exactly the three supplied drawable stickers');
const positions = test.operations.filter((op) => op[0] === 'translate');
for (let i = 0; i < 3; i++) assert(Math.abs(positions[i][1] - (397.5 + i * 102.5)) < .001,
  'incoming source positions use the photograph cover/overscan mapping in supplied order');
assert(test.canvas.width * test.canvas.height <= config.pixels.desktop * 1.003, 'pixel budget respected after rounding');
const first = structuredClone(test.operations);
test.operations.length = 0;
test.renderer.draw({ ...state, time: 999, paused: true });
assert.deepEqual(test.operations, first, 'scene time and pause do not invent object animation or routes');
assert.equal(test.calls, 0, 'renderer emits no audio or world events');

test.operations.length = 0;
test.renderer.draw({ ...state, worldFrame: { objects: [object('forest-leaf', 'floating', .5, .04)] } });
assert.equal(test.operations.filter((op) => op[0] === 'drawImage').length, 2, 'floating leaf has one faint reflection');
test.operations.length = 0;
test.renderer.draw({ ...state, worldFrame: { objects: [object('forest-leaf', 'rest', .5, .04)] } });
assert.equal(test.operations.filter((op) => op[0] === 'drawImage').length, 1, 'resting leaf has no water reflection');

// The authored fall reverses horizontal direction near ages 1.6s and 3.3s.
// Its asymmetric cutout must not mirror when the route's facing flag changes.
for (const mode of ['falling', 'floating', 'rest']) {
  for (const age of [1.6, 3.3]) {
    const leaf = { ...object('forest-leaf', mode, .5, .04), age };
    const poses = [false, true].map(flip => {
      test.operations.length = 0;
      test.renderer.draw({ ...state, worldFrame: { objects: [{ ...leaf, flip }] } });
      return structuredClone(test.operations);
    });
    assert.deepEqual(poses[0], poses[1], `${mode} leaf/reflection ignores route heading flips at ${age}s`);
  }
}
test.operations.length = 0;
test.renderer.draw({ ...state, worldFrame: { objects: [{ ...objects[0], flip: true }] } });
assert(test.operations.some(op => op[0] === 'scale' && op[1] === -1 && op[2] === 1),
  'bird facing still follows the world heading');

test.operations.length = 0;
test.renderer.draw({ ...state, width: 4000, height: 2000, quality: .3, worldFrame: { objects: [] } });
assert(test.canvas.width * test.canvas.height <= config.pixels.minimum * 1.005, 'low quality cap respected');
assert.equal(test.operations.filter((op) => op[0] === 'drawImage').length, 0, 'empty world is empty');
test.renderer.resetEvents(500);
test.renderer.destroy();
test.operations.length = 0;
test.renderer.draw(state);
assert.equal(test.operations.length, 0, 'destroyed renderer cannot draw');
assert.equal(await test.renderer.load(), false);

const failed = harness();
const failedLoad = failed.renderer.load();
for (const image of failed.images) image.onerror();
assert.equal(await failedLoad, false);
failed.renderer.draw(state);
assert.equal(failed.operations.filter((op) => op[0] === 'drawImage').length, 0, 'failed assets safely use silhouette/skip leaf');
assert(failed.operations.some((op) => op[0] === 'ellipse'), 'procedural butterfly and parrot fallback remain');
failed.renderer.destroy();

const cancelled = harness();
const cancelledLoad = cancelled.renderer.load();
const lateLoads = cancelled.images.map((item) => item.onload);
cancelled.renderer.destroy();
assert.equal(await cancelledLoad, false, 'destroy settles pending loads');
for (const image of cancelled.images) assert.equal(image.onload, null);
for (const lateLoad of lateLoads) lateLoad();
assert.equal(await harness({ noContext: true }).renderer.load(), false);
console.log('Sprite renderer contracts passed (frame-only poses, projection/caps, loading/fallback, destroy).');
