# Atlas fixture

This directory is a subject-matter fixture for the reusable interaction engine in `../engine/`.

- `world.json` contains scene-specific semantic IDs and coordinates.
- `trails.json` contains scene-specific authored choreography and evidence metadata.
- `index.html` remains a visual experiment / migration target.

The runtime itself does **not** live here anymore. New interaction behavior belongs in `engine/`, and generic improvements should be proven first in `engine/lab.html` before being applied to this fixture.

The fixture may remain visually opinionated. The engine must remain content-neutral.
