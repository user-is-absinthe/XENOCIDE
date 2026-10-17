"use strict";
Object.assign(X.Game.prototype, {
  newGunState() {
    return {
      combo: 0,
      comboTimer: 0,
      parry: 0,
      parryCooldown: 0,
      pistolStreak: 0,
      sniperStreak: 0,
      machineHeat: 0,
    };
  },
  gunStep(dt) {
    const s = this.gunState;
    for (const k of ["comboTimer", "parry", "parryCooldown"])
      s[k] = Math.max(0, s[k] - dt);
    if (!s.comboTimer) s.combo = 0;
    if (
      this.weapon !== 5 ||
      !this.mouse.left ||
      this.reload > 0 ||
      this.repairing
    )
      s.machineHeat = Math.max(0, s.machineHeat - 0.3 * dt);
  },
  requireAmmo(cost) {
    if (X.Debug.enabled("noReload") && this.mags[this.weapon] < cost)
      this.beginReload();
    if (this.mags[this.weapon] >= cost) return true;
    this.beginReload();
    this.cool = 0.2;
    if (this.clock >= (this.ammoNotice || 0)) {
      X.UI.toast(
        "Для этой атаки нужно " +
          cost +
          " патронов в магазине. ЛКМ — обычный огонь; R — перезарядка.",
        1800,
      );
      this.ammoNotice = this.clock + 2;
    }
    return false;
  },
  fieldAttackFX(w) {
    this.muzzle = 0.055;
    this.stats.shots++;
    this.cool = w.rate;
    this.shake = Math.max(this.shake, w.recoil || 0);
    X.Audio.play(w.kind);
  },
  fireFieldWeapon(alt) {
    const base = X.weapons[this.weapon],
      w = X.Armory.stats(base, alt),
      s = this.gunState,
      p = this.player;
    if (base.id === "blade") {
      if (alt) {
        if (s.parryCooldown > 0) return;
        s.parry = w.parryWindow;
        s.parryCooldown = w.rate;
        this.fieldAttackFX(w);
        this.cool = 0.2;
        this.arc = { angle: p.angle, life: 0.2, alt: true };
        return;
      }
      const phase = s.comboTimer > 0 ? s.combo : 0;
      const damage = w.damage * [1, 1.3, 1.75][phase];
      s.combo = (phase + 1) % 3;
      s.comboTimer = 1;
      this.hash.query(p.x, p.y, w.range + 60, (e) => {
        const a = Math.atan2(e.y - p.y, e.x - p.x) - p.angle;
        if (
          Math.hypot(e.x - p.x, e.y - p.y) < w.range + e.r &&
          Math.cos(a) > 0.36 &&
          this.map.line(p.x, p.y, e.x, e.y)
        ) {
          this.hurtEnemy(e, damage, w.type);
          e.stun = Math.max(e.stun, 0.15);
        }
      });
      for (const o of this.objectives)
        if (
          o.kind === "nest" &&
          !o.done &&
          Math.hypot(o.x - p.x, o.y - p.y) < w.range + 34 &&
          this.map.line(p.x, p.y, o.x, o.y)
        ) {
          o.hp -= damage;
          if (o.hp <= 0) {
            o.done = true;
            this.earned += 200;
            this.explode(o.x, o.y, 80, 80, false);
          }
        }
      this.arc = { angle: p.angle, life: 0.15, alt: false };
      this.fieldAttackFX(w);
      return;
    }
    if (base.id === "rifle" && !alt) {
      this.fireRifle(false);
      return;
    }
    let cost =
      alt && base.id === "smg"
        ? Math.min(w.count, this.mags[this.weapon])
        : w.cost;
    if (!this.requireAmmo(Math.max(1, cost))) return;
    this.mags[this.weapon] -= cost;
    this.fieldAttackFX(w);
    if (base.id === "rifle" && alt) {
      this.hash.query(p.x, p.y, w.range + 70, (e) => {
        const a = Math.atan2(e.y - p.y, e.x - p.x),
          distance = Math.hypot(e.x - p.x, e.y - p.y);
        if (
          distance < w.range + e.r &&
          Math.cos(a - p.angle) > Math.cos(0.6) &&
          this.map.line(p.x, p.y, e.x, e.y)
        ) {
          this.hurtEnemy(e, w.damage, w.type);
          const push = w.knockback * (e.boss ? 0.25 : 1),
            steps = Math.ceil(push / 6);
          for (let i = 0; i < steps; i++)
            this.map.move(
              e,
              (Math.cos(a) * push) / steps,
              (Math.sin(a) * push) / steps,
            );
          e.pathIndex = -1;
          e.losTimer = 0;
          this.interruptEnemy(e, w.interrupt);
          e.stun = Math.max(e.stun, 0.25 * (e.boss ? 0.25 : 1));
        }
      });
      for (const o of this.objectives)
        if (
          o.kind === "nest" &&
          !o.done &&
          Math.hypot(o.x - p.x, o.y - p.y) < w.range &&
          Math.cos(Math.atan2(o.y - p.y, o.x - p.x) - p.angle) >
            Math.cos(0.6) &&
          this.map.line(p.x, p.y, o.x, o.y)
        ) {
          o.hp -= w.damage;
          if (o.hp <= 0) {
            o.done = true;
            this.earned += 200;
          }
        }
      this.pulse = {
        x: p.x,
        y: p.y,
        angle: p.angle,
        range: w.range,
        life: 0.25,
      };
    } else if (base.id === "smg" && alt) {
      for (let i = 0; i < cost; i++)
        this.modeShot(
          { ...w, kind: "ricochet" },
          p.angle + (i - (cost - 1) / 2) * 0.12,
          w.damage,
        );
    } else {
      let damage = w.damage;
      const key = base.id === "pistol" ? "pistolStreak" : "sniperStreak";
      if (!alt && ["pistol", "sniper"].includes(base.id))
        damage *= 1 + s[key] * w.seriesStep;
      if (base.id === "machine") {
        if (!alt) {
          damage *= 1 + s.machineHeat * w.heatBonus;
          s.machineHeat = Math.min(1, s.machineHeat + 0.1);
          this.cool *= 1 - this.spin * 0.55;
        }
      }
      const spread =
        w.spread *
        (this.moving && base.id !== "smg"
          ? base.id === "machine" && alt
            ? 1
            : 2
          : 1);
      this.modeShot(
        {
          ...w,
          ownerID: base.id,
          trackSeries: !alt && ["pistol", "sniper"].includes(base.id),
          weakTime: alt ? w.weakTime : 0,
          weakFactor: alt ? w.weakFactor : 0,
          cripple: alt ? w.cripple : 0,
          suppress: alt ? w.suppress : 0,
        },
        p.angle + (this.rng.next() - 0.5) * spread,
        damage,
      );
    }
    this.autoReload();
  },
  interruptEnemy(e, duration) {
    const t = duration * (e.boss ? 0.25 : 1);
    e.interrupt = Math.max(e.interrupt || 0, t);
    e.attack = Math.max(e.attack, t);
    e.special = Math.max(e.special, t);
  },
  fieldHit(s, e) {
    if (!s.hitAny && s.trackSeries) {
      const key = s.ownerID === "pistol" ? "pistolStreak" : "sniperStreak";
      this.gunState[key] = Math.min(
        s.ownerID === "pistol" ? 5 : 4,
        this.gunState[key] + 1,
      );
    }
    s.hitAny = true;
    this.hurtEnemy(e, s.damage, s.type, s.armorPierce);
    if (!e.active) return;
    if (s.weakTime) {
      for (const o of this.enemies.items) if (o.active) o.weakTime = 0;
      e.weakTime = s.weakTime;
      e.weakFactor = s.weakFactor;
    }
    if (s.cripple) {
      e.cripple = Math.max(e.cripple || 0, s.cripple * (e.boss ? 0.25 : 1));
      this.interruptEnemy(e, s.cripple);
    }
    if (s.suppress) {
      e.suppressed = Math.max(
        e.suppressed || 0,
        s.suppress * (e.boss ? 0.25 : 1),
      );
      this.interruptEnemy(e, 0.3);
    }
  },
  fieldMiss(s) {
    if (s.trackSeries && !s.hitAny)
      this.gunState[s.ownerID === "pistol" ? "pistolStreak" : "sniperStreak"] =
        0;
  },
  parryProjectile(s) {
    const p = this.player;
    if (
      this.weapon !== 0 ||
      this.gunState.parry <= 0 ||
      !s.enemy ||
      Math.hypot(s.x - p.x, s.y - p.y) > p.r + s.radius + 40 ||
      !this.map.line(p.x, p.y, s.x, s.y) ||
      Math.cos(Math.atan2(s.y - p.y, s.x - p.x) - p.angle) < -0.1
    )
      return false;
    const w = X.Armory.stats(X.weapons[0], true),
      speed = Math.max(500, Math.hypot(s.vx, s.vy));
    s.enemy = false;
    s.type = "energy";
    s.kind = "reflected";
    s.damage *= w.reflect * (1 + 0.1 * X.profile.upgrades.power);
    s.vx = Math.cos(p.angle) * speed;
    s.vy = Math.sin(p.angle) * speed;
    s.life = 1.6;
    s.hit.clear();
    s.color = "#8ffff0";
    this.fx(s.x, s.y, "#c4fff2", 8, 100);
    X.Audio.play("blade");
    return true;
  },
  parryMelee(source) {
    const p = this.player;
    if (
      this.weapon !== 0 ||
      this.gunState.parry <= 0 ||
      !source ||
      Math.cos(Math.atan2(source.y - p.y, source.x - p.x) - p.angle) < -0.1
    )
      return false;
    const w = X.Armory.stats(X.weapons[0], true);
    this.hurtEnemy(source, w.damage, "energy");
    this.interruptEnemy(source, 0.6);
    source.stun = 0.3;
    this.fx(source.x, source.y, "#c4fff2", 8, 100);
    return true;
  },
  fireUmbrella(w, cost) {
    const p = this.player,
      inner = w.blast + p.r + 8,
      outerCount = w.rings === 2 && cost >= 8 ? Math.floor(cost * 0.28) : 0;
    for (const [count, distance, offset] of [
      [cost - outerCount, inner, 0],
      [outerCount, inner + w.blast * 1.5, 0.35],
    ])
      for (let i = 0; i < count; i++)
        this.modeShot(
          { ...w, umbrella: true, count: cost, range: distance - 25 },
          p.angle + offset + (i * Math.PI * 2) / count,
          w.damage,
        );
  },
  shotExplosion(s, x = s.x, y = s.y) {
    // Отскок от стены или движение бойца не должны накрыть его своим зонтиком.
    const radius = s.umbrella
      ? Math.min(
          s.blast,
          Math.max(
            0,
            Math.hypot(x - this.player.x, y - this.player.y) -
              this.player.r -
              6,
          ),
        )
      : s.blast;
    if (radius > 3) this.explode(x, y, radius, s.damage, s.enemy);
    else this.fx(x, y, s.color, 4, 40);
  },
  gunHint() {
    const s = this.gunState;
    if (this.weapon === 0)
      return (
        "Комбо " +
        (s.combo + 1) +
        "/3 · парирование " +
        (s.parry > 0
          ? "АКТИВНО"
          : s.parryCooldown > 0
            ? s.parryCooldown.toFixed(1) + " с"
            : "ГОТОВО")
      );
    if (this.weapon === 1)
      return "Точная серия " + s.pistolStreak + "/5 · ПКМ: метка за 2 патрона";
    if (this.weapon === 5)
      return this.mouse.right
        ? "УПОР · скорость 20% · без рывка"
        : "Нагрев " + Math.round(s.machineHeat * 100) + "%";
    if (this.weapon === 6)
      return (
        "Точная серия " + s.sniperStreak + "/4 · ПКМ: сковывание за 2 патрона"
      );
    return "";
  },
});
