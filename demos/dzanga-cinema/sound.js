// A quiet, synthesized atmosphere; these are not field recordings.
// The caller must invoke start() from an explicit user gesture.
export function createSoundscape() {
  let context, output, rainGain, chirpTimer, pendingFade;
  let revision = 0;
  let destroyed = false;
  let wantedRunning = false;
  let rain = 0;
  const nodes = new Set();
  const sources = new Set();

  function own(node) {
    nodes.add(node);
    return node;
  }

  function smooth(parameter, value, seconds = 0.45) {
    const now = context.currentTime;
    // Holding the instantaneous value also makes rapid toggles click-free.
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

  function noiseBuffer(seconds) {
    const buffer = context.createBuffer(2, context.sampleRate * seconds, context.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const samples = buffer.getChannelData(channel);
      let low = 0;
      for (let i = 0; i < samples.length; i++) {
        const white = Math.random() * 2 - 1;
        low = (low + white * 0.035) / 1.035;
        samples[i] = low * 2.8 + white * 0.09;
      }
      // Match the ends without a silent gap in the looping atmosphere.
      const overlap = Math.floor(context.sampleRate * 0.08);
      for (let i = 0; i < overlap; i++) {
        const blend = i / overlap;
        const index = samples.length - overlap + i;
        samples[index] = samples[index] * (1 - blend) + samples[i] * blend;
      }
    }
    return buffer;
  }

  function noiseLayer(buffer, highpass, lowpass, volume) {
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
    gain.gain.value = volume;
    source.connect(high).connect(low).connect(gain).connect(output);
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

  function initialize() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error('Web Audio is not supported in this browser.');
    context = new AudioContextClass();
    output = own(context.createGain());
    output.gain.value = 0;
    output.connect(context.destination);
    const noise = noiseBuffer(8);
    const stream = noiseLayer(noise, 140, 1850, 0.32);
    breathe(stream, 0.075, 0.032);
    const leaves = noiseLayer(noise, 550, 2700, 0.075);
    breathe(leaves, 0.041, 0.032);
    rainGain = noiseLayer(noise, 850, 4200, 0.02 + rain * 0.19);
  }

  function chirp() {
    if (destroyed || context.state !== 'running' || Math.random() > 0.13) return;
    const now = context.currentTime;
    const pitch = 2450 + Math.random() * 1100;
    const oscillator = own(context.createOscillator());
    const envelope = own(context.createGain());
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(pitch, now);
    oscillator.frequency.exponentialRampToValueAtTime(pitch * 0.92, now + 0.14);
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(0.002, now + 0.018);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    envelope.gain.linearRampToValueAtTime(0, now + 0.15);
    oscillator.connect(envelope).connect(output);
    sources.add(oscillator);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
      sources.delete(oscillator);
      nodes.delete(oscillator);
      nodes.delete(envelope);
    };
    oscillator.start(now);
    oscillator.stop(now + 0.17);
  }

  async function start() {
    if (destroyed) return false;
    wantedRunning = true;
    const request = ++revision;
    cancelFade();
    if (!context) initialize();
    try {
      await context.resume();
    } catch (error) {
      if (destroyed || request !== revision) return false;
      throw error;
    }
    if (destroyed || request !== revision) {
      if (!destroyed && !wantedRunning) await context.suspend().catch(() => {});
      return false;
    }
    smooth(output.gain, 0.75, 0.55);
    if (!chirpTimer) chirpTimer = setInterval(chirp, 1300);
    return true;
  }

  async function stop() {
    wantedRunning = false;
    const request = ++revision;
    clearInterval(chirpTimer);
    chirpTimer = undefined;
    cancelFade();
    if (!context || destroyed || context.state !== 'running') return true;
    smooth(output.gain, 0, 0.12);
    return new Promise((resolve) => {
      const timer = setTimeout(async () => {
        pendingFade = undefined;
        if (request !== revision || destroyed) return resolve(false);
        try {
          await context.suspend();
          resolve(request === revision);
        } catch {
          resolve(false);
        }
      }, 850);
      pendingFade = { timer, resolve };
    });
  }

  function setRain(value) {
    if (!Number.isFinite(value)) return;
    rain = Math.min(1, Math.max(0, value));
    if (context && !destroyed) smooth(rainGain.gain, 0.02 + rain * 0.19, 1);
  }

  async function destroy() {
    if (destroyed) return;
    destroyed = true;
    revision++;
    cancelFade();
    clearInterval(chirpTimer);
    for (const source of sources) {
      source.onended = null;
      try { source.stop(); } catch { /* A completed chirp is already stopped. */ }
    }
    for (const node of nodes) node.disconnect();
    sources.clear();
    nodes.clear();
    if (context && context.state !== 'closed') await context.close().catch(() => {});
  }

  return { start, stop, setRain, destroy };
}
