import { lodAlpha } from './math.js';

export class SVGRenderer {
  constructor(root, worldSpec = {}) {
    this.root = root;
    this.worldSpec = worldSpec;
    this.objects = new Map();
    this.pending = new Map();
    this.cache = new Map();
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
    target.set(command.channel, command);
  }

  queueLOD(scale) {
    for (const [id, { spec }] of this.objects) {
      const alpha = lodAlpha(scale, spec.lod || {});
      this.queue({ target: id, channel: '__lodOpacity', value: alpha });
    }
  }

  flush() {
    for (const [id, channels] of this.pending) {
      const record = this.objects.get(id);
      if (!record) continue;
      const { element } = record;
      let state = this.cache.get(id);
      if (!state) {
        state = {
          opacity: 1,
          lodOpacity: 1,
          tx: 0,
          ty: 0,
          scale: 1,
          rotate: 0,
          lastTransform: ''
        };
        this.cache.set(id, state);
      }

      for (const command of channels.values()) this.applyCommand(element, state, command);

      const composedOpacity = state.opacity * state.lodOpacity;
      if (state.lastOpacity !== composedOpacity) {
        element.style.opacity = String(composedOpacity);
        state.lastOpacity = composedOpacity;
      }

      const transform = `translate(${state.tx} ${state.ty}) rotate(${state.rotate}) scale(${state.scale})`;
      if (transform !== state.lastTransform && (state.tx || state.ty || state.rotate || state.scale !== 1 || state.lastTransform)) {
        element.setAttribute('transform', transform);
        state.lastTransform = transform;
      }
    }
    this.pending.clear();
  }

  applyCommand(element, state, command) {
    const { channel, value } = command;
    switch (channel) {
      case '__lodOpacity':
        state.lodOpacity = value;
        break;
      case 'opacity':
        state.opacity = value;
        break;
      case 'x':
      case 'translateX':
        state.tx = value;
        break;
      case 'y':
      case 'translateY':
        state.ty = value;
        break;
      case 'scale':
        state.scale = value;
        break;
      case 'rotate':
        state.rotate = value;
        break;
      case 'attribute':
        if (command.attribute) this.setIfChanged(element, `attr:${command.attribute}`, value, v => element.setAttribute(command.attribute, String(v)));
        break;
      case 'style':
        if (command.attribute) this.setIfChanged(element, `style:${command.attribute}`, value, v => element.style[command.attribute] = `${v}${command.unit || ''}`);
        break;
      case 'draw':
        this.applyDraw(element, value);
        break;
      case 'pathPosition':
        this.applyPathPosition(element, state, command.path, value);
        break;
      case 'visibility':
        this.setIfChanged(element, 'visibility', Boolean(value), v => element.style.display = v ? '' : 'none');
        break;
    }
  }

  applyDraw(element, value) {
    if (typeof element.getTotalLength !== 'function') return;
    let length = this.pathLengths.get(element);
    if (!length) {
      try {
        length = element.getTotalLength();
        this.pathLengths.set(element, length);
      } catch (_) {
        return;
      }
    }
    element.style.strokeDasharray = `${length}`;
    element.style.strokeDashoffset = `${length * (1 - value)}`;
  }

  applyPathPosition(element, state, pathId, value) {
    const path = this.objects.get(pathId)?.element;
    if (!path || typeof path.getTotalLength !== 'function') return;
    let length = this.pathLengths.get(path);
    if (!length) {
      try {
        length = path.getTotalLength();
        this.pathLengths.set(path, length);
      } catch (_) {
        return;
      }
    }
    try {
      const point = path.getPointAtLength(length * value);
      state.tx = point.x;
      state.ty = point.y;
    } catch (_) {}
  }

  setIfChanged(element, key, value, setter) {
    const record = this.cache.get(element) || {};
    if (Object.is(record[key], value)) return;
    record[key] = value;
    this.cache.set(element, record);
    setter(value);
  }
}
