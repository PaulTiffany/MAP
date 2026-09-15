export class InputController {
  constructor(element, emit) {
    this.element = element;
    this.emit = emit;
    this.pointers = new Map();
    this.lastPinch = null;
    this.bind();
  }

  bind() {
    this.element.addEventListener('wheel', this.onWheel, { passive: false });
    this.element.addEventListener('pointerdown', this.onPointerDown);
    this.element.addEventListener('pointermove', this.onPointerMove);
    this.element.addEventListener('pointerup', this.onPointerEnd);
    this.element.addEventListener('pointercancel', this.onPointerEnd);
  }

  destroy() {
    this.element.removeEventListener('wheel', this.onWheel);
    this.element.removeEventListener('pointerdown', this.onPointerDown);
    this.element.removeEventListener('pointermove', this.onPointerMove);
    this.element.removeEventListener('pointerup', this.onPointerEnd);
    this.element.removeEventListener('pointercancel', this.onPointerEnd);
    this.pointers.clear();
  }

  onWheel = event => {
    event.preventDefault();
    const zoomGesture = event.ctrlKey || event.metaKey;
    if (zoomGesture) {
      this.emit({
        type: 'zoom',
        x: event.clientX,
        y: event.clientY,
        factor: Math.exp(-event.deltaY * 0.002),
        rawDelta: event.deltaY,
        source: 'wheel'
      });
      return;
    }

    this.emit({
      type: 'scroll',
      dx: event.deltaX,
      dy: event.deltaY,
      x: event.clientX,
      y: event.clientY,
      source: 'wheel'
    });
  };

  onPointerDown = event => {
    this.element.setPointerCapture?.(event.pointerId);
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    this.lastPinch = this.pointers.size === 2 ? this.pinchSnapshot() : null;
  };

  onPointerMove = event => {
    const previous = this.pointers.get(event.pointerId);
    if (!previous) return;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (this.pointers.size === 1) {
      this.emit({
        type: 'drag',
        dx: event.clientX - previous.x,
        dy: event.clientY - previous.y,
        x: event.clientX,
        y: event.clientY,
        source: 'pointer'
      });
      return;
    }

    if (this.pointers.size === 2) {
      const current = this.pinchSnapshot();
      if (this.lastPinch && current.distance > 0 && this.lastPinch.distance > 0) {
        this.emit({
          type: 'pinch',
          x: current.x,
          y: current.y,
          factor: current.distance / this.lastPinch.distance,
          dx: current.x - this.lastPinch.x,
          dy: current.y - this.lastPinch.y,
          source: 'pointer'
        });
      }
      this.lastPinch = current;
    }
  };

  onPointerEnd = event => {
    this.pointers.delete(event.pointerId);
    this.lastPinch = this.pointers.size === 2 ? this.pinchSnapshot() : null;
    this.emit({ type: 'release', source: 'pointer' });
  };

  pinchSnapshot() {
    const [a, b] = [...this.pointers.values()];
    if (!a || !b) return null;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
      distance: Math.hypot(dx, dy)
    };
  }
}
