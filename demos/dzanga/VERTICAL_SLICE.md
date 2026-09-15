# Vertical slice — River to Bai

## Goal

Build one route deeply enough to prove the platform:

**river edge → closed canopy → elephant corridor → mist threshold → bai → understory/root reveal**

The route is fictional but visually grounded in Dzanga-Sangha ecology.

## World layout

A 3200 × 2200 logical-unit scene.

- Sangha-inspired river enters from southwest and bends east.
- Closed canopy occupies the center.
- A narrow animal corridor crosses the forest diagonally.
- A bai sits northeast as a pale mineral clearing.
- A hidden root/water network occupies the same geography at deep zoom.

## Guided trail

Trail progress `p ∈ [0,1]`.

### 0.00–0.16 — river edge

Camera glides above the river margin.

Graphics:
- river route draws gently;
- distant canopy stays nearly continuous;
- one seed/leaf marker follows the water path;
- scroll activity creates small water-ring amplitude.

### 0.16–0.40 — closed canopy

Camera moves inward and slightly closer.

Graphics:
- canopy masses separate by semantic zoom;
- mist thickens locally, then parts ahead of the camera;
- animal corridor becomes visible only after the user is close enough;
- high scroll activity produces a brief canopy wave.

### 0.40–0.64 — corridor

Camera follows the corridor rather than cutting straight to the clearing.

Graphics:
- path draws under the user;
- a small trace marker follows it;
- footprints appear in a staggered sequence;
- the river remains faintly visible behind, preserving geography.

### 0.64–0.84 — threshold

The clearing should be sensed before fully seen.

Graphics:
- canopy opacity drops locally;
- pale reflected light rises from ahead;
- mist moves laterally with scroll direction;
- bai outline resolves from irregular fragments into one opening.

### 0.84–1.00 — bai

Camera enters the clearing without a scene cut.

Graphics:
- mineral channels draw into view;
- a small group of abstract elephant-track marks converges, without literal animated animal avatars in v1;
- the clearing becomes visually quieter than the approach;
- at high zoom, root/water/seed networks underneath the clearing become available as a new semantic layer.

## Free-roam requirement

At every point the user can leave the guided route and pan/zoom manually. Re-entering the trail should restore choreography from the nearest progress point, not teleport back to the start.

## Orchestration matrix

| object | story progress | zoom | scroll activity |
| --- | --- | --- | --- |
| river | draw / follow | braids appear | ripple strength |
| canopy | local reveal | crowns separate | sway amplitude |
| mist | threshold timing | finer layers | displacement |
| corridor | path draw | tracks appear | trace speed |
| bai | opening / brighten | mineral detail | mostly quiet |
| root network | late reveal | primary trigger | subtle pulse |

## Completion gate

Do not expand the map until this route demonstrates all of the following in one coherent run:

- semantic cross-fade;
- camera + user zoom composition;
- progress-driven path drawing;
- progress-driven path following;
- velocity-driven response;
- zoom-triggered replacement of macro art with mechanism art;
- free roam → guided → free roam without visual discontinuity.
