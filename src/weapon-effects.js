"use strict";
Object.assign(X.Game.prototype, {
  weaponCharge(alt = false) {
    const w = X.weapons[this.weapon];
    return X.Armory.has(w)
      ? X.Armory.charge(w, alt)
      : X.WeaponStats.charge(w, X.profile.weaponTuning[w.id] || 0);
  },
  fireModeWeapon(alt) {
    const base = X.weapons[this.weapon],
      w = X.Armory.stats(base, alt),
      p = this.player,
      available = this.mags[this.weapon];
    if (available <= 0) {
      this.autoReload();
      return;
    }
    let cost = 1;
    if (alt && w.id === "flame") {
      if (!this.requireAmmo(20)) return;
      cost = 20;
    }
    if (alt && ["shotgun", "plasma", "grenade"].includes(w.id))
      cost = available;
    if (alt && w.id === "rocket") cost = Math.min(available, w.count);
    if (alt && w.id === "rail") cost = Math.min(available, w.cost);
    const charged = w.id === "rail" && this.charge >= w.charge;
    this.mags[this.weapon] -= cost;
    this.cool = w.rate;
    this.stats.shots++;
    this.muzzle = 0.055;
    this.shake = Math.max(this.shake, w.recoil || 0);
    X.Audio.play(w.kind, w.damage / 50);
    this.fx(
      p.x + Math.cos(p.angle) * 27,
      p.y + Math.sin(p.angle) * 27,
      w.color,
      3,
      60,
    );
    if (w.id === "tesla") this.fireTesla(w, alt);
    else if (alt && w.id === "grenade") {
      this.fireUmbrella(w, cost);
    } else if (alt && w.id === "rocket") {
      for (let i = 0; i < cost; i++)
        this.modeShot(w, p.angle + (i - (cost - 1) / 2) * 0.1, w.damage);
    } else if (alt && w.id === "shotgun")
      this.modeShot(w, p.angle, w.damage * cost);
    else if (alt && w.id === "plasma")
      this.modeShot(
        {
          ...w,
          poolDps: w.poolDps * Math.sqrt(cost),
          radius: Math.min(22, 9 + Math.sqrt(cost)),
        },
        p.angle,
        w.damage * cost,
      );
    else if (w.id === "rail")
      this.modeShot(
        { ...w, wallPierce: charged },
        p.angle,
        w.damage * (alt ? cost : 1),
      );
    else if (alt && w.id === "flame")
      this.modeShot({ ...w, kind: "napalm" }, p.angle, w.damage);
    else {
      const count = w.id === "flame" ? 3 : w.pellets || 1;
      for (let i = 0; i < count; i++)
        this.modeShot(
          w,
          p.angle + (this.rng.next() - 0.5) * w.spread * (this.moving ? 2 : 1),
          w.damage / (w.id === "flame" ? count : 1),
        );
    }
    this.autoReload();
  },
  modeShot(w, angle, damage) {
    const p = this.player;
    let range = w.range;
    if (w.id === "grenade" && !w.count)
      range = Math.max(
        60,
        Math.min(
          range,
          Math.hypot(
            this.mouse.x + this.camera.x - p.x,
            this.mouse.y + this.camera.y - p.y,
          ) - 25,
        ),
      );
    return this.shot(
      p.x + Math.cos(angle) * 25,
      p.y + Math.sin(angle) * 25,
      angle,
      {
        ...w,
        damage,
        range,
        radius:
          w.radius || (w.kind === "flame" ? 10 : w.kind === "plasma" ? 7 : 3),
      },
      false,
    );
  },
  fireTesla(w, alt) {
    const p = this.player,
      hit = new Set();
    let x = p.x,
      y = p.y,
      primary = null;
    const count = alt ? 1 + w.links : w.links;
    for (let n = 0; n < count; n++) {
      let target = null,
        best = n ? (alt ? w.secondaryRange : 220) : w.range;
      this.hash.query(x, y, best, (e) => {
        const d = Math.hypot(e.x - x, e.y - y),
          a = Math.atan2(e.y - p.y, e.x - p.x) - p.angle;
        if (
          !hit.has(e) &&
          d < best &&
          (n > 0 || Math.cos(a) > (alt ? 0.96 : 0.65)) &&
          this.map.line(x, y, e.x, e.y)
        ) {
          target = e;
          best = d;
        }
      });
      if (!target) break;
      if (n === 0) primary = target;
      this.beam(
        x,
        y,
        target.x,
        target.y,
        alt ? "#e3d2ff" : w.color,
        alt && n === 0 ? 5 : 3,
      );
      this.hurtEnemy(
        target,
        w.damage * (alt ? (n ? 0.35 : 1) : Math.pow(0.8, n)),
        w.type,
      );
      target.stun = alt ? 0.1 : 0.28;
      hit.add(target);
      // ПКМ: все ответвления исходят только из первой цели.
      x = alt ? primary.x : target.x;
      y = alt ? primary.y : target.y;
    }
  },
  fireRifle(alt) {
    if (this.pendingBurst) return;
    const w = X.Armory.stats(X.weapons[this.weapon], false);
    let per = alt ? 2 : 1;
    if (this.mags[this.weapon] < per) {
      alt = false;
      per = 1;
    }
    const count = Math.min(3, Math.floor(this.mags[this.weapon] / per));
    if (count <= 0) {
      this.autoReload();
      return;
    }
    this.mags[this.weapon] -= count * per;
    const damage = w.damage * (alt ? 1.65 : 1);
    this.pendingBurst = {
      remaining: count - 1,
      timer: 0.07,
      alt,
      round: { ...w, damage },
      per,
      fired: 0,
    };
    this.cool = w.rate * (alt ? 1.35 : 1);
    this.stats.shots++;
    this.rifleRound(this.pendingBurst.round);
    if (!this.pendingBurst.remaining) {
      this.pendingBurst = null;
      this.autoReload();
    }
  },
  rifleRound(w) {
    const a = this.player.angle + (this.rng.next() - 0.5) * w.spread;
    const b = this.pendingBurst,
      index = b ? b.fired++ : 0,
      third = index === 2 && !b?.alt;
    this.modeShot(
      {
        ...w,
        armorPierce: third,
        color: third ? "#a5e7ff" : w.color,
        radius: third ? 4 : 3,
      },
      a,
      w.damage * (third ? w.thirdBonus : 1),
    );
    this.muzzle = 0.055;
    X.Audio.play("rifle");
  },
  burstStep(dt) {
    const b = this.pendingBurst;
    if (!b) return;
    b.timer -= dt;
    while (b.timer <= 0 && b.remaining > 0) {
      this.rifleRound(b.round);
      b.remaining--;
      b.timer += 0.07;
    }
    if (!b.remaining) {
      this.pendingBurst = null;
      this.autoReload();
    }
  },
  cancelBurst() {
    const b = this.pendingBurst;
    if (!b) return;
    this.ammo.heavy = Math.min(99999, this.ammo.heavy + b.remaining * b.per);
    this.pendingBurst = null;
  },
  restoreBurst(state) {
    if (!state || state.remaining < 1) return;
    const w = X.Armory.stats(X.weapons[4], false);
    if (state.alt) w.damage *= 1.65;
    this.pendingBurst = {
      remaining: state.remaining,
      timer: state.timer,
      alt: state.alt,
      per: state.per || (state.alt ? 2 : 1),
      fired: state.fired || 3 - state.remaining,
      round: w,
    };
  },
  emitRailShards(s, e) {
    if (!s.shards) return;
    const a = Math.atan2(s.vy, s.vx),
      x = e.x + Math.cos(a) * (e.r + 8),
      y = e.y + Math.sin(a) * (e.r + 8);
    for (let i = 0; i < s.shards; i++)
      this.shot(
        x,
        y,
        a + (i - (s.shards - 1) / 2) * 0.1,
        {
          kind: "shard",
          speed: 1400,
          range: 340,
          damage: s.shardDamage,
          type: "energy",
          pierce: 1,
          color: "#b2e6ff",
          radius: 2,
        },
        false,
      );
  },
  attachShot(s, target = null) {
    s.stuck = true;
    s.host = target;
    s.hostId = target?.spawnId || 0;
    s.vx = s.vy = 0;
    s.life = s.fuse || 0.8;
    if (target) {
      s.x = target.x;
      s.y = target.y;
    } else {
      s.x = s.safeX;
      s.y = s.safeY;
    }
    s.oldX = s.x;
    s.oldY = s.y;
  },
  finishPayload(s) {
    if (s.payload === "sticky")
      this.explode(s.x, s.y, s.blast, s.damage, false, "energy");
    else if (s.payload === "napalm")
      this.explode(s.x, s.y, 36, s.damage, false, "fire");
    this.addSurface(
      s.x,
      s.y,
      s.poolRadius,
      s.poolDps,
      s.poolLife,
      s.payload === "napalm" ? "fire" : "energy",
    );
    s.active = false;
  },
  addSurface(x, y, radius, dps, life, type) {
    if (this.map.blocked(x, y)) return;
    let o = this.surfaces.get();
    if (!o) o = this.surfaces.items.reduce((a, b) => (a.life < b.life ? a : b));
    Object.assign(o, {
      active: true,
      x,
      y,
      radius,
      dps,
      life,
      maxLife: life,
      type,
      tick: 0,
      phase: this.visualRng.next() * 6,
    });
    this.fx(x, y, type === "fire" ? "#ffae59" : "#73f4cf", 10, 100);
  },
  surfaceStep(dt) {
    for (const o of this.surfaces.items)
      if (o.active) {
        o.life -= dt;
        if (o.life <= 0) {
          o.active = false;
          continue;
        }
        o.tick += dt;
        if (o.tick < 0.1) continue;
        const step = o.tick;
        o.tick = 0;
        this.hash.query(o.x, o.y, o.radius + 80, (e) => {
          if (
            e.active &&
            Math.hypot(e.x - o.x, e.y - o.y) < o.radius + e.r &&
            this.map.line(o.x, o.y, e.x, e.y)
          ) {
            this.hurtEnemy(e, o.dps * step, o.type);
            if (o.type === "fire") e.poolFire = 0.4;
            else e.slow = Math.max(e.slow, 0.25);
          }
        });
        for (const obj of this.objectives)
          if (
            obj.kind === "nest" &&
            !obj.done &&
            Math.hypot(obj.x - o.x, obj.y - o.y) < o.radius + 34 &&
            this.map.line(o.x, o.y, obj.x, obj.y)
          ) {
            obj.hp -= o.dps * step;
            if (obj.hp <= 0) {
              obj.done = true;
              this.creditReward(200);
            }
          }
      }
  },
  effectsSnapshot() {
    const fields = [
      "x",
      "y",
      "oldX",
      "oldY",
      "vx",
      "vy",
      "life",
      "damage",
      "pierce",
      "color",
      "type",
      "kind",
      "radius",
      "blast",
      "range",
      "safeX",
      "safeY",
      "payload",
      "poolRadius",
      "poolDps",
      "poolLife",
      "fuse",
      "stuck",
      "hostId",
    ];
    return {
      surfaces: this.surfaces.items
        .filter((o) => o.active)
        .map((o) => ({ ...o })),
      shots: this.shots.items
        .filter((s) => s.active && s.payload)
        .slice(0, 64)
        .map((s) => Object.fromEntries(fields.map((k) => [k, s[k]]))),
    };
  },
  restoreEffects(data) {
    if (!data) return;
    for (const o of data.surfaces) {
      const item = this.surfaces.get();
      if (item) Object.assign(item, o, { active: true });
    }
    for (const saved of data.shots) {
      const s = this.shots.get();
      if (s)
        Object.assign(s, saved, {
          active: true,
          enemy: false,
          wallPierce: false,
          shards: 0,
          homing: 0,
          hit: new Set(),
          ownerID: null,
          trackSeries: false,
          hitAny: false,
          armorPierce: false,
          weakTime: 0,
          weakFactor: 1,
          cripple: 0,
          suppress: 0,
          ricochets: 0,
          umbrella: false,
          host:
            this.enemies.items.find(
              (e) => e.active && e.spawnId === saved.hostId,
            ) || null,
        });
    }
  },
});
