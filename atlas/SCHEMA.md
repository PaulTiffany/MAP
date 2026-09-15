# Choreography schema

A trail is a deterministic function of progress `p ∈ [0,1]`.

## Camera keyframe

```json
{ "p": 0.42, "x": 3600, "y": 2080, "scale": 1.18 }
```

## Effect

```json
{
  "target": "origin.threat_edge",
  "channel": "opacity",
  "start": 0.10,
  "end": 0.58,
  "from": 1,
  "to": 0,
  "easing": "smoothstep"
}
```

Supported channels in `engine.js`: `opacity`, `attribute`, `draw`, `follow_path`, `scale`, `translate_x`, `translate_y`, `oscillate_x`, and `visibility`.

The semantic object named by `target` must exist in `world.json`. Effects do not select arbitrary DOM nodes directly.
