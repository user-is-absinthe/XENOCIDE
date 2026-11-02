"use strict";
X.Render = {
  canvas: document.getElementById("game"),
  sprites: [],
  floor: null,
  projectileSprite(type, frame) {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 32;
    const g = c.getContext("2d"),
      phase = (frame / 16) * Math.PI * 2;
    if (type === "fire") {
      // Cooler smoke sits behind turbulent orange lobes and the hot fuel core.
      for (let i = 0; i < 3; i++) {
        const x = 7 + i * 8,
          y = 12 + Math.sin(phase + i) * 4;
        const smoke = g.createRadialGradient(x, y, 1, x, y, 8 - i);
        smoke.addColorStop(0, "#635c5328");
        smoke.addColorStop(1, "#292d3000");
        g.fillStyle = smoke;
        g.fillRect(x - 8, y - 8, 16, 16);
      }
      for (let i = 0; i < 5; i++) {
        const x = 15 + i * 7,
          y = 16 + Math.sin(phase + i * 1.9) * (5 - i * 0.6),
          r = 5 + i * 0.7;
        const flame = g.createRadialGradient(x + 1, y, 0, x, y, r);
        flame.addColorStop(0, i > 2 ? "#ffe4a3cc" : "#e8994470");
        flame.addColorStop(0.35, "#ee842aa0");
        flame.addColorStop(0.7, "#bc3d2175");
        flame.addColorStop(1, "#86271a00");
        g.fillStyle = flame;
        g.fillRect(x - r, y - r, r * 2, r * 2);
      }
      g.fillStyle = "#ffca72b0";
      g.beginPath();
      g.moveTo(50, 16);
      g.bezierCurveTo(43, 11, 38, 18, 28, 12 + Math.sin(phase) * 3);
      g.bezierCurveTo(36, 19, 40, 15, 46, 20);
      g.closePath();
      g.fill();
      g.fillStyle = "#fff0bfbb";
      g.fillRect(46, 15, 4, 2);
      for (let i = 0; i < 3; i++) {
        g.fillStyle = i % 2 ? "#f1b16470" : "#d66b3370";
        g.fillRect(
          8 + i * 12,
          9 + Math.round(Math.sin(phase + i * 2) * 8),
          1,
          1,
        );
      }
    } else {
      const glow = g.createRadialGradient(48, 16, 1, 48, 16, 12);
      glow.addColorStop(0, "#7ac8ff88");
      glow.addColorStop(0.4, "#397dff48");
      glow.addColorStop(1, "#164bbb00");
      g.fillStyle = glow;
      g.fillRect(36, 4, 24, 24);
      const tail = g.createLinearGradient(4, 0, 50, 0);
      tail.addColorStop(0, "#215bd000");
      tail.addColorStop(0.65, "#397eee60");
      tail.addColorStop(1, "#acdfffcc");
      g.fillStyle = tail;
      g.beginPath();
      g.moveTo(50, 12);
      g.bezierCurveTo(
        35,
        9 + Math.sin(phase) * 3,
        22,
        20,
        3,
        15 + Math.sin(phase) * 4,
      );
      g.bezierCurveTo(24, 17, 38, 22, 50, 20);
      g.closePath();
      g.fill();
      g.strokeStyle = "#6fbeff55";
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(9, 16);
      g.bezierCurveTo(23, 11 + Math.sin(phase) * 5, 34, 22, 47, 16);
      g.stroke();
      g.fillStyle = "#79bffff0";
      g.beginPath();
      g.ellipse(48, 16, 6, 3.5, 0, 0, 7);
      g.fill();
      g.fillStyle = "#e0f5ff";
      g.beginPath();
      g.ellipse(49, 15.5, 3.5, 1.5, 0, 0, 7);
      g.fill();
      g.fillStyle = "#b3e3ff99";
      g.fillRect(33, 10 + Math.round(Math.sin(phase) * 3), 1, 1);
    }
    return c;
  },
  drawEnergyShot(g, s, time) {
    const fire =
      s.kind === "flame" || s.kind === "napalm" || s.payload === "napalm";
    if (!fire && s.kind !== "plasma" && s.payload !== "sticky") return false;
    const frame = Math.floor(time * 24 + s.x * 0.035 + s.y * 0.017) % 16,
      speed = Math.hypot(s.vx, s.vy),
      age = Math.max(
        0,
        Math.min(1, 1 - (s.life * speed) / Math.max(1, s.range)),
      ),
      scale = s.payload
        ? Math.max(1.1, s.radius / 7)
        : fire
          ? 0.8 + age * 0.35
          : 0.95;
    g.save();
    g.translate(Math.round(s.x), Math.round(s.y));
    g.rotate(speed > 0 ? Math.atan2(s.vy, s.vx) : 0);
    g.globalAlpha = s.payload ? 0.9 : fire ? 0.62 - age * 0.18 : 0.88;
    // The cached head is at (48,16); every tail points opposite velocity.
    if (s.stuck) {
      const pulse = 1 + Math.sin(time * 15) * 0.08;
      g.drawImage(
        this.projectileSprites[1][frame],
        -20 * scale * pulse,
        -16 * scale,
        28 * scale,
        32 * scale,
      );
    } else
      g.drawImage(
        this.projectileSprites[fire ? 0 : 1][frame],
        -48 * scale,
        -16 * scale,
        64 * scale,
        32 * scale,
      );
    if (s.payload === "sticky") {
      g.globalAlpha = 0.65;
      g.strokeStyle = "#94cfff";
      g.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const a = time * 3 + i * 2.1,
          r = s.radius + 3 + Math.sin(time * 18 + i) * 2;
        g.beginPath();
        g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        g.lineTo(Math.cos(a + 0.3) * (r + 3), Math.sin(a + 0.3) * (r + 3));
        g.lineTo(Math.cos(a + 0.6) * r, Math.sin(a + 0.6) * r);
        g.stroke();
      }
      if (s.stuck) {
        g.strokeStyle = "#d1eaff";
        g.beginPath();
        g.arc(
          0,
          0,
          s.radius + 6,
          -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * Math.max(0, s.life / s.fuse),
        );
        g.stroke();
      }
    }
    g.restore();
    return true;
  },
  materialTile(g, x, y, wall, theme, rng) {
    // All wear is baked once, using a visual RNG independent of combat.
    const metal = g.createLinearGradient(x, y, x + 30, y + 48);
    metal.addColorStop(0, "#a9c0bc12");
    metal.addColorStop(0.4, "#00000000");
    metal.addColorStop(1, "#01070ba0");
    g.fillStyle = metal;
    g.fillRect(x + 2, y + 2, 44, wall ? 32 : 44);
    for (let i = 0; i < 34; i++) {
      g.fillStyle = i % 3 ? "#02070922" : "#b4b8a51a";
      g.fillRect(
        x + rng.int(3, 44),
        y + rng.int(3, wall ? 30 : 44),
        rng.int(1, 3),
        1,
      );
    }
    if (wall) {
      g.fillStyle = "#a5b8b22b";
      g.fillRect(x + 3, y + 2, 41, 1);
      g.fillStyle = "#00080ba8";
      g.fillRect(x + 4, y + 30, 39, 3);
      for (let i = 0; i < 3; i++) {
        const xx = x + 7 + i * 13;
        g.fillStyle = "#152026";
        g.fillRect(xx, y + 9, 4, 16);
        g.fillStyle = "#87959033";
        g.fillRect(xx, y + 9, 1, 14);
      }
      g.fillStyle = "#080c10";
      g.fillRect(x + 4, y + 36, 40, 7);
      g.fillStyle = "#65716a33";
      g.fillRect(x + 6, y + 36, 36, 1);
      if (rng.next() < 0.38) {
        g.fillStyle = "#91593640";
        g.fillRect(x + rng.int(5, 39), y + 4, 2, rng.int(8, 25));
      }
    } else {
      g.fillStyle = "#a4b3aa18";
      g.fillRect(x + 3, y + 2, 41, 1);
      g.fillRect(x + 2, y + 3, 1, 41);
      g.fillStyle = "#00050870";
      g.fillRect(x + 3, y + 45, 43, 2);
      if (rng.next() < 0.2) {
        const xx = x + rng.int(9, 29),
          yy = y + rng.int(10, 30);
        g.fillStyle = theme === 3 ? "#29181e75" : "#050b0c80";
        for (let i = 0; i < 6; i++)
          g.fillRect(xx + rng.int(-5, 8), yy + i * 2, rng.int(5, 16), 2);
        g.fillStyle = "#849a9a15";
        g.fillRect(xx, yy + 4, 9, 1);
      }
      if (rng.next() < 0.18) {
        g.strokeStyle = "#0206098a";
        g.lineWidth = 1;
        g.beginPath();
        const xx = x + rng.int(12, 35);
        g.moveTo(xx, y + 2);
        g.lineTo(xx - 4, y + 14);
        g.lineTo(xx + 2, y + 20);
        g.lineTo(xx - 3, y + 31);
        g.stroke();
      }
    }
  },
  marine(g, game) {
    const walk =
      game.moving && game.state === "play" ? Math.sin(game.time * 16) * 4 : 0;
    g.fillStyle = "#00000080";
    g.beginPath();
    g.ellipse(-1, 7, 24, 19, 0, 0, 7);
    g.fill();
    // Boots, undersuit, layered ceramic plates and a recessed visor.
    for (const side of [-1, 1]) {
      const step = side * walk;
      g.fillStyle = "#090f13";
      g.fillRect(-17 + step, side < 0 ? -17 : 6, 22, 12);
      g.fillStyle = "#35423f";
      g.fillRect(-12 + step, side < 0 ? -15 : 8, 14, 8);
      g.fillStyle = "#6b7365";
      g.fillRect(-11 + step, side < 0 ? -15 : 8, 11, 2);
      g.fillStyle = "#111b20";
      g.fillRect(1, side < 0 ? -20 : 10, 18, 11);
      g.fillStyle = "#626c60";
      g.fillRect(3, side < 0 ? -19 : 11, 12, 8);
      g.fillStyle = "#a1a28a";
      g.fillRect(4, side < 0 ? -19 : 11, 9, 2);
      g.fillStyle = "#1c2929";
      g.fillRect(6, side < 0 ? -15 : 15, 8, 3);
    }
    g.fillStyle = "#0b1318";
    g.beginPath();
    g.moveTo(-13, -10);
    g.lineTo(-7, -15);
    g.lineTo(5, -13);
    g.lineTo(12, -6);
    g.lineTo(12, 8);
    g.lineTo(3, 14);
    g.lineTo(-10, 12);
    g.closePath();
    g.fill();
    const armor = g.createLinearGradient(-10, -13, 5, 14);
    armor.addColorStop(0, "#8b9381");
    armor.addColorStop(0.35, "#58675f");
    armor.addColorStop(1, "#263534");
    g.fillStyle = armor;
    g.fillRect(-10, -10, 16, 20);
    g.fillStyle = "#1b2729";
    g.fillRect(-8, -2, 13, 3);
    g.fillStyle = "#b4b19a";
    g.fillRect(-9, -10, 12, 2);
    g.fillStyle = "#151f20";
    g.fillRect(-14, -7, 5, 14);
    g.fillStyle = "#7b8170";
    g.fillRect(-14, -6, 2, 10);
    g.fillStyle = "#0a1218";
    g.fillRect(-2, -9, 18, 18);
    g.fillStyle = "#697e7a";
    g.fillRect(0, -8, 13, 15);
    g.fillStyle = "#b3bab0";
    g.fillRect(1, -8, 10, 2);
    g.fillStyle = "#1b2a30";
    g.fillRect(9, -6, 6, 12);
    g.fillStyle = "#629f9d";
    g.fillRect(10, -4, 4, 7);
    g.fillStyle = "#a3d1bf";
    g.fillRect(11, -4, 2, 2);
    g.fillStyle = "#0c1419";
    g.fillRect(12, 4, 25, 9);
    g.fillStyle = "#677271";
    g.fillRect(14, 4, 17, 3);
    g.fillStyle = "#303d40";
    g.fillRect(18, 7, 19, 4);
    g.fillStyle = "#a1a799";
    g.fillRect(30, 6, 6, 2);
    g.fillStyle = "#111c20";
    g.fillRect(20, 2, 5, 3);
    g.fillStyle = "#a59571";
    g.fillRect(-7, 5, 3, 3);
  },
  lighting(g, game, cx, cy) {
    const dark = X.profile.settings.darkMode;
    if (!dark && !X.profile.settings.lights) return;
    const lights = [],
      p = game.player;
    const add = (x, y, radius, color, power = 1) => {
      if (
        x + radius < cx ||
        y + radius < cy ||
        x - radius > cx + 1152 ||
        y - radius > cy + 648
      )
        return;
      lights.push({ x, y, radius, color, power });
    };
    const color = (kind) =>
      ["plasma", "rail"].includes(kind)
        ? "#438dff"
        : kind === "tesla"
          ? "#b294ff"
          : ["flame", "napalm"].includes(kind)
            ? "#ff3426"
            : "#ffb75e";
    if (game.muzzle > 0)
      add(
        p.x + Math.cos(p.angle) * 38,
        p.y + Math.sin(p.angle) * 38,
        180,
        color(X.weapons[game.weapon].kind),
        Math.min(1, game.muzzle / 0.035) *
          (["flame", "plasma"].includes(X.weapons[game.weapon].kind)
            ? (game.muzzleLightScale ?? 1)
            : 1),
      );
    for (const s of game.shots.items)
      if (
        s.active &&
        ["plasma", "flame", "napalm", "rail", "rocket"].includes(s.kind)
      ) {
        const soft = !s.payload && ["flame", "plasma"].includes(s.kind);
        add(
          s.x,
          s.y,
          soft
            ? s.kind === "flame"
              ? 65
              : 85
            : s.kind === "rocket"
              ? 95
              : 130,
          color(s.kind),
          soft ? (s.kind === "flame" ? 0.16 : 0.28) : 0.7,
        );
      }
    for (const s of game.surfaces.items)
      if (s.active)
        add(
          s.x,
          s.y,
          s.radius + 115,
          s.type === "fire" ? "#ff3426" : "#438dff",
          Math.min(0.85, s.life / 0.6),
        );
    for (const b of game.blasts)
      add(
        b.x,
        b.y,
        Math.max(180, b.r * 1.8),
        "#ffb05e",
        Math.min(1, b.life / 0.25),
      );
    for (const b of game.beams || []) {
      for (let i = 0; i <= 4; i++)
        add(
          b.x + ((b.tx - b.x) * i) / 4,
          b.y + ((b.ty - b.y) * i) / 4,
          95,
          b.color,
          Math.min(0.55, b.life * 5),
        );
    }
    for (const e of game.enemies.items)
      if (e.active && (e.burn > 0 || e.poolFire > 0))
        add(e.x, e.y, 100, "#ff3426", 0.5);
    const radial = (ctx, x, y, radius, inner, outer) => {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, inner);
      gradient.addColorStop(0.35, inner);
      gradient.addColorStop(1, outer);
      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    };
    if (dark) {
      // Erase light from a transparent mask, never from the opaque world canvas.
      if (!this.darkCanvas) {
        this.darkCanvas = document.createElement("canvas");
        this.darkCanvas.width = 1152;
        this.darkCanvas.height = 648;
      }
      const mask = this.darkCanvas.getContext("2d");
      mask.setTransform(1, 0, 0, 1, 0, 0);
      mask.globalCompositeOperation = "source-over";
      mask.clearRect(0, 0, 1152, 648);
      mask.fillStyle = "#010309f5";
      mask.fillRect(0, 0, 1152, 648);
      mask.translate(-cx, -cy);
      mask.globalCompositeOperation = "destination-out";
      radial(mask, p.x, p.y, 290, "#000000", "#00000000");
      // Overlapping soft spots make a cone with feathered sides and tip.
      for (let i = 1; i <= 12; i++) {
        mask.globalAlpha = 0.48 * (1 - i / 15);
        radial(
          mask,
          p.x + Math.cos(p.angle) * i * 42,
          p.y + Math.sin(p.angle) * i * 42,
          28 + i * 8,
          "#000000",
          "#00000000",
        );
      }
      for (const light of lights) {
        mask.globalAlpha = light.power;
        radial(mask, light.x, light.y, light.radius, "#000000", "#00000000");
      }
      mask.globalAlpha = 1;
      g.drawImage(this.darkCanvas, cx, cy);
    }
    g.save();
    g.globalCompositeOperation = "screen";
    for (const light of lights) {
      g.globalAlpha = light.power * 0.32;
      radial(
        g,
        light.x,
        light.y,
        light.radius,
        light.color,
        light.color + "00",
      );
    }
    g.restore();
  },
  init() {
    this.ctx = this.canvas.getContext("2d", { alpha: false });
    this.ctx.imageSmoothingEnabled = false;
    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.sprites = X.enemies.map((d) => this.sprite(d));
    this.projectileSprites = ["fire", "plasma"].map((type) =>
      Array.from({ length: 16 }, (_, frame) =>
        this.projectileSprite(type, frame),
      ),
    );
    this.burnSprites = [0, 1, 2].map((quality) =>
      Array.from({ length: 12 }, (_, frame) => this.burnSprite(frame, quality)),
    );
    this.surfaceSprites = ["fire", "energy"].map((type) => {
      const c = document.createElement("canvas");
      c.width = c.height = 128;
      const g = c.getContext("2d");
      const glow = g.createRadialGradient(64, 64, 2, 64, 64, 64);
      glow.addColorStop(0, type === "fire" ? "#f88e4750" : "#84baff66");
      glow.addColorStop(0.45, type === "fire" ? "#d5472438" : "#3269d74a");
      glow.addColorStop(1, "#00000000");
      g.fillStyle = glow;
      g.fillRect(0, 0, 128, 128);
      g.beginPath();
      for (let i = 0; i <= 48; i++) {
        const a = (i / 48) * Math.PI * 2,
          r = 43 + Math.sin(a * 5) * 5 + Math.cos(a * 9) * 3;
        if (i === 0) g.moveTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r);
        else g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r);
      }
      g.closePath();
      g.fillStyle = type === "fire" ? "#3b211dc0" : "#10234cc0";
      g.strokeStyle = type === "fire" ? "#ffac4d66" : "#8ebdff66";
      g.lineWidth = 2;
      g.fill();
      g.stroke();
      for (let i = 0; i < 28; i++) {
        const a = i * 2.399,
          r = 10 + (i % 7) * 6;
        g.fillStyle =
          type === "fire"
            ? i % 2
              ? "#ffb64a99"
              : "#d74d2588"
            : i % 2
              ? "#98c4ffaa"
              : "#4ac2ff88";
        g.beginPath();
        g.ellipse(
          64 + Math.cos(a) * r,
          64 + Math.sin(a) * r,
          2 + (i % 4),
          1 + (i % 3),
          a,
          0,
          7,
        );
        g.fill();
      }
      return c;
    });
  },
  burnSprite(frame, quality) {
    const c = document.createElement("canvas");
    c.width = 96;
    c.height = 112;
    const g = c.getContext("2d"),
      time = (frame / 12) * Math.PI * 2;
    const glow = g.createRadialGradient(48, 78, 4, 48, 78, 40);
    glow.addColorStop(0, "#ffc15650");
    glow.addColorStop(1, "#e45c1900");
    g.fillStyle = glow;
    g.fillRect(8, 38, 80, 74);
    if (quality > 0)
      for (let i = 0; i < 3; i++) {
        const rise = (frame * 3 + i * 19) % 60;
        g.globalAlpha = 0.08 * (1 - rise / 70);
        g.fillStyle = "#c3b5a8";
        g.beginPath();
        g.ellipse(
          48 + Math.sin(time + i) * 12,
          65 - rise,
          7 + rise * 0.12,
          6 + rise * 0.1,
          0,
          0,
          7,
        );
        g.fill();
      }
    g.globalAlpha = 1;
    const count = [3, 5, 6][quality];
    for (let i = 0; i < count; i++) {
      const x = 25 + (i * 46) / (count - 1),
        y = 82 + Math.sin(time + i) * 4,
        w = 9 + Math.sin(time + i * 2) * 2,
        h = 28 + (Math.sin(time + i * 1.7) + 1) * 10,
        sway = Math.sin(time + i * 2.1) * 7;
      g.fillStyle = "#e65d25dc";
      g.beginPath();
      g.moveTo(x - w, y);
      g.lineTo(x - w, y - h * 0.3);
      g.lineTo(x - w * 0.4 + sway, y - h * 0.55);
      g.lineTo(x + sway, y - h);
      g.lineTo(x + w * 0.3, y - h * 0.52);
      g.lineTo(x + w, y - h * 0.25);
      g.lineTo(x + w, y);
      g.closePath();
      g.fill();
      g.fillStyle = "#ffb33ce8";
      g.beginPath();
      g.moveTo(x - w * 0.5, y);
      g.lineTo(x - w * 0.5, y - h * 0.25);
      g.lineTo(x + sway * 0.5, y - h * 0.7);
      g.lineTo(x + w * 0.5, y - h * 0.2);
      g.lineTo(x + w * 0.5, y);
      g.closePath();
      g.fill();
      g.fillStyle = "#fff1a3";
      g.beginPath();
      g.moveTo(x - 3, y);
      g.lineTo(x + sway * 0.2, y - h * 0.3);
      g.lineTo(x + 3, y);
      g.fill();
    }
    for (let i = 0; i < [2, 4, 6][quality]; i++) {
      const rise = (frame * 4 + i * 11) % 58;
      g.fillStyle = rise < 35 ? "#ffe290" : "#e99447";
      g.globalAlpha = 1 - rise / 70;
      g.fillRect(25 + i * 8 + Math.sin(time + i) * 5, 70 - rise, 2, 3);
    }
    return c;
  },
  drawBurn(g, e, time, strength = e.burn) {
    const frames = this.burnSprites[X.profile.settings.quality],
      frame = Math.floor(time * 12 + e.phase * 2) % frames.length,
      scale = (e.r * 2 + 18) / 64;
    g.save();
    g.globalAlpha = Math.min(1, strength / 0.35);
    g.drawImage(
      frames[frame],
      e.x - 48 * scale,
      e.y - 76 * scale,
      96 * scale,
      112 * scale,
    );
    g.restore();
  },
  resize() {
    let d = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = 1152 * d;
    this.canvas.height = 648 * d;
    this.ctx.imageSmoothingEnabled = false;
    this.dpr = d;
  },
  sprite(d) {
    const c = document.createElement("canvas");
    c.width = c.height = 50;
    const g = c.getContext("2d");
    g.scale(0.5, 0.5);
    g.translate(50, 50);
    let r = d.radius;
    g.fillStyle = "#0008";
    g.beginPath();
    g.ellipse(0, 5, r + 8, r * 0.8, 0, 0, 7);
    g.fill();
    for (let side of [-1, 1])
      for (let i = 0; i < 3; i++) {
        g.strokeStyle = "#333f33";
        g.lineWidth = d.boss ? 7 : 4;
        g.beginPath();
        g.moveTo(-r * 0.5 + i * r * 0.5, side * r * 0.5);
        g.lineTo(-r * 0.7 + i * r * 0.6, side * (r + 7));
        g.lineTo(-r * 0.1 + i * r * 0.5, side * (r + 13));
        g.stroke();
        g.strokeStyle = d.color;
        g.lineWidth = 2;
        g.stroke();
      }
    g.fillStyle = "#242f30";
    g.beginPath();
    g.ellipse(-4, 0, r, r * 0.7, 0, 0, 7);
    g.fill();
    const shell = g.createLinearGradient(-r, -r, r * 0.5, r);
    shell.addColorStop(0, "#b1b4a0");
    shell.addColorStop(0.28, d.color);
    shell.addColorStop(1, "#142124");
    g.fillStyle = shell;
    g.beginPath();
    g.ellipse(0, -2, r * 0.82, r * 0.56, 0, 0, 7);
    g.fill();
    g.save();
    g.clip();
    const texture = new X.RNG(Math.round(r * 91 + d.hp));
    for (let i = 0; i < 70; i++) {
      g.fillStyle = i % 3 ? "#07100f55" : "#d4d5aa30";
      g.fillRect(texture.int(-r, r), texture.int(-r, r), 2, 2);
    }
    g.restore();
    for (let i = 0; i < 4; i++) {
      const xx = -r * 0.65 + i * r * 0.32;
      g.strokeStyle = "#101d20a8";
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(xx, -r * 0.45);
      g.lineTo(xx + 4, 0);
      g.lineTo(xx, r * 0.4);
      g.stroke();
      g.strokeStyle = "#c0c5a64a";
      g.lineWidth = 1;
      g.stroke();
    }
    g.fillStyle = "#2d3934";
    g.beginPath();
    g.moveTo(r * 0.35, -r * 0.6);
    g.lineTo(r + 8, 0);
    g.lineTo(r * 0.35, r * 0.6);
    g.fill();
    g.fillStyle = d.kind === "acid" ? "#daec65" : "#ff6e4d";
    g.fillRect(r * 0.6, -6, 5, 3);
    g.fillRect(r * 0.6, 3, 5, 3);
    g.fillStyle = "#d8e7d3";
    g.fillRect(r + 2, -8, 5, 3);
    g.fillRect(r + 2, 5, 5, 3);
    if (d.kind === "armor" || d.id === "steel") {
      const plate = g.createLinearGradient(0, -r, 0, r);
      plate.addColorStop(0, "#a2aaa1");
      plate.addColorStop(0.4, "#697876");
      plate.addColorStop(1, "#293a3d");
      g.fillStyle = plate;
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.moveTo(-r * 0.7 + i * 9, -r * 0.65);
        g.lineTo(-r * 0.2 + i * 9, -r * 0.6);
        g.lineTo(i * 9, r * 0.5);
        g.lineTo(-r * 0.7 + i * 9, r * 0.55);
        g.fill();
        g.strokeStyle = "#15242c";
        g.lineWidth = 1;
        g.stroke();
      }
      g.fillStyle = "#233239";
      g.fillRect(-r * 0.6, -3, r, 5);
      g.fillStyle = "#a5ab943d";
      for (let i = 0; i < 6; i++)
        g.fillRect(-r * 0.5 + i * 4, -r * 0.3 + (i % 3) * 2, 2, 2);
    }
    if (d.kind === "acid" || d.kind === "suicide") {
      const membrane = g.createRadialGradient(
        -r * 0.6,
        -r * 0.25,
        1,
        -r * 0.4,
        0,
        r * 0.65,
      );
      membrane.addColorStop(0, d.kind === "acid" ? "#b5c47d" : "#d8ae70");
      membrane.addColorStop(0.6, d.kind === "acid" ? "#75814b" : "#93603f");
      membrane.addColorStop(1, "#2a3027");
      g.fillStyle = membrane;
      g.beginPath();
      g.ellipse(-r * 0.4, 0, r * 0.65, r * 0.65, 0, 0, 7);
      g.fill();
      g.strokeStyle = "#2d3e3055";
      g.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.moveTo(-r * 0.8, -r * 0.3 + i * 4);
        g.lineTo(-r * 0.4, i * 3);
        g.lineTo(-r * 0.6, r * 0.4);
        g.stroke();
      }
      g.fillStyle = "#fff6b738";
      for (let i = 0; i < 4; i++) g.fillRect(-r * 0.8 + i * 4, -r * 0.4, 2, 4);
    }
    if (d.kind === "summon") {
      g.strokeStyle = "#dec5e1";
      g.lineWidth = 3;
      for (let i = 0; i < 6; i++) {
        g.beginPath();
        g.moveTo(-r * 0.5, 0);
        g.lineTo(-r - 10, Math.sin(i) * r);
        g.stroke();
      }
      g.fillStyle = "#deb2db";
      g.fillRect(-8, -8, 7, 16);
    }
    if (d.kind === "gunner") {
      g.fillStyle = "#b8abc7";
      g.fillRect(5, -r - 2, 24, 7);
      g.fillRect(5, r - 6, 24, 7);
      g.fillStyle = "#ed96cd";
      g.fillRect(25, -r, 6, 3);
      g.fillRect(25, r - 4, 6, 3);
    }
    if (d.kind === "elite" || d.id === "queen") {
      g.strokeStyle = "#e3a6a5";
      g.lineWidth = 4;
      for (let i = 0; i < 5; i++) {
        g.beginPath();
        g.moveTo(-r * 0.6 + i * 7, -r * 0.3);
        g.lineTo(-r * 0.8 + i * 7, -r - 8);
        g.stroke();
        g.beginPath();
        g.moveTo(-r * 0.6 + i * 7, r * 0.3);
        g.lineTo(-r * 0.8 + i * 7, r + 8);
        g.stroke();
      }
    }
    if (d.id === "heart") {
      g.fillStyle = "#ffce74";
      g.beginPath();
      g.ellipse(-7, 0, r * 0.6, r * 0.6, 0, 0, 7);
      g.fill();
      g.fillStyle = "#faefd2";
      g.fillRect(-12, -9, 11, 18);
    }
    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = 100;
    const pixels = sprite.getContext("2d");
    pixels.imageSmoothingEnabled = false;
    pixels.drawImage(c, 0, 0, 100, 100);
    return sprite;
  },
  prepare(game) {
    let m = game.map,
      c = document.createElement("canvas");
    c.width = m.w * 48;
    c.height = m.h * 48;
    const g = c.getContext("2d"),
      rng = new X.RNG(game.number * 117);
    const palettes = [
      ["#222c2d", "#303b3b", "#596561"],
      ["#292c2c", "#363b3c", "#60675f"],
      ["#282e29", "#343c34", "#646957"],
      ["#2c2628", "#393132", "#64534f"],
    ];
    let pal = palettes[game.level.theme];
    for (let y = 0; y < m.h; y++)
      for (let x = 0; x < m.w; x++) {
        let px = x * 48,
          py = y * 48;
        if (m.cells[y * m.w + x]) {
          g.fillStyle = "#080f17";
          g.fillRect(px, py, 48, 48);
          g.fillStyle = pal[2];
          g.fillRect(px + 1, py + 1, 46, 33);
          g.fillStyle = pal[1];
          g.fillRect(px + 4, py + 4, 40, 25);
          g.fillStyle = "#111d24";
          g.fillRect(px + 1, py + 34, 46, 13);
          g.fillStyle = "#819497";
          g.fillRect(px + 5, py + 6, 2, 2);
          g.fillRect(px + 40, py + 6, 2, 2);
          if (rng.next() < 0.12) {
            g.fillStyle = "#b6bb63";
            g.fillRect(px + 7, py + 23, 30, 3);
          }
        } else {
          g.fillStyle = rng.next() < 0.5 ? pal[0] : pal[1];
          g.fillRect(px, py, 48, 48);
          g.strokeStyle = "#0b131980";
          g.strokeRect(px + 0.5, py + 0.5, 47, 47);
          g.fillStyle = "#86929217";
          for (let i = 0; i < 5; i++)
            g.fillRect(
              px + rng.int(2, 44),
              py + rng.int(2, 44),
              rng.int(1, 5),
              1,
            );
          g.fillStyle = "#0a141b";
          g.fillRect(px + 5, py + 5, 2, 2);
          g.fillRect(px + 41, py + 41, 2, 2);
          if ((x + y * 3) % 17 === 0) {
            g.strokeStyle = "#72858633";
            for (let i = 0; i < 4; i++)
              g.strokeRect(px + 10, py + 10 + i * 5, 27, 2);
          }
          if (game.level.theme === 3 && rng.next() < 0.17) {
            g.strokeStyle = "#82475c88";
            g.lineWidth = 3;
            g.beginPath();
            g.moveTo(px, py + 15);
            g.bezierCurveTo(px + 35, py + 6, px + 2, py + 38, px + 48, py + 42);
            g.stroke();
          }
        }
        this.materialTile(
          g,
          px,
          py,
          m.cells[y * m.w + x],
          game.level.theme,
          rng,
        );
      }
    // Кэшированные коммуникации, предупредительные полосы и маркировка помещений.
    for (let y = 1; y < m.h - 1; y++)
      for (let x = 1; x < m.w - 1; x++)
        if (!m.cells[y * m.w + x]) {
          let px = x * 48,
            py = y * 48;
          // Contact shadows anchor raised walls to the floor.
          const neighbors = [
            [m.cells[(y - 1) * m.w + x], px, py, px, py + 22, 48, 22],
            [m.cells[y * m.w + x - 1], px, py, px + 18, py, 18, 48],
            [m.cells[(y + 1) * m.w + x], px, py + 48, px, py + 34, 48, -14],
            [m.cells[y * m.w + x + 1], px + 48, py, px + 34, py, -14, 48],
          ];
          for (const [solid, x1, y1, x2, y2, w, h] of neighbors)
            if (solid) {
              const shade = g.createLinearGradient(x1, y1, x2, y2);
              shade.addColorStop(0, "#00070bd0");
              shade.addColorStop(1, "#00070b00");
              g.fillStyle = shade;
              g.fillRect(x1, y1, w, h);
            }
          if (m.cells[(y - 1) * m.w + x]) {
            g.fillStyle = "#101e25";
            g.fillRect(px, py + 3, 48, 9);
            g.fillStyle = "#687e83";
            g.fillRect(px, py + 4, 48, 2);
            g.fillStyle = game.level.theme === 3 ? "#bc7c9d" : "#78b9b4";
            if (x % 3 === 0) g.fillRect(px + 8, py + 7, 25, 2);
            if (x % 7 === 0) {
              g.fillStyle = "#080e12";
              g.fillRect(px + 13, py + 4, 23, 8);
              g.fillStyle = game.level.theme === 3 ? "#a9765c" : "#a3b6a0";
              g.fillRect(px + 16, py + 6, 17, 2);
              const lamp = g.createRadialGradient(
                px + 24,
                py + 12,
                2,
                px + 24,
                py + 12,
                66,
              );
              lamp.addColorStop(0, "#c6ccb11c");
              lamp.addColorStop(1, "#c6ccb100");
              g.fillStyle = lamp;
              g.fillRect(px - 42, py + 12, 132, 54);
            }
          }
          if (m.cells[y * m.w + x - 1] && x > 3 && x < m.w - 4) {
            g.fillStyle = "#bd9b4e55";
            for (let i = 0; i < 4; i++) {
              g.beginPath();
              g.moveTo(px + 2, py + i * 12);
              g.lineTo(px + 8, py + i * 12 + 6);
              g.lineTo(px + 8, py + i * 12 + 11);
              g.lineTo(px + 2, py + i * 12 + 5);
              g.fill();
            }
          }
          if ((x * 7 + y * 11) % 113 === 0 && game.level.theme !== 3) {
            g.fillStyle = "#0a171e";
            g.fillRect(px + 9, py + 8, 30, 30);
            g.fillStyle = "#50656a";
            for (let j = 0; j < 6; j++)
              g.fillRect(px + 12, py + 10 + j * 4, 24, 2);
            g.strokeStyle = "#809091";
            g.strokeRect(px + 9.5, py + 8.5, 29, 29);
          }
        }
    g.textAlign = "left";
    for (const [i, r] of game.level.rooms.entries())
      if (r[2] > 8 && r[3] > 6) {
        let x = (r[0] + 1) * 48,
          y = (r[1] + 2) * 48;
        g.fillStyle = "#b2c6bc22";
        g.font = "bold 45px Bahnschrift,Segoe UI";
        g.fillText(String(i + 1).padStart(2, "0"), x, y);
        g.font = "9px Segoe UI";
        g.fillText(
          [
            "QUARANTINE / LAB",
            "MILITARY / RESTRICTED",
            "POWER / HIGH VOLTAGE",
            "BIOHAZARD / INFESTED",
          ][game.level.theme],
          x,
          y + 15,
        );
      }
    let start = m.point(game.level.start);
    g.strokeStyle = "#71b6a766";
    g.lineWidth = 3;
    g.strokeRect(start.x - 48, start.y - 48, 96, 96);
    g.fillStyle = "#94c3b85c";
    g.font = "bold 10px Segoe UI";
    g.textAlign = "center";
    g.fillText("ВЫСАДКА", start.x, start.y + 63);
    this.floor = c;
  },
  draw(game, dt) {
    const g = this.ctx;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.fillStyle = "#060d15";
    g.fillRect(0, 0, 1152, 648);
    if (!game.map) {
      this.backdrop(g);
      return;
    }
    const p = game.player;
    let shake =
        X.profile.settings.shake && game.state === "play" ? game.shake : 0,
      cx =
        Math.max(0, Math.min(game.map.w * 48 - 1152, p.x - 576)) +
        (Math.random() - 0.5) * shake,
      cy =
        Math.max(0, Math.min(game.map.h * 48 - 648, p.y - 324)) +
        (Math.random() - 0.5) * shake;
    game.camera.x = cx;
    game.camera.y = cy;
    g.save();
    g.translate(-Math.round(cx), -Math.round(cy));
    g.drawImage(this.floor, 0, 0);
    const visible = (x, y, r = 60) =>
      x > cx - r && x < cx + 1152 + r && y > cy - r && y < cy + 648 + r;
    if (X.profile.settings.blood)
      for (const m of game.marks)
        if (visible(m.x, m.y)) {
          g.save();
          g.translate(m.x, m.y);
          g.rotate(m.angle);
          g.fillStyle = "#253f28aa";
          g.beginPath();
          g.ellipse(0, 0, m.r * 1.4, m.r * 0.7, 0, 0, 7);
          g.fill();
          g.globalAlpha = 0.4;
          g.drawImage(this.sprites[0], -38, -38, 76, 76);
          g.restore();
        }
    for (const pool of game.surfaces.items)
      if (pool.active && visible(pool.x, pool.y, pool.radius + 20)) {
        g.save();
        g.translate(pool.x, pool.y);
        g.rotate(Math.sin(game.time + pool.phase) * 0.08);
        g.globalAlpha = Math.min(1, pool.life / 0.6);
        g.drawImage(
          this.surfaceSprites[pool.type === "fire" ? 0 : 1],
          -pool.radius,
          -pool.radius,
          pool.radius * 2,
          pool.radius * 2,
        );
        const pulse =
          0.5 +
          0.5 *
            Math.sin(game.time * (pool.type === "fire" ? 7 : 4) + pool.phase);
        g.globalAlpha *=
          pool.type === "fire" ? 0.18 + pulse * 0.16 : 0.12 + pulse * 0.2;
        g.strokeStyle = pool.type === "fire" ? "#ffd06a" : "#9ac5ff";
        g.lineWidth = pool.type === "fire" ? 3 : 2;
        // Broken hot fissures replace the geometric rotating targeting ring.
        for (let i = 0; i < 5; i++) {
          const a = i * 2.399 + pool.phase,
            r = pool.radius * (0.25 + (i % 3) * 0.17),
            x = Math.cos(a) * r,
            y = Math.sin(a) * r;
          g.beginPath();
          g.moveTo(x - 8, y + 2);
          g.bezierCurveTo(x - 3, y - 4 - pulse * 3, x + 3, y + 4, x + 9, y - 1);
          g.stroke();
        }
        const sparks = pool.type === "fire" ? 5 : 7;
        g.globalAlpha = Math.min(1, pool.life / 0.6) * (0.35 + pulse * 0.35);
        g.fillStyle = pool.type === "fire" ? "#ffca70" : "#87b9ff";
        for (let i = 0; i < sparks; i++) {
          const a = i * ((Math.PI * 2) / sparks) + pool.phase;
          const d =
            pool.radius *
            (0.35 + 0.1 * Math.sin(game.time * 3 + i + pool.phase));
          const size = pool.type === "fire" ? 3 : 2 + (i % 2);
          const rise = (game.time * 0.55 + i * 0.27 + pool.phase) % 1;
          g.fillRect(
            Math.round((Math.cos(a) * d) / 2) * 2,
            Math.round(
              (Math.sin(a) * d - rise * (pool.type === "fire" ? 28 : 8)) / 2,
            ) * 2,
            size * (1 - rise * 0.6),
            size * (1 - rise * 0.6),
          );
        }
        if (pool.type === "fire") {
          const frames = this.burnSprites[X.profile.settings.quality],
            size = pool.radius * 0.65;
          for (let i = 0; i < 3; i++)
            g.drawImage(
              frames[Math.floor(game.time * 12 + i * 4 + pool.phase) % 12],
              (i - 1) * pool.radius * 0.4 - size / 2,
              (i % 2) * pool.radius * 0.35 - size * 0.65,
              size,
              size,
            );
        } else {
          g.globalAlpha = Math.min(1, pool.life / 0.6) * (0.22 + pulse * 0.24);
          g.strokeStyle = "#a9d9ff";
          g.lineWidth = 1;
          for (let i = 0; i < 4; i++) {
            const y = (i - 1.5) * pool.radius * 0.23,
              drift = Math.sin(game.time * 2 + i + pool.phase) * 5;
            g.beginPath();
            g.moveTo(-pool.radius * 0.45, y);
            g.bezierCurveTo(
              -pool.radius * 0.2,
              y + drift,
              pool.radius * 0.15,
              y - drift,
              pool.radius * 0.4,
              y + 2,
            );
            g.stroke();
          }
        }
        g.restore();
      }
    for (const [x, y, w, h] of game.level.hazards || []) {
      let active = game.time % 6 > 4;
      g.fillStyle = active ? "#e99e4255" : "#7c783233";
      g.fillRect(x * 48, y * 48, w * 48, h * 48);
      g.strokeStyle = active ? "#ffd16f" : "#b19d53";
      g.lineWidth = 2;
      g.strokeRect(x * 48 + 3, y * 48 + 3, w * 48 - 6, h * 48 - 6);
      if (game.time % 6 > 3) {
        g.fillStyle = "#f0cc83";
        g.font = "bold 13px Segoe UI";
        g.textAlign = "center";
        g.fillText(
          active ? "РАЗРЯД" : "ВНИМАНИЕ",
          (x + w / 2) * 48,
          (y + h / 2) * 48,
        );
      }
    }
    const exit = game.exit,
      ready = game.ready();
    g.fillStyle = ready ? "#54b89e" : "#253c43";
    g.fillRect(exit.x - 29, exit.y - 32, 58, 64);
    g.strokeStyle = ready ? "#a0ffe0" : "#657a7d";
    g.lineWidth = 3;
    g.strokeRect(exit.x - 30, exit.y - 33, 60, 66);
    g.fillStyle = "#071c23";
    g.fillRect(exit.x - 17, exit.y - 23, 34, 46);
    g.fillStyle = ready ? "#a0ffe0" : "#6b8589";
    g.font = "bold 10px Segoe UI";
    g.textAlign = "center";
    g.fillText(
      ready
        ? X.profile.settings.keys.interact.replace("Key", "") + " · ВЫХОД"
        : "ШЛЮЗ",
      exit.x,
      exit.y + 4,
    );
    for (const o of game.objectives) {
      if (!visible(o.x, o.y)) continue;
      if (o.kind === "nest") {
        g.fillStyle = o.done ? "#252e28" : "#754155";
        g.beginPath();
        g.ellipse(o.x, o.y, 38, 30, 0, 0, 7);
        g.fill();
        for (let i = 0; i < 6; i++) {
          g.fillStyle = o.done ? "#3c3d34" : i % 2 ? "#c27d8a" : "#805c70";
          g.beginPath();
          g.ellipse(
            o.x + Math.cos(i) * 23,
            o.y + Math.sin(i) * 17,
            10,
            15,
            i,
            0,
            7,
          );
          g.fill();
        }
      } else {
        g.fillStyle = "#0e1d24";
        g.fillRect(o.x - 25, o.y - 25, 50, 50);
        g.fillStyle = o.done ? "#70d0b0" : "#e8ad66";
        g.fillRect(o.x - 18, o.y - 18, 36, 18);
        g.fillStyle = "#72858a";
        for (let i = 0; i < 5; i++) g.fillRect(o.x - 16 + i * 7, o.y + 8, 3, 3);
        if (!o.done) {
          g.fillStyle = "#d9eded";
          g.fillText(
            X.profile.settings.keys.interact.replace("Key", "") +
              " · " +
              Math.round((o.progress / 1.5) * 100) +
              "%",
            o.x,
            o.y - 38,
          );
        } else if (
          game.level.mode === "defend" &&
          o === game.objectives[0] &&
          game.coreHp < X.C.coreMaxHp &&
          game.coreHp > 0
        ) {
          g.fillStyle = game.repairing ? "#8de7b4" : "#f1c879";
          g.fillText(
            X.profile.settings.keys.interact.replace("Key", "") +
              (game.repairing
                ? " · РЕМОНТ +" + X.C.coreRepairRate + " HP/с"
                : " · УДЕРЖИВАЙТЕ: РЕМОНТ"),
            o.x,
            o.y - 38,
          );
        }
      }
    }
    for (const l of game.loot)
      if (visible(l.x, l.y)) {
        if (l.kind === "health") {
          g.fillStyle = "#071c1ddd";
          g.fillRect(l.x - 12, l.y - 12, 24, 24);
          g.fillStyle = "#b7e8bd";
          g.fillRect(l.x - 2, l.y - 8, 4, 16);
          g.fillRect(l.x - 8, l.y - 2, 16, 4);
        } else {
          const a = l.ammoType || X.Loot.types()[0] || "light",
            data = X.ammo[a];
          X.Loot.drawIcon(g, l.x, l.y, a, 0.8);
          g.font = "bold 8px Segoe UI";
          g.textAlign = "center";
          g.fillStyle = "#07131ddd";
          g.fillRect(l.x - 22, l.y + 13, 44, 11);
          g.fillStyle = data.color;
          g.fillText(data.short, l.x, l.y + 21);
        }
      }
    let hover = null,
      hoverDistance = 60;
    for (const l of game.loot) {
      const distance = Math.hypot(
        l.x - (game.mouse.x + cx),
        l.y - (game.mouse.y + cy),
      );
      if (distance < hoverDistance) {
        hover = l;
        hoverDistance = distance;
      }
    }
    if (hover) {
      const type = hover.ammoType,
        text =
          hover.kind === "health"
            ? "АПТЕЧКА"
            : type
              ? X.ammo[type].name +
                " +" +
                X.Loot.quantity(type, hover.amount, game.diff)
              : "КОМПЛЕКТ СНАБЖЕНИЯ";
      g.font = "bold 12px Segoe UI";
      g.textAlign = "center";
      const width = g.measureText(text).width + 14,
        tipX = Math.max(
          cx + width / 2 + 6,
          Math.min(cx + 1152 - width / 2 - 6, game.mouse.x + cx),
        ),
        tipY = Math.max(cy + 20, game.mouse.y + cy - 38);
      g.fillStyle = "#07131dee";
      g.fillRect(tipX - width / 2, tipY - 14, width, 20);
      g.fillStyle = type ? X.ammo[type].color : "#b7e8bd";
      g.fillText(text, tipX, tipY);
    }
    for (const e of game.enemies.items)
      if (e.active && visible(e.x, e.y)) {
        const d = X.enemies[e.type];
        g.save();
        g.translate(e.x, e.y);
        g.rotate(e.angle || 0);
        if (d.kind === "cloak" && Math.sin(e.age * 1.3) > 0)
          g.globalAlpha = 0.24;
        let size = d.boss ? 150 : 100;
        g.drawImage(
          this.sprites[e.type],
          -size / 2,
          -size / 2 + Math.sin(e.phase) * 1.5,
          size,
          size,
        );
        g.restore();
        if (e.burn > 0 || e.poolFire > 0)
          this.drawBurn(g, e, game.time, Math.max(e.burn, e.poolFire || 0));
        if (e.elite || d.boss) {
          g.fillStyle = "#1a1015";
          g.fillRect(e.x - 23, e.y - e.r - 15, 46, 4);
          g.fillStyle = d.boss ? "#e58c71" : "#c993ef";
          g.fillRect(
            e.x - 23,
            e.y - e.r - 15,
            46 * Math.max(0, e.hp / e.maxHp),
            4,
          );
        }
      }
    for (const s of game.shots.items)
      if (s.active && visible(s.x, s.y)) {
        if (this.drawEnergyShot(g, s, game.time)) continue;
        // Chunky hot core + crisp pixel tracer, tuned for the game's canvas palette.
        const soft = !s.payload && ["flame", "plasma"].includes(s.kind);
        g.save();
        g.strokeStyle = s.color;
        g.lineWidth =
          s.kind === "rail" ? 5 : s.kind === "flame" ? 12 : s.radius * 1.4;
        g.globalAlpha = soft
          ? s.kind === "flame"
            ? 0.32
            : 0.75
          : s.kind === "flame"
            ? 0.5
            : 1;
        g.beginPath();
        g.moveTo(s.oldX, s.oldY);
        g.lineTo(s.x - s.vx * 0.013, s.y - s.vy * 0.013);
        g.stroke();
        g.globalAlpha = soft ? 0.1 : 0.32;
        g.strokeStyle = s.color;
        g.lineWidth = Math.max(1, s.radius * (soft ? 1.8 : 3.2));
        g.beginPath();
        g.moveTo(s.oldX, s.oldY);
        g.lineTo(s.x, s.y);
        g.stroke();
        g.globalAlpha = 1;
        g.fillStyle = "#f2f4dc";
        const px = s.kind === "rail" ? 4 : 2;
        g.fillRect(
          Math.round(s.x / 2) * 2 - px / 2,
          Math.round(s.y / 2) * 2 - px / 2,
          px,
          px,
        );
        if (s.payload) {
          g.fillStyle = s.payload === "sticky" ? "#78efcf" : "#ffb763";
          g.beginPath();
          g.arc(s.x, s.y, s.radius, 0, 7);
          g.fill();
          if (s.stuck) {
            g.strokeStyle = "#d6fff2";
            g.lineWidth = 2;
            g.beginPath();
            g.arc(
              s.x,
              s.y,
              s.radius + 5,
              -Math.PI / 2,
              -Math.PI / 2 + Math.PI * 2 * Math.max(0, s.life / s.fuse),
            );
            g.stroke();
          }
        }
        g.restore();
      }
    g.globalAlpha = 1;
    for (let i = game.blasts.length - 1; i >= 0; i--) {
      const b = game.blasts[i];
      if (game.state === "play") b.life -= dt;
      if (b.life <= 0) {
        game.blasts.splice(i, 1);
        continue;
      }
      const r = b.r * (1 - b.life / 0.5);
      const age = 1 - b.life / 0.5;
      g.globalAlpha = Math.min(1, b.life * 2);
      let fire = g.createRadialGradient(b.x, b.y, 0, b.x, b.y, r);
      fire.addColorStop(0, "#fff6d6");
      fire.addColorStop(0.3, "#ffc364");
      fire.addColorStop(0.65, "#d4582d88");
      fire.addColorStop(1, "#a0321600");
      g.fillStyle = fire;
      g.fillRect(b.x - r, b.y - r, r * 2, r * 2);
      g.strokeStyle = "#ffe3ae";
      g.lineWidth = Math.max(1, 5 * (1 - age));
      g.beginPath();
      g.arc(b.x, b.y, r * (0.76 + age * 0.24), 0, 7);
      g.stroke();
      // A second, broken ring and short square embers sell the impact at game scale.
      g.globalAlpha = Math.min(1, b.life * 2) * 0.72;
      g.strokeStyle = age < 0.45 ? "#fff1bd" : "#ff884c";
      g.lineWidth = 2;
      g.setLineDash([5, 7]);
      g.beginPath();
      g.arc(b.x, b.y, r * 0.58, age * 2, age * 2 + Math.PI * 1.55);
      g.stroke();
      g.setLineDash([]);
      for (let spark = 0; spark < 8; spark++) {
        const a = (spark * Math.PI) / 4 + 0.2;
        const d = r * (0.42 + ((spark * 7) % 3) * 0.15);
        g.fillStyle = spark % 2 ? "#fff0bd" : "#ff9356";
        g.fillRect(
          Math.round((b.x + Math.cos(a) * d) / 2) * 2,
          Math.round((b.y + Math.sin(a) * d) / 2) * 2,
          3,
          3,
        );
      }
    }
    g.globalAlpha = 1;
    g.save();
    g.translate(p.x, p.y);
    g.rotate(p.angle);
    this.marine(g, game);
    if (game.muzzle > 0) {
      const kind = X.weapons[game.weapon].kind;
      if (["flame", "plasma"].includes(kind)) {
        g.save();
        g.globalAlpha = kind === "flame" ? 0.55 : 0.65;
        g.drawImage(
          this.projectileSprites[kind === "flame" ? 0 : 1][
            Math.floor(game.time * 24) % 16
          ],
          8,
          -2,
          40,
          20,
        );
        g.restore();
      } else {
        g.fillStyle = X.weapons[game.weapon].color;
        g.beginPath();
        g.moveTo(33, 4);
        g.lineTo(51, -3);
        g.lineTo(45, 7);
        g.lineTo(55, 15);
        g.lineTo(33, 13);
        g.fill();
      }
    }
    if (p.invuln > 0) {
      g.strokeStyle = "#7ce2db88";
      g.lineWidth = 2;
      g.strokeRect(-19, -23, 42, 46);
    }
    g.restore();
    if (game.arc && game.arc.life > 0) {
      if (game.state === "play") game.arc.life -= dt;
      g.strokeStyle = "#95ffdb";
      g.lineWidth = 7;
      g.beginPath();
      g.arc(
        p.x,
        p.y,
        80,
        game.arc.alt ? 0 : game.arc.angle - 1.1,
        game.arc.alt ? 7 : game.arc.angle + 1.1,
      );
      g.stroke();
    }
    if (game.weapon === 0 && game.gunState.parry > 0) {
      g.strokeStyle = "#baffef";
      g.lineWidth = 5;
      g.beginPath();
      g.arc(p.x, p.y, 55, p.angle - 1.65, p.angle + 1.65);
      g.stroke();
    }
    if (game.pulse?.life > 0) {
      const o = game.pulse;
      if (game.state === "play") o.life -= dt;
      g.strokeStyle = "#8bf3f3";
      g.globalAlpha = Math.max(0, o.life * 4);
      g.lineWidth = 7;
      g.beginPath();
      g.arc(
        o.x,
        o.y,
        o.range * (1 - o.life / 0.3),
        o.angle - 0.6,
        o.angle + 0.6,
      );
      g.stroke();
      g.globalAlpha = 1;
    }
    if (game.weapon === 5 && game.mouse.right) {
      g.strokeStyle = "#d4c78f";
      g.lineWidth = 3;
      g.strokeRect(p.x - 27, p.y - 27, 54, 54);
    }
    if (game.beams)
      for (let i = game.beams.length - 1; i >= 0; i--) {
        const b = game.beams[i];
        if (game.state === "play") b.life -= dt;
        if (b.life <= 0) {
          game.beams.splice(i, 1);
          continue;
        }
        g.strokeStyle = b.color;
        g.lineWidth = b.width || 3;
        g.beginPath();
        g.moveTo(b.x, b.y);
        g.lineTo(
          (b.x + b.tx) / 2 + Math.sin(b.life * 200) * 10,
          (b.y + b.ty) / 2 + 9,
        );
        g.lineTo(b.tx, b.ty);
        g.stroke();
      }
    for (const o of game.particles.items)
      if (o.active && visible(o.x, o.y)) {
        g.globalAlpha = Math.min(1, o.life * 4);
        g.fillStyle = o.color;
        g.fillRect(o.x, o.y, o.size, o.size);
      }
    g.globalAlpha = 1;
    if (X.profile.settings.lights && !X.profile.settings.darkMode) {
      let gradient = g.createRadialGradient(p.x, p.y, 100, p.x, p.y, 680);
      gradient.addColorStop(0, "#00000000");
      gradient.addColorStop(1, "#02050caf");
      g.fillStyle = gradient;
      g.fillRect(cx, cy, 1152, 648);
      g.globalCompositeOperation = "screen";
      g.fillStyle = "#83d0c010";
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.angle);
      g.beginPath();
      g.moveTo(15, 0);
      g.arc(15, 0, 370, -0.3, 0.3);
      g.closePath();
      g.fill();
      g.restore();
      g.fillStyle = "#83d0c010";
      g.beginPath();
      g.arc(p.x, p.y, 130, 0, 7);
      g.fill();
      g.globalCompositeOperation = "source-over";
    }
    this.lighting(g, game, cx, cy);
    // Метка цели поверх существ и освещения, но в мировых координатах.
    for (const e of game.enemies.items)
      if (
        e.active &&
        visible(e.x, e.y) &&
        (e.weakTime > 0 || e.cripple > 0 || e.suppressed > 0)
      ) {
        g.strokeStyle =
          e.weakTime > 0 ? "#ffc76a" : e.cripple > 0 ? "#89eaff" : "#efdd8c";
        g.lineWidth = 2;
        g.beginPath();
        g.arc(e.x, e.y, e.r + 7, 0, 7);
        g.stroke();
        g.fillStyle = g.strokeStyle;
        g.font = "bold 11px Segoe UI";
        g.textAlign = "center";
        g.fillText(
          e.weakTime > 0
            ? "МЕТКА " + e.weakTime.toFixed(1)
            : e.cripple > 0
              ? "СКОВАН"
              : "ПОДАВЛЕН",
          e.x,
          e.y - e.r - 12,
        );
      }
    const core = game.objectives[0];
    this.drawRevival(g, game);
    if (core && visible(core.x, core.y)) this.defenseHealth(g, game);
    g.restore();
    this.revivalFlash(g, game);
    if (game.damageFlash > 0) {
      g.fillStyle = "rgba(180,33,25," + game.damageFlash * 0.3 + ")";
      g.fillRect(0, 0, 1152, 648);
    }
    if (game.state === "play") this.crosshair(g, game);
    if (game.mapOpen) this.minimap(g, game);
  },
  defenseHealth(g, game) {
    if (game.level.mode !== "defend" || !game.objectives[0]) return;
    const core = game.objectives[0],
      ratio = Math.max(0, Math.min(1, game.coreHp / X.C.coreMaxHp)),
      color = ratio > 0.5 ? "#70d0b0" : ratio > 0.25 ? "#efb45c" : "#f16f68";
    g.save();
    g.fillStyle = "#07131df0";
    g.fillRect(core.x - 76, core.y - 86, 152, 36);
    g.font = "bold 11px Segoe UI";
    g.textAlign = "center";
    g.fillStyle = "#e4f7ed";
    g.fillText(
      "ПЕРЕДАТЧИК · " + Math.ceil(ratio * 100) + "%",
      core.x,
      core.y - 72,
    );
    g.fillStyle = "#293b44";
    g.fillRect(core.x - 68, core.y - 64, 136, 8);
    g.fillStyle = color;
    g.fillRect(core.x - 68, core.y - 64, 136 * ratio, 8);
    g.restore();
  },
  backdrop(g) {
    g.strokeStyle = "#2b424944";
    for (let i = 0; i < 30; i++) {
      g.beginPath();
      g.moveTo(i * 64, 0);
      g.lineTo(i * 64 - 300, 648);
      g.stroke();
    }
    g.fillStyle = "#6dd7bb";
    g.font = "14px Segoe UI";
    g.fillText("КАРАНТИН / СЕКТОР 07", 850, 580);
  },
  crosshair(g, game) {
    let x = game.mouse.x,
      y = game.mouse.y;
    g.strokeStyle = "#b9e9db";
    g.lineWidth = 1;
    g.beginPath();
    for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
      g.moveTo(x + Math.cos(a) * 5, y + Math.sin(a) * 5);
      g.lineTo(x + Math.cos(a) * 12, y + Math.sin(a) * 12);
    }
    g.stroke();
    g.fillStyle = "#ecbd85";
    g.fillRect(x - 1, y - 1, 2, 2);
    const reloading = game.reload > 0;
    if (reloading) {
      const progress = Math.max(
        0,
        Math.min(
          1,
          1 - game.reload / (game.reloadTotal || X.weapons[game.weapon].reload),
        ),
      );
      g.lineWidth = 3;
      g.strokeStyle = "#172c35ee";
      g.beginPath();
      g.arc(x, y, 20, 0, Math.PI * 2);
      g.stroke();
      g.strokeStyle = "#ffc47a";
      g.beginPath();
      g.arc(x, y, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
      g.stroke();
      g.lineWidth = 2;
      g.strokeStyle = "#fff1cf";
      g.beginPath();
      g.arc(x, y, 24, game.time * 6, game.time * 6 + 0.65);
      g.stroke();
    }
    const label = game.ammoStatus().text;
    g.font = "bold 13px Bahnschrift,Segoe UI";
    g.textAlign = "center";
    const tx = Math.max(70, Math.min(1082, x)),
      ty = Math.min(reloading ? 580 : 620, y + 38);
    g.fillStyle = "#07131de0";
    g.fillRect(
      tx - g.measureText(label).width / 2 - 6,
      ty - 13,
      g.measureText(label).width + 12,
      19,
    );
    g.fillStyle = reloading ? "#ffd39a" : "#e4f7ed";
    g.fillText(label, tx, ty);
    if (reloading) {
      g.globalAlpha = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(game.time * 10));
      g.fillStyle = "#ffc47a";
      g.strokeStyle = "#07131d";
      g.lineWidth = 4;
      g.strokeText("ПЕРЕЗАРЯДКА", tx, ty + 20);
      g.fillText("ПЕРЕЗАРЯДКА", tx, ty + 20);
      g.globalAlpha = 1;
      g.font = "11px Segoe UI";
      g.fillText(game.reload.toFixed(1) + " с", tx, ty + 35);
    } else if (X.weapons[game.weapon].ammo && game.ammoStatus().total === 0) {
      g.fillStyle = "#ff947b";
      g.fillText("НЕТ ПАТРОНОВ · 1: КЛИНОК", tx, Math.min(642, ty + 18));
    }
  },
  minimap(g, game) {
    const m = game.map,
      s = Math.min(12, 570 / m.h),
      x = 576 - (m.w * s) / 2,
      y = 324 - (m.h * s) / 2;
    g.fillStyle = "#050c15ee";
    g.fillRect(x - 20, y - 20, m.w * s + 40, m.h * s + 40);
    for (let j = 0; j < m.h; j++)
      for (let i = 0; i < m.w; i++) {
        g.fillStyle = m.cells[j * m.w + i] ? "#263c47" : "#647475";
        g.fillRect(x + i * s, y + j * s, s - 1, s - 1);
      }
    let dot = (p, c, r) => {
      g.fillStyle = c;
      g.fillRect(x + (p.x / 48) * s - r, y + (p.y / 48) * s - r, r * 2, r * 2);
    };
    for (const o of game.objectives) if (!o.done) dot(o, "#efaf65", 4);
    dot(game.exit, "#6fe6bd", 5);
    dot(game.player, "#fff", 4);
    g.fillStyle = "#d4e7e9";
    g.textAlign = "center";
    g.font = "14px Segoe UI";
    g.fillText(
      "КАРТА · " +
        X.profile.settings.keys.map.replace("Key", "") +
        " · оранжевый: задача / зелёный: выход",
      576,
      y - 30,
    );
  },
};
