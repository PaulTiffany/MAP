# From a living still to a sticker book

Implementation methodology · GPT-6 / Codex

MAP / The listening forest / third study

[Read the designed article](methodology.html) · [Enter MAP](index.html) · [Agent/runtime contract](lib/sticker-world/README.md) · [Artwork provenance](ART_DIRECTION.md)

## 1. The architectural choice

Start with a strong, fixed composition. Preserve its photographic detail, then spend rendering work on things that convey life: moving water, changing light, leaves, mist and occasional animals. This is a **2.5D scene**, not a reconstructed 3D forest. Its photographic-style objects are composited “stickers”: named instances with anchors, scale, depth and actions. A sticker need not have a paper outline or an illustrated appearance.

The important change in this study is separating **what exists**, **where it belongs**, **what it is doing**, **who chooses its next action**, and **how it is drawn**. The forest is the first test case, not the intended limit of the architecture. A future city could reuse the command/lifecycle pattern while supplying different assets, paths, actions and rendering adapters.

GitHub Pages serves ordinary static files; the visitor's browser does the work. There is no backend, streaming video, remote inference, framework, dependency installation or build step. The implementation now lives at **[https://paultiffany.github.io/MAP/](https://paultiffany.github.io/MAP/)**. The previous forest demo route is removed, not redirected. All runtime asset/import paths are relative so the repository can be served locally at `/` and on Pages at `/MAP/`.

This pass implements an in-page control boundary and a seeded local ambient director. **It does not implement an AI agent, authenticated agent service, multiplayer world, persistence, general editor or arbitrary-script loader.** Those are future systems that can use this boundary without taking ownership of the rendering loop.

## 2. Separate five responsibilities

| Responsibility | Current home | Meaning |
| --- | --- | --- |
| Catalog | `lib/sticker-world/catalog.js` | Reusable sticker types and permitted actions. A parrot's possible actions are not its placement in this forest. |
| Scene manifest | `world-manifest.js` | Named instances, placements, scene-owned paths and direction settings. Reusing a type does not imply reusing these coordinates. |
| Runtime state | `lib/sticker-world/world.js` | Current actions, transitions, command validation, revisions, receipts and bounded event history. |
| Decision policy | `lib/sticker-world/director.js`, human controls, future agent adapter | Decides which allowed action to request. Does not bypass validation or modify renderer internals. |
| Rendering adapter | `renderer.js`, `fauna.js`, `sound.js` | Projects current state into material motion, sprites and optional sound. Has no independent decision-making loop. |

```text
human “Direct scene” panel ─┐
seeded ambient director ────┼─ validated command → world state + receipt
future external adapter ───┘                         │
                                            shared scene clock
                                                   │
                          WebGL materials + 2D stickers + optional audio
```

This is a reusable core with a forest adapter, not a claim that every scene feature is already generic. Canopy ellipses, stream masks, log exclusions, shader lighting and drawing details still belong to this scene. A new scene reauthors those or provides a new adapter. A catalog entry alone does not supply an asset pipeline, collision geometry or a complete renderer.

## 3. A small, inspectable direction protocol

The page exposes `window.stickerWorld`. Future integrations should **observe → choose → dispatch → inspect receipt → observe again**, not reach into internal mutable state. The optional **Direct scene** panel demonstrates the same command route for a person. See the [runtime contract](lib/sticker-world/README.md) for exact exports, object IDs, action arguments and copyable examples.

Commands contain a unique `id`, named `object`, allowed `action`, optional bounded `args` and optional `expectedRevision`. The runtime checks types, known objects/actions/paths, numeric ranges and its action/state constraints before mutation. An unknown path does not become an arbitrary screen-space route. Commands cannot contain executable code, asset URLs, network targets or a replacement renderer.

`observe()` returns detached state, rather than references that a caller can mutate to skip validation. A receipt reports success/failure, a rejection reason where applicable, and revision. A successful command ID is cached in a bounded 128-entry window: an identical retry returns its original receipt; reusing it for a different payload returns `id-conflict`. Rejected commands do not change state. This is short-lived retry protection, not durable exactly-once delivery; an evicted ID may be accepted again.

`expectedRevision` offers optimistic coordination against accepted-command **and lifecycle** changes. A controller that sees a conflict should observe again and reconsider, not blindly retry with a new revision. Recent history is capped at 64 entries. Neither the revision counter nor that history is a persistent event store. Reloading creates a new local world.

The ambient director sends commands through the same interface. Its seed makes the local policy repeatable for testing; it is still authored software, not an AI model. Human commands and the director share one state machine. A later agent adapter needs explicit authority and arbitration rules before multiple people or services can reliably share a scene.

An accepted manual/external command switches off new ambient choices. Already-started actions finish; the visitor can explicitly resume the director. New commands are rejected while paused, and the page adapter rejects commands while hidden or without animated graphics. The in-page API is an integration boundary, not a security boundary against other JavaScript on the same page.

## 4. One clock, many kinds of movement

`scene.js` owns the sole presentation loop and advances scene time only when motion is enabled. It updates the world, asks the policy for decisions and passes a current snapshot to drawing. No sticker starts its own animation loop. Animal events carry stable IDs; the audio layer deduplicates them.

Time of day is separate from elapsed animation time. The slider covers 06:00–19:30, without redundant preset buttons. “Let the day pass” advances that daylight span in 180 seconds, continues from the selected hour and stops at dusk. It does not speed up wingbeats or jump from night to dawn automatically. Rain remains independent of the hour.

| Motion vocabulary | What changes | What keeps it spatially credible |
| --- | --- | --- |
| Parrot flight and call | Registered wing poses travel along a named path; a call is an event, not a continuously running sound. | Body anchors prevent pose jitter; scale and route are authored for the clearing. |
| Leaf release, contact and drift | A leaf tumbles down, meets the stream, produces a ripple and floats. | Water contact is an authored path transition, not an assertion of general collision physics. |
| Ripple | An expanding, fading ring begins at a bounded water position. | It stays associated with the stream surface rather than translating the whole photograph. |
| Butterfly motion | Small wing changes and curved path travel. | Restrained size, sparse population and fixed scene paths. |
| Gust | A bounded transient strengthens existing anchored leaf/branch deformation. | Tree trunks and buttress roots should remain still. |
| Flow, light and weather | Material-specific refraction, highlights, rays, cloud modulation, mist and rain. | Source-space masks constrain changes to the intended regions. |
| Pointer parallax | Very small view offset. | All layers use the same projection; parallax is supporting depth, not the main animation vocabulary. |

These are distinguishable render behaviors connected to addressable state. They are not a physical simulation, animal-intelligence model or general collision system. Leaf contact and flight endpoints are authored illusions that can be checked and reused.

Pause holds the shared clock. Reduced-motion preference starts paused. Hidden pages suspend animation and audio; returning resets the wall-time baseline instead of simulating the missed interval. Paused or hidden time must never accumulate a burst of animal calls. Sound requires an explicit user gesture. A static image remains the baseline without JavaScript or WebGL.

## 5. Author in the image's coordinate system

Use normalized source-image coordinates: **(0, 0) is top-left; (1, 1) is bottom-right**. Put path points, anchors, water boundaries and light openings there. The renderer and sticker canvas share cover cropping, 2.5% overscan and pointer offset. Do not put a river mask in viewport percentages; a portrait crop would make the banks move independently of the image.

For image aspect `Ai` and viewport aspect `Av`, before overscan:

```text
cover = [min(1, Av / Ai), min(1, Ai / Av)]
sourcePoint = (viewportPoint - 0.5) * cover / overscan + 0.5 + pointerOffset
```

Keep the WebGL texture-orientation conversion at the sampling boundary. Use the inverse mapping to project a source-space sticker onto Canvas2D. Test one known anchor in portrait and landscape before tuning motion. `scene-config.js` supplies the common 1672/941 aspect, 1.025 overscan and material settings; the manifest supplies instance/path data.

The parrot atlas is a 2 × 2 sheet with three flight poses and one perched pose. Alpha bounds are measured at load. Use shared flight crops and per-pose torso registration points so wing changes do not move the body. Anchor the perched pose at its feet. Keep cutout fringes, focus, scale, contrast and light direction consistent with the background. Reusing a sticker means reusing its identity and action vocabulary, not ignoring scene-specific art direction.

The neutral forest plate was generated with diffuse overcast illumination and no visible sun or baked directional beams. The browser supplies changing shafts, dapple, warmth, exposure and water highlights. The earlier sunlit plate remains for provenance but is not requested at runtime. Even a neutral plate contains diffuse shading and reflections; it is not an albedo map. Without geometry and surface normals, this remains artistic time-of-day simulation, **not ray tracing, physical relighting or an astronomical model**.

## 6. Sound belongs to events and distance

A low-level bed uses filtered noise for stream, leaves and rain. Synthesized animal cues are linked to events, with stereo pan, distance attenuation and low-pass filtering. The audio layer allows at most three transient voices, at least 0.8 seconds between accepted cues and three seconds between parrot cues. It deduplicates IDs and releases each voice's nodes when finished.

A cue must sit inside the environment, not dominate it. Start quietly, leave headroom and fade start/stop transitions. Repeated Sound toggles must not create overlapping contexts or duplicate calls. Browser gain values are relative, not calibrated sound-pressure levels. The listener controls actual speaker/headphone volume.

This is procedural sound, not a field recording or scientifically accurate species call. Generated animals and audio are not documentary evidence of the location. Agent direction must never bypass the visitor's sound opt-in, volume or pause preferences.

## 7. Spend explicit budgets

| Budget | Policy, not a performance guarantee |
| --- | --- |
| Presentation | At most 30 rendered frames per second, about 33.3 ms apart. |
| Main WebGL surface | 1.2 million pixels initially, or 0.65 million on narrow/coarse-pointer devices; floor 0.36 million. |
| Drawing | One WebGL scene pass plus a small transparent sticker canvas; reuse textures and decoded atlases. |
| Idle | No continuing animation while paused and settled or hidden. |
| Audio | User opt-in; bounded voices; hidden-page suspension. |
| Commands | Allowlisted actions and arguments; bounded receipts/history; no arbitrary code or per-frame network calls. |

The quality controller checks windows of 90 positive frame intervals. If more than 22% exceed 48 ms, it multiplies the cap by 0.76 down to 360,000 pixels. Reductions are at least six scene seconds apart and remain until reload. Hidden/resume handling resets the baseline. Do not discard very slow foreground frames, or an overloaded device could never reduce quality.

About → Rendering details reports observed scheduled-frame cadence, internal surface dimensions, pixel cap and average CPU submission time. One-off manual draws do not inflate the frame counter. **CPU submission is not GPU completion time.** Avoid synchronous graphics queries and pixel readbacks in the production loop; lower the drawing buffer and reuse resources. Measure physical target devices before claiming mobile frame rate or battery efficiency.

### Asset record

| Compressed image | Bytes |
| --- | --- |
| Main neutral plate | 409,902 |
| Smaller responsive candidate | 148,944 |
| Transparent foreground bough | 122,896 |
| Parrot atlas | 261,186 |
| Transparent leaf | 42,566 |
| Main plate + bough + atlas + leaf | 836,550 |

These are file sizes, not total transfer or decoded memory. Main/small dimensions are 1672 × 941 and 1008 × 568. Browser selection depends on viewport, crop and pixel ratio. HTML, CSS and code add to transfer; decoded textures consume more memory. This study adds a 512 × 512 generated leaf cutout; the small butterfly and ripple rings are procedural. Full prompts are recorded in the asset provenance.

### Validation record

Historical **version 2**, 25 September 2026: local desktop Chromium reported 30.0 fps / 0.2 ms average CPU submission at 886 × 638 CSS pixels (1108 × 798 WebGL surface), and 30.0 fps / 0.3 ms at 320 × 568 (320 × 568 surface). These were short rolling-window observations on one host, not a sustained benchmark or physical-phone measurement, and **do not measure this sticker-runtime revision**.

**Sticker-book revision, 25 September 2026:** all three suites pass on Node 22.16.0. Browser checks covered 320 × 568, 390 × 844, 844 × 390 and a 1280 × 720 project-prefix view, including direct control, pause rejection, leaf contact history, path guides/immersion and About → methodology. The local `/MAP/` view loaded without console errors; the removed demo route returned 404. Three-second rolling readouts showed 30.0 fps / 0.3 ms CPU submission at 1280 × 720 (1461 × 822 render surface) and 30.0 fps / 0.8 ms at 390 × 844 (390 × 844 surface). These are desktop-host observations at those viewport sizes, not physical-phone or GPU-time measurements. The new PR workflow runs the three contract suites independently of deployment.

For the current revision run all three dependency-free test suites below and record browser checks separately. Tests of command/state behavior cannot establish shader output, audio quality, visible contact registration or thermal performance. The acceptance checklist is a validation procedure, not a blanket claim that all devices pass.

## 8. Replicate and extend

1. **Choose a fixed view and readable action space.** A strong plate needs a depth corridor and open areas for motion. A busy forest can hide useful behaviors; a future street, room or plaza may be a clearer interaction laboratory.
2. **Prepare a neutral still and small asset set.** Generate or license the art; record provenance and complete prompts. Avoid fixed sunbeams if the scene will relight. Export compressed alternatives and check transparent edges on light/dark backgrounds.
3. **Separate types from instances.** Add reusable action metadata to the catalog. Place named instances and scene-specific paths in a manifest. Do not embed an entire forest route inside a reusable parrot type.
4. **Author registration and constraints.** Set anchors, depth, allowed paths and water contact points. Reauthor masks and exclusions for the new plate. Verify landscape and portrait alignment.
5. **Implement one behavior at a time.** Distinguish pose animation, trajectory, deformation, contact transition, flow and event audio. Watch normal speed; more amplitude is not a substitute for a new kind of movement.
6. **Keep policy outside rendering.** Have a local director, human interface or future adapter send bounded commands. Observe first, use unique IDs, inspect receipts and handle stale revisions. Never inject callbacks or scripts from command data.
7. **Honor the visitor's controls.** Preserve pause, reduced motion, sound consent, volume, visibility and static fallback. A future agent is not allowed to override those preferences implicitly.
8. **Test, measure and deploy.** Run deterministic contracts, browser checks and real-device measurements. Serve the repository root and verify relative paths at the actual Pages project prefix.

```sh
python -m http.server 8765 --bind 127.0.0.1
# Open http://127.0.0.1:8765/
node selftest.mjs
node lib/sticker-world/selftest.mjs
node sprite-selftest.mjs
```

The repository's existing Pages workflow publishes the root after merge to `main`. This is a migration, not two maintained implementations. The old forest demo URL should no longer host a duplicate scene. Other historical SVG demos and research files remain separate.

### Next architectural steps — not implemented here

- Versioned asset/library packaging, provenance checks and manifest migration tools.
- Explicit path affordances, generalized occlusion, contact surfaces and action composition beyond the forest adapter.
- A transport adapter that translates an agent's proposal into the existing allowlisted command envelope, with authority, rate limits and approval policy.
- Shared sessions with arbitration, permissions, persistent state and durable event/replay semantics. GitHub Pages alone supplies none of these services.
- A second scene to test what is genuinely reusable. A city should challenge the abstraction with new actions, not merely exchange the background image.

## 9. Acceptance checks for humans and future agents

| Check | Acceptance criterion |
| --- | --- |
| Identity and isolation | Catalog describes types; manifest names instances/paths; observation cannot mutate internal state. |
| Commands | Unknown objects/actions/paths and invalid numbers fail safely; identical retry and conflicting ID reuse have distinct outcomes; stale revisions require reconsideration. |
| Direction | Human and ambient actions use the same validator. Disabling the director stops new ambient decisions, without inventing an AI connection. |
| Visible motion | A leaf's fall, contact and drift read differently from bird wingbeats, ripples, gusts and parallax. |
| Boundaries | Stream banks, log, trunks and roots do not move with water/canopy deformation. Stickers remain registered across crop changes. |
| Lifecycle | Pause freezes progress; reduced motion begins paused; hidden time does not create a backlog of events or sound. |
| Time/weather/audio | Slider and automatic day change illumination, not action speed. Rain is independent; sound stays opt-in and quiet. |
| Access and layout | Narrow portrait, short landscape, keyboard, About, directing panel and return links remain usable. |
| Failure and performance | Missing optional assets/WebGL preserve a useful fallback; no idle render loop or unbounded histories; record device and sampling interval for measurements. |
| Deployment | Root scene, methodology, library modules and relative assets resolve under `/MAP/`; removed demo route is not a second implementation. |

## Scope and sources

An imagined Congo Basin forest inspired by the Sangha region, not a photograph of a specific location. The [UNESCO Sangha Trinational record](https://whc.unesco.org/en/list/1380/) describes the regional humid tropical forest landscape. No local people, music or cultural practices are reproduced; see [cultural grounding](demos/dzanga/CULTURAL_GROUNDING.md).

References: [WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices). Project records: [art direction](ART_DIRECTION.md), [full asset prompts](assets/GENERATION.md), [runtime contract](lib/sticker-world/README.md), [source](https://github.com/PaulTiffany/MAP). Keep this document, the readable article and the runtime contract aligned with the code. These describe public implementation decisions and reproducible procedures, not hidden reasoning traces.
