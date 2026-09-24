# Dzanga — The listening forest

A fixed-frame cinematic study inspired by the humid lowland rainforest of Central Africa. [Open the scene](https://paultiffany.github.io/MAP/demos/dzanga-cinema/).

This is a new, self-contained direction alongside the existing Dzanga SVG studies. It uses an original AI-generated raster plate and a small WebGL renderer: the stream refracts, mist drifts, green canopy details stir and a few insects catch the light. The result is a 2.5D living image, not a navigable 3D reconstruction.

## Experience

- Morning mist, soft rain and blue hour atmospheres fade gently into one another.
- Pause stops the scene clock. Reduced-motion preference starts with a still frame.
- Sound is opt-in: synthesized stream, leaves, rain and restrained insect tones. No recordings, speech or music are used.
- Immerse hides the interface. A small Show controls button restores it.
- Keyboard: Space pauses, S toggles sound, H hides controls, F requests fullscreen, Escape leaves immersion. Normal focused-button keyboard behavior is preserved.
- Hidden tabs stop rendering and suspend sound. A static image remains available without WebGL or JavaScript.

## Run locally

From the repository root:

```sh
python -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/demos/dzanga-cinema/`. No build, dependencies, credentials or runtime network services are required. The existing Pages workflow publishes this directory when the change reaches `main`.

## Files and tuning

- `index.html`, `style.css`: responsive viewer and accessible controls.
- `scene.js`: source-image-space stream/canopy masks, atmosphere shader, one presentation loop and input/lifecycle handling.
- `sound.js`: lazy Web Audio soundscape with fade-in/out and suspension.
- `assets/sangha-forest.webp`: main original image, 474,408 bytes.
- `assets/sangha-forest-small.webp`: smaller image candidate, 161,232 bytes.
- [Art direction and full generation prompt](ART_DIRECTION.md): built-in image-generation provenance and ecological framing.

The loop is capped at 30 fps and the drawing surface at 1.6 million pixels. These are operating caps, not a measured device-performance guarantee. A different image requires reauthoring the water envelope and foliage masks in the shader. A 2.5% overscan protects the edges during very small pointer parallax.

## Review

Check morning/rain/blue-hour selection; pause/resume; opt-in sound; fullscreen support; Immerse and return; dialog focus; narrow portrait and short landscape layouts. On reduced-motion systems, confirm the page begins paused. No-WebGL browsers should retain the artwork and atmosphere controls with motion disabled.

The generated scene depicts no people or cultural practices. It is not a photograph of a real site or a representation of BaAka knowledge. See [cultural grounding](../dzanga/CULTURAL_GROUNDING.md).
