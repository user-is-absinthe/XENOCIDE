"use strict";

X.segmentDistance = (x, y, ax, ay, bx, by) => {
  const dx = bx - ax,
    dy = by - ay;
  const t = Math.max(
    0,
    Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)),
  );
  return Math.hypot(x - ax - dx * t, y - ay - dy * t);
};

Object.assign(X.Game.prototype, {
  newBossEncounter(e) {
    return {
      phase: e && e.hp <= e.maxHp / 2 ? 2 : 1,
      state: "approach",
      time: 2.5,
      cycle: 0,
      healed: 0,
    };
  },
  copyBossEncounter(s) {
    return s ? { ...s, zones: s.zones?.map((z) => [...z]) } : null;
  },
  bossSet(e, state, time, sound) {
    Object.assign(e.encounter, { state, time });
    if (sound) X.Audio.play(sound);
  },
  bossStatus(e) {
    const s = e.encounter;
    const status = {
      transition: "Вторая фаза",
      windup: "Таран · уйдите в сторону",
      brood: "Формирование узлов",
      guard: "Защищена узлами",
      healing: "Лечение · прервите огнём",
      pulse: "Биовыброс · покиньте круг",
      discharge: "Разряд пола",
      floorWarning: "Разметка разряда",
      charge: "Таран",
      recovery: s?.exposed ? "Уязвимость" : "Восстановление",
    }[s?.state];
    return status ? " · " + status : "";
  },
  bossDamageFactor(e) {
    if (e.encounter?.state === "guard" && this.broodNodes(e).length)
      return 0.48;
    return e.encounter?.state === "recovery" && e.encounter.exposed ? 1.65 : 1;
  },
  bossStep(e, dt) {
    const s = e.encounter;
    if (s.phase === 1 && e.hp <= e.maxHp / 2) {
      s.phase = 2;
      s.cycle = 1;
      if (X.enemies[e.type].id === "queen")
        for (const node of this.broodNodes(e)) node.active = false;
      this.bossSet(e, "transition", 2.4, "bossPhase");
    }
    s.time = Math.max(0, s.time - dt);
    if (s.state === "transition") {
      if (!s.time) this.bossSet(e, "approach", 0.7);
      return true;
    }
    switch (X.enemies[e.type].id) {
      case "steel":
        return this.steelStep(e, dt);
      case "queen":
        return this.queenStep(e);
      case "patient":
        return this.patientStep(e);
      case "heart":
        return this.heartStep(e);
    }
  },
  steelWarn(e) {
    const s = e.encounter,
      p = this.player;
    const angle = Math.atan2(p.y - e.y, p.x - e.x);
    const dx = Math.cos(angle),
      dy = Math.sin(angle);
    let length = 0;
    while (
      length < 504 &&
      this.map.fits(e.x + dx * (length + 3), e.y + dy * (length + 3), e.r)
    )
      length += 3;
    Object.assign(s, {
      ax: e.x,
      ay: e.y,
      bx: e.x + dx * length,
      by: e.y + dy * length,
      angle,
      impact: length < 504,
      hit: false,
    });
    e.angle = angle;
    this.bossSet(e, "windup", 1.35, "bossWarn");
  },
  steelStep(e, dt) {
    const s = e.encounter,
      p = this.player;
    if (s.state === "approach") {
      if (
        s.time ||
        Math.hypot(p.x - e.x, p.y - e.y) > 470 ||
        !this.map.line(e.x, e.y, p.x, p.y)
      )
        return false;
      s.remaining = s.phase === 2 && s.cycle % 2 === 1 ? 2 : 1;
      s.cycle++;
      s.exposed = false;
      this.steelWarn(e);
    } else if (s.state === "windup" && !s.time) {
      this.bossSet(e, "charge", 0, "enemy");
    } else if (s.state === "charge") {
      const left = Math.hypot(s.bx - e.x, s.by - e.y);
      const step = Math.min(left, dt * 600);
      const x = step === left ? s.bx : e.x + Math.cos(s.angle) * step;
      const y = step === left ? s.by : e.y + Math.sin(s.angle) * step;
      if (!s.hit && X.segmentDistance(p.x, p.y, e.x, e.y, x, y) <= e.r + p.r) {
        s.hit = true;
        this.hurtPlayer(X.enemies[e.type].damage * 1.45 * this.diff.damage);
      }
      e.x = x;
      e.y = y;
      if (step === left) {
        s.exposed ||= s.impact;
        if (--s.remaining > 0) this.steelWarn(e);
        else this.bossSet(e, "recovery", s.exposed ? 3 : 1.8, "enemy");
      }
    } else if (s.state === "recovery" && !s.time) {
      this.bossSet(e, "approach", 1.6);
    }
    return true;
  },
  enemyPushFactor(e) {
    if (e.broodNode || (e.encounter && e.encounter.state !== "approach"))
      return 0;
    return e.boss ? 0.25 : 1;
  },
  broodNodes(e) {
    return this.enemies.items.filter(
      (node) => node.active && node.broodNode && node.broodOwner === e.spawnId,
    );
  },
  queenRecovery(e, exposed = true) {
    e.encounter.exposed = exposed;
    this.bossSet(e, "recovery", exposed ? 4.2 : 2.5, "pickup");
  },
  queenStep(e) {
    const s = e.encounter,
      p = this.player;
    if (s.state === "approach") {
      if (s.time || Math.hypot(p.x - e.x, p.y - e.y) > 500) return false;
      this.bossSet(e, "brood", 1.4, "bossWarn");
    } else if (s.state === "brood" && !s.time) {
      const nav = this.navSmall,
        m = this.map;
      m.flow(nav, p.x, p.y);
      const candidates = [];
      for (let i = 0; i < nav.field.length; i++) {
        if (nav.field[i] < 2 || nav.field[i] > 13) continue;
        const q = m.point([i % m.w, Math.floor(i / m.w)]);
        const distance = Math.hypot(q.x - e.x, q.y - e.y);
        if (distance >= 110 && distance <= 520 && m.fits(q.x, q.y, 19))
          candidates.push(q);
      }
      const placed = [];
      for (let i = 0; i < s.phase; i++) {
        const pool = candidates.filter((q) =>
          placed.every((a) => Math.hypot(q.x - a.x, q.y - a.y) >= 210),
        );
        if (!pool.length) break;
        const q = this.rng.pick(pool);
        const node = this.spawn(X.broodNodeType, q.x, q.y);
        if (!node) break;
        node.broodOwner = e.spawnId;
        placed.push(q);
      }
      s.reinforceAt = 9;
      if (placed.length) this.bossSet(e, "guard", 13);
      else this.queenRecovery(e, false);
    } else if (s.state === "guard") {
      const nodes = this.broodNodes(e);
      if (!nodes.length) this.queenRecovery(e);
      else if (!s.time) {
        for (const node of nodes) node.active = false;
        this.queenRecovery(e, false);
      } else {
        if (s.phase === 2 && s.time <= s.reinforceAt) {
          s.reinforceAt -= 4;
          let active = this.enemies.items.filter(
            (a) => a.active && !a.broodNode && a.broodOwner === e.spawnId,
          ).length;
          for (const node of nodes)
            for (const offset of [-32, 32]) {
              if (active >= 6) break;
              if (!this.map.fits(node.x + offset, node.y, X.enemies[1].radius))
                continue;
              const add = this.spawn(1, node.x + offset, node.y);
              if (add) {
                add.broodOwner = e.spawnId;
                active++;
              }
            }
        }
        return false;
      }
    } else if (s.state === "recovery" && !s.time) {
      this.bossSet(e, "approach", 4);
    }
    return true;
  },
  patientStep(e) {
    const s = e.encounter,
      p = this.player;
    if (s.state === "approach") {
      if (
        s.time ||
        Math.hypot(p.x - e.x, p.y - e.y) > 430 ||
        !this.map.line(e.x, e.y, p.x, p.y)
      )
        return false;
      if (s.phase === 2) {
        Object.assign(s, { ax: p.x, ay: p.y });
        this.bossSet(e, "pulse", 1.4, "bossWarn");
      } else if (!this.patientHeal(e)) this.bossSet(e, "approach", 3);
    } else if (s.state === "pulse" && !s.time) {
      if (Math.hypot(p.x - s.ax, p.y - s.ay) <= 86)
        this.hurtPlayer(37 * this.diff.damage);
      if (!this.patientHeal(e)) {
        s.exposed = true;
        this.bossSet(e, "recovery", 2.5, "enemy");
      }
    } else if (s.state === "healing" && !s.time) {
      const heal = Math.min(
        e.maxHp * 0.05,
        e.maxHp * 0.14 - s.healed,
        e.maxHp - e.hp,
      );
      e.hp += heal;
      s.healed += heal;
      s.exposed = false;
      this.bossSet(e, "recovery", 2, "enemy");
    } else if (s.state === "recovery" && !s.time) {
      this.bossSet(e, "approach", 4.5);
    }
    return true;
  },
  patientHeal(e) {
    const s = e.encounter;
    if (s.healed >= e.maxHp * 0.14 - 0.01 || e.hp >= e.maxHp - 60) return false;
    s.interruptDamage = 0;
    this.bossSet(e, "healing", 3.5, "bossWarn");
    return true;
  },
  bossDamageTaken(e, damage) {
    const s = e.encounter;
    if (s?.state !== "healing" || !e.active) return;
    s.interruptDamage += damage;
    if (s.interruptDamage >= 60) {
      s.exposed = true;
      this.bossSet(e, "recovery", 3.3, "pickup");
    }
  },
  heartZones(e) {
    const p = this.player,
      m = this.map;
    const cx = Math.floor(p.x / 48),
      cy = Math.floor(p.y / 48);
    m.flow(this.navSmall, p.x, p.y);
    const reachable = (zone, x, y) => {
      for (let dy = -4; dy <= 4; dy++)
        for (let dx = -4; dx <= 4; dx++) {
          const q = m.point([Math.floor(x / 48) + dx, Math.floor(y / 48) + dy]);
          if (
            this.bossZoneDistance(zone, q.x, q.y) > 18 &&
            Math.hypot(q.x - x, q.y - y) <= 200 &&
            m.corridor(x, y, q.x, q.y, p.r)
          )
            return true;
        }
      return false;
    };
    const pads = (this.level.reactorPads || []).map((zone) =>
      zone.map((n) => n * 48),
    );
    const fitsFloor = ([x, y, w, h]) => {
      for (let row = y; row < y + h; row += 48)
        for (let col = x; col < x + w; col += 48)
          if (m.blocked(col + 24, row + 24)) return false;
      return true;
    };
    const local = [
      [(cx - 1) * 48, (cy - 1) * 48, 144, 144],
      [(cx - 1) * 48, cy * 48, 144, 48],
      [cx * 48, (cy - 1) * 48, 48, 144],
    ].find((z) => fitsFloor(z) && reachable(z, p.x, p.y));
    const first = pads.find(
      (z) =>
        this.bossZoneDistance(z, p.x, p.y) <= 42 &&
        fitsFloor(z) &&
        reachable(z, p.x, p.y),
    ) ||
      local || [cx * 48, cy * 48, 48, 48];
    if (e.encounter.phase === 1) return [first];
    const candidates = [...pads];
    for (const [dx, dy] of [
      [3, 0],
      [0, 3],
      [-3, 0],
      [0, -3],
      [4, 2],
      [-4, -2],
    ]) {
      const x = cx + dx,
        y = cy + dy;
      const q = m.point([x, y]);
      if (this.navSmall.field[m.index(q.x, q.y)] >= 0)
        candidates.push([(x - 1) * 48, (y - 1) * 48, 144, 144]);
    }
    const second = candidates.find((z) => {
      const [x, y, w, h] = z;
      return (
        x >= 48 &&
        y >= 48 &&
        x + w <= (m.w - 1) * 48 &&
        y + h <= (m.h - 1) * 48 &&
        (x + w <= first[0] ||
          x >= first[0] + first[2] ||
          y + h <= first[1] ||
          y >= first[1] + first[3]) &&
        fitsFloor(z) &&
        this.bossZoneDistance(z, p.x, p.y) <= 260 &&
        reachable(z, x + w / 2, y + h / 2)
      );
    });
    if (second) return [first, second];
    for (let i = 0; i < this.navSmall.field.length; i++) {
      if (this.navSmall.field[i] < 2 || this.navSmall.field[i] > 5) continue;
      const q = m.point([i % m.w, Math.floor(i / m.w)]);
      if (this.bossZoneDistance(first, q.x, q.y) > 24)
        return [first, [q.x - 24, q.y - 24, 48, 48]];
    }
    return [first];
  },
  bossZoneDistance([x, y, w, h], px, py) {
    return Math.max(x - px, px - x - w, y - py, py - y - h);
  },
  heartStep(e) {
    const s = e.encounter,
      p = this.player;
    if (s.state === "approach") {
      if (s.time || Math.hypot(p.x - e.x, p.y - e.y) > 520) return false;
      s.zones = this.heartZones(e);
      s.hit = false;
      s.index = 0;
      this.bossSet(e, "floorWarning", 1.8, "bossWarn");
    } else if (s.state === "floorWarning" && !s.time) {
      this.bossSet(e, "discharge", 0.55, "enemy");
    } else if (s.state === "discharge") {
      if (this.bossZoneDistance(s.zones[s.index], p.x, p.y) <= 0 && !s.hit) {
        s.hit = true;
        this.hurtPlayer(39 * this.diff.damage);
      }
      if (!s.time) {
        s.hit = false;
        if (++s.index < s.zones.length)
          this.bossSet(e, "floorWarning", 1.55, "bossWarn");
        else {
          s.exposed = true;
          this.bossSet(e, "recovery", 3.3);
        }
      }
    } else if (s.state === "recovery" && !s.time) {
      this.bossSet(e, "approach", 2.3);
    }
    return true;
  },
  bossDanger(e, x, y) {
    const s = e.encounter;
    if (s.state === "windup" || s.state === "charge")
      return (
        X.segmentDistance(
          x,
          y,
          s.state === "charge" ? e.x : s.ax,
          s.state === "charge" ? e.y : s.ay,
          s.bx,
          s.by,
        ) -
        e.r -
        this.player.r
      );
    if (s.state === "pulse") return Math.hypot(x - s.ax, y - s.ay) - 86;
    if (s.state === "floorWarning" || s.state === "discharge")
      return this.bossZoneDistance(s.zones[s.index], x, y);
    return Infinity;
  },
  drawBossCues(g) {
    g.save();
    for (const e of this.enemies.items) {
      if (!e.active || !e.boss) continue;
      const s = e.encounter;
      if (s.state === "windup" || s.state === "charge") {
        g.lineCap = "round";
        g.beginPath();
        g.moveTo(
          s.state === "charge" ? e.x : s.ax,
          s.state === "charge" ? e.y : s.ay,
        );
        g.lineTo(s.bx, s.by);
        g.strokeStyle = s.state === "charge" ? "#ff613d77" : "#ffc15e44";
        g.lineWidth = 2 * (e.r + this.player.r);
        g.stroke();
        g.setLineDash([14, 10]);
        g.strokeStyle = "#ffe19a";
        g.lineWidth = 4;
        g.stroke();
        g.setLineDash([]);
        if (Math.hypot(s.bx - s.ax, s.by - s.ay) > 22) {
          g.beginPath();
          g.moveTo(
            s.bx - 22 * Math.cos(s.angle - 0.65),
            s.by - 22 * Math.sin(s.angle - 0.65),
          );
          g.lineTo(s.bx, s.by);
          g.lineTo(
            s.bx - 22 * Math.cos(s.angle + 0.65),
            s.by - 22 * Math.sin(s.angle + 0.65),
          );
          g.stroke();
        }
      }
      if (s.state === "pulse") {
        g.beginPath();
        g.arc(s.ax, s.ay, 86, 0, 2 * Math.PI);
        g.fillStyle = "#e57c7044";
        g.fill();
        g.strokeStyle = "#ffb8a6";
        g.lineWidth = 5;
        g.setLineDash([6, 7]);
        g.stroke();
        g.setLineDash([]);
      }
      if (s.state === "healing") {
        g.fillStyle = "#111b19";
        g.fillRect(e.x - 38, e.y - e.r - 31, 76, 10);
        g.fillStyle = "#8fffb6";
        g.fillRect(e.x - 36, e.y - e.r - 29, 72 * (1 - s.time / 3.5), 6);
        g.strokeStyle = "#c4ffdb";
        g.lineWidth = 3;
        g.beginPath();
        g.arc(e.x, e.y, e.r, 0, 2 * Math.PI);
        g.stroke();
        g.beginPath();
        g.moveTo(e.x - 11, e.y);
        g.lineTo(e.x + 11, e.y);
        g.moveTo(e.x, e.y - 11);
        g.lineTo(e.x, e.y + 11);
        g.stroke();
      }
      if (s.state === "brood") {
        g.strokeStyle = "#ffc4ea";
        g.lineWidth = 5;
        g.setLineDash([5, 9]);
        g.beginPath();
        g.arc(e.x, e.y, e.r + 19 + 14 * (1 - s.time / 1.4), 0, 2 * Math.PI);
        g.stroke();
        g.setLineDash([]);
      }
      if (s.state === "guard") {
        for (const node of this.broodNodes(e)) {
          g.strokeStyle = "#ffc4ea";
          g.lineWidth = 3;
          g.setLineDash([5, 8]);
          g.beginPath();
          g.moveTo(e.x, e.y);
          g.lineTo(node.x, node.y);
          g.stroke();
          g.setLineDash([]);
          g.fillStyle = "#652b59";
          g.beginPath();
          g.arc(node.x, node.y, node.r, 0, 2 * Math.PI);
          g.fill();
          g.stroke();
          g.fillStyle = "#ffc4ea";
          g.fillRect(
            node.x - node.r,
            node.y - node.r - 7,
            (2 * node.r * node.hp) / node.maxHp,
            3,
          );
        }
      }
      if (s.state === "floorWarning" || s.state === "discharge") {
        for (let i = s.zones.length - 1; i >= s.index; i--) {
          const [x, y, w, h] = s.zones[i];
          const next = i > s.index,
            live = !next && s.state === "discharge";
          g.strokeStyle = next ? "#9ae6ff" : live ? "#fff3db" : "#ffd76b";
          g.fillStyle = live ? "#ff774a99" : "#ffcb5744";
          g.lineWidth = next ? 3 : 5;
          g.setLineDash(next ? [5, 9] : live ? [] : [15, 7]);
          if (!next) g.fillRect(x, y, w, h);
          g.strokeRect(x, y, w, h);
          g.setLineDash([]);
          g.fillStyle = "#09121b";
          g.fillRect(x + 4, y + 4 + (next ? 20 : 0), 28, 20);
          g.fillStyle = g.strokeStyle;
          g.font = "bold 15px Segoe UI";
          g.textAlign = "center";
          g.fillText(String(i + 1), x + 18, y + 19 + (next ? 20 : 0));
        }
      }
      if (s.state === "transition" || (s.state === "recovery" && s.exposed)) {
        g.strokeStyle = s.state === "transition" ? "#fff5ae" : "#91ffe4";
        g.lineWidth = 4;
        g.beginPath();
        g.arc(e.x, e.y, e.r + 11, 0, 2 * Math.PI);
        g.stroke();
      }
    }
    g.restore();
  },
});
