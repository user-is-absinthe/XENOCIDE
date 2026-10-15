"use strict";
// Методы подсистемы выполняются в контексте экземпляра Game.
Object.assign(X.Game.prototype, {
  switchWeapon(index) {
    if (X.profile.owned.includes(index)) {
      this.weapon = index;
      this.reload = 0;
      this.charge = 0;
      this.spin = 0;
      this.cool = Math.max(0.1, this.cool);
      X.Audio.play("menu");
    }
  },
  cycle(dir) {
    let a = X.profile.owned.slice().sort((a, b) => a - b),
      i = a.indexOf(this.weapon);
    this.switchWeapon(a[(i + dir + a.length) % a.length]);
  },
  beginReload() {
    const w = X.weapons[this.weapon];
    if (w.ammo && X.Debug.enabled("noReload")) {
      this.refillMagazine();
      this.reload = 0;
      return;
    }
    if (
      w.ammo &&
      !this.reload &&
      this.mags[this.weapon] < w.mag &&
      (this.ammo[w.ammo] > 0 || X.Debug.enabled("ammo"))
    ) {
      this.reload = w.reload * (1 - 0.09 * X.profile.upgrades.reload);
      this.reloadTotal = this.reload;
      X.Audio.play("reload");
    }
  },
  refillMagazine() {
    const w = X.weapons[this.weapon];
    if (!w.ammo) return;
    const n = X.Debug.enabled("ammo")
      ? w.mag - this.mags[this.weapon]
      : Math.min(w.mag - this.mags[this.weapon], this.ammo[w.ammo]);
    this.mags[this.weapon] += n;
    if (!X.Debug.enabled("ammo")) this.ammo[w.ammo] -= n;
  },
  ammoStatus() {
    const w = X.weapons[this.weapon];
    if (!w.ammo) return { mag: "∞", total: "∞", text: "∞" };
    let total = this.ammo[w.ammo];
    for (let i = 0; i < X.weapons.length; i++)
      if (X.weapons[i].ammo === w.ammo) total += this.mags[i];
    if (X.Debug.enabled("ammo")) total = "∞";
    const mag = this.mags[this.weapon];
    return { mag, total, text: mag + "/" + total };
  },
  fire(alt) {
    const base = X.weapons[this.weapon];
    if (base.debugOnly && !X.Debug.active) return;
    let w = X.WeaponStats.tuned(base, X.profile.weaponTuning[base.id] || 0),
      p = this.player,
      cost = (alt ? 2 : 1) * (w.burst || 1);
    if (w.ammo && X.Debug.enabled("noReload") && this.mags[this.weapon] < cost)
      this.beginReload();
    if (w.ammo && this.mags[this.weapon] < cost) {
      if (this.mags[this.weapon] === 0) {
        this.beginReload();
        this.cool = 0.2;
        return;
      } else alt = false;
      cost = Math.min((alt ? 2 : 1) * (w.burst || 1), this.mags[this.weapon]);
      if (this.mags[this.weapon] < cost) {
        this.cool = 0.2;
        return;
      }
    }
    if (w.ammo) this.mags[this.weapon] -= cost;
    this.cool =
      w.rate *
      (alt ? 1.35 : 1) *
      (w.kind === "machine" ? 1 - this.spin * 0.55 : 1);
    this.shake = Math.max(this.shake, w.recoil || 0);
    this.stats.shots++;
    this.muzzle = 0.055;
    let damage =
        X.WeaponStats.damage(
          w,
          X.profile.weaponMods[w.id] || 0,
          X.profile.upgrades.power,
        ) * (alt ? 1.65 : 1),
      angle = p.angle;
    X.Audio.play(w.kind, w.damage / 50);
    this.fx(
      p.x + Math.cos(angle) * 27,
      p.y + Math.sin(angle) * 27,
      w.color,
      3,
      60,
    );
    if (w.kind === "blade") {
      this.hash.query(p.x, p.y, w.range, (e) => {
        let dist = Math.hypot(e.x - p.x, e.y - p.y),
          a = Math.atan2(e.y - p.y, e.x - p.x) - angle;
        a = Math.atan2(Math.sin(a), Math.cos(a));
        if (
          dist < w.range + e.r &&
          (alt || Math.abs(a) < 1.2) &&
          this.map.line(p.x, p.y, e.x, e.y)
        ) {
          this.hurtEnemy(e, damage, w.type);
          e.stun = 0.15;
        }
      });
      for (const o of this.objectives)
        if (
          !o.done &&
          o.kind === "nest" &&
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
      this.arc = { angle, life: 0.15, alt };
      return;
    }
    if (w.kind === "tesla") {
      let x = p.x,
        y = p.y,
        hit = new Set();
      for (let n = 0; n < w.links + (alt ? 2 : 0); n++) {
        let target = null,
          best = n ? 220 : w.range;
        this.hash.query(x, y, best, (e) => {
          let d = Math.hypot(e.x - x, e.y - y),
            a = Math.atan2(e.y - y, e.x - x) - angle;
          if (
            !hit.has(e) &&
            d < best &&
            (n > 0 || Math.cos(a) > 0.65) &&
            this.map.line(x, y, e.x, e.y)
          ) {
            target = e;
            best = d;
          }
        });
        if (!target) break;
        this.beam(x, y, target.x, target.y, w.color);
        this.hurtEnemy(target, damage * Math.pow(0.8, n), w.type);
        target.stun = 0.28;
        hit.add(target);
        x = target.x;
        y = target.y;
      }
      return;
    }
    let count = w.pellets || Math.min(w.burst || 1, cost);
    if (w.kind === "flame") count = alt ? 5 : 3;
    for (let i = 0; i < count; i++) {
      let a =
        angle +
        (this.rng.next() - 0.5) *
          w.spread *
          (alt ? 1.4 : 1) *
          (this.moving && w.kind !== "smg" ? 2 : 1);
      this.shot(
        p.x + Math.cos(a) * 25,
        p.y + Math.sin(a) * 25,
        a,
        {
          ...w,
          range:
            w.kind === "grenade"
              ? Math.max(
                  60,
                  Math.min(
                    w.range,
                    Math.hypot(
                      this.mouse.x + this.camera.x - p.x,
                      this.mouse.y + this.camera.y - p.y,
                    ) - 25,
                  ),
                )
              : w.range,
          damage: damage / (w.kind === "flame" ? count : 1),
          wallPierce: w.kind === "rail" && this.charge >= w.charge,
          radius: w.kind === "plasma" ? 7 : w.kind === "flame" ? 10 : 3,
        },
        false,
      );
    }
    if (w.kind === "rail" || w.kind === "rocket") this.shake = alt ? 7 : 4;
  },
  shot(x, y, a, w, enemy) {
    let s = this.shots.get();
    if (!s) return;
    Object.assign(s, {
      x,
      y,
      oldX: x,
      oldY: y,
      vx: Math.cos(a) * w.speed,
      vy: Math.sin(a) * w.speed,
      life: w.range / w.speed,
      damage: w.damage,
      pierce: w.pierce || 1,
      color: w.color,
      type: w.type,
      kind: w.kind || "enemy",
      radius: w.radius || 3,
      enemy,
      hit: s.hit || new Set(),
      blast: w.blast || 0,
      range: w.range,
      bounces: 0,
      wallPierce: !!w.wallPierce,
    });
    s.hit.clear();
  },
  projectileStep(dt) {
    for (const s of this.shots.items)
      if (s.active) {
        s.life -= dt;
        if (s.kind === "rocket" && !s.enemy) {
          let target = null,
            best = 300;
          this.hash.query(s.x, s.y, 300, (e) => {
            let d = Math.hypot(e.x - s.x, e.y - s.y),
              dot = (e.x - s.x) * s.vx + (e.y - s.y) * s.vy;
            if (d < best && dot > 0 && this.map.line(s.x, s.y, e.x, e.y)) {
              target = e;
              best = d;
            }
          });
          if (target) {
            let a = Math.atan2(target.y - s.y, target.x - s.x);
            s.vx += (Math.cos(a) * 450 - s.vx) * dt * 2;
            s.vy += (Math.sin(a) * 450 - s.vy) * dt * 2;
          }
          this.fx(s.x, s.y, "#c99369", 1, 25);
        }
        let steps = Math.max(1, Math.ceil((Math.hypot(s.vx, s.vy) * dt) / 12));
        s.oldX = s.x;
        s.oldY = s.y;
        for (let n = 0; n < steps && s.active; n++) {
          const ox = s.x,
            oy = s.y;
          s.x += (s.vx * dt) / steps;
          s.y += (s.vy * dt) / steps;
          const inside =
            s.x >= 0 &&
            s.y >= 0 &&
            s.x < this.map.w * X.C.tile &&
            s.y < this.map.h * X.C.tile;
          if (!inside || (this.map.blocked(s.x, s.y) && !s.wallPierce)) {
            if (s.kind === "grenade" && s.bounces < 4) {
              if (this.map.blocked(s.x, oy)) s.vx *= -0.7;
              if (this.map.blocked(ox, s.y)) s.vy *= -0.7;
              s.x = ox;
              s.y = oy;
              s.bounces++;
              continue;
            }
            if (s.blast) this.explode(ox, oy, s.blast, s.damage, s.enemy);
            this.fx(ox, oy, s.color, 3, 45);
            s.active = false;
            break;
          }
          if (s.enemy) {
            if (
              Math.hypot(s.x - this.player.x, s.y - this.player.y) <
              this.player.r + s.radius
            ) {
              this.hurtPlayer(s.damage);
              s.active = false;
            }
          } else if (s.kind !== "grenade") {
            this.hash.query(s.x, s.y, 65, (e) => {
              if (!s.active || s.hit.has(e)) return;
              if (Math.hypot(e.x - s.x, e.y - s.y) < e.r + s.radius) {
                s.hit.add(e);
                if (s.blast) {
                  this.explode(s.x, s.y, s.blast, s.damage, false);
                  s.active = false;
                } else {
                  this.hurtEnemy(e, s.damage, s.type);
                  if (s.kind === "flame") e.burn = 3;
                  if (s.kind === "plasma") e.slow = 1.3;
                  if (--s.pierce <= 0) s.active = false;
                }
              }
            });
          }
          if (!s.enemy)
            for (const o of this.objectives)
              if (
                !o.done &&
                o.kind === "nest" &&
                Math.hypot(o.x - s.x, o.y - s.y) < 34
              ) {
                o.hp -= s.damage;
                s.active = false;
                if (o.hp <= 0) {
                  o.done = true;
                  this.earned += 200;
                  this.explode(o.x, o.y, 90, 100, false);
                  X.UI.toast("Гнездо уничтожено");
                }
              }
        }
        if (s.life <= 0) {
          if (s.blast && s.active)
            this.explode(s.x, s.y, s.blast, s.damage, s.enemy);
          s.active = false;
        }
      }
  },
  explode(x, y, r, damage, enemy) {
    this.blasts.push({ x, y, r, life: 0.35 });
    if (this.blasts.length > 20) this.blasts.shift();
    this.fx(x, y, "#ffad59", 32, 230);
    this.shake = Math.max(this.shake, 10);
    X.Audio.play("boom", 2);
    if (enemy) {
      let d = Math.hypot(x - this.player.x, y - this.player.y);
      if (d < r && this.map.line(x, y, this.player.x, this.player.y))
        this.hurtPlayer(damage * (1 - d / r));
    } else {
      for (const o of this.objectives)
        if (o.kind === "nest" && !o.done && Math.hypot(o.x - x, o.y - y) < r) {
          o.hp -= damage;
          if (o.hp <= 0) {
            o.done = true;
            this.earned += 200;
          }
        }
      this.hash.query(x, y, r + 50, (e) => {
        let d = Math.hypot(x - e.x, y - e.y);
        if (d < r + e.r && this.map.line(x, y, e.x, e.y))
          this.hurtEnemy(e, damage * (1 - (0.6 * d) / (r + e.r)), "explosive");
      });
    }
  },
  hurtPlayer(damage) {
    if (X.Debug.enabled("god")) return;
    let p = this.player;
    if (p.invuln > 0) return;
    let absorbed = Math.min(p.armor, damage * 0.65);
    p.armor -= absorbed;
    p.hp -= damage - absorbed;
    p.invuln = 0.24;
    this.damageFlash = 0.5;
    this.stats.damage += damage;
    X.Audio.play("hurt");
  },
  hurtEnemy(e, damage, type) {
    if (!e.active) return;
    let d = X.enemies[e.type];
    e.hp -= damage * (d.resist?.[type] ?? 1);
    if (damage > 3) this.fx(e.x, e.y, d.color, 2, 45);
    if (e.hp <= 0) this.kill(e);
  },
});
