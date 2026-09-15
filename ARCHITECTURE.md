# Semantic Motion Engine Architecture

The engine is the product under development. Any subject-matter scene is a fixture that exercises it.

## Goal

Combine two independent interaction systems without conflating them:

1. **Semantic zoom** — magnification changes the representation and available interface, not merely pixel size.
2. **Scroll-aware orchestration** — user motion scrubs deterministic visual timelines and may also drive velocity/direction-sensitive effects.

A scene should be authorable as data plus art assets. Content-specific JavaScript is a failure mode.

## Runtime pipeline

```text
pointer / wheel / pinch
        ↓
normalized intents
        ↓
state signals ───────────────┐
        ↓                    │
frame invalidation           │
        ↓                    │
requestAnimationFrame        │
        ↓                    │
┌───────────────┐   ┌────────▼────────┐
│ camera rig    │   │ timeline sampler│
│ guide + user  │   │ source → tracks │
└───────┬───────┘   └────────┬────────┘
        │                    │
        └──────────┬─────────┘
                   ↓
            render commands
                   ↓
          batched renderer writes
```

No input handler directly animates DOM/SVG state.

## Coordinate model

Everything lives in one persistent logical world.

- Camera state is `{ x, y, scale }` where `x,y` are the world point under the viewport center.
- The world element receives one transform per frame.
- Free-roam and authored camera paths share the same camera.
- World dimensions and camera bounds are scene data.

## Camera composition

Guided motion and semantic zoom must compose rather than fight.

The timeline may author a **guide camera** `{x,y,scale}`. User interaction supplies a separate view offset:

```text
effective.x     = guide.x + user.dx
effective.y     = guide.y + user.dy
effective.scale = guide.scale × user.zoom
```

This allows a trail to move through a scene while pinch/ctrl-wheel independently increases or decreases semantic depth.

## Signal model

The runtime exposes scalar signals. Tracks may use any signal as their source.

Core signals:

- `timeline.primary` — normalized authored-story progress `[0,1]`.
- `camera.x`, `camera.y`, `camera.scale` — effective camera state.
- `camera.userZoom` — semantic zoom multiplier layered over a guide camera.
- `input.scrollVelocity` — signed decaying motion signal.
- `input.scrollDirection` — `-1`, `0`, or `1`.
- `input.activity` — normalized motion magnitude `[0,1]`.

This is the central abstraction. A visual effect does not care whether its source is scroll progress, zoom depth, or motion intensity.

## Scene graph

Every meaningful renderable object gets a stable semantic ID and selector.

```js
{
  "objects": {
    "scene.river": {
      "selector": "#river",
      "lod": { "min": 0.4, "max": 2.0, "fade": 0.25 }
    }
  }
}
```

Animated objects should be wrapper groups when possible. Authored base transforms are preserved and runtime transforms are composed after them.

## Semantic level of detail

LOD is continuous, not a page switch.

Each object may declare:

- `min` — scale at which it is fully meaningful on zoom-in.
- `max` — scale after which it may disappear in favor of deeper representation.
- `fade` — cross-fade width around either boundary.

The renderer multiplies LOD alpha by timeline-authored opacity. Thus semantic zoom and scroll choreography compose naturally.

## Timeline model

A motion specification contains timelines. Each timeline selects a source signal and contains declarative tracks.

```js
{
  "source": "timeline.primary",
  "tracks": [
    {
      "target": "scene.bridge",
      "channel": "draw",
      "keyframes": [
        { "at": 0.2, "value": 0 },
        { "at": 0.7, "value": 1, "easing": "smoothstep" }
      ]
    }
  ]
}
```

The same mechanism supports zoom-driven or velocity-driven animation by changing only `source`.

## Renderer contract

The SVG renderer batches commands by target and channel and writes only changed values.

Current channels:

- `opacity`
- `draw`
- `pathPosition`
- `attribute`
- `style`
- `translateX` / `translateY`
- `scale`
- `rotate`
- `visibility`

Multiple attributes on one target are independent queue slots; they cannot accidentally overwrite each other.

Path lengths are cached. DOM/SVG writes are cached. Authored transforms are preserved.

## Scheduling and performance

Performance invariants:

1. A single `requestAnimationFrame` loop owns presentation updates.
2. Input handlers only mutate state and invalidate a frame.
3. The loop sleeps when no decaying/continuous signal remains active.
4. The world camera is one compositor-friendly transform.
5. Renderer writes are batched and deduplicated.
6. SVG path lengths are measured once and cached.
7. Scene content does not create its own animation loops.
8. Reduced-motion policy can be implemented at the runtime/signal layer rather than scattered across scenes.

Simple effects may later compile to native CSS scroll timelines where supported, but the canonical model remains renderer-independent because camera, semantic LOD, path geometry, and multiple input signals must interoperate.

## Modes

The same runtime supports at least two interaction policies:

- `free` — wheel/drag pans; pinch or ctrl-wheel zooms.
- `timeline` — vertical wheel/drag scrubs `timeline.primary`; pinch or ctrl-wheel still changes semantic zoom independently.

Modes define input→signal mapping. They do not change the scene graph or effect system.

## Reference lab

`engine/lab.html` is intentionally content-neutral. It exists to validate:

- free pan/zoom;
- guided camera choreography;
- independent semantic zoom during a guided timeline;
- LOD cross-fades;
- SVG path drawing;
- path following;
- scroll-velocity-reactive graphics;
- deterministic declarative tracks.

Subject-matter scenes should not be optimized until this lab is smooth and predictable across desktop and mobile.

## Design rule

**Input produces signals. Signals drive timelines. Timelines produce render commands. Semantic depth is independent of story progress. One frame loop owns presentation.**
