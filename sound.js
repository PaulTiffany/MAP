// Synthesized atmosphere and fauna approximations, not field recordings or
// species-identification audio. start() must follow an explicit user gesture.
// Fauna cues come from the scene clock; there is deliberately no bird timer.
export function createSoundscape() {
  let context, bus, output, rainGain, leafGain, insectGain, pendingFade;
  let suspendInFlight;
  let revision = 0;
  let destroyed = false;
  let wantedRunning = false;
  let active = true;
  let volume = 0.45;
  let environment = { hour: 8, rain: 0, wind: 0.3 };
  let lastCueTime = -Infinity;
  const lastKindTime = { parrot: -Infinity, insect: -Infinity };
  const nodes = new Set();
  const sources = new Set();
  const voices = new Set();
  const seen = new Map();
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

  function own(node) {
    nodes.add(node);
    return node;
  }

  function smooth(parameter, value, seconds = 0.45) {
    const now = context.currentTime;
    if (parameter.cancelAndHoldAtTime) parameter.cancelAndHoldAtTime(now);
    else {
      const current = parameter.value;
      parameter.cancelScheduledValues(now);
      parameter.setValueAtTime(current, now);
    }
    parameter.setTargetAtTime(value, now, seconds);
  }

  function cancelFade() {
    if (!pendingFade) return;
    clearTimeout(pendingFade.timer);
    pendingFade.resolve(false);
    pendingFade = undefined;
  }

  function releaseVoice(voice) {
    if (!voices.delete(voice)) return;
    voice.source.onended = null;
    sources.delete(voice.source);
    for (const node of voice.nodes) {
      node.disconnect();
      nodes.delete(node);
    }
  }

  function cancelVoices() {
    for (const voice of [...voices]) {
      // Disconnect even in a suspended context: no unfinished call can return
      // after the visitor enables sound or resumes the scene.
      try { voice.source.stop(); } catch { /* Already completed. */ }
      releaseVoice(voice);
    }
  }

  function releaseNodes() {
    cancelVoices();
    for (const source of sources) {
      source.onended = null;
      try { source.stop(); } catch { /* Already stopped. */ }
    }
    for (const node of nodes) node.disconnect();
    sources.clear();
    nodes.clear();
  }

  function noiseBuffer(seconds) {
    const buffer = context.createBuffer(2, Math.floor(context.sampleRate * seconds), context.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const samples = buffer.getChannelData(channel);
      let low = 0;
      for (let i = 0; i < samples.length; i++) {
        const white = Math.random() * 2 - 1;
        low = (low + white * 0.035) / 1.035;
        samples[i] = low * 2.8 + white * 0.09;
      }
      const overlap = Math.floor(context.sampleRate * 0.08);
      for (let i = 0; i < overlap; i++) {
        const blend = i / overlap;
        const index = samples.length - overlap + i;
        samples[index] = samples[index] * (1 - blend) + samples[i] * blend;
      }
    }
    return buffer;
  }

  function noiseLayer(buffer, highpass, lowpass, level) {
    const source = own(context.createBufferSource());
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = 0.08;
    const low = own(context.createBiquadFilter());
    low.type = 'lowpass';
    low.frequency.value = lowpass;
    low.Q.value = 0.45;
    const high = own(context.createBiquadFilter());
    high.type = 'highpass';
    high.frequency.value = highpass;
    high.Q.value = 0.45;
    const gain = own(context.createGain());
    gain.gain.value = level;
    source.connect(high).connect(low).connect(gain).connect(bus);
    sources.add(source);
    source.start(0, 0.08 + Math.random() * (buffer.duration - 0.08));
    return gain;
  }

  function breathe(gain, speed, depth) {
    const oscillator = own(context.createOscillator());
    const amount = own(context.createGain());
    oscillator.frequency.value = speed;
    amount.gain.value = depth;
    oscillator.connect(amount).connect(gain.gain);
    sources.add(oscillator);
    oscillator.start();
  }

  function applyEnvironment() {
    if (!context || destroyed) return;
    const { hour, rain, wind } = environment;
    // A gentle rise toward evening, rather than a pitched repeating cricket.
    const night = 0.5 - 0.5 * Math.cos((hour - 12) * Math.PI / 12);
    smooth(rainGain.gain, rain * 0.2, 1.6);
    smooth(leafGain.gain, 0.042 + wind * 0.08, 1.8);
    smooth(insectGain.gain, (0.022 + night * 0.045) * (1 - rain * 0.65), 2.5);
  }

  function initialize() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error('Web Audio is not supported in this browser.');
    try {
      context = new AudioContextClass();
      lastCueTime = lastKindTime.parrot = lastKindTime.insect = -Infinity;
      seen.clear();
      bus = own(context.createGain());
      output = own(context.createGain());
      output.gain.value = 0;
      const compressor = own(context.createDynamicsCompressor());
      compressor.threshold.value = -18;
      compressor.knee.value = 12;
      compressor.ratio.value = 8;
      compressor.attack.value = 0.005;
      compressor.release.value = 0.24;
      bus.connect(compressor).connect(output).connect(context.destination);
      const noise = noiseBuffer(8);
      const stream = noiseLayer(noise, 140, 1850, 0.32);
      breathe(stream, 0.075, 0.027);
      leafGain = noiseLayer(noise, 550, 2700, 0.06);
      breathe(leafGain, 0.041, 0.016);
      rainGain = noiseLayer(noise, 850, 4200, 0);
      insectGain = noiseLayer(noise, 3300, 6800, 0.025);
      breathe(insectGain, 0.19, 0.004);
      applyEnvironment();
    } catch (error) {
      releaseNodes();
      const failedContext = context;
      context = undefined;
      if (failedContext && failedContext.state !== 'closed') failedContext.close().catch(() => {});
      throw error;
    }
  }

  function randomFor(id) {
    let seed = 2166136261;
    for (const character of String(id)) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
    return () => {
      seed = Math.imul(seed, 1664525) + 1013904223 | 0;
      return (seed >>> 0) / 4294967296;
    };
  }

  function callBuffer(kind, id) {
    const random = randomFor(id);
    const parrot = kind === 'parrot';
    const duration = parrot ? 0.84 + random() * 0.36 : 0.38 + random() * 0.2;
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
    const samples = buffer.getChannelData(0);
    const base = parrot ? 1400 + random() * 450 : 4200 + random() * 900;
    const syllables = parrot ? 2 + Math.floor(random() * 2) : 4;
    let phase = 0;
    let rough = 0;
    let previousNoise = 0;
    // Soft breathy onset, uneven pitch, harmonics, and rasp prevent a clean
    // musical/beep contour. This only suggests a distant grey-parrot-like call.
    for (let i = 0; i < samples.length; i++) {
      const time = i / context.sampleRate;
      const position = time / duration;
      const syllable = Math.min(syllables - 1, Math.floor(position * syllables));
      const local = position * syllables - syllable;
      const envelope = Math.pow(Math.max(0, Math.sin(Math.PI * local)), parrot ? 1.7 : 4);
      const fade = Math.min(1, time / 0.055, (duration - time) / 0.09);
      const white = random() * 2 - 1;
      rough = rough * 0.93 + white * 0.07;
      const pitch = base * (1 + 0.13 * Math.sin(local * Math.PI)
        - 0.13 * local - syllable * 0.035 + 0.025 * Math.sin(time * 97) + rough * 0.08);
      phase += Math.PI * 2 * pitch / context.sampleRate;
      const rasp = white - previousNoise * 0.75;
      previousNoise = white;
      const wavering = 0.8 + 0.14 * Math.sin(time * 163) + rough * 0.5;
      const tone = Math.sin(phase) * 0.55 + Math.sin(phase * 2 + 0.4) * 0.11
        + Math.sin(phase * 3) * 0.045;
      samples[i] = (tone * wavering + rasp * (parrot ? 0.15 : 0.23)) * envelope * fade;
    }
    return buffer;
  }

  function cue({ id, kind = 'parrot', pan = 0, distance = 0.65, strength = 0.65 } = {}) {
    if (destroyed || !active || !wantedRunning || !context || context.state !== 'running') return false;
    if ((typeof id !== 'string' && typeof id !== 'number') || String(id).length === 0) return false;
    if (kind !== 'parrot' && kind !== 'insect') return false;
    const key = kind + ':' + id;
    const now = context.currentTime;
    if (seen.has(key)) return false;
    // A rejected cue is consumed, never held for later or piled up on resume.
    seen.set(key, now);
    if (seen.size > 128) seen.delete(seen.keys().next().value);
    if (voices.size >= 3 || now - lastCueTime < 0.8
      || now - lastKindTime[kind] < (kind === 'parrot' ? 3 : 1.5)) return false;
    const range = Number.isFinite(distance) ? clamp(distance, 0.22, 1) : 0.65;
    const level = Number.isFinite(strength) ? clamp(strength) : 0.65;
    if (level === 0) return false;
    const source = own(context.createBufferSource());
    const lowpass = own(context.createBiquadFilter());
    lowpass.type = 'lowpass';
    lowpass.Q.value = 0.45;
    lowpass.frequency.value = (kind === 'parrot' ? 5700 : 7500) * (1 - range * 0.47);
    const gain = own(context.createGain());
    // Calls remain in the forest, never a full-volume foreground closeup.
    gain.gain.value = (kind === 'parrot' ? 0.11 : 0.045) * level / (1 + range * 2.8);
    const voiceNodes = [source, lowpass, gain];
    source.buffer = callBuffer(kind, key);
    source.connect(lowpass).connect(gain);
    if (typeof context.createStereoPanner === 'function') {
      const panner = own(context.createStereoPanner());
      panner.pan.value = Number.isFinite(pan) ? clamp(pan, -0.8, 0.8) : 0;
      gain.connect(panner).connect(bus);
      voiceNodes.push(panner);
    } else gain.connect(bus);
    const voice = { source, nodes: voiceNodes };
    voices.add(voice);
    sources.add(source);
    source.onended = () => releaseVoice(voice);
    lastCueTime = now;
    lastKindTime[kind] = now;
    source.start(now);
    return true;
  }

  async function start() {
    if (destroyed) return false;
    wantedRunning = true;
    const request = ++revision;
    cancelFade();
    try {
      if (context?.state === 'closed') {
        releaseNodes();
        context = undefined;
      }
      if (!context) initialize();
      if (suspendInFlight) await suspendInFlight;
      if (destroyed || request !== revision) return false;
      await context.resume();
    } catch (error) {
      if (destroyed || request !== revision) return false;
      wantedRunning = false;
      cancelVoices();
      if (context && output) output.gain.value = 0;
      throw error;
    }
    if (destroyed || request !== revision) {
      if (!destroyed && !wantedRunning) await suspendContext();
      return false;
    }
    if (context.state !== 'running') {
      wantedRunning = false;
      return false;
    }
    smooth(output.gain, volume * 0.72, 0.55);
    return true;
  }

  async function suspendContext() {
    if (suspendInFlight) return suspendInFlight;
    const pending = context.suspend().catch(() => {});
    suspendInFlight = pending;
    await pending;
    if (suspendInFlight === pending) suspendInFlight = undefined;
  }

  async function stop() {
    wantedRunning = false;
    const request = ++revision;
    cancelFade();
    cancelVoices();
    if (!context || destroyed) return true;
    if (context.state !== 'running') {
      output.gain.cancelScheduledValues(context.currentTime);
      output.gain.setValueAtTime(0, context.currentTime);
      return true;
    }
    smooth(output.gain, 0, 0.12);
    return new Promise((resolve) => {
      const timer = setTimeout(async () => {
        pendingFade = undefined;
        if (request !== revision || destroyed) return resolve(false);
        await suspendContext();
        resolve(request === revision && context.state === 'suspended');
      }, 850);
      pendingFade = { timer, resolve };
    });
  }

  function setEnvironment(next = {}) {
    if (destroyed) return;
    const nextEnvironment = { ...environment };
    if (Number.isFinite(next.hour)) nextEnvironment.hour = ((next.hour % 24) + 24) % 24;
    if (Number.isFinite(next.rain)) nextEnvironment.rain = clamp(next.rain);
    if (Number.isFinite(next.wind)) nextEnvironment.wind = clamp(next.wind);
    environment = nextEnvironment;
    applyEnvironment();
  }

  function setRain(value) {
    setEnvironment({ rain: value });
  }

  function setVolume(value) {
    if (destroyed || !Number.isFinite(value)) return;
    volume = clamp(value);
    if (context && wantedRunning) smooth(output.gain, volume * 0.72, 0.18);
  }

  function setActive(value) {
    active = Boolean(value);
    if (!active) cancelVoices();
  }

  async function destroy() {
    if (destroyed) return;
    destroyed = true;
    wantedRunning = false;
    revision++;
    cancelFade();
    releaseNodes();
    seen.clear();
    if (context && context.state !== 'closed') await context.close().catch(() => {});
  }

  return { start, stop, setRain, setEnvironment, cue, setActive, setVolume, destroy };
}
