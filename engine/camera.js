import { clamp } from './math.js';

export class Camera2D {
  constructor({ x = 0, y = 0, scale = 1, minScale = 0.1, maxScale = 8 } = {}) {
    this.x = x;
    this.y = y;
    this.scale = scale;
    this.minScale = minScale;
    this.maxScale = maxScale;
    this.viewport = { width: 1, height: 1 };
    this.bounds = null;
  }

  setViewport(width, height) {
    this.viewport.width = Math.max(1, width);
    this.viewport.height = Math.max(1, height);
    this.constrain();
  }

  setBounds(bounds) {
    this.bounds = bounds || null;
    this.constrain();
  }

  set({ x = this.x, y = this.y, scale = this.scale } = {}) {
    this.x = x;
    this.y = y;
    this.scale = clamp(scale, this.minScale, this.maxScale);
    this.constrain();
  }

  panScreen(dx, dy) {
    this.x -= dx / this.scale;
    this.y -= dy / this.scale;
    this.constrain();
  }

  panWorld(dx, dy) {
    this.x += dx;
    this.y += dy;
    this.constrain();
  }

  zoomAt(screenX, screenY, factor) {
    const before = this.screenToWorld(screenX, screenY);
    const next = clamp(this.scale * factor, this.minScale, this.maxScale);
    if (next === this.scale) return;
    this.scale = next;
    this.x = before.x - (screenX - this.viewport.width / 2) / this.scale;
    this.y = before.y - (screenY - this.viewport.height / 2) / this.scale;
    this.constrain();
  }

  screenToWorld(screenX, screenY) {
    return {
      x: this.x + (screenX - this.viewport.width / 2) / this.scale,
      y: this.y + (screenY - this.viewport.height / 2) / this.scale
    };
  }

  worldToScreen(worldX, worldY) {
    return {
      x: (worldX - this.x) * this.scale + this.viewport.width / 2,
      y: (worldY - this.y) * this.scale + this.viewport.height / 2
    };
  }

  constrain() {
    if (!this.bounds) return;
    const halfW = this.viewport.width / (2 * this.scale);
    const halfH = this.viewport.height / (2 * this.scale);
    const minX = this.bounds.x + Math.min(halfW, this.bounds.width / 2);
    const maxX = this.bounds.x + this.bounds.width - Math.min(halfW, this.bounds.width / 2);
    const minY = this.bounds.y + Math.min(halfH, this.bounds.height / 2);
    const maxY = this.bounds.y + this.bounds.height - Math.min(halfH, this.bounds.height / 2);
    this.x = clamp(this.x, minX, maxX);
    this.y = clamp(this.y, minY, maxY);
  }

  cssTransform() {
    const tx = this.viewport.width / 2 - this.x * this.scale;
    const ty = this.viewport.height / 2 - this.y * this.scale;
    return `translate3d(${tx}px,${ty}px,0) scale(${this.scale})`;
  }

  snapshot() {
    return { x: this.x, y: this.y, scale: this.scale };
  }
}
