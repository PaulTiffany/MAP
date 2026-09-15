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

    const world = this.worldSpec.world || {};
    this.camera = new Camera2D({
      x: world.initialCamera?.x ?? (world.width || 1000) / 2,
      y: world.initialCamera?.y ?? (world.height || 1000) / 2,
      scale: world.initialCamera?.scale ?? 1,
      minScale: world.minScale ?? 0.08,
      maxScale: world.maxScale ?? 10
    });
    if (world.width && world.height) this.camera.setBounds({ x: 0, y: 0, width: world.width, height: world.height });

    this.signals = new SignalStore({
      'timeline.primary': 0,
      'camera.x': this.camera.x,
      'camera.y': this.camera.y,
      'camera.scale': this.camera.scale,
      'input.scrollVelocity': 0,
      'input.scrollDirection': 0,
      'input.activity': 0
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
      this.camera.zoomAt(intent.x, intent.y, intent.factor);
      this.markActivity(intent.rawDelta || Math.log(intent.factor) * -500);
    } else if (intent.type === 'pinch') {
      this.camera.panScreen(intent.dx, intent.dy);
      this.camera.zoomAt(intent.x, intent.y, intent.factor);
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

  markActivity(delta) {
    const previous = this.signals.get('input.scrollVelocity');
    const velocity = previous * 0.45 + delta * 0.55;
    this.signals.patch({
      'input.scrollVelocity': velocity,
      'input.scrollDirection': Math.sign(delta),
      'input.activity': Math.min(1, Math.abs(velocity) / 120)
    });
  }

  frame = ({ dt }) => {
    let velocity = this.signals.get('input.scrollVelocity');
    velocity *= Math.exp(-dt / 140);
    if (Math.abs(velocity) < 0.01) velocity = 0;
    this.signals.patch({
      'input.scrollVelocity': velocity,
      'input.activity': Math.min(1, Math.abs(velocity) / 120)
    });

    const commands = this.timeline.sample(this.signals);
    for (const command of commands) {
      if (command.target === '@camera') this.applyCameraCommand(command);
      else this.renderer.queue(command);
    }

    this.signals.patch({
      'camera.x': this.camera.x,
      'camera.y': this.camera.y,
      'camera.scale': this.camera.scale
    });
    this.renderer.queueLOD(this.camera.scale);
    this.renderer.flush();

    const transform = this.camera.cssTransform();
    if (transform !== this.lastWorldTransform) {
      this.worldElement.style.transformOrigin = '0 0';
      this.worldElement.style.transform = transform;
      this.lastWorldTransform = transform;
    }

    return velocity !== 0;
  };

  applyCameraCommand(command) {
    if (this.mode !== 'timeline') return;
    if (command.channel === 'x') this.camera.x = command.value;
    if (command.channel === 'y') this.camera.y = command.value;
    if (command.channel === 'scale') this.camera.scale = clamp(command.value, this.camera.minScale, this.camera.maxScale);
    this.camera.constrain();
  }

  destroy() {
    this.input.destroy();
    this.resizeObserver.disconnect();
    this.scheduler.stop();
  }
}
