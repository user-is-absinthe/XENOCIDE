"use strict";
// Методы подсистемы выполняются в контексте экземпляра Game.
Object.assign(X.Game.prototype, {
  activeEnemies() {
    let n = 0;
    for (const e of this.enemies.items) if (e.active) n++;
    return n;
  },
  spawn(type, x, y, elite = false) {
    let e = this.enemies.get();
    if (!e) return;
    const d = X.enemies[type];
    if (!this.map.fits(x, y, d.radius)) {
      let found = false;
      for (let r = 1; r < 5 && !found; r++)
        for (let oy = -r; oy <= r && !found; oy++)
          for (let ox = -r; ox <= r; ox++) {
            let qx = x + ox * 48,
              qy = y + oy * 48;
            if (this.map.fits(qx, qy, d.radius)) {
              x = qx;
              y = qy;
              found = true;
              break;
            }
          }
      if (!found) {
        e.active = false;
        return;
      }
    }
    const scale = 1 + Math.min(this.number, 40) * 0.027;
    Object.assign(e, {
      x,
      y,
      r: d.radius,
      type,
      hp: d.hp * this.diff.hp * scale * (elite ? 1.65 : 1),
      maxHp: d.hp * this.diff.hp * scale * (elite ? 1.65 : 1),
      elite,
      attack: 0.5 + this.rng.next(),
      phase: this.rng.next() * 6,
      age: 0,
      burn: 0,
      slow: 0,
      stun: 0,
      special: 2 + this.rng.next() * 3,
      boss: !!d.boss,
      pathX: x,
      pathY: y,
      pathIndex: -1,
      losTimer: 0,
      clear: false,
    });
    return e;
  },
  enemyStep(e, dt) {
    const p = this.player,
      d = X.enemies[e.type];
    e.age += dt;
    e.phase += dt * 8;
    e.attack -= dt;
    e.special -= dt;
    e.slow = Math.max(0, e.slow - dt);
    e.stun = Math.max(0, e.stun - dt);
    if (e.burn > 0) {
      e.burn -= dt;
      this.hurtEnemy(e, 20 * dt, "fire");
      if (!e.active) return;
    }
    let tx = p.x,
      ty = p.y,
      coreTarget = false;
    if (
      this.level.mode === "defend" &&
      this.objectives[0] &&
      e.type % 3 === 0
    ) {
      coreTarget = true;
      tx = this.objectives[0].x;
      ty = this.objectives[0].y;
    }
    let dist = Math.hypot(tx - e.x, ty - e.y),
      a = Math.atan2(ty - e.y, tx - e.x);
    e.angle = a;
    if (d.kind === "elite" && e.special <= 0) {
      for (let i = 0; i < 5; i++)
        this.map.move(e, Math.cos(a) * 12, Math.sin(a) * 12);
      e.special = 4;
      this.fx(e.x, e.y, d.color, 8, 80);
    }
    if (d.kind === "summon" && e.special <= 0) {
      for (let i = 0; i < 3; i++) {
        let sx = e.x + Math.cos(i * 2.1) * 38,
          sy = e.y + Math.sin(i * 2.1) * 38;
        if (this.map.fits(sx, sy, 16)) this.spawn(0, sx, sy);
      }
      e.special = 9;
      this.fx(e.x, e.y, "#c18ddb", 12, 80);
    }
    if (d.boss && e.special <= 0) {
      this.bossAttack(e);
      e.special = e.hp < e.maxHp * 0.5 ? 3 : 5;
    }
    if (d.kind === "suicide" && dist < 65) {
      this.explode(e.x, e.y, 105, d.damage * this.diff.damage, true);
      e.hp = 0;
      this.kill(e);
      return;
    }
    e.losTimer -= dt;
    if (e.losTimer <= 0) {
      e.clear = this.map.corridor(e.x, e.y, tx, ty, e.r);
      e.losTimer = 0.25;
    }
    let ranged = ["acid", "gunner", "elite", "boss"].includes(d.kind);
    if (
      ranged &&
      dist < 650 &&
      dist > 70 &&
      e.attack <= 0 &&
      this.map.line(e.x, e.y, tx, ty)
    ) {
      let count = d.kind === "elite" ? 3 : 1;
      for (let i = 0; i < count; i++)
        this.shot(
          e.x,
          e.y,
          a + (i - (count - 1) / 2) * 0.15,
          {
            damage: d.damage * this.diff.damage,
            speed: d.kind === "acid" ? 235 : 330,
            range: 800,
            pierce: 1,
            color: d.kind === "acid" ? "#c0e75b" : "#e38cbd",
            type: "enemy",
            radius: d.boss ? 9 : 6,
          },
          true,
        );
      e.attack = d.rate / this.diff.speed;
    }
    if (dist < p.r + e.r + 6 && e.attack <= 0) {
      if (!coreTarget) this.hurtPlayer(d.damage * this.diff.damage);
      else {
        this.coreHp -= d.damage * this.diff.damage;
        if (this.coreHp <= 0)
          this.finish(false, "Обороняемый передатчик уничтожен");
      }
      if (d.kind === "heavy") {
        for (let i = 0; i < 5; i++)
          this.map.move(p, Math.cos(a) * 8, Math.sin(a) * 8);
        this.shake = 5;
      }
      X.Audio.play("enemy");
      e.attack = d.rate / this.diff.speed;
    }
    if (e.stun > 0) return;
    let speed =
      d.speed * this.diff.speed * (e.elite ? 1.1 : 1) * (e.slow > 0 ? 0.45 : 1);
    if (ranged && e.clear && dist < 260) speed *= -0.35;
    else if (ranged && e.clear && dist < 420) speed *= 0.18;
    let vx = Math.cos(a),
      vy = Math.sin(a);
    if (!e.clear) {
      const nav = coreTarget
          ? this.navCore
          : e.r > 23
            ? this.navBig
            : this.navSmall,
        field = nav.field;
      if (
        e.pathIndex < 0 ||
        Math.hypot(e.pathX - e.x, e.pathY - e.y) < 4 ||
        field[e.pathIndex] < 0
      ) {
        let idx = this.map.index(e.x, e.y),
          best = idx,
          value = field[idx];
        if (value < 0) {
          let bestDistance = 1e12;
          for (let oy = -2; oy <= 2; oy++)
            for (let ox = -2; ox <= 2; ox++) {
              let n = idx + oy * this.map.w + ox;
              if (field[n] >= 0) {
                let d =
                  (((n % this.map.w) + 0.5) * 48 - e.x) ** 2 +
                  ((Math.floor(n / this.map.w) + 0.5) * 48 - e.y) ** 2;
                if (d < bestDistance) {
                  best = n;
                  bestDistance = d;
                }
              }
            }
        } else
          for (let n of [idx - 1, idx + 1, idx - this.map.w, idx + this.map.w])
            if (field[n] >= 0 && field[n] < value) {
              best = n;
              value = field[n];
            }
        e.pathIndex = best;
        e.pathX = ((best % this.map.w) + 0.5) * 48;
        e.pathY = (Math.floor(best / this.map.w) + 0.5) * 48;
      }
      let b = Math.atan2(e.pathY - e.y, e.pathX - e.x);
      vx = Math.cos(b);
      vy = Math.sin(b);
    } else e.pathIndex = -1;
    let sx = 0,
      sy = 0;
    this.hash.query(e.x, e.y, e.r + 30, (o) => {
      if (o === e) return;
      let x = e.x - o.x,
        y = e.y - o.y,
        l = Math.hypot(x, y),
        r = e.r + o.r;
      if (l < 0.01) {
        sx += Math.cos(e.phase) * 20;
        sy += Math.sin(e.phase) * 20;
      } else if (l < r) {
        sx += (x / l) * (r - l) * 3;
        sy += (y / l) * (r - l) * 3;
      }
    });
    this.map.move(e, (vx * speed + sx) * dt, (vy * speed + sy) * dt);
  },
  bossAttack(e) {
    let d = X.enemies[e.type];
    this.fx(e.x, e.y, d.color, 24, 140);
    for (let i = 0; i < 16; i++)
      this.shot(
        e.x,
        e.y,
        (i * Math.PI) / 8 + e.age * 0.2,
        {
          damage: d.damage * 0.65 * this.diff.damage,
          speed: 210,
          range: 850,
          pierce: 1,
          color: d.color,
          type: "enemy",
          radius: 7,
        },
        true,
      );
    if (d.id === "steel") for (let i = 0; i < 3; i++) this.spawn(5, e.x, e.y);
    if (d.id === "queen") for (let i = 0; i < 4; i++) this.spawn(1, e.x, e.y);
    if (d.id === "heart") {
      for (let i = 0; i < 4; i++) {
        let a = e.angle + (i - 1.5) * 0.22;
        this.shot(
          e.x,
          e.y,
          a,
          {
            damage: 28 * this.diff.damage,
            speed: 380,
            range: 950,
            pierce: 1,
            color: "#f5ad56",
            type: "enemy",
            radius: 10,
          },
          true,
        );
      }
    }
    if (d.id === "patient") {
      e.hp = Math.min(e.maxHp, e.hp + 20);
    }
  },
  kill(e) {
    if (!e.active) return;
    e.active = false;
    this.kills++;
    if (this.weapon === 0) this.stats.bladeKills++;
    this.earned += Math.round(
      X.enemies[e.type].credit * this.diff.economy * (e.elite ? 1.8 : 1),
    );
    this.fx(e.x, e.y, "#74914f", 7, 70);
    if (X.profile.settings.blood) {
      this.marks.push({
        x: e.x,
        y: e.y,
        r: e.r,
        angle: e.angle,
        color: X.enemies[e.type].color,
      });
      if (this.marks.length > 180) this.marks.shift();
    }
    let roll = this.rng.next();
    if (roll < 0.18 * this.diff.loot || e.boss)
      this.loot.push({
        x: e.x,
        y: e.y,
        kind: roll < 0.045 * this.diff.loot ? "health" : "ammo",
        amount: e.boss ? 4 : 1,
      });
    if (this.loot.length > 300) this.loot.shift();
  },
});
