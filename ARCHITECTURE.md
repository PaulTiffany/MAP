# MAP Living Atlas Architecture

The atlas should be authored as a semantic world, not as a pile of animation callbacks.

## 1. Coordinate model

Everything lives in one persistent world coordinate system.

- World: 7200 × 7200 logical units.
- Camera state: `{ x, y, scale }`.
- Free-roam and guided trails manipulate the same camera.
- Regions are coordinates, not pages.

## 2. Semantic layers

Objects declare the depth range in which they are meaningful:

1. `geography` — regions, roads, coastlines, terrain, MAP center.
2. `relations` — membranes, threat edges, transfer edges, networks.
3. `mechanisms` — viability domains, operators, provenance chains, tests.
4. `formal` — exact labels, theorem/proof status, source links, Lean controls.

The renderer cross-fades by camera scale. No semantic layer is allowed to imply a stronger epistemic status merely because it is visually deeper.

## 3. Scene graph

Every meaningful visual object gets a stable semantic ID.

Examples:

- `origin.actor_a`
- `origin.actor_b`
- `origin.threat_edge`
- `origin.map_bridge`
- `theory.membrane_a`
- `theory.membrane_b`
- `theory.viability_a`
- `theory.transfer_edge`
- `applications.research_node`
- `intuition.transfer_particle`
- `formal.lean_curve`

Animations target IDs, never anonymous DOM order.

## 4. Trails

A trail is an authored path through the same world.

Each trail declares:

- `camera_path`: semantic camera keyframes.
- `chapters`: progress intervals and explanatory copy.
- `effects`: deterministic visual changes driven by trail progress.
- `evidence`: links to formal claims or provenance records relevant to the trail.

Trail progress `p ∈ [0,1]` is the single source of truth for scroll-triggered choreography.

## 5. Effect channels

The runtime supports a small vocabulary of composable effects:

- `opacity` — fade an object.
- `draw` — reveal an SVG path via path length.
- `follow_path` — move an object along an SVG path.
- `attribute` — interpolate numeric SVG attributes (`rx`, `ry`, `r`, etc.).
- `style` — interpolate numeric CSS properties.
- `scale` — scale around the object's own center.
- `translate` — move an object in world units.
- `text` — switch copy at a defined progress boundary.
- `visibility` — expose an interface only within a progress/depth range.

Each effect declares `start`, `end`, `from`, `to`, and optional `easing`.

This makes choreography inspectable. A reviewer can answer: “At what exact progress does reciprocal threat begin fading?” without reading custom JavaScript.

## 6. Camera choreography

Camera paths are authored independently from graphics.

A camera keyframe contains:

```json
{ "p": 0.42, "x": 3600, "y": 2080, "scale": 1.18 }
```

The engine interpolates between keyframes. Camera motion must never encode substantive meaning that is absent from the scene graph; the camera reveals the argument, it does not invent it.

## 7. Evidence binding

Formal claims and visual interpretations must be explicitly distinguished.

Any effect or chapter may declare:

- `status: "mechanically_checked"`
- `status: "formally_defined"`
- `status: "counterexample"`
- `status: "interpretation"`
- `status: "compatible_application"`

Formal objects may link to `FORMAL.md`, `PROVENANCE.md`, `map.json`, Principia Symbolica labels, or the pinned Lean source.

## 8. Rendering contract

The map may look hand-drawn, cartographic, or fantastical, but its semantics are data-driven.

Art assets are presentation. Semantic IDs, coordinates, trails, effect ranges, and evidence status are the architecture.

That separation lets us later replace an SVG mountain with an illustrated image, shader, canvas effect, or generated asset without changing the meaning or choreography.

## 9. Design rule

**The map is the interface. Scroll is the clock. Zoom is semantic resolution. Evidence is never compressed away.**
