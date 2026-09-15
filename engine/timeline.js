import { sampleKeyframes } from './math.js';

export class TimelineSampler {
  constructor(spec = {}) {
    this.spec = spec;
    this.timelines = Object.values(spec.timelines || {}).map(timeline => ({
      ...timeline,
      sourceName: timeline.source || 'timeline.primary'
    }));
    this.sourceNames = [...new Set(this.timelines.map(timeline => timeline.sourceName))];
    this.lastSourceValues = new Map();
  }

  changedSources(signals, force = false) {
    const changed = new Set();
    for (const sourceName of this.sourceNames) {
      const value = signals.get(sourceName, 0);
      if (force || !this.lastSourceValues.has(sourceName) || !Object.is(this.lastSourceValues.get(sourceName), value)) {
        changed.add(sourceName);
        this.lastSourceValues.set(sourceName, value);
      }
    }
    return changed;
  }

  sample(signals, predicate = null, sourceFilter = null) {
    const commands = [];
    for (const timeline of this.timelines) {
      if (sourceFilter && !sourceFilter.has(timeline.sourceName)) continue;
      const sourceValue = signals.get(timeline.sourceName, 0);
      for (const track of timeline.tracks || []) {
        if (predicate && !predicate(track)) continue;
        const value = sampleKeyframes(track.keyframes || [], sourceValue, track.easing || 'linear');
        if (value === undefined) continue;
        commands.push({
          target: track.target,
          channel: track.channel,
          value,
          attribute: track.attribute,
          path: track.path,
          unit: track.unit || '',
          compose: track.compose || 'replace',
          slot: track.slot
        });
      }
    }
    return commands;
  }
}

export function validateTimelineSpec(spec) {
  const errors = [];
  for (const [timelineId, timeline] of Object.entries(spec.timelines || {})) {
    for (const [index, track] of (timeline.tracks || []).entries()) {
      const prefix = `${timelineId}.tracks[${index}]`;
      if (!track.target) errors.push(`${prefix}: missing target`);
      if (!track.channel) errors.push(`${prefix}: missing channel`);
      if (!Array.isArray(track.keyframes) || track.keyframes.length === 0) {
        errors.push(`${prefix}: keyframes must be a non-empty array`);
        continue;
      }
      let previous = -Infinity;
      for (const [kfIndex, frame] of track.keyframes.entries()) {
        if (typeof frame.at !== 'number') errors.push(`${prefix}.keyframes[${kfIndex}]: at must be numeric`);
        if (frame.at < previous) errors.push(`${prefix}: keyframes must be sorted by at`);
        previous = frame.at;
      }
    }
  }
  return errors;
}
