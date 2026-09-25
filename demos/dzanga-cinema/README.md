# Dzanga — The listening forest

A fixed-frame cinematic study inspired by the humid lowland rainforest of Central Africa. [Open the scene](https://paultiffany.github.io/MAP/demos/dzanga-cinema/).

This is a self-contained direction alongside the existing Dzanga SVG studies. Version 2 combines an original, diffusely lit raster plate, a moving transparent foreground bough, material-specific animation, and a sparse scripted wildlife layer. The result is a 2.5D living image, not a navigable 3D reconstruction.

**[Read the replication methodology](methodology.html)** — also linked inside **About this place**. The [Markdown source](METHODOLOGY.md) is available for reuse.

## Experience

- Select morning, noon or dusk, scrub the time slider, or let the day advance automatically. The complete 06:00–19:30 passage takes 180 seconds and stops at dusk. Rain is independent of time.
- A moving solar light field, canopy transmission and reflections approximate daylight changes. The neutral overcast plate has no illustrated sun or directional beams competing with that motion. It still contains diffuse shading and reflections, without geometry for accurate shadow casting; this is not ray tracing or physical relighting.
- Water refraction, normal-based highlights and droplet rings move within an authored stream mask. Branch and leaf groups move with a shared wind signal while trunks remain anchored.
- African grey parrot sprites perch and fly through the central clearing. Small brown/ochre butterflies move close to the banks.
- Pause stops the scene clock. Reduced-motion preference starts with a still frame.
- Sound is opt-in: synthesized stream, leaves, rain and event-driven animal-call approximations with distance attenuation and stereo positioning. No recordings, speech or music are used. Volume starts conservatively and is adjustable in About.
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
- `scene.js`: one shared presentation clock, input, lifecycle, automatic quality reduction and lightweight performance readout.
- `scene-config.js`: authored source-space regions, daylight presets and rendering budgets.
- `renderer.js`: two-texture WebGL material, daylight, mist and foreground foliage rendering.
- `fauna.js`: bounded Canvas2D actors and scene-clock call events.
- `sound.js`: lazy Web Audio atmosphere and bounded, filtered spatial calls.
- `assets/sangha-neutral.webp`: current diffuse base plate, 1672 × 941 pixels, 409,902 bytes.
- `assets/sangha-neutral-small.webp`: smaller responsive candidate, 1008 × 568 pixels, 148,944 bytes.
- `assets/foreground-bough.webp`, `assets/grey-parrot-atlas.webp`: transparent foliage and fauna layers, 122,896 and 261,186 bytes. Main plate plus both layers totals 793,984 bytes before page/code files.
- `assets/sangha-forest.webp`, `assets/sangha-forest-small.webp`: earlier sunlit images preserved for provenance; not loaded by the current scene.
- [Art direction](ART_DIRECTION.md): original generation prompt, current neutral lighting approach and ecological framing.
- [Version 2 asset prompts](assets/GENERATION.md): neutral plate, generated foliage and parrot atlas.
- `selftest.mjs`: dependency-free controller and lifecycle checks; run with `node demos/dzanga-cinema/selftest.mjs` from the repository root.

The shared loop targets 30 fps. Initial WebGL budgets are 1.2 million pixels on desktop and 650,000 on coarse-pointer or narrow devices, reducing toward 360,000 under sustained missed frame budgets. These are operating caps, not a device-performance guarantee. About reports observed scheduled-frame cadence and CPU submission time, not GPU duration. A different image requires reauthoring the water envelope, foliage masks, perches and flight paths. A shared 2.5% overscan protects the edges during very small pointer parallax; the renderer and fauna read it from `scene-config.js`.

## Review

Check daylight selection and scrubbing; independent rain; automatic day progression; pause/resume; opt-in sound and volume; fullscreen support; Immerse and return; methodology link; narrow portrait and short landscape layouts. On reduced-motion systems, confirm the page begins paused. No-WebGL browsers should retain the artwork and manual lighting/weather controls with motion disabled.

The self-test exercises simulated controller behavior, not visual rendering or real-device performance. Pair it with browser checks for shader compilation, mask registration on the neutral plate, noticeable material motion, fauna scale, audio balance and device-specific frame cadence. The methodology distinguishes design budgets from measured results.

The generated scene depicts no people or cultural practices. It is not a photograph of a real site or a representation of BaAka knowledge. See [cultural grounding](../dzanga/CULTURAL_GROUNDING.md).
