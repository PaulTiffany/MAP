import { stickerCatalog } from './catalog.js';

const CACHE_LIMIT = 128, HISTORY_LIMIT = 64, RIPPLE_LIMIT = 4;
const RIPPLE_SECONDS = 4, CALL_COOLDOWN = 3;
const copy = value => JSON.parse(JSON.stringify(value));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const finite = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const identifier = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,95}$/.test(value);
const within = (point, box) => Array.isArray(point) && point.length === 2
  && finite(point[0], box[0], box[2]) && finite(point[1], box[1], box[3]);
const boxValid = b => Array.isArray(b) && b.length === 4 && b.every(Number.isFinite)
  && b[0] < b[2] && b[1] < b[3] && b.every(v => v >= 0 && v <= 1);
const keysOnly = (obj, keys) => record(obj) && Object.keys(obj).every(key => keys.includes(key));
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
};

// Catmull-Rom gives authored routes curved trajectories; bounds clamp overshoot.
function sample(path, progress, bounds) {
  const points = path.points;
  const scaled = clamp(progress, 0, 1) * (points.length - 1);
  const i = Math.min(points.length - 2, Math.floor(scaled)), t = scaled - i;
  const a = points[Math.max(0, i - 1)], b = points[i], c = points[i + 1], d = points[Math.min(points.length - 1, i + 2)];
  return [0, 1].map(axis => clamp(.5 * ((2 * b[axis]) + (-a[axis] + c[axis]) * t
    + (2 * a[axis] - 5 * b[axis] + 4 * c[axis] - d[axis]) * t * t
    + (-a[axis] + 3 * b[axis] - 3 * c[axis] + d[axis]) * t * t * t), bounds[axis], bounds[axis + 2]));
}

function validateManifest(input) {
  if (!record(input) || input.version !== 1 || !identifier(input.id) || !boxValid(input.bounds)
      || !record(input.paths) || !Array.isArray(input.instances) || input.instances.length > 64)
    throw new TypeError('Invalid sticker-world manifest');
  if (Object.keys(input.paths).length > 128) throw new TypeError('Too many paths');
  for (const [name, path] of Object.entries(input.paths)) {
    if (!identifier(name) || !record(path) || !['flight', 'fall', 'float', 'flutter'].includes(path.kind)
        || !finite(path.duration, .1, 120) || !Array.isArray(path.points) || path.points.length < 2 || path.points.length > 64
        || !path.points.every(point => within(point, input.bounds))
        || (path.size !== undefined && !finite(path.size, .001, 1))) throw new TypeError(`Invalid path: ${name}`);
    if (path.next !== undefined && (path.kind !== 'fall' || !Object.hasOwn(input.paths, path.next) || input.paths[path.next].kind !== 'float'))
      throw new TypeError(`Invalid path continuation: ${name}`);
  }
  const ids = new Set();
  for (const obj of input.instances) {
    if (!record(obj) || !identifier(obj.id) || ids.has(obj.id) || !Object.hasOwn(stickerCatalog, obj.sticker)
        || !within(obj.position, input.bounds) || !finite(obj.size, .001, 1) || !finite(obj.layer, -1000, 1000)
        || (obj.paths !== undefined && (!Array.isArray(obj.paths) || !obj.paths.every(p => Object.hasOwn(input.paths, p))))
        || (obj.bounds !== undefined && !boxValid(obj.bounds))
        || (obj.flow !== undefined && !finite(obj.flow, 0, 2))
        || (obj.gustDuration !== undefined && !finite(obj.gustDuration, .1, 30))
        || (obj.impactStrength !== undefined && !finite(obj.impactStrength, 0, 1))) throw new TypeError(`Invalid instance: ${obj?.id}`);
    if (obj.call !== undefined && (!keysOnly(obj.call, ['distance', 'strength'])
        || !finite(obj.call.distance, 0, 1) || !finite(obj.call.strength, 0, 1))) throw new TypeError(`Invalid call: ${obj.id}`);
    ids.add(obj.id);
  }
  for (const obj of input.instances) if (obj.impactTarget !== undefined
      && !input.instances.some(target => target.id === obj.impactTarget && stickerCatalog[target.sticker].behavior === 'water'))
    throw new TypeError(`Invalid impact target: ${obj.id}`);
  return copy(input);
}

/** Pure local simulation: no rendering, timers, audio context, network or eval.
 * update accepts an absolute caller clock; time advances only across two
 * consecutive unpaused updates. Mutations enter through dispatch alone.
 */
export function createWorld(input, { onEvent = () => {} } = {}) {
  const manifest = freeze(validateManifest(input));
  const objects = new Map(manifest.instances.map(def => [def.id, {
    def, behavior: stickerCatalog[def.sticker].behavior,
    mode: stickerCatalog[def.sticker].initialMode, start: 0, path: null,
    position: [...def.position], flow: def.flow ?? 1, gust: 0, lastCall: -Infinity,
  }]));
  let time = 0, revision = 0, lastInput = null, previouslyPaused = false;
  let environment = { hour: 8, rain: 0, wind: .4, paused: false };
  let dirty = true, cachedFrame = null, eventSerial = 0;
  const receipts = new Map(), history = [], ripples = [];

  function remember(entry) {
    history.push(entry);
    if (history.length > HISTORY_LIMIT) history.shift();
  }
  function emit(type, fields) {
    const event = { id: `${manifest.id}:event:${++eventSerial}`, type, time, revision, ...fields };
    remember({ kind: 'event', ...event });
    try { onEvent(freeze(copy(event))); } catch { /* Optional consumers cannot halt simulation. */ }
  }
  function ripple(x, y, strength) {
    ripples.push({ x, y, start: time, strength });
    if (ripples.length > RIPPLE_LIMIT) ripples.shift();
  }
  function complete(obj) {
    obj.mode = stickerCatalog[obj.def.sticker].initialMode;
    obj.position = obj.behavior === 'leaf' ? obj.position : [...obj.def.position];
    obj.path = null; obj.start = time; obj.gust = 0;
    revision++; dirty = true;
    emit('action-complete', { object: obj.def.id, mode: obj.mode });
  }
  function frame() {
    if (!dirty) return cachedFrame;
    let gust = 0, flow = 1;
    const rendered = [];
    for (const obj of objects.values()) {
      const age = time - obj.start, path = obj.path && manifest.paths[obj.path];
      const progress = path ? clamp(age / path.duration, 0, 1) : 0;
      const position = path ? sample(path, progress, manifest.bounds) : [...obj.position];
      let angle = 0, flip = false, opacity = obj.behavior === 'leaf' && obj.mode === 'rest' ? 0 : 1;
      if (path) {
        const next = sample(path, Math.min(1, progress + .002), manifest.bounds);
        const previous = sample(path, Math.max(0, progress - .002), manifest.bounds);
        flip = next[0] < previous[0];
        angle = clamp(Math.atan2(next[1] - previous[1], Math.abs(next[0] - previous[0]) + .00001), -.35, .35);
      }
      if (obj.mode === 'falling') angle = Math.sin(age * 2.1) * .7 + age * 1.8;
      if (obj.mode === 'floating') {
        angle = Math.sin(age * 1.9) * .16;
        opacity *= Math.min(1, (1 - progress) * 5);
      }
      if (obj.behavior === 'bough') gust = Math.max(gust,
        obj.gust * Math.sin(clamp(age / (obj.def.gustDuration ?? 5), 0, 1) * Math.PI));
      if (obj.behavior === 'water') flow = obj.flow;
      rendered.push({ id: obj.def.id, sticker: obj.def.sticker, position,
        size: path?.size ?? obj.def.size, layer: obj.def.layer, mode: obj.mode,
        age, progress, angle, opacity, flip });
    }
    rendered.sort((a, b) => a.layer - b.layer);
    cachedFrame = freeze({ time, revision, environment: { ...environment }, objects: rendered,
      effects: { gust, flow, ripples: ripples.map(r => ({ x: r.x, y: r.y, age: time - r.start, strength: r.strength })) } });
    dirty = false;
    return cachedFrame;
  }
  function observe() {
    return copy({ scene: manifest.id, ...frame(),
      paths: Object.fromEntries(Object.entries(manifest.paths).map(([id, p]) => [id,
        { kind: p.kind, duration: p.duration, points: p.points, ...(p.next ? { next: p.next } : {}) }])),
      capabilities: manifest.instances.map(obj => ({ object: obj.id, sticker: obj.sticker,
        actions: stickerCatalog[obj.sticker].actions, paths: obj.paths ?? [], bounds: obj.bounds ?? manifest.bounds })),
      history, limits: { commandCache: CACHE_LIMIT, history: HISTORY_LIMIT, ripples: RIPPLE_LIMIT } });
  }

  function update(inputTime, next = {}) {
    if (!finite(inputTime, 0, Number.MAX_SAFE_INTEGER) || !record(next)) return frame();
    // Invalid environment updates are atomic no-ops, not half-applied values.
    if ((next.hour !== undefined && !finite(next.hour, 0, 24))
        || (next.rain !== undefined && !finite(next.rain, 0, 1))
        || (next.wind !== undefined && !finite(next.wind, 0, 2))
        || (next.paused !== undefined && typeof next.paused !== 'boolean')) return frame();
    if (lastInput !== null && inputTime < lastInput) return frame();
    environment = { ...environment, ...Object.fromEntries(Object.entries(next).filter(([key]) => ['hour', 'rain', 'wind', 'paused'].includes(key))) };
    if (lastInput !== null && !environment.paused && !previouslyPaused) time += inputTime - lastInput;
    lastInput = inputTime; previouslyPaused = environment.paused; dirty = true;
    if (environment.paused) return frame();
    for (const obj of objects.values()) {
      // At most one continuation is supported: falling -> floating -> rest.
      if (obj.path) {
        let path = manifest.paths[obj.path];
        if (time - obj.start >= path.duration) {
          obj.position = [...path.points.at(-1)];
          if (obj.mode === 'falling') {
            const impactTime = obj.start + path.duration;
            revision++;
            if (obj.def.impactTarget) {
              const strength = obj.def.impactStrength ?? .6;
              // Use the actual transition time even when a frame crosses it.
              ripples.push({ x: obj.position[0], y: obj.position[1], start: impactTime, strength });
              if (ripples.length > RIPPLE_LIMIT) ripples.shift();
              emit('water-impact', { object: obj.def.id, target: obj.def.impactTarget,
                position: [...obj.position], strength, at: impactTime });
            }
            if (path.next) {
              obj.path = path.next; obj.mode = 'floating'; obj.start = impactTime;
              path = manifest.paths[obj.path];
            } else complete(obj);
          }
          if (obj.path && time - obj.start >= path.duration) {
            obj.position = [...path.points.at(-1)]; complete(obj);
          }
        }
      }
      if (obj.mode === 'gusting' && time - obj.start >= (obj.def.gustDuration ?? 5)) complete(obj);
    }
    for (let i = ripples.length - 1; i >= 0; i--) if (time - ripples[i].start >= RIPPLE_SECONDS) ripples.splice(i, 1);
    return frame();
  }

  function dispatch(command) {
    const reject = reason => ({ ok: false, reason, revision });
    if (!keysOnly(command, ['id', 'object', 'action', 'args', 'expectedRevision'])
        || !identifier(command.id) || !identifier(command.object) || !identifier(command.action)
        || (command.expectedRevision !== undefined && (!Number.isSafeInteger(command.expectedRevision) || command.expectedRevision < 0)))
      return reject('invalid-command');
    const args = command.args === undefined ? {} : command.args;
    if (!record(args) || Object.keys(args).length > 3 || !Object.entries(args).every(([key, value]) =>
      key.length <= 32 && ((typeof value === 'number' && Number.isFinite(value))
      || (typeof value === 'string' && value.length <= 96)))) return reject('invalid-args');
    // Canonical key order makes equivalent retries idempotent. Values are
    // validated as finite scalars before the signature is ever cached.
    const fingerprint = JSON.stringify([command.object, command.action,
      Object.keys(args).sort().map(k => [k, args[k]]), command.expectedRevision ?? null]);
    const prior = receipts.get(command.id);
    if (prior) return prior.fingerprint === fingerprint ? { ...prior.receipt } : reject('id-conflict');
    if (command.expectedRevision !== undefined && command.expectedRevision !== revision) return reject('stale-revision');
    const obj = objects.get(command.object);
    if (!obj) return reject('unknown-object');
    if (!stickerCatalog[obj.def.sticker].actions.includes(command.action)) return reject('unsupported-action');
    if (environment.paused) return reject('paused');
    const action = command.action;
    let path = null;
    if (['fly', 'release', 'flutter'].includes(action)) {
      if (!keysOnly(args, ['path']) || typeof args.path !== 'string'
          || !obj.def.paths?.includes(args.path) || !Object.hasOwn(manifest.paths, args.path)) return reject('invalid-path');
      path = manifest.paths[args.path];
      if (path.kind !== ({ fly: 'flight', release: 'fall', flutter: 'flutter' })[action]) return reject('invalid-path');
      if (obj.path) return reject('busy');
    } else if (action === 'ripple') {
      if (!keysOnly(args, ['x', 'y', 'strength']) || !within([args.x, args.y], obj.def.bounds ?? manifest.bounds)
          || !finite(args.strength, 0, 1)) return reject('invalid-args');
    } else if (action === 'set-flow') {
      if (!keysOnly(args, ['value']) || !finite(args.value, 0, 2)) return reject('invalid-args');
    } else if (action === 'gust') {
      if (!keysOnly(args, ['strength']) || !finite(args.strength, 0, 1)) return reject('invalid-args');
      if (obj.mode === 'gusting') return reject('busy');
    } else if (!keysOnly(args, [])) return reject('invalid-args');
    if (action === 'call' && time - obj.lastCall < CALL_COOLDOWN) return reject('cooldown');

    revision++; dirty = true;
    if (path) {
      obj.path = args.path; obj.start = time;
      obj.mode = ({ fly: 'flying', release: 'falling', flutter: 'fluttering' })[action];
    } else if (action === 'set-flow') obj.flow = args.value;
    else if (action === 'gust') { obj.gust = args.strength; obj.start = time; obj.mode = 'gusting'; }
    else if (action === 'rest') { obj.path = null; obj.position = [...obj.def.position]; obj.mode = 'rest'; obj.start = time; }
    else if (action === 'ripple') ripple(args.x, args.y, args.strength);
    else if (action === 'call') obj.lastCall = time;
    const receipt = { ok: true, revision };
    receipts.set(command.id, { fingerprint, receipt });
    if (receipts.size > CACHE_LIMIT) receipts.delete(receipts.keys().next().value);
    remember({ kind: 'command', id: command.id, object: obj.def.id, action, args: copy(args), time, revision });
    if (action === 'call') {
      const position = frame().objects.find(item => item.id === obj.def.id).position;
      emit('call', { object: obj.def.id, kind: 'parrot', pan: clamp((position[0] - .5) * 2, -1, 1),
        distance: obj.def.call?.distance ?? .5,
        strength: (obj.def.call?.strength ?? .5) * (1 - environment.rain * .65) });
    }
    return { ...receipt };
  }

  return Object.freeze({ update, observe, frame, dispatch });
}
