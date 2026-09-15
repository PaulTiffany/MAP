# Performance budget

The demo must stay impressive on GitHub Pages without requiring a build server or heavyweight runtime.

## First-load budget

Target before compression:

- HTML: ≤ 40 KB
- demo JS beyond shared engine: ≤ 30 KB
- world + motion JSON: ≤ 40 KB combined
- initial SVG markup/assets: ≤ 350 KB
- total first useful payload: ≤ 500 KB

Large optional region art may be lazy-loaded after first interaction.

## Runtime budget

### Frame discipline

- exactly one engine-owned `requestAnimationFrame` presentation loop;
- no DOM/SVG writes directly from wheel, pointer, or touch handlers;
- no repeated layout reads inside renderer flushes;
- path lengths cached after first read;
- unchanged attributes/styles are not rewritten;
- semantic layers outside useful LOD ranges should become noninteractive and, where profiling justifies it, detachable.

### Scene complexity targets

For the first slice:

- ≤ 250 semantic objects indexed by the renderer;
- ≤ 60 simultaneously visible animated objects;
- ≤ 12 path-following objects active at once;
- ≤ 8 expensive filter effects active at once; prefer zero SVG blur filters on low-power mobile;
- decorative micro-detail may be grouped into nonsemantic SVG groups instead of individually indexed nodes.

These are starting budgets, not claims about browser limits.

## Rendering hierarchy

1. CSS transform the whole world for camera pan/zoom.
2. SVG transforms/opacity/path stroke for authored semantic objects.
3. Avoid geometry mutation when transform can express the same visual result.
4. Introduce Canvas only for dense disposable particles if profiling shows DOM/SVG pressure.
5. Introduce WebGL only behind the existing render-command contract, never by forking interaction semantics.

## Mobile degradation

On narrow / low-power devices:

- reduce ambient particles by at least 60%;
- disable blur-heavy mist and use layered translucent paths instead;
- reduce velocity-reactive canopy groups;
- retain semantic transitions, path reveals, and camera choreography;
- preserve reduced-motion semantics by replacing movement with opacity/detail-state transitions.

## Profiling gates

Before expanding beyond the vertical slice, test:

- Android Chrome midrange hardware;
- iOS Safari representative phone;
- desktop Chromium with trackpad;
- desktop Firefox;
- reduced-motion preference.

Record:

- long frames during continuous scroll;
- scripting/rendering/painting split;
- node count by zoom level;
- memory after ten minutes of roam/guide switching;
- time to first useful frame over a cold GitHub Pages load.

Do not optimize by visual guess. If SVG remains smooth, keep SVG; inspectability is a feature of the platform.
