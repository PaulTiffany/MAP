# Animal motion system

Animals are motion strata, not mascots. The rainforest remains the protagonist.

## Semantic depth

- **Macro:** bird flocks and large-life corridor traces establish scale and continuous habitation.
- **Mid:** visible bird passes, elephant movement near the bai, butterflies at clearing edges, and tracks along corridors.
- **Near:** dragonflies, butterflies, fireflies, frogs, water-edge motion, and fine track detail.
- **Deep:** animals can become evidence layers: tracks, disturbance, route traces, feeding/water relations, and future annotations.

## Current motion classes

- `flock` — reusable SVG silhouettes following authored paths.
- `large-life-pass` — low-frequency, low-opacity movement through a corridor.
- `clearing-swarm` — butterflies and similar local motion around high-information clearings.
- `water-hover` — dragonflies and other short-range motion tied to water.
- `micro-life` — fireflies/frogs revealed primarily by semantic depth.
- `trace` — footprints and corridor marks rather than explicit animals.

## Engine signals

Animal fields may respond independently to:

- `time.*` for persistent ambient movement;
- `timeline.primary` for authored guided moments;
- `camera.scale` for semantic depth;
- `input.activity` for movement energy;
- `input.scrollDirection` for directional reaction.

The default should remain calm. Faster user movement can increase visible ecological response, but the forest must not behave like a game encounter system.

## Performance rule

Prefer one moving group containing several silhouettes over independently simulating many agents. Reuse SVG symbols; author paths; keep micro-life cheap. Introduce particle or Canvas/WebGL renderers only after profiling proves SVG is the bottleneck.
