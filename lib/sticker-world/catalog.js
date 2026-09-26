// Shared visual/behavior definitions. Scene manifests own coordinates and paths.
// Assets resolve relative to this module, including a GitHub Pages project prefix.
const asset = (filename, extra = {}) => Object.freeze({
  url: new URL(`../../assets/${filename}`, import.meta.url).href, ...extra,
});

export const stickerCatalog = Object.freeze({
  'grey-parrot': Object.freeze({
    label: 'African grey parrot', behavior: 'bird', initialMode: 'perched',
    actions: Object.freeze(['fly', 'call']),
    asset: asset('grey-parrot-atlas.webp', { grid: [2, 2],
      anchors: [[.57, .77], [.58, .76], [.57, .29], [.59, .85]] }),
  }),
  'forest-leaf': Object.freeze({
    label: 'Falling leaf', behavior: 'leaf', initialMode: 'rest',
    actions: Object.freeze(['release']), asset: asset('forest-leaf.webp'),
  }),
  'stream-water': Object.freeze({
    label: 'Water surface', behavior: 'water', initialMode: 'flowing',
    actions: Object.freeze(['ripple', 'set-flow']), asset: null,
  }),
  'forest-bough': Object.freeze({
    label: 'Flexible bough', behavior: 'bough', initialMode: 'rest',
    actions: Object.freeze(['gust']), asset: asset('foreground-bough.webp'),
  }),
  'forest-butterfly': Object.freeze({
    label: 'Bank butterfly', behavior: 'butterfly', initialMode: 'rest',
    actions: Object.freeze(['flutter', 'rest']), asset: null,
  }),
});
