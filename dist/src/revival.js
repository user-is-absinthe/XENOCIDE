"use strict";
Object.assign(X.Game.prototype, {
  tryRevive() {
    const p = this.player;
    if (
      this.state !== "play" ||
      !p ||
      p.hp > 0 ||
      X.profile.upgrades.secondChance !== 1
    )
      return false;
    X.profile.upgrades.secondChance = 0;
    p.hp = p.maxHp;
    p.invuln = 3;
    this.cancelBurst();
    this.cool = Math.max(0.2, this.cool);
    this.damageFlash = 0;
    this.shake = 7;
    this.reviveFX = { life: 2.4 };
    for (const e of this.enemies.items)
      if (e.active) {
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d < 210 && this.map.line(p.x, p.y, e.x, e.y)) {
          const a = d > 0.1 ? Math.atan2(e.y - p.y, e.x - p.x) : e.phase,
            push = 95 * (1 - d / 210) * (e.boss ? 0.25 : 1),
            steps = Math.max(1, Math.ceil(push / 6));
          for (let i = 0; i < steps; i++)
            this.map.move(
              e,
              (Math.cos(a) * push) / steps,
              (Math.sin(a) * push) / steps,
            );
          e.stun = Math.max(e.stun, 0.8 * (e.boss ? 0.25 : 1));
          e.attack = Math.max(e.attack, 0.8 * (e.boss ? 0.25 : 1));
          e.pathIndex = -1;
          e.losTimer = 0;
        }
      }
    for (const s of this.shots.items)
      if (s.active && s.enemy && Math.hypot(s.x - p.x, s.y - p.y) < 190)
        s.active = false;
    this.fx(p.x, p.y, "#aaffed", 55, 240);
    this.fx(p.x, p.y, "#c5a9ff", 25, 160);
    X.Audio.play("revive", 2);
    X.Audio.play("pickup", 1.5);
    X.UI.toast("ВТОРОЙ ШАНС · имплант израсходован · защитное поле 3 с", 3200);
    // Записываем живое состояние и уже потраченный имплант одним снимком.
    this.checkpoint();
    return true;
  },
});
Object.assign(X.Render, {
  drawRevival(g, game) {
    const o = game.reviveFX;
    if (!o) return;
    const p = game.player,
      t = 2.4 - o.life,
      progress = t / 2.4,
      fade = Math.min(1, o.life / 0.5),
      q = X.profile.settings.quality;
    g.save();
    g.translate(p.x, p.y);
    g.globalAlpha = fade;
    const glow = g.createRadialGradient(0, 0, 5, 0, 0, 120);
    glow.addColorStop(0, "#c9fff860");
    glow.addColorStop(0.5, "#3be9d92b");
    glow.addColorStop(1, "#46aaff00");
    g.fillStyle = glow;
    g.fillRect(-120, -120, 240, 240);
    for (let ring = 0; ring < 3; ring++) {
      const r = 22 + (180 - ring * 30) * (1 - Math.pow(1 - progress, 3));
      g.strokeStyle = ring === 1 ? "#c7a6ff" : "#a4fff0";
      g.lineWidth = ring === 0 ? 4 : 2;
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 + t * (ring % 2 ? -1 : 1) + ring * 0.2;
        g.beginPath();
        g.arc(0, 0, r, a, a + 0.78);
        g.stroke();
      }
    }
    g.strokeStyle = "#ddfff8";
    g.lineWidth = 2;
    g.beginPath();
    for (let i = 0; i <= 6; i++) {
      const a = (i * Math.PI) / 3 - t * 0.7,
        r = 42 + Math.sin(t * 8) * 3;
      const x = Math.cos(a) * r,
        y = Math.sin(a) * r;
      if (!i) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
    // Сборка силуэта: короткие сканирующие полосы и восходящие искры.
    g.fillStyle = "#a8fff5";
    for (let i = 0; i < (q === 0 ? 6 : 12); i++) {
      const y = 32 - ((t * 85 + i * 17) % 125),
        x = Math.sin(i * 2.399) * 42;
      g.globalAlpha = fade * 0.55;
      g.fillRect(x, y, 2, 8 + (i % 5));
    }
    for (let i = 0; i < 5; i++) {
      g.globalAlpha = fade * (0.18 + 0.12 * Math.sin(t * 12 + i));
      g.fillRect(-21, -24 + i * 11, 42, 2);
    }
    g.globalAlpha = fade;
    g.textAlign = "center";
    g.font = "bold 18px Bahnschrift,Segoe UI";
    g.lineWidth = 4;
    g.strokeStyle = "#071b24";
    g.fillStyle = "#caffed";
    g.strokeText("ВТОРОЙ ШАНС", 0, -83);
    g.fillText("ВТОРОЙ ШАНС", 0, -83);
    g.font = "bold 11px Segoe UI";
    g.fillStyle = "#c9baff";
    g.fillText("ИМПЛАНТ ИЗРАСХОДОВАН", 0, -64);
    g.restore();
  },
  revivalFlash(g, game) {
    if (!game.reviveFX) return;
    const t = 2.4 - game.reviveFX.life;
    if (t > 0.22) return;
    g.save();
    g.globalAlpha = 0.2 * (1 - t / 0.22);
    g.fillStyle = "#acfff2";
    g.fillRect(0, 0, 1152, 648);
    g.restore();
  },
});
