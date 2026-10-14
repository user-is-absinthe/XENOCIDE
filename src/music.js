"use strict";
// Небольшой процедурный синтезатор: минорные гармонии, арпеджио, бас и ударные.
// Свой RNG и отдельная шина громкости: музыка не влияет на игровой баланс.
X.Music = {
  ctx: null,
  output: null,
  timer: null,
  voices: 0,
  step: 0,
  nextTime: 0,
  scheduled: 0,
  start(ctx) {
    if (this.ctx) return;
    this.ctx = ctx;
    this.output = ctx.createGain();
    this.output.connect(ctx.destination);
    this.output.gain.value = 0;
    this.rng = new X.RNG(0x58e0c1de);
    this.nextTime = ctx.currentTime + 0.08;
    this.timer = setInterval(() => this.tick(), 100);
  },
  tick() {
    if (!this.ctx || this.ctx.state !== "running") return;
    const s = X.profile.settings,
      now = this.ctx.currentTime;
    if (s.mute || !s.musicEnabled) {
      this.nextTime = now + 0.08;
      return;
    }
    if (this.nextTime < now) this.nextTime = now + 0.04;
    let budget = 0;
    while (this.nextTime < now + 0.3 && budget++ < 8) {
      const intensity =
        X.game?.state === "play"
          ? Math.min(1, 0.25 + X.game.wave * 0.065)
          : 0.15;
      this.scheduleStep(this.nextTime, this.step++, intensity);
      this.nextTime += 60 / 104 / 4;
    }
  },
  note(time, midi, duration, volume, wave = "triangle") {
    if (this.voices >= 24) return;
    const c = this.ctx,
      o = c.createOscillator(),
      g = c.createGain(),
      f = c.createBiquadFilter();
    o.type = wave;
    o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
    f.type = "lowpass";
    f.frequency.value = wave === "sine" ? 800 : 1500;
    o.connect(f);
    f.connect(g);
    g.connect(this.output);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(volume, time + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    o.start(time);
    o.stop(time + duration + 0.03);
    this.voices++;
    this.scheduled++;
    o.onended = () => {
      this.voices--;
      o.disconnect();
      f.disconnect();
      g.disconnect();
    };
  },
  drum(time, kind, volume) {
    const c = this.ctx,
      g = c.createGain();
    g.connect(this.output);
    if (kind === "kick") {
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(125, time);
      o.frequency.exponentialRampToValueAtTime(38, time + 0.16);
      o.connect(g);
      g.gain.setValueAtTime(volume, time);
      g.gain.exponentialRampToValueAtTime(0.0001, time + 0.2);
      o.start(time);
      o.stop(time + 0.22);
      o.onended = () => {
        o.disconnect();
        g.disconnect();
      };
    } else {
      const n = c.createBufferSource(),
        f = c.createBiquadFilter();
      n.buffer = X.Audio.noise;
      f.type = "highpass";
      f.frequency.value = kind === "hat" ? 6000 : 1300;
      n.connect(f);
      f.connect(g);
      const duration = kind === "hat" ? 0.045 : 0.14;
      g.gain.setValueAtTime(volume, time);
      g.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      n.start(time);
      n.stop(time + duration + 0.01);
      n.onended = () => {
        n.disconnect();
        f.disconnect();
        g.disconnect();
      };
    }
    this.scheduled++;
  },
  scheduleStep(time, step, intensity) {
    const bar = Math.floor(step / 16),
      beat = step % 16,
      root = 38 + [0, 8, 5, 10][Math.floor(bar / 2) % 4];
    if (beat % 4 === 0)
      this.note(time, root + (beat === 8 ? 12 : 0), 0.45, 0.16, "sine");
    const motif = [0, 7, 12, 3, 10, 7, 15, 12],
      index = (Math.floor(step / 2) + Math.floor(bar / 4)) % motif.length;
    if (beat % 2 === 0 && (this.rng.next() > 0.18 || beat === 0))
      this.note(
        time,
        root + 24 + motif[index],
        0.24,
        0.045 + intensity * 0.025,
      );
    if (beat === 0 && bar % 2 === 0)
      for (const n of [0, 3, 7])
        this.note(time, root + 12 + n, 0.95, 0.025, "sine");
    if (beat % 8 === 0 || (intensity > 0.6 && beat === 11))
      this.drum(time, "kick", 0.13);
    if (beat === 4 || beat === 12)
      this.drum(time, "snare", 0.035 + intensity * 0.025);
    if (beat % 2 === 0 && this.rng.next() > 0.15)
      this.drum(time, "hat", 0.018 + intensity * 0.01);
  },
};
