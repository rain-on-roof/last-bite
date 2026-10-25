// Every sound is synthesised, so the game ships with no audio files. The
// context only starts after the first user gesture, as browsers require.
export function createAudio() {
  let ctx = null;
  let master = null;
  let noise = null;
  let muted = false;
  let ambience = null;

  function unlock() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.8;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    master.connect(comp).connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    startAmbience();
  }

  function env(gain, t, attack, peak, decay) {
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  function noiseBurst({ t, dur, type, freq, q = 1, peak = 0.5, attack = 0.004, rate = 1 }) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.playbackRate.value = rate;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    env(g, t, attack, peak, dur);
    src.connect(f).connect(g).connect(master);
    src.start(t, Math.random() * 0.5, attack + dur + 0.05);
    return { src, f, g };
  }

  function tone({ t, type = 'sine', from, to = from, dur, peak = 0.3, attack = 0.005, dest = master }) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    env(g, t, attack, peak, dur);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + attack + dur + 0.05);
    return o;
  }

  const SOUNDS = {
    bite(t) {
      noiseBurst({ t, dur: 0.06, type: 'bandpass', freq: 2200 + Math.random() * 1400, q: 1.4, peak: 0.55 });
      noiseBurst({ t: t + 0.045, dur: 0.05, type: 'bandpass', freq: 1500 + Math.random() * 900, q: 1.2, peak: 0.35 });
      noiseBurst({ t: t + 0.09, dur: 0.07, type: 'lowpass', freq: 700, q: 0.7, peak: 0.25 });
    },
    step(t) {
      tone({ t, from: 120, to: 60, dur: 0.07, peak: 0.25 });
      noiseBurst({ t, dur: 0.04, type: 'lowpass', freq: 500, peak: 0.12 });
    },
    tell(t) {
      // A rising hiss.
      const { g } = noiseBurst({ t, dur: 0.55, type: 'highpass', freq: 3200, q: 0.6, peak: 0.32, attack: 0.18 });
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.32, t + 0.25);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    },
    fakeout(t) {
      honkVoice(t, 260, 210, 0.16, 0.22);
    },
    innocent(t) {
      // A smug little whistle.
      tone({ t, from: 1250, to: 1650, dur: 0.16, peak: 0.12 });
      tone({ t: t + 0.2, from: 1650, to: 1180, dur: 0.22, peak: 0.12 });
    },
    sandwich(t) {
      [660, 880, 1320].forEach((f, i) => tone({ t: t + i * 0.07, type: 'triangle', from: f, dur: 0.18, peak: 0.18 }));
    },
    strike(t) {
      // Impact: a bass drop and a crack, while the screen freezes.
      tone({ t, from: 150, to: 32, dur: 0.8, peak: 0.95, attack: 0.004 });
      tone({ t, type: 'triangle', from: 90, to: 40, dur: 0.5, peak: 0.5 });
      noiseBurst({ t, dur: 0.22, type: 'lowpass', freq: 1400, peak: 0.9 });
      // The HONK itself lands with the cut-in, then echoes off the park.
      const h = t + 0.2;
      honkVoice(h, 420, 250, 0.85, 1.0, 9);
      honkVoice(h + 0.02, 840, 500, 0.7, 0.28, 11);
      honkVoice(h + 0.95, 400, 260, 0.38, 0.38, 7);
      honkVoice(h + 1.32, 400, 260, 0.3, 0.16, 7);
      for (let i = 0; i < 8; i++) noiseBurst({ t: h + 0.05 + i * 0.08, dur: 0.05, type: 'bandpass', freq: 600, q: 0.8, peak: 0.28 });
    },
    close(t) {
      // A whoosh for the dodge and a bright ding for the bonus.
      const { f } = noiseBurst({ t, dur: 0.35, type: 'bandpass', freq: 600, q: 1.2, peak: 0.35, attack: 0.05 });
      f.frequency.setValueAtTime(500, t);
      f.frequency.exponentialRampToValueAtTime(3500, t + 0.35);
      [1320, 1760, 2640].forEach((fr, i) => tone({ t: t + 0.08 + i * 0.06, type: 'triangle', from: fr, dur: 0.25, peak: 0.16 }));
      SOUNDS.innocent(t + 0.3);
    },
    ui(t) {
      tone({ t, type: 'triangle', from: 520, to: 780, dur: 0.07, peak: 0.15 });
    },
  };

  // Two detuned saws through a nasal band: close enough to a goose.
  function honkVoice(t, from, to, dur, peak, wobble = 0) {
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1100;
    band.Q.value = 2.2;
    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i / 128) - 1;
      curve[i] = Math.tanh(x * 3);
    }
    shaper.curve = curve;
    const g = ctx.createGain();
    env(g, t, 0.02, peak, dur);
    shaper.connect(band).connect(g).connect(master);
    for (const detune of [0, 9, -7]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.detune.value = detune;
      o.frequency.setValueAtTime(from, t);
      o.frequency.linearRampToValueAtTime(from * 1.08, t + dur * 0.2);
      o.frequency.exponentialRampToValueAtTime(to, t + dur);
      if (wobble) {
        // A ragged vibrato: the difference between a beep and a goose.
        const lfo = ctx.createOscillator();
        const depth = ctx.createGain();
        lfo.frequency.value = wobble + Math.random() * 3;
        depth.gain.value = from * 0.06;
        lfo.connect(depth).connect(o.frequency);
        lfo.start(t);
        lfo.stop(t + dur + 0.1);
      }
      o.connect(shaper);
      o.start(t);
      o.stop(t + dur + 0.1);
    }
  }

  function startAmbience() {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 380;
    const g = ctx.createGain();
    g.gain.value = 0.05;
    src.connect(f).connect(g).connect(master);
    src.start();
    ambience = setInterval(() => {
      if (!ctx || muted || document.hidden) return;
      const t = ctx.currentTime;
      const base = 2600 + Math.random() * 1600;
      const n = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) tone({ t: t + i * 0.11, from: base, to: base * 1.3, dur: 0.06, peak: 0.035 });
    }, 2600);
  }

  return {
    unlock,
    play(name) {
      if (!ctx || muted || !SOUNDS[name]) return;
      SOUNDS[name](ctx.currentTime + 0.005);
    },
    setMuted(value) {
      muted = value;
      if (master) master.gain.setTargetAtTime(muted ? 0 : 0.8, ctx.currentTime, 0.03);
    },
    get muted() {
      return muted;
    },
    stop() {
      clearInterval(ambience);
    },
  };
}
