# Atlas implementation

`world.json` is the semantic scene graph.

`trails.json` is the authored choreography: camera keyframes, chapters, effect ranges, and epistemic status.

`engine.js` is the generic runtime for applying those effects.

The current `index.html` is the reference visual implementation. New art should target stable semantic IDs rather than add one-off animation callbacks.

The intended authoring workflow is:

1. place or replace an art object in the world;
2. bind it to a semantic ID in `world.json`;
3. choreograph it in `trails.json`;
4. let the engine scrub it from trail progress;
5. keep formal/provenance status attached to the semantic object or chapter.

This lets the visual language become much richer without making the site less auditable.
