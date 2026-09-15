import { clamp, lodAlpha } from './math.js';

export class SVGRenderer {
  constructor(root, worldSpec = {}) {
    this.root = root;
    this.worldSpec = worldSpec;
    this.objects = new Map();
    this.pending = new Map();
    this.state = new Map();
    this.elementWrites = new WeakMap();
    this.pathLengths = new WeakMap();
    this.index();
  }

  index() {
    this.objects.clear();
    for (const [id, spec] of Object.entries(this.worldSpec.objects || {})) {
      const element = this.root.querySelector(spec.selector);
      if (element) this.objects.set(id, { element, spec });
    }
  }

  queue(command) {
    if (!this.objects.has(command.target)) return;
    let target = this.pending.get(command.target);
    if (!target) {
      target = new Map();
      this.pending.set(command.target, target);
    }
    const slot = command.slot || `${command.channel}:${command.attribute || command.path || ''}`;
    target.set(slot, command);
  }

  queueLOD(scale) {
    for (const [id, { spec }] of this.objects) {
      this.queue({ target: id, channel: '__lodOpacity', value: lodAlpha(scale, spec.lod || {}) });
    }
  }

  flush() {
    for (const [id, commands] of this.pending) {
      const record = this.objects.get(id);
      if (!record) continue;
      const { element } = record;
      const state = this.objectState(id, element);

      for (const command of commands.values()) this.applyCommand(element, state, command);

      const composedOpacity = state.opacity * state.lodOpacity;
      this.write(element, 'opacity', composedOpacity, v => element.style.opacity = String(v));

      if (state.transformDirty) {
        const runtimeTransform = `translate(${state.tx} ${state.ty}) rotate(${state.rotate}) scale(${state.scale})`;
        const transform = `${state.baseTransform} ${runtimeTransform}`.trim();
        this.write(element, 'transform', transform, v => element.setAttribute('transform', v));
        state.transformDirty = false;
      }
    }
    this.pending.clear();
  }

  objectState(id, element) {
    let state = this.state.get(id);
    if (!state) {
      state = {
        opacity: 1,
        lodOpacity: 1,
        tx: 0,
        ty: 0,
        scale: 1,
        rotate: 0,
        baseTransform: element.getAttribute('transform') || '',
        transformDirty: false
      };
      this.state.set(id, state);
    }
    return state;
  }

  applyCommand(element, state, command) {
    const { channel, value } = command;
    switch (channel) {
      case '__lodOpacity':
        state.lodOpacity = clamp(value);
        break;
      case 'opacity':
        state.opacity = clamp(value);
        break;
      case 'x':
      case 'translateX':
        if (state.tx !== value) { state.tx = value; state.transformDirty = true; }
        break;
      case 'y':
      case 'translateY':
        if (state.ty !== value) { state.ty = value; state.transformDirty = true; }
        break;
      case 'scale':
        if (state.scale !== value) { state.scale = value; state.transformDirty = true; }
        break;
      case 'rotate':
        if (state.rotate !== value) { state.rotate = value; state.transformDirty = true; }
        break;
      case 'attribute':
        if (command.attribute) this.write(element, `attr:${command.attribute}`, value, v => element.setAttribute(command.attribute, String(v)));
        break;
      case 'style':
        if (command.attribute) this.write(element, `style:${command.attribute}`, value, v => element.style[command.attribute] = `${v}${command.unit || ''}`);
        break;
      case 'draw':
        this.applyDraw(element, clamp(value));
        break;
      case 'pathPosition':
        this.applyPathPosition(state, command.path, clamp(value));
        break;
      case 'visibility':
        this.write(element, 'visibility', Boolean(value), v => element.style.display = v ? '' : 'none');
        break;
    }
  }

  applyDraw(element, value) {
    const length = this.pathLength(element);
    if (!length) return;
    this.write(element, 'draw:array', length, v => element.style.strokeDasharray = String(v));
    this.write(element, 'draw:offset', length * (1 - value), v => element.style.strokeDashoffset = String(v));
  }

  applyPathPosition(state, pathId, value) {
    const path = this.objects.get(pathId)?.element;
    if (!path || typeof path.getPointAtLength !== 'function') return;
    const length = this.pathLength(path);
    if (!length) return;
    try {
      const point = path.getPointAtLength(length * value);
      if (state.tx !== point.x || state.ty !== point.y) {
        state.tx = point.x;
        state.ty = point.y;
        state.transformDirty = true;
      }
    } catch (_) {}
  }

  pathLength(element) {
    if (typeof element.getTotalLength !== 'function') return 0;
    if (this.pathLengths.has(element)) return this.pathLengths.get(element);
    try {
      const length = element.getTotalLength();
      this.pathLengths.set(element, length);
      return length;
    } catch (_) {
      return 0;
    }
  }

  write(element, key, value, setter) {
    let record = this.elementWrites.get(element);
    if (!record) {
      record = new Map();
      this.elementWrites.set(element, record);
    }
    if (Object.is(record.get(key), value)) return;
    record.set(key, value);
    setter(value);
  }
}
