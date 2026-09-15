# Semantic Motion Engine

This directory is the reusable system under active development.

Its job is to combine:

- continuous pan / pinch / wheel zoom;
- semantic level-of-detail driven by effective camera scale;
- scroll-scrubbed authored timelines;
- camera choreography that composes with user zoom;
- graphics driven by progress, zoom, direction, or scroll activity;
- batched SVG writes behind one requestAnimationFrame scheduler.

`lab.html` is the canonical test fixture. It intentionally contains no subject-matter content.

Core modules:

- `camera.js` — world-coordinate camera and pointer-centered zoom.
- `input.js` — normalized wheel, drag, and pinch intents.
- `state.js` — signal store and frame invalidation scheduler.
- `timeline.js` — declarative signal-to-track sampling.
- `svg-renderer.js` — semantic LOD, batched channels, path drawing/following, transform composition.
- `runtime.js` — composes input, camera rig, signals, timelines, and rendering.
- `motion.schema.json` / `world.schema.json` — machine-readable authoring contracts.

Optimization policy:

1. Fix interaction semantics in `lab.html` first.
2. Profile before introducing a more complex renderer.
3. Keep SVG while scene complexity remains tractable and inspectable.
4. Add Canvas/WebGL only behind the same render-command contract if profiling proves it necessary.
5. Do not put content-specific branches in the engine.

The architectural invariant is:

**input → signals → sampled tracks → render commands → one batched frame.**
