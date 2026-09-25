# How this forest is built

Implementation methodology · GPT-6 / Codex  
MAP / The listening forest / second study

[Read the designed article](methodology.html) · [Return to the forest](index.html) · [Artwork provenance and prompt](ART_DIRECTION.md)

## 1. The architectural choice

Start with a strong, fixed composition. Preserve its photographic detail, then spend rendering work on the things that convey life: leaves at different distances, traveling water highlights, changing light, mist, and occasional animals. This is a **2.5D scene**: an image with spatially authored motion and composited layers. It does not reconstruct the forest as geometry.

GitHub Pages delivers ordinary static files. The visitor's browser renders the scene locally; no backend, streaming video, remote inference, framework, package installation, or build step is required. Keep every asset beside the scene and use relative URLs so a project subdirectory works unchanged.

Separate the base image from the changing illumination. The current forest plate was generated with diffuse overcast light, without a visible sun or directional sunbeams. The renderer adds the time-dependent shafts, dapple, warmth, exposure and water glints. The earlier sunlit plate remains in the repository for provenance but is no longer the runtime background; there is no shader-based sun-removal workaround.

Even a neutral plate retains diffuse shading and reflections. It is not an unlit material map and contains no surface geometry, so the renderer cannot cast accurate new shadows or recover hidden surfaces. The result is an artistic time-of-day simulation, **not ray tracing, physical relighting, or an astronomical model**. A later scene needing accurate relighting would require geometry and materials, or separately authored light-state plates.

## 2. One clock, several forms of movement

```text
scene.js — controls, visibility, quality policy, shared scene time
  ├─ scene-config.js — source-space placement, clock and quality limits
  ├─ renderer.js — image, water, canopy, mist, lighting and rain
  ├─ fauna.js    — transparent sprite canvas and animal event cues
  └─ sound.js    — optional ambience and spatial call voices
```

The scene controller owns the animation loop and advances elapsed time only while motion is enabled. The renderer and fauna receive that time; they do not start competing animation loops. Animal call events carry stable IDs, and the audio layer deduplicates them. Time-of-day is a separate value: moving its slider changes illumination without fast-forwarding wingbeats or water. The hour ranges from 06:00 to 19:30, with presets at 08:00, 12:30 and 18:42. “Let the day pass” advances a full daylight span in 180 seconds, continues from the selected hour, and stops at dusk; it does not jump from night back to dawn automatically.

Pause holds the scene clock. Reduced-motion preference starts with motion paused. A hidden page suspends animation and audio; resuming resets the wall-clock baseline rather than simulating the missed interval. Sound requires an explicit gesture. A static image remains the baseline when JavaScript or WebGL is unavailable.

## 3. Author in the image's coordinate system

Define positions in normalized source-image coordinates: **(0, 0) is top-left, (1, 1) is bottom-right**. Put river boundaries, tree anchors, animal paths and light openings in this coordinate system. Apply the same cover crop, overscan and pointer transform to every layer. Never attach a river mask to viewport percentages: a portrait crop would make the banks swim.

For image aspect `Ai` and viewport aspect `Av`, the visible source span before overscan is:

```text
cover = [min(1, Av / Ai), min(1, Ai / Av)]
sourcePoint = (viewportPoint - 0.5) * cover / overscan + 0.5 + pointerOffset
```

WebGL's texture orientation needs one explicit conversion to this top-left convention. Keep that conversion at the sampling boundary. Use the inverse transform when projecting source-space animals onto the overlay canvas. Test a known anchor in landscape and portrait before adding movement.

The current `scene-config.js` exposes these settings. This is a shortened, directly reusable subset of the configuration, rather than a claim that every mask is data-driven:

```js
export const forestConfig = {
  imageAspect: 1672 / 941,
  overscan: 1.025,
  fps: 30,
  cycleSeconds: 180,
  hours: { min: 6, max: 19.5, initial: 8 },
  presets: { dawn: 6.5, morning: 8, noon: 12.5, dusk: 18.7 },
  pixels: { desktop: 1200000, mobile: 650000, minimum: 360000 },
  assets: { foliage: 'assets/foreground-bough.webp' },
  stream: { center: 0.49, horizon: 0.585, spread: 0.385 },
  foliage: { origin: [0.59, -0.095], size: [0.52, 0.43] }
};
```

The main plate URL is in `index.html`. Canopy ellipses and the log exclusion remain authored in `renderer.js`; animal routes belong to `fauna.js`. Reauthor all of those for a new photograph, including the objects that must remain still. The renderer receives overscan as a uniform from `scene-config.js`, and the fauna projection reads that same configuration. A future reusable engine could promote the remaining authored masks and routes into the configuration.

## 4. Build the movement by material

| Layer | Method | Constraint that keeps it believable |
| --- | --- | --- |
| Water | Animate a height field for refraction; estimate normals with neighboring height samples for moving highlights. Advect wave detail downstream and add sparse expanding ripple cues. | Fade displacement to zero at the authored bank boundary and exclude the fallen log. Ripples belong to the surface, not the whole screen. |
| Canopy | Animate several soft source-space patches with different phases and frequencies. Green-detail weighting and fixed tree anchors restrict distortion. Composite separate transparent foreground foliage for stronger near-field motion. | Trunks and buttress roots remain stable. Bend from the stem; do not translate an entire tree. |
| Sunlight | Start from a neutral, diffusely lit plate. Map the selected hour to an artistic sun path; change directional shafts, dapple, cloud modulation, exposure and water reflection. | Morning, noon and dusk must differ in light direction and character. The image has no object geometry or surface normals for accurate shadow casting. |
| Air and weather | Drift low-frequency mist through the depth corridor; use restrained cloud shadows and sparse rain streaks. Rain has its own control, independent of the hour. | Avoid a uniform moving veil. Far air is softer and lower-contrast than near details. |
| Fauna | Draw a small generated parrot pose atlas along scripted routes, with a resident perched bird; add tiny procedural butterfly paths. | Sparse arrivals, depth-scaled size, restrained saturation and quiet intervals. These are artistic behaviors, not ecological simulation. |

The image and foreground layer are composited in one full-screen WebGL pass. Animal sprites use a separate transparent 2D canvas driven by the same root loop. Reuse loaded textures and decoded sprites; do not upload an image or create new graphics resources every frame.

The parrot atlas contains three flight poses and one perched pose in a 2 × 2 grid. Alpha bounds are measured once while loading. Share a crop across flight cells and record a torso registration point for each pose, so wing changes do not make the bird's body jump or change scale. Anchor the perched pose at its feet. The 48-second event schedule includes a brief one- or two-bird flight through the central opening; feathered path endpoints suggest entry into vegetation without a geometry-based occlusion system. At most three small butterflies are drawn, reduced to one at lower quality.

## 5. Sound belongs to events and distance

Build a low-level bed from filtered noise for stream, leaves and rain. Add occasional synthesized animal cues linked to scene events. Give each cue an ID, start time, horizontal position and depth; use position for stereo pan and depth for lower gain and reduced high frequencies. This implementation permits at most three transient voices, with a minimum 0.8-second gap between accepted cues and three seconds between parrot cues. Release each voice's nodes when it ends.

A call should sit in the environment rather than dominate it. Leave room above the combined ambience and calls, fade start/stop transitions, and suppress missed events when resuming a hidden or paused scene. Test repeated Sound toggles for overlapping contexts or duplicate calls. Browser audio values are relative levels, not calibrated sound-pressure levels; speaker and headphone volume remain under the listener's control.

The sound is procedural synthesis, not a field recording or a scientifically accurate species call. Neither generated animals nor synthesized sound should be presented as documentary evidence of this location.

## 6. Spend a small, explicit frame budget

| Budget | Design target / policy |
| --- | --- |
| Presentation | At most 30 rendered frames per second: about 33.3 ms between frames. This is a cap, not a promise that every device reaches it. |
| Main WebGL surface | Start at 1.2 million pixels, or 0.65 million if the initial viewport is narrower than 700 CSS pixels or has a coarse pointer; adaptive floor is 0.36 million pixels. |
| Rendering | One WebGL scene pass plus a small transparent fauna overlay. No ray tracing or per-frame network calls. |
| Resolution | Keep CSS display size independent of internal render size. Avoid blindly multiplying full-screen dimensions by device pixel ratio. |
| Idle | No continuing animation while paused and settled or while the page is hidden. |
| Audio | Create only after opt-in; bound transient voices and suspend the hidden page. |

The quality controller inspects windows of 90 frame intervals. If more than 22% exceed 48 ms, it multiplies the pixel cap by 0.76, to a minimum of 360,000 pixels; reductions are at least six scene seconds apart. All finite positive foreground intervals count, including very slow frames. Hidden-tab and resume handling reset the time baseline, so background waits do not count as render failures. Quality stays at its reduced level until reload rather than repeatedly growing and shrinking. Frame intervals include browser scheduling and CPU work; they are **not GPU timings**. About → Rendering details reports observed scheduled-frame cadence, actual surface dimensions, pixel cap and average CPU submission time. One-off manual draws do not inflate the frame counter. Submission time also does not measure completed GPU work.

Measure a real target phone before claiming mobile performance. Keep synchronous graphics queries and pixel readbacks out of the production animation loop. This follows the platform guidance on smaller drawing buffers, resource reuse and avoiding blocking calls in [MDN's WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices).

### Asset and validation record

| Compressed image | File bytes |
| --- | --- |
| Neutral forest plate (`sangha-neutral.webp`) | 409,902 |
| Smaller neutral candidate (`sangha-neutral-small.webp`) | 148,944 |
| Transparent foreground bough | 122,896 |
| Parrot pose atlas | 261,186 |
| Main plate + bough + atlas | 793,984 |

These are file sizes, not total network transfer or decoded memory. The main plate is 1672 × 941 pixels; the smaller alternative is 1008 × 568. Which candidate the browser selects depends on the crop, viewport and pixel ratio. HTML, CSS and JavaScript add to the page payload. A compressed image expands when decoded and uploaded to graphics memory. The original sunlit plates remain as provenance files and are not requested by the scene.

**Browser observations — 25 September 2026.** The local preview was checked in the desktop app's Chromium browser. Its live Rendering details panel reported the following snapshots; the displayed values use rolling windows of at least three seconds. These are observations on this host, not a sustained benchmark or measurements from a physical mobile device.

| CSS viewport | Internal WebGL surface | Configured pixel cap | Reported cadence | Average CPU submission |
| --- | --- | --- | --- | --- |
| 886 × 638 | 1108 × 798 | 1.20 million | 30.0 fps | 0.2 ms |
| 320 × 568 | 320 × 568 | 0.65 million | 30.0 fps | 0.3 ms |

The pixel cap is a ceiling; the actual surface can be smaller. CPU submission is not GPU completion time. Layout checks at 390 × 844, 320 × 568, 844 × 390 and 638 × 478 CSS pixels found no horizontal overflow or overlapping controls. Browser checks confirmed that the neutral plate loaded without the original sun, dawn/dusk selection changed the scene, pause held scene time at 55.006 across repeated checks, manual hour selection worked while paused, and automatic daylight advanced with rain independently controlled. Sound-button on/off state changed successfully without reported errors; these checks do not establish acoustic realism.

The dependency-free controller self-test passed. Visual review and these short readouts do not replace longer thermal/battery testing or checking actual low-power phones. Those remain validation steps for broader deployment.

## 7. Replicate the scene

1. **Choose a fixed view.** Select the place, camera height, focal length, light and weather. Give the composition a readable depth corridor and some exposed water or foliage where motion can be seen.
2. **Make a neutral still.** Generate or license a detailed plate under diffuse overcast illumination, without a visible sun, directional beams or strong golden highlights. Let the renderer supply the changing daylight. Record the provenance and full prompt. Avoid blurred plants, impossible branches and clipped highlights; animation will magnify those defects. Keep the original composition when editing a plate so masks and animal anchors remain registered, then verify that registration visually.
3. **Prepare a small asset set.** Export a compressed main plate and smaller alternative. Make transparent near foliage and a compact animal pose atlas only where they add visible value. Check alpha edges on both light and dark backgrounds.
4. **Map the space.** Record source-space river boundaries, obstacles, plant anchors, light opening and animal routes. Confirm overlay registration in both portrait and landscape.
5. **Animate one material at a time.** Tune water first, then foliage, then light and air. Observe at normal speed for ten seconds. Keep each material's frequency, direction and amplitude distinct.
6. **Add life sparingly.** Schedule brief flights and long quiet gaps. Align calls to stable event IDs; tune sound from quiet to audible, rather than starting loud.
7. **Add controls and lifecycle behavior.** Hour, optional accelerated day, independent rain, motion, sound and immersion should all remain understandable. Implement keyboard access, reduced motion, hidden-tab suspension and static fallback before publishing.
8. **Measure and publish.** Record asset bytes, draw-surface dimensions and frame intervals on representative devices. Fix visible mask errors, then copy the folder to Pages and verify every relative URL at the deployed subpath.

For local review, serve the repository root with `python -m http.server 8765 --bind 127.0.0.1` and open `/demos/dzanga-cinema/`. For a new scene, copy this directory, replace assets, reauthor masks and routes, and update the provenance and methodology records. The current scene is a working pattern; a general JSON-driven world editor is not implemented.

Run `node demos/dzanga-cinema/selftest.mjs` for the dependency-free controller checks: clock formatting, adaptive caps, reduced-motion startup, scheduling, pause, daylight completion, hidden-tab suspension, static fallback and an audio-start race. These checks use a simulated browser environment; they do not validate shader output, perceived motion, audio quality or real-device frame rate. Complete the browser checks below as a separate step.

## 8. Acceptance checks

| Check | Acceptance criterion |
| --- | --- |
| Motion at normal speed | Within ten seconds, water flow, some leaves and changing light are perceptible without using a before/after slider. The frame still feels calm. |
| Boundaries | Banks, log, trunks and roots do not wobble with the stream or canopy. Foreground leaves stay attached to their anchors. |
| Time and weather | Morning, noon and dusk are visually distinct. Rain works at each hour. Accelerated day changes light without accelerating animal or water motion. |
| Fauna and audio | A full event cycle includes recognizable, plausibly scaled life and quiet gaps. Calls follow events without duplication, harsh peaks or autoplay. |
| Lifecycle | Pause freezes motion; reduced motion begins paused; hidden pages stop animation and sound; returning does not trigger an event backlog. |
| Layout and access | Test wide desktop, narrow portrait and short landscape. Controls, About, this document and return links remain reachable with keyboard and touch. |
| Failure and load | Test absent WebGL, context loss and failed optional assets. Retain the still. Verify no repeated downloads or sustained work when idle. |
| Performance | Record browser, device, viewport, internal pixel dimensions, time interval and sample duration. Distinguish measured results from target budgets. |

## Scope and sources

This is an imagined Congo Basin forest inspired by the Sangha region. UNESCO describes the [Sangha Trinational](https://whc.unesco.org/en/list/1380/) as a humid tropical forest landscape spanning Cameroon, the Central African Republic and the Republic of Congo. The artwork is not a photograph of a particular site and does not reproduce local people, music or cultural practices. See [cultural grounding](../dzanga/CULTURAL_GROUNDING.md).

Implementation references: [WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices). Project records: [art direction](ART_DIRECTION.md), [source directory](https://github.com/PaulTiffany/MAP/tree/main/demos/dzanga-cinema). The browser-readable article and this Markdown document carry the same methodology; keep both synchronized when the architecture changes.
