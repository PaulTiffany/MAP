import { clamp } from './math.js';
import { Camera2D } from './camera.js';
import { InputController } from './input.js';
import { SignalStore, FrameScheduler } from './state.js';
import { TimelineSampler, validateTimelineSpec } from './timeline.js';
import { SVGRenderer } from './svg-renderer.js';

export class SemanticMotionRuntime {
  constructor({ viewport, worldElement, sceneRoot = document, worldSpec, motionSpec, mode = 'free' }) {
    if (!viewport || !worldElement) throw new Error('viewport and worldElement are required');
    const errors = validateTimelineSpec(motionSpec || {});
    if (errors.length) throw new Error(`Invalid motion spec:\n${errors.join('\n')}`);

    this.viewport = viewport;
    this.worldElement = worldElement;
    this.worldSpec = worldSpec || { world: {}, objects: {} };
    this.motionSpec = motionSpec || { timelines: {} };
    this.mode = mode;
    this.scrollSensitivity = 0.0012;
    this.dragSensitivity = 0.0024;
    this.lastWorldTransform = '';
    this.reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.usesTime = !this.reducedMotion && Object.values(this.motionSpec.timelines || {})
      .some(timeline => String(timeline.source || '').startsWith('time.'));
    this.timeOrigin = performance.now();

    const world = this.worldSpec.world || {};
    this.camera = new Camera2D({
      x: world.initialCamera?.x ?? (world.width || 1000) / 2,
      y: world.initialCamera?.y ?? (world.height || 1000) / 2,
      scale: world.initialCamera?.scale ?? 1,
      minScale: world.minScale ?? 0.08,
      maxScale: world.maxScale ?? 10
    });
    if (world.width && world.height) this.camera.setBounds({ x: 0, y: 0, width: world.width, height: world.height });

    this.guide = { x: this.camera.x, y: this.camera.y, scale: this.camera.scale };
    this.userView = { dx: 0, dy: 0, zoom: 1 };

    this.signals = new SignalStore({
      'timeline.primary': 0,
      'camera.x': this.camera.x,
      'camera.y': this.camera.y,
      'camera.scale': this.camera.scale,
      'camera.userZoom': 1,
      'input.scrollVelocity': 0,
      'input.scrollDirection': 0,
      'input.activity': 0,
      'time.seconds': 0,
      'time.loopFast': 0,
      'time.loopSlow': 0,
      'time.loopSlower': 0,
      'time.sineSlow': 0.5,
      'time.sineSlower': 0.5
    });
    this.timeline = new TimelineSampler(this.motionSpec);
    this.renderer = new SVGRenderer(sceneRoot, this.worldSpec);
    this.scheduler = new FrameScheduler(this.frame);
    this.input = new InputController(viewport, this.handleIntent);
    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(viewport);
    this.resize();
    this.scheduler.invalidate();
  }

  setMode(mode) {
    if (mode !== 'free' && mode !== 'timeline') throw new Error(`Unknown mode: ${mode}`);
    if (mode === this.mode) return;
    this.guide = this.camera.snapshot();
    this.userView = { dx: 0, dy: 0, zoom: 1 };
    this.mode = mode;
    this.scheduler.invalidate();
  }

  setProgress(progress) {
    this.signals.set('timeline.primary', clamp(progress));
    this.scheduler.invalidate();
  }

  setSignal(name, value) {
    this.signals.set(name, value);
    this.scheduler.invalidate();
  }

  resize = () => {
    const rect = this.viewport.getBoundingClientRect();
    this.camera.setViewport(rect.width, rect.height);
    this.scheduler.invalidate();
  };

  handleIntent = intent => {
    if (intent.type === 'zoom') {
      if (this.mode === 'timeline') this.zoomGuidedAt(intent.x, intent.y, intent.factor);
      else this.camera.zoomAt(intent.x, intent.y, intent.factor);
      this.markActivity(intent.rawDelta || Math.log(intent.factor) * -500);
    } else if (intent.type === 'pinch') {
      if (this.mode === 'timeline') {
        this.userView.dx -= intent.dx / this.camera.scale;
        this.userView.dy -= intent.dy / this.camera.scale;
        this.zoomGuidedAt(intent.x, intent.y, intent.factor);
      } else {
        this.camera.panScreen(intent.dx, intent.dy);
        this.camera.zoomAt(intent.x, intent.y, intent.factor);
      }
      this.markActivity(Math.log(intent.factor) * -500);
    } else if (intent.type === 'scroll') {
      if (this.mode === 'timeline') {
        this.setProgress(this.signals.get('timeline.primary') + intent.dy * this.scrollSensitivity);
      } else {
        this.camera.panScreen(-intent.dx, -intent.dy);
      }
      this.markActivity(intent.dy || intent.dx);
    } else if (intent.type === 'drag') {
      if (this.mode === 'timeline') {
        this.setProgress(this.signals.get('timeline.primary') - intent.dy * this.dragSensitivity);
      } else {
        this.camera.panScreen(intent.dx, intent.dy);
      }
      this.markActivity(-intent.dy || intent.dx);
    }
    this.scheduler.invalidate();
  };

  zoomGuidedAt(screenX, screenY, factor) {
    const before = this.camera.screenToWorld(screenX, screenY);
    const desiredScale = clamp(this.guide.scale * this.userView.zoom * factor, this.camera.minScale, this.camera.maxScale);
    this.userView.zoom = desiredScale / Math.max(1e-9, this.guide.scale);
    const nextX = before.x - (screenX - this.camera.viewport.width / 2) / desiredScale;
    const nextY = before.y - (screenY - this.camera.viewport.height / 2) / desiredScale;
    this.userView.dx = nextX - this.guide.x;
    this.userView.dy = nextY - this.guide.y;
  }

  markActivity(delta) {
    const previous = this.signals.get('input.scrollVelocity');
    const velocity = previous * 0.45 + delta * 0.55;
    this.signals.patch({
      'input.scrollVelocity': velocity,
      'input.scrollDirection': Math.sign(delta),
      'input.activity': Math.min(1, Math.abs(velocity) / 120)
    });
  }

  updateTime(now) {
    if (!this.usesTime) return;
    const seconds = (now - this.timeOrigin) / 1000;
    const loop = period => (seconds % period) / period;
    const sine = period => (Math.sin((seconds / period) * Math.PI * 2) + 1) / 2;
    this.signals.patch({
      'time.seconds': seconds,
      'time.loopFast': loop(9),
      'time.loopSlow': loop(24),
      'time.loopSlower': loop(46),
      'time.sineSlow': sine(18),
      'time.sineSlower': sine(38)
    });
  }

  frame = ({ dt, now }) => {
    this.updateTime(now);

    let velocity = this.signals.get('input.scrollVelocity');
    velocity *= Math.exp(-dt / 140);
    if (Math.abs(velocity) < 0.01) velocity = 0;
    this.signals.patch({
      'input.scrollVelocity': velocity,
      'input.activity': Math.min(1, Math.abs(velocity) / 120)
    });

    if (this.mode === 'timeline') {
      const cameraCommands = this.timeline.sample(this.signals, track => track.target === '@camera');
      for (const command of cameraCommands) this.applyGuideCommand(command);
      this.composeGuidedCamera();
    }

    this.signals.patch({
      'camera.x': this.camera.x,
      'camera.y': this.camera.y,
      'camera.scale': this.camera.scale,
      'camera.userZoom': this.userView.zoom
    });

    const visualCommands = this.timeline.sample(this.signals, track => track.target !== '@camera');
    for (const command of visualCommands) this.renderer.queue(command);
    this.renderer.queueLOD(this.camera.scale);
    this.renderer.flush();

    const transform = this.camera.cssTransform();
    if (transform !== this.lastWorldTransform) {
      this.worldElement.style.transformOrigin = '0 0';
      this.worldElement.style.transform = transform;
      this.lastWorldTransform = transform;
    }

    return velocity !== 0 || this.usesTime;
  };

  applyGuideCommand(command) {
    if (command.channel === 'x') this.guide.x = command.value;
    if (command.channel === 'y') this.guide.y = command.value;
    if (command.channel === 'scale') this.guide.scale = clamp(command.value, this.camera.minScale, this.camera.maxScale);
  }

  composeGuidedCamera() {
    this.camera.set({
      x: this.guide.x + this.userView.dx,
      y: this.guide.y + this.userView.dy,
      scale: this.guide.scale * this.userView.zoom
    });
  }

  destroy() {
    this.input.destroy();
    this.resizeObserver.disconnect();
    this.scheduler.stop();
  }
}
