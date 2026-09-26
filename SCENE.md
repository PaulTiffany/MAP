# The listening forest · sticker-book study

A fixed-frame, photographic-style Congo Basin forest is the first scene in MAP's emerging living-world architecture. [Enter MAP](https://paultiffany.github.io/MAP/).

The scene is now served from the repository root. The former `demos/dzanga-cinema/` implementation path has been removed, not redirected. Earlier SVG studies remain separate historical experiments. This change does not alter the formal MAP research records.

**[Read the replication methodology](methodology.html)** — also linked from **About this place**. [Download its Markdown source](METHODOLOGY.md). For future agent integrations, start with the [runtime contract](lib/sticker-world/README.md).

## What this pass establishes

A “sticker” is an individually addressable animation object, not necessarily a paper-looking graphic. Its reusable type belongs to a catalog; a scene places instances and authors paths; a renderer draws their current state. A bounded command interface sits between anyone making decisions and the animation implementation.

The optional **Direct scene** panel is the human-facing demonstration of that interface. The same in-page `window.stickerWorld` API exposes observation and validated commands for a future adapter. The current ambient director uses seeded local decisions; there is no AI service, external agent connection, authentication, multiplayer, persistence or arbitrary-script execution. This is a first reusable seam inside a working scene, not a general world editor.

## Experience

- Scrub the 06:00–19:30 time slider, or let daylight advance over 180 seconds and stop at dusk. Redundant morning/noon/dusk buttons are removed. Rain remains independent.
- Direct individual actions: a parrot flight or call, a falling leaf, a water ripple, a gust and butterfly motion. Objects have named actions and authored paths rather than independent hard-coded animation loops.
- Leaves tumble into the stream, trigger a contact ripple and drift on the surface. Sprite wing changes, path travel, deformation, ripple expansion and material flow provide different kinds of motion; pointer parallax is only one small effect.
- A neutral overcast base plate lets the browser supply moving light, dapple, warmth and reflections. It still contains diffuse shading; this is not ray tracing or physical relighting.
- Sound is opt-in: synthesized stream, leaves, rain and bounded spatial animal-call approximations. It is not a field recording. Volume is adjustable in About.
- Pause holds the scene clock. Reduced motion starts paused. Hidden tabs stop rendering and suspend sound; resuming does not play a backlog of calls.
- Immerse hides the interface; Show controls restores it. Space pauses, S toggles sound, H hides controls and F requests fullscreen, without taking over normal focused-button input. Escape leaves immersion.
- A static image remains the baseline without JavaScript or WebGL.

## Run and test

From the repository root:

```sh
python -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/`. The existing GitHub Pages workflow deploys the repository root when changes reach `main`. Assets and imports use relative paths so the same files work below `/MAP/`. No build, dependencies, credentials or runtime network services are required.

```sh
node selftest.mjs
node lib/sticker-world/selftest.mjs
node sprite-selftest.mjs
```

These dependency-free tests exercise controller/lifecycle and runtime contracts. They do not establish rendering correctness, perceived sound quality or real-device performance. Also check direct controls and receipts, path registration, leaf contact, paused/hidden behavior, narrow portrait and short landscape layouts, and fallback without WebGL.

## Files and responsibilities

| File | Responsibility |
| --- | --- |
| `world-manifest.js` | Scene-owned instance placements, named paths and ambient direction data. |
| `lib/sticker-world/catalog.js` | Shared sticker types and available actions. |
| `lib/sticker-world/world.js` | Validation, command receipts and bounded runtime state. |
| `lib/sticker-world/director.js` | Seeded local ambient policy using the same commands as direct control. |
| `scene.js` | Shared clock, input, runtime integration, lifecycle and performance readout. |
| `scene-config.js` | Source-space material settings, daylight and quality limits. |
| `renderer.js` | WebGL background, water, light, mist and foreground foliage. |
| `fauna.js` | Transparent Canvas2D sticker drawing. |
| `sound.js` | Lazy Web Audio ambience and bounded spatial cues. |
| `index.html`, `style.css` | Viewer, optional directing panel and accessible controls. |

The shared loop caps rendering at 30 fps. Initial WebGL caps are 1.2 million pixels on desktop and 650,000 on narrow/coarse-pointer devices, reducing toward 360,000 under sustained missed budgets. About reports observed cadence and CPU submission time, not GPU duration. These are policies, not performance guarantees.

The main neutral plate is 1672 × 941 pixels / 409,902 bytes. Its smaller responsive candidate is 1008 × 568 / 148,944 bytes. Foreground bough, parrot atlas and the new leaf add 122,896, 261,186 and 42,566 bytes. The main plate plus these layers totals 836,550 bytes before HTML, CSS and code. Original sunlit assets remain for provenance and are not loaded by this scene. See [art direction](ART_DIRECTION.md) and [full generation prompts](assets/GENERATION.md).

To build another scene, reuse the runtime contract but reauthor placements, paths, renderer masks, lighting constraints and scale. Do not assume a different photograph will align with this forest's coordinates. See the methodology for the implemented boundaries and the next architectural steps.

The generated setting depicts no people or cultural practices. It is not a photograph of a real site or a representation of BaAka knowledge. See [cultural grounding](demos/dzanga/CULTURAL_GROUNDING.md).
