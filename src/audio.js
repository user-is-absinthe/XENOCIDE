"use strict";
X.Audio = {
  ctx: null,
  voices: 0,
  start() {
    if (!this.ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      const c = (this.ctx = new C());
      this.effects = c.createGain();
      this.limiter = c.createDynamicsCompressor();
      this.limiter.threshold.value = -12;
      this.limiter.knee.value = 6;
      this.limiter.ratio.value = 12;
      this.limiter.attack.value = 0.003;
      this.limiter.release.value = 0.12;
      this.effects.connect(this.limiter);
      this.headroom = c.createGain();
      this.headroom.gain.value = 0.85;
      this.limiter.connect(this.headroom);
      this.headroom.connect(c.destination);
      this.ambient = c.createGain();
      this.ambient.connect(c.destination);
      this.noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const data = this.noise.getChannelData(0),
        rng = new X.RNG(555);
      for (let i = 0; i < data.length; i++) data[i] = rng.next() * 2 - 1;
      for (const f of [43.65, 65.4, 87.3]) {
        const o = c.createOscillator(),
          g = c.createGain();
        o.type = "sine";
        o.frequency.value = f;
        g.gain.value = 0.13;
        o.connect(g);
        g.connect(this.ambient);
        o.start();
      }
      const hum = c.createBufferSource(),
        filter = c.createBiquadFilter(),
        gain = c.createGain();
      hum.buffer = this.noise;
      hum.loop = true;
      filter.type = "lowpass";
      filter.frequency.value = 160;
      gain.gain.value = 0.15;
      hum.connect(filter);
      filter.connect(gain);
      gain.connect(this.ambient);
      hum.start();
      X.Music.start(c);
      this.settings();
    }
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
  },
  settings() {
    if (!this.ctx) return;
    const s = X.profile.settings,
      t = this.ctx.currentTime;
    const setGain = (param, target) => {
      const current = param.value;
      param.cancelScheduledValues(t);
      param.setValueAtTime(target === 0 ? 0 : current, t);
      if (target !== 0) param.linearRampToValueAtTime(target, t + 0.04);
    };
    setGain(this.effects.gain, s.mute ? 0 : s.sfx);
    setGain(this.ambient.gain, s.mute || !s.musicEnabled ? 0 : s.music * 0.15);
    if (X.Music.output)
      setGain(
        X.Music.output.gain,
        s.mute || !s.musicEnabled ? 0 : s.music * 0.65,
      );
  },
  buffers: new Map(),
  lastPlay: new Map(),
  serial: 0,
  play(kind = "bullet", power = 1, mode = false) {
    if (!this.ctx || X.profile.settings.mute || this.voices >= 32) return;
    const c = this.ctx,
      t = c.currentTime,
      interval =
        kind === "enemy"
          ? 0.5
          : kind === "flame"
            ? 0.045
            : kind === "tesla"
              ? 0.055
              : kind === "pickup"
                ? 0.06
                : 0;
    if (t - (this.lastPlay.get(kind) ?? -Infinity) < interval) return;
    this.lastPlay.set(kind, t);
    const variant = this.serial++ % 3,
      key = kind + ":" + mode + ":" + variant;
    let buffer = this.buffers.get(key);
    if (!buffer) {
      buffer = X.SoundDesign.build(c, kind, mode, variant);
      this.buffers.set(key, buffer);
    }
    const source = c.createBufferSource(),
      gain = c.createGain();
    source.buffer = buffer;
    gain.gain.value = Math.min(
      0.32,
      0.2 * Math.sqrt(Math.max(0.35, Math.min(4, power))),
    );
    source.connect(gain);
    gain.connect(this.effects);
    this.voices++;
    source.onended = () => {
      this.voices = Math.max(0, this.voices - 1);
      source.disconnect();
      gain.disconnect();
    };
    source.start();
    return source;
  },
};
