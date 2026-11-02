"use strict";
// Deterministic layered PCM synthesis. Each cached sound needs one playback voice.
X.SoundDesign = {
  recipes() {
    const tone = (freq, end, duration, level, delay = 0, extra = {}) => ({
      type: "tone",
      freq,
      end,
      duration,
      level,
      delay,
      ...extra,
    });
    const noise = (freq, duration, level, delay = 0, extra = {}) => ({
      type: "noise",
      freq,
      duration,
      level,
      delay,
      ...extra,
    });
    return {
      bullet: [
        noise(7200, 0.055, 0.65),
        tone(170, 62, 0.11, 0.42),
        noise(2300, 0.025, 0.22, 0.065),
      ],
      smg: [
        noise(9400, 0.035, 0.46),
        tone(240, 110, 0.055, 0.25),
        tone(1800, 1200, 0.022, 0.09, 0.025),
      ],
      shotgun: [
        noise(4200, 0.14, 0.85),
        tone(105, 34, 0.24, 0.65),
        noise(1800, 0.045, 0.24, 0.12),
        tone(330, 180, 0.05, 0.12, 0.145),
      ],
      rifle: [
        noise(8200, 0.07, 0.7),
        tone(210, 78, 0.12, 0.4),
        noise(3600, 0.025, 0.25, 0.055),
      ],
      machine: [
        noise(3600, 0.1, 0.7),
        tone(125, 43, 0.17, 0.55),
        noise(1200, 0.035, 0.3, 0.065),
      ],
      sniper: [
        noise(11000, 0.04, 0.75),
        tone(155, 38, 0.28, 0.62),
        noise(2900, 0.22, 0.3, 0.035, { decay: 7 }),
        tone(700, 310, 0.05, 0.13, 0.18),
      ],
      flame: [
        // Soft pressurised hiss: no low-frequency thump or sharp ignition click.
        noise(6500, 0.16, 0.18, 0, { band: 1600, attack: 0.025, decay: 2.4 }),
        noise(2400, 0.13, 0.08, 0, { band: 700, attack: 0.03, decay: 2.8 }),
      ],
      plasma: [
        tone(1200, 240, 0.22, 0.3, 0, { attack: 0.004, mod: 31 }),
        tone(2100, 650, 0.09, 0.12),
        noise(5200, 0.045, 0.24),
        tone(170, 100, 0.17, 0.15),
      ],
      // Hollow air launch plus inharmonic, damped spring resonances: a pneumatic "pyn".
      grenade: [
        noise(800, 0.095, 0.55),
        tone(390, 260, 0.32, 0.34, 0, { spring: true, decay: 5 }),
        tone(1070, 730, 0.16, 0.13, 0.009, { spring: true }),
        noise(2900, 0.025, 0.15, 0.018),
      ],
      rail: [
        tone(2400, 430, 0.34, 0.3, 0, { mod: 95 }),
        noise(8500, 0.07, 0.6),
        tone(95, 32, 0.22, 0.4),
        tone(3300, 1500, 0.2, 0.1, 0.025),
      ],
      tesla: [
        {
          type: "electric",
          freq: 7800,
          band: 600,
          duration: 0.19,
          level: 0.58,
          delay: 0,
          decay: 3,
        },
        noise(11000, 0.022, 0.3),
        tone(2100, 700, 0.09, 0.08),
      ],
      // Guide-rail clack, pressure kick, then the noisy whistle of the motor.
      rocket: [
        noise(1800, 0.055, 0.48),
        tone(90, 29, 0.19, 0.5),
        noise(4600, 0.76, 0.48, 0.025, {
          band: 300,
          filterEnd: 1400,
          attack: 0.055,
          decay: 2,
        }),
        tone(1900, 620, 0.64, 0.13, 0.045, { attack: 0.06, decay: 2.5 }),
        noise(2600, 0.022, 0.19, 0.018),
      ],
      blade: [
        noise(5900, 0.16, 0.36, 0, { band: 1200, attack: 0.025, decay: 3 }),
        tone(820, 230, 0.15, 0.16, 0, { mod: 38 }),
        tone(2100, 950, 0.07, 0.06, 0.025),
      ],
      guard: [
        tone(330, 740, 0.2, 0.2, 0, { mod: 50 }),
        noise(4500, 0.045, 0.23),
        tone(1300, 850, 0.16, 0.1, 0.018),
      ],
      parry: [
        tone(2400, 1300, 0.16, 0.3, 0, { spring: true }),
        noise(8200, 0.035, 0.38),
        tone(670, 440, 0.22, 0.13),
      ],
      boom: [
        noise(700, 0.72, 0.9, 0, { filterEnd: 130, decay: 5 }),
        tone(65, 22, 0.6, 0.65),
        noise(3600, 0.09, 0.42),
        noise(1700, 0.32, 0.2, 0.1),
      ],
      pickup: [tone(660, 660, 0.07, 0.16), tone(990, 990, 0.11, 0.16, 0.055)],
      revive: [
        tone(130, 520, 0.8, 0.3, 0, { attack: 0.06, decay: 1.8 }),
        tone(390, 1560, 0.65, 0.13, 0.1, { attack: 0.08, decay: 2 }),
        noise(3000, 0.6, 0.17, 0.04, { attack: 0.12, decay: 2 }),
        tone(1040, 1040, 0.3, 0.13, 0.55, { attack: 0.02 }),
      ],
      menu: [noise(4200, 0.012, 0.15), tone(640, 420, 0.055, 0.12)],
      reload: [
        noise(1800, 0.045, 0.32),
        noise(3300, 0.035, 0.28, 0.13),
        tone(420, 210, 0.06, 0.13, 0.16),
        noise(6600, 0.025, 0.2, 0.24),
      ],
      dash: [
        noise(5600, 0.23, 0.45, 0, {
          band: 650,
          filterEnd: 800,
          attack: 0.012,
          decay: 3,
        }),
        tone(240, 70, 0.18, 0.17),
      ],
      hurt: [
        noise(1800, 0.1, 0.42),
        tone(115, 48, 0.22, 0.36, 0, { mod: 23 }),
        noise(600, 0.2, 0.18, 0.02),
      ],
      enemy: [
        tone(150, 65, 0.34, 0.27, 0, { mod: 43 }),
        noise(1600, 0.3, 0.4, 0, { band: 180, attack: 0.02 }),
        tone(310, 110, 0.24, 0.1),
      ],
      flameAlt: [
        noise(1100, 0.2, 0.6),
        tone(110, 40, 0.26, 0.38),
        noise(4200, 0.38, 0.35, 0.04, { band: 300, attack: 0.035, decay: 3 }),
      ],
      plasmaAlt: [
        tone(400, 1300, 0.15, 0.2, 0, { attack: 0.01 }),
        tone(900, 120, 0.38, 0.38, 0.05, { mod: 49 }),
        noise(6000, 0.1, 0.32, 0.07),
        tone(110, 45, 0.28, 0.25, 0.06),
      ],
      teslaAlt: [
        {
          type: "electric",
          freq: 10000,
          band: 900,
          duration: 0.17,
          level: 0.58,
          delay: 0,
          mod: 115,
          decay: 2.8,
        },
        tone(1400, 550, 0.1, 0.12),
        noise(8000, 0.02, 0.25),
      ],
    };
  },
  build(ctx, kind, mode = false, variant = 0) {
    this.profiles ||= this.recipes();
    const alt = mode === true,
      key =
        kind === "blade" && alt
          ? "guard"
          : alt && this.profiles[kind + "Alt"]
            ? kind + "Alt"
            : kind,
      layers = this.profiles[key] || this.profiles.bullet,
      duration =
        Math.max(...layers.map((l) => (l.delay || 0) + l.duration)) + 0.025,
      rate = ctx.sampleRate,
      buffer = ctx.createBuffer(1, Math.ceil(duration * rate), rate),
      data = buffer.getChannelData(0);
    let seed = 2179 + variant * 7919;
    for (const char of key)
      seed = (Math.imul(seed, 31) + char.charCodeAt(0)) >>> 0;
    const rng = new X.RNG(seed),
      variation = 1 + (variant - 1) * 0.018;
    const energyReload =
        kind === "reload" && ["plasma", "tesla", "rail"].includes(mode),
      heavyReload =
        kind === "reload" &&
        ["shotgun", "grenade", "rocket", "machine"].includes(mode),
      pitch =
        variation * (energyReload ? 1.55 : heavyReload ? 0.75 : alt ? 0.94 : 1);
    for (const layer of layers) {
      const start = Math.floor((layer.delay || 0) * rate),
        count = Math.floor(layer.duration * rate),
        attack = layer.attack || 0.0015,
        decay = layer.decay || 5,
        freq = (layer.freq || 100) * pitch,
        end = (layer.end || layer.freq || 100) * pitch,
        a0 = 1 - Math.exp((-Math.PI * 2 * Math.min(rate * 0.45, freq)) / rate),
        a1 =
          1 -
          Math.exp(
            (-Math.PI *
              2 *
              Math.min(
                rate * 0.45,
                (layer.filterEnd || layer.freq || 100) * pitch,
              )) /
              rate,
          ),
        lowA = 1 - Math.exp((-Math.PI * 2 * (layer.band || 0)) / rate);
      let low = 0,
        high = 0;
      for (let i = 0; i < count; i++) {
        const t = i / rate,
          u = t / layer.duration,
          envelope =
            Math.min(1, t / attack) *
            Math.exp(-decay * u) *
            Math.min(1, (layer.duration - t) / 0.012);
        let value;
        if (layer.type === "noise" || layer.type === "electric") {
          const white = rng.next() * 2 - 1;
          high += (a0 + (a1 - a0) * u) * (white - high);
          low += lowA * (white - low);
          value = layer.band ? (high - low) * 1.8 : high;
          if (layer.type === "electric") {
            const gate =
              Math.sin(
                Math.PI * 2 * (layer.mod || 73) * t + Math.sin(t * 81) * 1.4,
              ) > 0.15
                ? 1
                : 0.08;
            value =
              value * gate +
              Math.sin(t * Math.PI * 2 * 98 + Math.sin(t * 9500) * 2) *
                0.14 *
                gate;
          }
        } else {
          const phase =
              Math.PI *
              2 *
              (freq * t + ((end - freq) * t * t) / (2 * layer.duration)),
            wobble = layer.spring
              ? 1.3 * Math.sin(t * 235) * Math.exp(-t * 20)
              : 0;
          value = Math.sin(phase + wobble);
          if (layer.spring)
            value =
              value * 0.7 +
              Math.sin(phase * 2.73) * 0.2 +
              Math.sin(phase * 4.91) * 0.1;
          if (layer.mod)
            value *= 0.55 + 0.45 * Math.sin(Math.PI * 2 * layer.mod * t);
        }
        data[start + i] += value * envelope * layer.level;
      }
    }
    // Gentle saturation contains transients; final fade prevents buffer-end clicks.
    const fade = Math.ceil(rate * 0.008);
    for (let i = 0; i < data.length; i++)
      data[i] =
        Math.tanh(data[i] * 1.6) *
        0.78 *
        Math.min(1, (data.length - 1 - i) / fade);
    return buffer;
  },
};
