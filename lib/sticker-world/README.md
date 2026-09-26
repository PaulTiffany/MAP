# Sticker-world contract · version 1

This is a dependency-free, local simulation kernel with a forest rendering adapter. It separates reusable sticker types, placed instances, authored paths, state and decision policy. It is a foundation for agent direction—not a connected AI agent, general editor, multiplayer service or physics engine.

[Methodology](../../METHODOLOGY.md) · [Readable article](../../methodology.html) · [Forest manifest](../../world-manifest.js)

## Direct the running page

The page exposes `window.stickerWorld` after its module loads. No credentials or network requests are involved. Observe at decision time, not every animation frame:

```js
const state = window.stickerWorld.observe();
const receipt = window.stickerWorld.dispatch({
  id: crypto.randomUUID(),
  object: 'leaf',
  action: 'release',
  args: { path: 'leaf-fall' },
  expectedRevision: state.revision,
});
console.log(receipt); // {ok: true, revision: ...} or {ok: false, reason, revision}
```

An accepted manual/external command disables new ambient decisions. Active actions finish. Resume automatic direction explicitly with `stickerWorld.setDirectorEnabled(true)`; `false` stops new choices. Only booleans are accepted; other values throw `TypeError`. This policy toggle returns `{enabled}` and does not increment the world revision.

The page adapter rejects commands with `unavailable` when hidden or without its WebGL renderer. The kernel rejects new commands with `paused` while paused. No action can enable sound, unpause the visitor, change preferences, load a URL or execute supplied code. Sound events are audible only after the visitor opts in. These checks are an integration contract, **not a security boundary against JavaScript already executing on the page**. A future network adapter must add authentication, authority, rate limits and arbitration.

## Command envelope and retry semantics

Only `{id, object, action, args?, expectedRevision?}` is accepted. Identifiers are 1–96 characters: an initial ASCII letter/digit, then ASCII letters/digits or `_.:-`. Arguments must be a plain record with at most three finite-number/string values; action-specific checks apply below. Unknown fields, paths or values are rejected before mutation. Use JSON-compatible plain data, not class instances, callbacks, getters or proxies.

- `id`: caller-generated unique identifier. Keep the exact command for uncertain retries.
- `object`: an instance ID, not a catalog type.
- `action`: an action allowed by that object's catalog type.
- `args`: the exact argument record below; omitted means `{}`.
- `expectedRevision`: optional nonnegative safe integer. Revisions advance for accepted commands and lifecycle transitions, **not** continuously for motion. It is optimistic coordination, not a lock.

Successful receipts are cached for the most recent 128 successful IDs. An identical retry returns the original receipt without repeating the action. A changed payload using a cached ID returns `id-conflict`. The fingerprint includes `expectedRevision`. Retry lookup precedes current pause/revision checks in the kernel; the page's availability check precedes the kernel. Rejected commands are not cached and do not mutate the world. An evicted ID can execute again. This is not persistent exactly-once delivery.

Rejection reasons: `invalid-command`, `invalid-args`, `unknown-object`, `unsupported-action`, `invalid-path`, `busy`, `cooldown`, `paused`, `stale-revision`, `id-conflict`; the page additionally returns `unavailable`. On `busy`/`cooldown`, wait for scene progress; on `stale-revision`, observe again and reconsider. Do not blindly retry a stale proposal with a new revision.

## Current forest capabilities

All arguments listed are required, except empty `{}`. Numbers are not coerced from strings.

| Object / type | Action and arguments | Lifecycle / constraint |
| --- | --- | --- |
| `parrot` / `grey-parrot` | `fly`, `{path:'clearing-loop'}` | 10-second flight, then returns to its perch; `busy` while flying. |
| `parrot` / `grey-parrot` | `call`, `{}` | Emits an optional spatial sound event; 3 scene seconds between accepted calls. Can call while flying. |
| `leaf` / `forest-leaf` | `release`, `{path:'leaf-fall'}` | 6.5-second fall → one water impact → 14-second `stream-drift` → hidden rest. `busy` during both phases. |
| `water` / `stream-water` | `ripple`, `{x,y,strength}` | `x` in [.33,.67], `y` in [.63,.95], strength in [0,1]; fades over 4 scene seconds. |
| `water` / `stream-water` | `set-flow`, `{value}` | Value in [0,2]; persists until changed/reload. Zero freezes the flow phase, not separately triggered ripples or rain. |
| `bough` / `forest-bough` | `gust`, `{strength}` | Strength in [0,1]; 5-second envelope, then rest. `busy` while gusting. |
| `butterfly` / `forest-butterfly` | `flutter`, `{path:'bank-loop'}` | 11-second path, then returns to its anchor; `busy` while fluttering. |
| `butterfly` / `forest-butterfly` | `rest`, `{}` | Immediately cancels its route and returns to its anchor. |

`observe().capabilities` enumerates each instance's action names, allowed path IDs and coordinate bounds. The table supplies the argument shapes for this version. `observe().paths` supplies route kind, duration, control points and any continuation. Read the manifest for placements, scales, drawing order, controls and ambient intervals. IDs are scene-owned; never assume these forest IDs exist in another scene.

## Core exports

```js
import { createWorld } from './world.js';
import { createDirector } from './director.js';
import { stickerCatalog } from './catalog.js';

const world = createWorld(manifest, { onEvent(event) { /* optional consumer */ } });
const director = createDirector(world, manifest, { seed: manifest.seed });
world.update(0, { hour: 8, rain: 0, wind: .4, paused: false });

// Called by the host's single shared loop, using elapsed seconds:
world.update(elapsedSeconds, environment);
director.update();
const frame = world.frame(); // pass to rendering; no decisions inside drawing
```

- `createWorld(manifest, {onEvent?})` validates and copies trusted author data; invalid manifests throw `TypeError`.
- `world.update(absoluteSeconds, environment?)` advances local scene time and transitions. Environment keys: hour [0,24], rain [0,1], wind [0,2], paused boolean. Invalid time/values and backwards clocks are ignored atomically. Unknown environment keys are ignored.
- `world.frame()` returns a cached deeply frozen render snapshot; inexpensive repeated reads without an update return the same object.
- `world.observe()` returns a detached JSON-compatible snapshot plus capabilities, paths, history and limits. Mutation of an observation cannot change the world. The page wrapper adds `directorEnabled`.
- `world.dispatch(command)` returns a detached receipt. It does not invoke the director or start a render loop.
- `createDirector(world, manifest, {seed?})` returns `update()`, `setEnabled(boolean)` and read-only `isEnabled`. It is a seeded local rule scheduler, not AI. Re-enabling reschedules initial delays; missed intervals do not accumulate a catch-up storm.

The kernel has no DOM, timers, audio contexts, fetches or evaluation. The host owns the clock. Time advances only between consecutive unpaused updates; the first update and resume establish baselines. Thus a hidden/paused interval cannot jump an action forward. `scene.js` also stops presentation/audio while hidden and caps scheduled draws at 30 fps.

## Snapshots and events

`frame()` contains `{time, revision, environment, objects, effects}`. Objects are layer-sorted records with `{id, sticker, position, size, layer, mode, age, progress, angle, opacity, flip}`. Effects contain `{gust, flow, ripples:[{x,y,age,strength}]}`. `observe()` adds `{scene, paths, capabilities, history, limits}`.

`onEvent` receives immutable events with `{id,type,time,revision,...}`. Current events are `call`, `water-impact`, and `action-complete`. Call events include object, kind, pan, distance and strength. An impact includes object, target, position, strength and `at` (actual contact time); `time` is when the update processed it. Even a large clock step emits only one impact per fall. Optional consumer exceptions are isolated from the simulation. History interleaves accepted command records and events, up to 64 entries. It is diagnostic evidence, not a durable replay log.

## Author another scene

1. Use a version-1 manifest with an identifier, normalized `[minX,minY,maxX,maxY]` bounds, a `paths` record and `instances` array. Coordinates are source-image space, top-left origin—not viewport percentages.
2. Each instance needs `id`, catalog `sticker`, `position:[x,y]`, `size` [.001,1], and `layer` [-1000,1000]. Optional fields include `paths`, bounds, flow, gustDuration, call and impactTarget/impactStrength. See the forest manifest for complete examples.
3. Paths need kind (`flight`, `fall`, `float`, `flutter`), duration [.1,120] seconds and 2–64 points within scene bounds. Optional size overrides the instance size during that route. Only a fall can continue to a named float path. Match the endpoint/startpoint yourself; the kernel does not infer contact geometry or repair discontinuities.
4. Instances may only select their allowlisted routes of the correct kind. Give a falling leaf a water instance's `impactTarget` to produce contact. Author the route endpoint inside the intended water region; the runtime does not discover surfaces from pixels. Fly/flutter completion returns to the instance anchor, so author a closed return if you want continuity.
5. Optional `ambient` rules specify unique IDs, object/action/args, `initial` and `interval` ranges in seconds, plus optional hours/maxRain gates. There can be at most 64 rules; each interval bound is [.1,3600]. Decisions still pass command validation. `controls` are labels/commands for the human adapter, not kernel behavior.
6. Supply a renderer for that composition. The current catalog and behavior vocabulary are finite; a new behavior needs code and tests, not just an asset URL. Reuse known behaviors first, then extend deliberately.

Limits: 64 instances, 128 paths, 64 points/path, 4 active ripple records (oldest evicted), 64 history entries and 128 successful retry IDs. Reload clears state. The current forest adapter renders one water material and one foreground bough: `effects.flow` uses the last water instance and gust uses the maximum envelope. It does **not** provide independent material surfaces for multiple water/bough instances. The WebGL pass sits below all Canvas2D sprites; layer values order sprites but cannot interleave them with photographic geometry. The rectangular water command bounds are a validation region, not a pixel-perfect shoreline or collision mesh.

The non-forest `courtyard` fixture in [selftest.mjs](selftest.mjs) demonstrates kernel reuse with different IDs/paths. It is not a second rendered scene. Asset catalog URLs are trusted static modules; commands cannot register arbitrary URLs or code. Asset preparation, lighting matching, occlusion and scene-specific masks remain authoring work.

## Verify from the repository root

```sh
node lib/sticker-world/selftest.mjs
node sprite-selftest.mjs
node selftest.mjs
```

The tests cover state isolation, validation, retries, revisions, bounded effects/history, pause/clock semantics, lifecycle/contact, seeded policy, another manifest, render contracts and scene-controller integration. Also inspect actual visuals, keyboard/mobile layouts, sound level, fallback and project-prefix URLs in a browser. These tests do not establish physical realism or device performance.
