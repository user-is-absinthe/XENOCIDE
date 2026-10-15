"use strict";
X.Render = {
  canvas: document.getElementById("game"),
  sprites: [],
  floor: null,
  init() {
    this.ctx = this.canvas.getContext("2d", { alpha: false });
    this.ctx.imageSmoothingEnabled = false;
    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.sprites = X.enemies.map((d) => this.sprite(d));
    this.burnSprites = [0, 1, 2].map((quality) =>
      Array.from({ length: 12 }, (_, frame) => this.burnSprite(frame, quality)),
    );
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
  drawBurn(g, e, time) {
    const frames = this.burnSprites[X.profile.settings.quality],
      frame = Math.floor(time * 12 + e.phase * 2) % frames.length,
      scale = (e.r * 2 + 18) / 64;
    g.save();
    g.globalAlpha = Math.min(1, e.burn / 0.35);
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
    c.width = c.height = 100;
    const g = c.getContext("2d");
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
    g.fillStyle = d.color;
    g.beginPath();
    g.ellipse(0, -2, r * 0.82, r * 0.56, 0, 0, 7);
    g.fill();
    g.fillStyle = "#d0dbad";
    for (let i = 0; i < 4; i++)
      g.fillRect(-r * 0.6 + i * 6, -r * 0.4, 3, r * 0.7);
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
      g.fillStyle = "#d1d8cf";
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.moveTo(-r * 0.7 + i * 9, -r * 0.65);
        g.lineTo(-r * 0.2 + i * 9, -r * 0.6);
        g.lineTo(i * 9, r * 0.5);
        g.lineTo(-r * 0.7 + i * 9, r * 0.55);
        g.fill();
      }
      g.fillStyle = "#667985";
      g.fillRect(-r * 0.6, -3, r, 5);
    }
    if (d.kind === "acid" || d.kind === "suicide") {
      g.fillStyle = d.kind === "acid" ? "#c7e36f" : "#efb261";
      g.beginPath();
      g.ellipse(-r * 0.4, 0, r * 0.65, r * 0.65, 0, 0, 7);
      g.fill();
      g.fillStyle = "#fff6b755";
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
    return c;
  },
  prepare(game) {
    let m = game.map,
      c = document.createElement("canvas");
    c.width = m.w * 48;
    c.height = m.h * 48;
    const g = c.getContext("2d"),
      rng = new X.RNG(game.number * 117);
    const palettes = [
      ["#202c32", "#24363d", "#40535a"],
      ["#242b31", "#2e343c", "#4d565d"],
      ["#26302e", "#2c3c39", "#5a6953"],
      ["#2c292c", "#393038", "#69505b"],
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
      }
    // Кэшированные коммуникации, предупредительные полосы и маркировка помещений.
    for (let y = 1; y < m.h - 1; y++)
      for (let x = 1; x < m.w - 1; x++)
        if (!m.cells[y * m.w + x]) {
          let px = x * 48,
            py = y * 48;
          if (m.cells[(y - 1) * m.w + x]) {
            g.fillStyle = "#101e25";
            g.fillRect(px, py + 3, 48, 9);
            g.fillStyle = "#687e83";
            g.fillRect(px, py + 4, 48, 2);
            g.fillStyle = game.level.theme === 3 ? "#bc7c9d" : "#78b9b4";
            if (x % 3 === 0) g.fillRect(px + 8, py + 7, 25, 2);
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
    let shake = X.profile.settings.shake ? game.shake : 0,
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
        if (e.burn > 0) this.drawBurn(g, e, game.time);
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
        g.strokeStyle = s.color;
        g.lineWidth =
          s.kind === "rail" ? 5 : s.kind === "flame" ? 12 : s.radius * 1.4;
        g.globalAlpha = s.kind === "flame" ? 0.5 : 1;
        g.beginPath();
        g.moveTo(s.oldX, s.oldY);
        g.lineTo(s.x - s.vx * 0.013, s.y - s.vy * 0.013);
        g.stroke();
        g.fillStyle = "#f2f4dc";
        g.fillRect(s.x - 1, s.y - 1, 3, 3);
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
      g.globalAlpha = b.life * 2;
      let fire = g.createRadialGradient(b.x, b.y, 0, b.x, b.y, r);
      fire.addColorStop(0, "#fff6d6");
      fire.addColorStop(0.3, "#ffc364");
      fire.addColorStop(0.65, "#d4582d88");
      fire.addColorStop(1, "#a0321600");
      g.fillStyle = fire;
      g.fillRect(b.x - r, b.y - r, r * 2, r * 2);
      g.strokeStyle = "#ffe3ae";
      g.lineWidth = 2;
      g.beginPath();
      g.arc(b.x, b.y, r, 0, 7);
      g.stroke();
    }
    g.globalAlpha = 1;
    g.save();
    g.translate(p.x, p.y);
    g.rotate(p.angle);
    g.fillStyle = "#0007";
    g.beginPath();
    g.ellipse(-2, 7, 23, 17, 0, 0, 7);
    g.fill();
    let walk =
      game.moving && game.state === "play" ? Math.sin(game.time * 16) * 5 : 0;
    g.fillStyle = "#192c38";
    g.fillRect(-13 + walk, -15, 16, 12);
    g.fillRect(-13 - walk, 4, 16, 12);
    g.fillStyle = "#b6cbcc";
    g.fillRect(-10, -13, 19, 26);
    g.fillStyle = "#3c6676";
    g.fillRect(-6, -11, 15, 22);
    g.fillStyle = "#d7a477";
    g.fillRect(4, -18, 14, 10);
    g.fillRect(4, 9, 15, 8);
    g.fillStyle = "#192f40";
    g.fillRect(5, -17, 10, 8);
    g.fillRect(5, 10, 10, 7);
    g.fillStyle = "#b7d7d8";
    g.fillRect(-5, -8, 16, 16);
    g.fillStyle = "#4dd6d4";
    g.fillRect(6, -6, 5, 12);
    g.fillStyle = "#18232d";
    g.fillRect(10, 5, 26, 7);
    g.fillStyle = "#8b9d9e";
    g.fillRect(20, 6, 17, 3);
    if (game.muzzle > 0) {
      g.fillStyle = X.weapons[game.weapon].color;
      g.beginPath();
      g.moveTo(33, 4);
      g.lineTo(51, -3);
      g.lineTo(45, 7);
      g.lineTo(55, 15);
      g.lineTo(33, 13);
      g.fill();
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
    if (game.beams)
      for (let i = game.beams.length - 1; i >= 0; i--) {
        const b = game.beams[i];
        if (game.state === "play") b.life -= dt;
        if (b.life <= 0) {
          game.beams.splice(i, 1);
          continue;
        }
        g.strokeStyle = b.color;
        g.lineWidth = 3;
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
    if (X.profile.settings.lights) {
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
    // Метка цели поверх существ и освещения, но в мировых координатах.
    const core = game.objectives[0];
    if (core && visible(core.x, core.y)) this.defenseHealth(g, game);
    g.restore();
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
