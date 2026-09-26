// Scene-specific placement and intentions, not engine code. Coordinates are in
// the uncropped photograph, with top-left (0,0), right/down positive.
export const forestManifest = {
  version: 1,
  id: 'sangha-sticker-book',
  seed: 68019,
  bounds: [0, 0, 1, 1],
  paths: {
    'clearing-loop': {
      kind: 'flight', duration: 10, size: .044,
      points: [[.703, .700], [.650, .540], [.570, .397], [.420, .382],
        [.329, .455], [.464, .485], [.613, .566], [.703, .700]],
    },
    'leaf-fall': {
      kind: 'fall', duration: 6.5, next: 'stream-drift',
      points: [[.602, .282], [.568, .377], [.609, .474], [.573, .583], [.544, .671]],
    },
    'stream-drift': {
      kind: 'float', duration: 14,
      points: [[.544, .671], [.525, .716], [.499, .770], [.468, .837], [.432, .921]],
    },
    'bank-loop': {
      kind: 'flutter', duration: 11,
      points: [[.387, .662], [.373, .630], [.398, .606], [.420, .625],
        [.412, .650], [.391, .643], [.387, .662]],
    },
  },
  instances: [
    { id: 'parrot', sticker: 'grey-parrot', position: [.703, .700], size: .057,
      layer: 30, paths: ['clearing-loop'], call: { distance: .28, strength: .55 } },
    { id: 'leaf', sticker: 'forest-leaf', position: [.602, .282], size: .032,
      layer: 40, paths: ['leaf-fall'], impactTarget: 'water', impactStrength: .65 },
    { id: 'water', sticker: 'stream-water', position: [.49, .77], size: .3,
      layer: 10, bounds: [.33, .63, .67, .95], flow: 1 },
    { id: 'bough', sticker: 'forest-bough', position: [.85, .12], size: .43,
      layer: 5, gustDuration: 5 },
    { id: 'butterfly', sticker: 'forest-butterfly', position: [.387, .662], size: .006,
      layer: 35, paths: ['bank-loop'] },
  ],
  controls: [
    { label: 'Take flight', object: 'parrot', action: 'fly', args: { path: 'clearing-loop' } },
    { label: 'Call softly', object: 'parrot', action: 'call', args: {} },
    { label: 'Release a leaf', object: 'leaf', action: 'release', args: { path: 'leaf-fall' } },
    { label: 'Touch the water', object: 'water', action: 'ripple', args: { x: .49, y: .76, strength: .8 } },
    { label: 'Send a breeze', object: 'bough', action: 'gust', args: { strength: 1 } },
    { label: 'Wake the butterfly', object: 'butterfly', action: 'flutter', args: { path: 'bank-loop' } },
  ],
  // This is a small deterministic local director, not an AI agent. It uses the
  // exact same validated command boundary available to humans/future agents.
  ambient: [
    { id: 'leaf-weather', object: 'leaf', action: 'release', args: { path: 'leaf-fall' },
      initial: [2, 3], interval: [25, 37], maxRain: .9 },
    { id: 'bird-flight', object: 'parrot', action: 'fly', args: { path: 'clearing-loop' },
      initial: [10, 13], interval: [34, 52], maxRain: .7, hours: [6, 19] },
    { id: 'bird-voice', object: 'parrot', action: 'call', args: {},
      initial: [4, 6], interval: [18, 31], maxRain: .8, hours: [6, 19] },
    { id: 'bank-life', object: 'butterfly', action: 'flutter', args: { path: 'bank-loop' },
      initial: [1, 2], interval: [13, 20], maxRain: .7 },
    { id: 'passing-breeze', object: 'bough', action: 'gust', args: { strength: .7 },
      initial: [7, 10], interval: [16, 26] },
    { id: 'surface-life', object: 'water', action: 'ripple', args: { x: .467, y: .757, strength: .38 },
      initial: [12, 16], interval: [18, 29] },
  ],
};

export default forestManifest;
