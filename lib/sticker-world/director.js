// Seeded, bounded local ambience. This is deliberately not an LLM or agent.
// It has no private access to world state and uses the public command boundary.
export function createDirector(world, manifest, { seed = manifest.seed ?? 1 } = {}) {
  let randomState = (Number.isFinite(seed) ? seed : 1) >>> 0;
  const random = () => {
    randomState = (Math.imul(1664525, randomState) + 1013904223) >>> 0;
    return randomState / 4294967296;
  };
  const validRange = r => Array.isArray(r) && r.length === 2
    && r.every(Number.isFinite) && r[0] >= .1 && r[1] >= r[0] && r[1] <= 3600;
  const range = r => r[0] + random() * (r[1] - r[0]);
  const definitions = manifest.ambient ?? [];
  if (!Array.isArray(definitions) || definitions.length > 64) throw new TypeError('Invalid ambient rules');
  const ids = new Set();
  const start = world.frame().time;
  const rules = definitions.map(def => {
    if (!def || typeof def.id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,47}$/.test(def.id)
        || ids.has(def.id) || !validRange(def.initial) || !validRange(def.interval)) throw new TypeError('Invalid ambient rule');
    ids.add(def.id);
    return { def: JSON.parse(JSON.stringify(def)), next: start + range(def.initial), serial: 0 };
  });
  let enabled = true;
  function update() {
    const frame = world.frame();
    if (!enabled || frame.environment.paused) return;
    for (const rule of rules) {
      if (frame.time < rule.next) continue;
      const { def } = rule;
      const suitable = (def.maxRain === undefined || frame.environment.rain <= def.maxRain)
        && (!def.hours || (frame.environment.hour >= def.hours[0] && frame.environment.hour <= def.hours[1]));
      if (suitable) world.dispatch({ id: `ambient:${def.id}:${++rule.serial}`,
        object: def.object, action: def.action, args: def.args ?? {} });
      // No catch-up storm after a seek, pause, busy object, or long absence.
      rule.next = frame.time + range(def.interval);
    }
  }
  function setEnabled(value) {
    if (typeof value !== 'boolean') throw new TypeError('Enabled must be boolean');
    if (enabled === value) return;
    enabled = value;
    if (value) {
      const time = world.frame().time;
      for (const rule of rules) rule.next = time + range(rule.def.initial);
    }
  }
  return Object.freeze({ update, setEnabled, get isEnabled() { return enabled; } });
}
