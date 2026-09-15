export class SignalStore {
  constructor(initial = {}) {
    this.values = new Map(Object.entries(initial));
    this.listeners = new Set();
  }

  get(name, fallback = 0) {
    return this.values.has(name) ? this.values.get(name) : fallback;
  }

  set(name, value) {
    if (Object.is(this.values.get(name), value)) return false;
    this.values.set(name, value);
    for (const listener of this.listeners) listener(name, value);
    return true;
  }

  patch(values) {
    let changed = false;
    for (const [name, value] of Object.entries(values)) changed = this.set(name, value) || changed;
    return changed;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export class FrameScheduler {
  constructor(step) {
    this.step = step;
    this.raf = 0;
    this.last = 0;
    this.keepAlive = false;
  }

  invalidate() {
    if (!this.raf) this.raf = requestAnimationFrame(this.tick);
  }

  tick = now => {
    this.raf = 0;
    const dt = this.last ? Math.min(64, now - this.last) : 16.67;
    this.last = now;
    this.keepAlive = Boolean(this.step({ now, dt }));
    if (this.keepAlive) this.invalidate();
  };

  stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.last = 0;
  }
}
