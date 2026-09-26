import assert from 'node:assert/strict';
import { createWorld } from './world.js';
import { createDirector } from './director.js';
import { forestManifest } from '../../world-manifest.js';

let checks = 0;
function test(name, run) {
  run(); checks++; console.log(`ok ${checks} - ${name}`);
}
const clone = value => JSON.parse(JSON.stringify(value));
const command = (id, object, action, args = {}) => ({ id, object, action, args });
const actor = (world, id) => world.frame().objects.find(obj => obj.id === id);

test('invalid commands never mutate state or throw', () => {
  const world = createWorld(forestManifest), before = world.observe();
  const cyclic = {}; cyclic.path = cyclic;
  for (const cmd of [null, [], {}, { ...command('x', 'parrot', 'fly', { path: 'clearing-loop' }), evil: 1 },
    command('x', 'parrot', 'fly', { path: 'missing' }), command('x', 'missing', 'fly'),
    command('x', 'parrot', 'eval', { source: 'alert(1)' }), command('x', 'water', 'ripple', { x: NaN, y: .7, strength: 1 }),
    command('x', 'water', 'ripple', { x: .1, y: .7, strength: 1 }), command('x', 'water', 'set-flow', { value: Infinity }),
    command('x', 'water', 'set-flow', { value: '1' }), command('x', 'bough', 'gust', { strength: 1.1 }),
    command('x', 'parrot', 'call', { unexpected: 0 }), command('x', 'parrot', 'fly', cyclic),
    command('x', 'parrot', 'call', null), command('x', 'water', 'set-flow', { value: 1n }),
    { ...command('x', 'parrot', 'call'), expectedRevision: -1 }]) {
    assert.equal(world.dispatch(cmd).ok, false);
    assert.deepEqual(world.observe(), before);
  }
});

test('observation detaches every nested value; render snapshots are immutable', () => {
  const input = clone(forestManifest), world = createWorld(input), first = world.frame();
  input.paths['clearing-loop'].points[0][0] = 0;
  input.instances[0].position[0] = 0;
  const observation = world.observe();
  observation.objects[0].position[0] = 0;
  observation.paths['clearing-loop'].points[0][0] = 0;
  observation.capabilities[0].actions.push('eval');
  assert.equal(world.observe().paths['clearing-loop'].points[0][0], .703);
  assert.equal(actor(world, 'parrot').position[0], .703);
  assert.throws(() => { first.objects[0].position[0] = 0; }, TypeError);
  assert.equal(world.frame(), first, 'frame is cached until state changes');
});

test('idempotent retries, conflicting ids, optimistic revision and bounded caches', () => {
  const world = createWorld(forestManifest);
  const cmd = { ...command('first', 'water', 'set-flow', { value: .5 }), expectedRevision: 0 };
  const receipt = world.dispatch(cmd);
  assert.deepEqual(receipt, { ok: true, revision: 1 });
  assert.deepEqual(world.dispatch(cmd), receipt);
  assert.equal(world.dispatch({ ...cmd, args: { value: 1 } }).reason, 'id-conflict');
  assert.equal(world.dispatch({ ...command('old', 'water', 'set-flow', { value: 1 }), expectedRevision: 0 }).reason, 'stale-revision');
  receipt.revision = 99;
  assert.equal(world.dispatch(cmd).revision, 1);
  for (let i = 0; i < 150; i++) assert.equal(world.dispatch(command(`flow-${i}`, 'water', 'set-flow', { value: i % 2 })).ok, true);
  assert.equal(world.observe().history.length, 64);
  assert.equal(world.dispatch(command('first', 'water', 'set-flow', { value: .6 })).ok, true, 'expired ids may be reused after 128 successes');
});

test('pause freezes lifecycle, blocks actions and emits no audio or impact', () => {
  const events = [], world = createWorld(forestManifest, { onEvent: e => events.push(e) });
  world.update(0);
  world.dispatch(command('leaf', 'leaf', 'release', { path: 'leaf-fall' }));
  world.update(2);
  const active = actor(world, 'leaf');
  world.update(10, { paused: true });
  world.update(100, { paused: true });
  assert.equal(world.frame().time, 2);
  assert.deepEqual(actor(world, 'leaf'), active);
  assert.equal(world.dispatch(command('call', 'parrot', 'call')).reason, 'paused');
  assert.equal(events.length, 0);
  world.update(200, { paused: false });
  assert.equal(world.frame().time, 2, 'resume does not catch up hidden time');
  world.update(201);
  assert.equal(world.frame().time, 3);
});

test('leaf falls, makes exactly one water impact and ripple, floats, then rests', () => {
  const events = [], world = createWorld(forestManifest, { onEvent: e => events.push(e) });
  world.update(0);
  world.dispatch(command('leaf', 'leaf', 'release', { path: 'leaf-fall' }));
  assert.equal(actor(world, 'leaf').mode, 'falling');
  assert.equal(world.dispatch(command('leaf-again', 'leaf', 'release', { path: 'leaf-fall' })).reason, 'busy');
  world.update(6.5);
  assert.equal(actor(world, 'leaf').mode, 'floating');
  assert.equal(events.filter(e => e.type === 'water-impact').length, 1);
  assert.equal(world.frame().effects.ripples.length, 1);
  assert.equal(world.frame().effects.ripples[0].age, 0);
  world.update(7); world.update(8);
  assert.equal(events.filter(e => e.type === 'water-impact').length, 1);
  world.update(21);
  assert.equal(actor(world, 'leaf').mode, 'rest');
  assert.equal(world.frame().effects.ripples.length, 0);
  assert.equal(actor(world, 'leaf').opacity, 0);
  assert.equal(world.dispatch(command('leaf-next', 'leaf', 'release', { path: 'leaf-fall' })).ok, true);
  world.update(100);
  assert.equal(events.filter(e => e.type === 'water-impact').length, 2);
  assert.equal(actor(world, 'leaf').mode, 'rest', 'large jump resolves both phases once');
  assert.equal(world.frame().effects.ripples.length, 0);
});

test('flight, flutter/rest, gust and call capability lifecycle', () => {
  const events = [], world = createWorld(forestManifest, { onEvent: e => events.push(e) });
  world.update(0);
  assert.equal(world.dispatch(command('fly', 'parrot', 'fly', { path: 'clearing-loop' })).ok, true);
  assert.equal(world.dispatch(command('fly2', 'parrot', 'fly', { path: 'clearing-loop' })).reason, 'busy');
  assert.equal(world.dispatch(command('call1', 'parrot', 'call')).ok, true);
  assert.equal(world.dispatch(command('call2', 'parrot', 'call')).reason, 'cooldown');
  assert.equal(events[0].type, 'call');
  assert.equal(world.dispatch(command('flutter', 'butterfly', 'flutter', { path: 'bank-loop' })).ok, true);
  world.update(2);
  assert.equal(actor(world, 'parrot').mode, 'flying');
  assert.notDeepEqual(actor(world, 'parrot').position, [.703, .700]);
  assert.equal(world.dispatch(command('rest', 'butterfly', 'rest')).ok, true);
  assert.equal(actor(world, 'butterfly').mode, 'rest');
  world.dispatch(command('gust', 'bough', 'gust', { strength: .8 }));
  assert.equal(world.dispatch(command('gust2', 'bough', 'gust', { strength: .8 })).reason, 'busy');
  world.update(4.5);
  assert.ok(world.frame().effects.gust > .79);
  world.update(10);
  assert.equal(actor(world, 'parrot').mode, 'perched');
  assert.deepEqual(actor(world, 'parrot').position, [.703, .700]);
  assert.equal(world.frame().effects.gust, 0);
});

test('ripples are bounded and invalid clock/environment updates do not mutate', () => {
  const world = createWorld(forestManifest);
  world.update(0);
  for (let i = 0; i < 30; i++) world.dispatch(command(`r${i}`, 'water', 'ripple', { x: .5, y: .7, strength: .5 }));
  assert.equal(world.frame().effects.ripples.length, 4);
  const before = world.observe();
  world.update(NaN); world.update(10, { rain: 2 }); world.update(-1); world.update(10, { paused: 'true' });
  assert.deepEqual(world.observe(), before);
  world.update(5); assert.equal(world.frame().effects.ripples.length, 0);
});

test('local director is seeded, disableable, and has no catch-up storm', () => {
  function run(seed) {
    const world = createWorld(forestManifest), director = createDirector(world, forestManifest, { seed });
    for (let t = 0; t <= 100; t += .5) { world.update(t); director.update(); }
    return world.observe().history;
  }
  assert.deepEqual(run(42), run(42));
  assert.notDeepEqual(run(42), run(43));
  const world = createWorld(forestManifest), director = createDirector(world, forestManifest);
  world.update(0); director.setEnabled(false); world.update(200); director.update();
  assert.equal(world.observe().revision, 0);
  director.setEnabled(true); director.update();
  assert.equal(world.observe().revision, 0);
  world.update(1000); director.update();
  assert.ok(world.observe().history.filter(e => e.kind === 'command').length <= forestManifest.ambient.length);
  assert.equal(director.isEnabled, true);
});

test('same kernel runs another authored scene with no forest object ids or coordinates', () => {
  const fixture = { version: 1, id: 'courtyard', bounds: [0, 0, 1, 1],
    paths: { descent: { kind: 'fall', duration: 1, next: 'drift', points: [[.2, .1], [.3, .4]] },
      drift: { kind: 'float', duration: 2, points: [[.3, .4], [.7, .8]] },
      circuit: { kind: 'flight', duration: 2, points: [[.1, .2], [.7, .3], [.1, .2]] } },
    instances: [
      { id: 'paper', sticker: 'forest-leaf', position: [.2, .1], size: .02, layer: 2, paths: ['descent'], impactTarget: 'fountain' },
      { id: 'fountain', sticker: 'stream-water', position: [.5, .6], size: .4, layer: 1, bounds: [.2, .3, .8, .9], flow: .3 },
      { id: 'visitor', sticker: 'grey-parrot', position: [.1, .2], size: .05, layer: 3, paths: ['circuit'] },
    ], ambient: [] };
  const events = [], world = createWorld(fixture, { onEvent: e => events.push(e) });
  world.update(0);
  world.dispatch(command('drop', 'paper', 'release', { path: 'descent' }));
  world.dispatch(command('visit', 'visitor', 'fly', { path: 'circuit' }));
  world.update(1);
  assert.equal(events[0].target, 'fountain');
  assert.deepEqual(events[0].position, [.3, .4]);
  assert.equal(world.frame().effects.flow, .3);
  world.update(4);
  assert.equal(actor(world, 'paper').mode, 'rest');
  assert.deepEqual(actor(world, 'visitor').position, [.1, .2]);
});

test('all manifest controls dispatch accepted commands into a fresh world', () => {
  for (const [i, control] of forestManifest.controls.entries()) {
    const world = createWorld(forestManifest);
    const { label, ...cmd } = control;
    assert.equal(world.dispatch({ id: `control-${i}`, ...cmd }).ok, true, label);
  }
});

console.log(`${checks} sticker-world contract groups passed.`);
