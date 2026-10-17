"use strict";
X.Audio = {
  ctx: null,
  voices: 0,
  lastEnemy: 0,
  start() {
    if (!this.ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      const c = (this.ctx = new C());
      this.effects = c.createGain();
      this.effects.connect(c.destination);
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
  play(kind = "bullet", power = 1) {
    if (!this.ctx || X.profile.settings.mute || this.voices >= 32) return;
    const c = this.ctx,
      t = c.currentTime;
    if (kind === "enemy" && t - this.lastEnemy < 0.8) return;
    if (kind === "enemy") this.lastEnemy = t;
    const types = {
      bullet: [360, 70, 0.12, "square", 0.4],
      smg: [290, 90, 0.07, "square", 0.3],
      shotgun: [140, 30, 0.25, "sawtooth", 0.9],
      rifle: [270, 55, 0.12, "square", 0.6],
      machine: [100, 40, 0.15, "sawtooth", 0.8],
      sniper: [600, 45, 0.3, "sawtooth", 0.75],
      flame: [90, 60, 0.09, "triangle", 0.9],
      plasma: [700, 180, 0.22, "sine", 0.15],
      grenade: [180, 45, 0.2, "triangle", 0.6],
      rail: [1200, 80, 0.45, "sawtooth", 0.3],
      tesla: [1100, 250, 0.17, "sawtooth", 0.2],
      rocket: [100, 25, 0.5, "sawtooth", 0.9],
      blade: [600, 120, 0.2, "triangle", 0.2],
      boom: [80, 20, 0.6, "sine", 1],
      pickup: [600, 1300, 0.15, "sine", 0],
      revive: [160, 1600, 0.8, "sine", 0.08],
      menu: [420, 700, 0.07, "sine", 0],
      reload: [200, 130, 0.16, "triangle", 0.35],
      dash: [400, 80, 0.2, "sine", 0.5],
      hurt: [130, 30, 0.18, "sawtooth", 0.4],
      enemy: [180, 45, 0.3, "sawtooth", 0.55],
    };
    const [freq, end, duration, wave, noise] = types[kind] || types.bullet,
      g = c.createGain(),
      o = c.createOscillator();
    g.connect(this.effects);
    o.connect(g);
    o.type = wave;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(end, t + duration);
    g.gain.setValueAtTime(
      Math.min(0.14, 0.035 * Math.sqrt(Math.max(0.3, power))),
      t,
    );
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    this.voices++;
    o.onended = () => {
      this.voices--;
      o.disconnect();
      g.disconnect();
    };
    o.start(t);
    o.stop(t + duration + 0.02);
    if (noise) {
      const source = c.createBufferSource(),
        filter = c.createBiquadFilter(),
        ng = c.createGain();
      source.buffer = this.noise;
      filter.type = "lowpass";
      filter.frequency.value =
        kind === "flame" ? 1200 : kind === "boom" ? 450 : 3000;
      source.connect(filter);
      filter.connect(ng);
      ng.connect(this.effects);
      ng.gain.setValueAtTime(noise * 0.055, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + duration);
      source.start(t);
      source.stop(t + duration);
      source.onended = () => {
        source.disconnect();
        filter.disconnect();
        ng.disconnect();
      };
    }
  },
};
