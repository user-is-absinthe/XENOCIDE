"use strict";
// Автопилот использует обычные ввод, боезапас и экономику; профиль хранится отдельно.
X.Demo = {
  key: "xenocide.demo.v1",
  active: false,
  saved: null,
  original: null,
  cycle: 1,
  stage: 1,
  wait: 0,
  load() {
    if (this.saved) return this.saved;
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return this.saved;
      if (raw.length > 8e6) throw Error("demo size");
      const data = JSON.parse(raw);
      if (
        data.version !== 1 ||
        !Number.isInteger(data.stage) ||
        data.stage < 1 ||
        data.stage > 20 ||
        !Number.isSafeInteger(data.cycle) ||
        data.cycle < 1
      )
        throw Error("demo format");
      const profile = X.Save.validate(data.profile);
      if (profile.checkpoint && profile.checkpoint.number !== data.stage)
        throw Error("demo checkpoint");
      this.saved = {
        version: 1,
        stage: data.stage,
        cycle: data.cycle,
        profile,
      };
    } catch (e) {
      X.UI.toast(
        "Сохранение демо недоступно. Можно начать новую демонстрацию.",
      );
    }
    return this.saved;
  },
  save() {
    if (!this.active) return;
    this.saved = {
      version: 1,
      stage: this.stage,
      cycle: this.cycle,
      profile: JSON.parse(JSON.stringify(X.profile)),
    };
    try {
      localStorage.setItem(this.key, JSON.stringify(this.saved));
    } catch (e) {
      X.UI.toast(
        "Демо сохранено только в памяти: локальное хранилище недоступно.",
        6000,
      );
    }
  },
  enter(resume, difficulty = 1) {
    if (this.active) return;
    X.Debug.leave();
    if (resume && !this.load()) return;
    this.original = X.profile;
    X.profile = resume
      ? X.Save.validate(this.saved.profile)
      : X.Save.defaults();
    // Настройки изображения/звука и раскладка те же, сложность сессии независима.
    X.profile.settings = JSON.parse(JSON.stringify(this.original.settings));
    if (!resume)
      X.profile.difficulty = Math.floor(X.Save.number(difficulty, 0, 3, 1));
    this.stage = resume ? this.saved.stage : 1;
    this.cycle = resume ? this.saved.cycle : 1;
    this.active = true;
    this.wait = 0;
    const cp = X.profile.checkpoint;
    if (!cp) this.supply();
    X.game.start(this.stage, cp);
    if (cp) this.restoreRuntime(X.game, cp.demoRuntime);
    this.resetPilot();
    X.game.checkpoint();
    X.Audio.settings();
    X.UI.toast("ДЕМО · управление компьютером · Esc — пауза и выход", 5000);
  },
  leave() {
    if (!this.active) return;
    if (X.game.state === "play") X.game.checkpoint();
    else this.save();
    X.profile = this.original;
    this.original = null;
    this.active = false;
    this.wait = 0;
    X.game.keys.clear();
    X.game.mouse.left = X.game.mouse.right = false;
    X.Audio.settings();
  },
  resetPilot() {
    this.think = 0;
    this.target = null;
    this.goal = null;
    this.nav = X.game.map.navigation(14);
    this.navGoal = -1;
    this.navTimer = 0;
    this.switchTimer = 0;
    this.velocities = new WeakMap();
    this.aimVelocity = { x: 0, y: 0 };
    this.coreRepair = false;
  },
  capture(g) {
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
      "enemy",
      "blast",
      "range",
      "bounces",
      "wallPierce",
      "shards",
      "shardDamage",
      "homing",
      "seek",
      "payload",
      "poolRadius",
      "poolDps",
      "poolLife",
      "fuse",
      "stuck",
      "hostId",
      "safeX",
      "safeY",
      "ownerID",
      "trackSeries",
      "hitAny",
      "armorPierce",
      "weakTime",
      "weakFactor",
      "cripple",
      "suppress",
      "ricochets",
      "umbrella",
    ];
    X.profile.checkpoint.demoRuntime = {
      shots: g.shots.items
        .filter((s) => s.active)
        .map((s) => ({
          ...Object.fromEntries(fields.map((key) => [key, s[key]])),
          hitIds: [...s.hit].map((e) => e.spawnId).filter(Number.isSafeInteger),
        })),
      spawnTimer: g.spawnTimer,
      checkTimer: g.checkTimer,
      invuln: g.player.invuln,
      pace: g.pace,
    };
  },
  restoreRuntime(g, data) {
    if (!data || !Array.isArray(data.shots) || data.shots.length > X.C.maxShots)
      return;
    const numeric = [
      "x",
      "y",
      "oldX",
      "oldY",
      "vx",
      "vy",
      "life",
      "damage",
      "pierce",
      "radius",
      "blast",
      "range",
      "bounces",
      "shards",
      "shardDamage",
      "homing",
      "seek",
      "poolRadius",
      "poolDps",
      "poolLife",
      "fuse",
      "hostId",
      "safeX",
      "safeY",
      "weakTime",
      "weakFactor",
      "cripple",
      "suppress",
      "ricochets",
    ];
    const flags = [
      "enemy",
      "wallPierce",
      "stuck",
      "trackSeries",
      "hitAny",
      "armorPierce",
      "umbrella",
    ];
    const enemies = g.enemies.items.filter((e) => e.active);
    g.shots.clear();
    for (const raw of data.shots) {
      if (
        !raw ||
        !["x", "y", "vx", "vy", "life", "damage"].every((k) =>
          Number.isFinite(raw[k]),
        ) ||
        raw.life <= 0
      )
        continue;
      const s = g.shots.get();
      for (const key of numeric) s[key] = X.Save.number(raw[key], -1e8, 1e8);
      for (const key of flags) s[key] = raw[key] === true;
      for (const key of ["color", "type", "kind", "payload", "ownerID"])
        s[key] = typeof raw[key] === "string" ? raw[key].slice(0, 40) : null;
      s.hit = new Set(
        enemies.filter(
          (e) => Array.isArray(raw.hitIds) && raw.hitIds.includes(e.spawnId),
        ),
      );
      s.host = enemies.find((e) => e.spawnId === s.hostId) || null;
    }
    g.spawnTimer = X.Save.number(data.spawnTimer, -1e8, 1, 0);
    g.checkTimer = X.Save.number(data.checkTimer, 0, 30, 30);
    g.player.invuln = X.Save.number(data.invuln, 0, 3);
    if ([0.55, 1, 1.4].includes(data.pace))
      g.pace = X.profile.settings.pace = data.pace;
  },
  finished(win) {
    if (win) {
      this.stage = (X.game.number % 20) + 1;
      if (X.game.number === 20) this.cycle++;
    } else this.stage = X.game.number;
    // Поражение повторяет текущую миссию с заработанными 50% и новыми покупками.
    this.wait = 4;
    X.game.state = "demo-wait";
    this.save();
    this.report(win);
  },
  report(win) {
    X.UI.show(
      '<div class="eyebrow">Демо · круг ' +
        this.cycle +
        "</div><h2>" +
        (win ? "Сектор зачищен" : "Повторная высадка") +
        "</h2><p>" +
        (win ? "Следующая миссия" : "Повтор миссии") +
        ": " +
        this.stage +
        " / 20 · " +
        X.levels[this.stage - 1].name +
        "</p><p>Получено ₡ " +
        X.game.creditsAwarded +
        '. Компьютер пополнит боезапас и купит доступное снаряжение. Высадка автоматически через 4 секунды.</p><div class="row">' +
        X.UI.button("demoPause", "ПАУЗА", true) +
        X.UI.button("menu", "ГЛАВНОЕ МЕНЮ") +
        "</div>",
      "demo-result",
    );
  },
  tick(g, dt) {
    if (!this.active) return;
    if (g.state === "demo-wait") {
      this.wait -= dt;
      if (this.wait <= 0) {
        this.supply();
        g.start(this.stage);
        this.resetPilot();
        g.checkpoint();
      }
      return;
    }
    if (g.state !== "play") return;
    this.think -= dt;
    this.switchTimer -= dt;
    this.navTimer -= dt;
    if (this.think <= 0) {
      this.decide(g);
      this.think = 0.099;
    }
    const p = g.player,
      t = this.target;
    if (t && !t.done && t.active !== false) {
      const w = X.weapons[g.weapon];
      const lead = w.speed
        ? Math.min(0.5, Math.hypot(t.x - p.x, t.y - p.y) / w.speed)
        : 0;
      const x = t.x + this.aimVelocity.x * lead,
        y = t.y + this.aimVelocity.y * lead;
      g.camera.x = Math.max(0, Math.min(g.map.w * 48 - 1152, p.x - 576));
      g.camera.y = Math.max(0, Math.min(g.map.h * 48 - 648, p.y - 324));
      g.mouse.x = (g.map.line(p.x, p.y, x, y) ? x : t.x) - g.camera.x;
      g.mouse.y = (g.map.line(p.x, p.y, x, y) ? y : t.y) - g.camera.y;
    } else g.mouse.left = g.mouse.right = false;
  },
  supply() {
    const p = X.profile;
    p.checkpoint = null;
    this.purchases = [];
    const buy = (ok, name) => {
      if (ok) this.purchases.push(name);
    };
    // Сначала резерв для имеющегося оружия. Никаких бесплатных ресурсов.
    const restock = () => {
      const packs = Math.max(3, Math.min(60, Math.floor(p.credits / 800)));
      const types = new Set(
        p.owned.map((i) => X.weapons[i].ammo).filter(Boolean),
      );
      for (const a of [
        "energy",
        "explosive",
        "fuel",
        "heavy",
        "shell",
        "light",
      ].filter((a) => types.has(a))) {
        const target = Math.max(
          X.ammo[a].pack * packs,
          ...p.owned
            .filter((i) => X.weapons[i].ammo === a)
            .map((i) => X.Armory.mag(X.weapons[i]) * 5),
        );
        for (
          let n = 0;
          n < 60 && p.ammo[a] < target && p.credits >= X.ammo[a].price;
          n++
        )
          buy(X.Economy.ammo(a), X.ammo[a].name);
      }
    };
    restock();
    // По одному новому виду за заход, остаток — на наиболее выгодные усиления.
    const next = [2, 4, 3, 7, 5, 6, 9, 8, 10, 12, 11].find(
      (i) => !p.owned.includes(i) && p.unlocked >= X.Economy.unlockAt[i],
    );
    if (next !== undefined && p.credits >= X.weapons[next].price)
      buy(X.Economy.weapon(next), X.weapons[next].name);
    restock();
    for (let n = 0; n < 50; n++) {
      const choices = [];
      const weights = {
        regeneration: 0.45,
        speed: 0.5,
        power: 0.8,
        health: 0.85,
        reload: 1,
        dashCharges: 1.1,
        armor: 1.2,
        stamina: 1.5,
        sprint: 1.5,
        secondChance: 1.8,
      };
      for (const u of X.upgrades) {
        const rank = p.upgrades[u.id],
          cost = Math.round(u.price * 1.65 ** rank);
        if (rank < u.max && cost <= p.credits)
          choices.push({
            score: cost * weights[u.id],
            buy: () => X.Economy.upgrade(u.id),
            name: u.name,
          });
      }
      for (const i of p.owned) {
        const w = X.weapons[i];
        for (const [field, base, action] of [
          ["weaponMods", 400 + w.price * 0.3, "mod"],
          ["weaponTuning", 450 + w.price * 0.25, "tune"],
        ]) {
          const rank = p[field][w.id] || 0,
            cost = Math.round(base * 1.8 ** rank);
          if (rank < X.Armory.max && cost <= p.credits)
            choices.push({
              score: cost * (i === 0 ? 1.4 : 1),
              buy: () => X.Economy[action](i),
              name: w.name,
            });
        }
      }
      choices.sort((a, b) => a.score - b.score);
      if (!choices.length || !choices[0].buy()) break;
      this.purchases.push(choices[0].name);
    }
    this.save();
  },
  chooseWeapon(g, target, distance, crowd) {
    let best = 0,
      score = -Infinity;
    for (const i of X.profile.owned) {
      const w = X.weapons[i];
      if (w.debugOnly || (w.ammo && g.mags[i] + g.ammo[w.ammo] <= 0)) continue;
      if (target?.kind === "nest" && w.kind === "tesla") continue;
      const s = X.Armory.stats(w, false);
      let value =
        (s.damage * (s.pellets || 1)) / Math.max(0.1, s.rate + (s.charge || 0));
      if (w.kind === "blade" && distance > s.range + 20) value *= 0.02;
      if (distance > s.range * 0.9) value *= 0.08;
      if (w.kind === "shotgun")
        value *= Math.min(1, 130 / Math.max(1, distance));
      if (w.kind === "rifle") value *= 3;
      if (w.blast && distance < w.blast + 120) value *= 0.01;
      if (["tesla", "flame", "grenade", "plasma"].includes(w.kind))
        value *= 1 + Math.min(5, crowd) * 0.2;
      if (target?.type !== undefined)
        value *= X.enemies[target.type].resist?.[w.type] || 1;
      if (w.ammo && !g.mags[i]) value *= 0.5;
      if (i === g.weapon) value *= 1.3;
      if (value > score) {
        score = value;
        best = i;
      }
    }
    if (
      best !== g.weapon &&
      this.switchTimer <= 0 &&
      !g.pendingBurst &&
      !g.charge
    ) {
      g.switchWeapon(best);
      this.switchTimer = 1;
    }
  },
  decide(g) {
    const p = g.player,
      m = g.map,
      k = X.profile.settings.keys;
    const enemies = g.enemies.items.filter((e) => e.active);
    let near = null,
      distance = Infinity,
      targetScore = Infinity,
      closest = Infinity,
      crowd = 0;
    const core = g.level.mode === "defend" ? g.objectives[0] : null;
    const coreThreats = core
      ? enemies.filter(
          (e) =>
            e.type % 3 === 0 && Math.hypot(e.x - core.x, e.y - core.y) < 200,
        )
      : [];
    for (const e of enemies) {
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      closest = Math.min(closest, d);
      if (d < 240) crowd++;
      const priority =
        d * (e.type === 6 ? 0.35 : 1) * (coreThreats.includes(e) ? 0.3 : 1);
      if (priority < targetScore && m.line(p.x, p.y, e.x, e.y)) {
        near = e;
        distance = d;
        targetScore = priority;
      }
    }
    let goal = null,
      nest = null;
    const unfinished = g.objectives.filter((o) => !o.done);
    if (unfinished.length)
      goal = unfinished.reduce((a, b) =>
        Math.hypot(a.x - p.x, a.y - p.y) < Math.hypot(b.x - p.x, b.y - p.y)
          ? a
          : b,
      );
    if (goal?.kind === "nest" && m.line(p.x, p.y, goal.x, goal.y)) nest = goal;
    if (
      core?.done &&
      (g.wave < g.level.waves ||
        g.spawnQueue.length ||
        coreThreats.length ||
        g.coreHp < 350)
    )
      goal = core;
    if (g.ready()) goal = g.exit;
    // При необходимости лечиться/пополнить запас подбираем ближайший доступный ресурс.
    let loot = null,
      lootScore = Infinity;
    for (const l of g.loot) {
      const d = Math.hypot(l.x - p.x, l.y - p.y);
      const useful =
        l.kind === "health"
          ? p.hp < p.maxHp * 0.8
          : !l.ammoType ||
            X.profile.owned.some(
              (i) =>
                X.weapons[i].ammo === l.ammoType &&
                g.ammo[l.ammoType] < X.ammo[l.ammoType].pack * 2,
            );
      if (
        useful &&
        d < lootScore &&
        (!goal || d < 300) &&
        m.line(p.x, p.y, l.x, l.y)
      ) {
        loot = l;
        lootScore = d;
      }
    }
    if (
      loot &&
      !g.ready() &&
      (!core ||
        (!coreThreats.length &&
          g.coreHp > 400 &&
          Math.hypot(loot.x - core.x, loot.y - core.y) < 140))
    )
      goal = loot;
    if (!goal && !near && enemies.length) goal = enemies[0];
    const target =
      nest && (distance > 200 || g.level.mode === "timed")
        ? nest
        : near || nest;
    this.target = target;
    const targetDistance = target
      ? Math.hypot(target.x - p.x, target.y - p.y)
      : Infinity;
    this.chooseWeapon(g, target, targetDistance, crowd);
    const w = X.weapons[g.weapon],
      stats = X.Armory.stats(w, false);
    const prev = target ? this.velocities.get(target) : null;
    this.aimVelocity = prev
      ? { x: (target.x - prev.x) / 0.1, y: (target.y - prev.y) / 0.1 }
      : { x: 0, y: 0 };
    for (const e of enemies) this.velocities.set(e, { x: e.x, y: e.y });
    if (nest) this.velocities.set(nest, { x: nest.x, y: nest.y });
    let alt = false;
    if (target && target.kind !== "nest") {
      if (w.id === "pistol")
        alt =
          !target.weakTime &&
          g.mags[g.weapon] >= 4 &&
          target.hp > stats.damage * 3;
      else if (w.id === "sniper")
        alt =
          !target.cripple &&
          g.mags[g.weapon] >= 2 &&
          (target.boss || distance < 220);
      else if (w.id === "smg") alt = crowd >= 3 && g.mags[g.weapon] >= 5;
      else if (w.id === "rifle")
        alt = distance < 180 && crowd > 1 && g.mags[g.weapon] >= 3;
      else if (w.kind === "blade")
        alt = distance < 100 && g.gunState.parryCooldown <= 0 && p.invuln <= 0;
      else if (w.kind === "tesla") alt = crowd > 1;
      else if (w.kind === "flame")
        alt =
          distance > 140 &&
          g.mags[g.weapon] >= 20 &&
          (crowd > 1 || coreThreats.length > 1);
      else if (w.kind === "plasma")
        alt =
          distance > 180 &&
          g.mags[g.weapon] >= 4 &&
          (target.boss || coreThreats.length > 1);
      else if (["rocket", "rail"].includes(w.kind))
        alt = !!target.boss && distance > 300;
      else if (w.kind === "grenade") alt = crowd >= 3 && closest < 220;
      else if (w.kind === "shotgun")
        alt = distance > 200 && g.mags[g.weapon] > 1 && !!target.boss;
      else if (w.kind === "machine") alt = distance > 450 && closest > 350;
    }
    // Не сбрасывать долгий заряд, меняя решение о режиме посреди атаки.
    if (g.charge > 0) alt = g.mouse.right;
    const firing =
      !!target &&
      targetDistance <
        (alt ? X.Armory.stats(w, true).range : stats.range) * 0.95;
    g.mouse.left = firing && !alt;
    g.mouse.right = firing && alt;
    if (
      w.ammo &&
      g.mags[g.weapon] < X.Armory.mag(w) * 0.3 &&
      closest > 400 &&
      !g.pendingBurst
    )
      g.beginReload();
    g.keys.clear();
    if (core?.done) {
      if (g.coreHp < 220 && !coreThreats.length) this.coreRepair = true;
      if (g.coreHp > 460 || coreThreats.length) this.coreRepair = false;
      if (g.ready() || this.coreRepair || !near || g.reload > 0)
        g.keys.add(k.interact);
    } else g.keys.add(k.interact);
    // Тянуть маршрут по центрам клеток и срезать только проверенные прямые участки.
    const waypoint = goal ? this.waypoint(g, goal) : null;
    const dirs = [
      [0, 0],
      [1, 0, k.right],
      [-1, 0, k.left],
      [0, 1, k.down],
      [0, -1, k.up],
      [Math.SQRT1_2, Math.SQRT1_2, k.right, k.down],
      [-Math.SQRT1_2, Math.SQRT1_2, k.left, k.down],
      [Math.SQRT1_2, -Math.SQRT1_2, k.right, k.up],
      [-Math.SQRT1_2, -Math.SQRT1_2, k.left, k.up],
    ];
    let move = dirs[0],
      best = -Infinity;
    const holding =
      goal?.kind === "terminal" &&
      Math.hypot(goal.x - p.x, goal.y - p.y) < 72 &&
      (!goal.done || (core && this.coreRepair));
    for (const dir of dirs) {
      const x = p.x + dir[0] * 18,
        y = p.y + dir[1] * 18;
      if (!m.corridor(p.x, p.y, x, y, p.r + 1)) continue;
      let value =
        waypoint && !holding
          ? -Math.hypot(x - waypoint.x, y - waypoint.y) *
            (g.ready() || g.level.mode === "timed" || coreThreats.length
              ? 2
              : 0.8)
          : 0;
      if (holding)
        value -= Math.hypot(x - goal.x, y - goal.y) * (core ? 2 : 0.8);
      if (core?.done && goal === core)
        value -=
          Math.max(
            0,
            Math.hypot(x - core.x, y - core.y) - (this.coreRepair ? 70 : 220),
          ) * 12;
      for (const e of enemies) {
        const d = Math.hypot(e.x - x, e.y - y);
        const safe = w.kind === "blade" ? 60 : 160;
        if (d < safe) value -= (safe - d) * 5;
      }
      if (near && !waypoint && w.kind !== "blade")
        value -= Math.abs(Math.hypot(x - near.x, y - near.y) - 300) * 0.3;
      if (near && w.kind === "blade")
        value -= Math.abs(Math.hypot(x - near.x, y - near.y) - 85) * 0.8;
      for (const s of g.shots.items)
        if (s.active && s.enemy) {
          const d = Math.hypot(s.x + s.vx * 0.2 - x, s.y + s.vy * 0.2 - y);
          if (d < 80) value -= (80 - d) * 2;
        }
      for (const [hx, hy, hw, hh] of g.level.hazards || [])
        if (
          g.time % 6 > 3 &&
          x > hx * 48 &&
          x < (hx + hw) * 48 &&
          y > hy * 48 &&
          y < (hy + hh) * 48
        )
          value -= 400;
      for (const s of g.surfaces.items)
        if (s.active && Math.hypot(x - s.x, y - s.y) < s.radius) value -= 150;
      if (value > best) {
        best = value;
        move = dir;
      }
    }
    for (const key of move.slice(2)) g.keys.add(key);
    if (closest < 105 && !g.dashHeld && move.length > 2) {
      // Рывок только по свободному отрезку, чтобы не влетать в стену.
      if (m.corridor(p.x, p.y, p.x + move[0] * 150, p.y + move[1] * 150, p.r))
        g.keys.add(k.dash);
    }
    if (
      (closest < 180 || (!near && waypoint)) &&
      p.stamina > 25 &&
      (!waypoint || Math.hypot(waypoint.x - p.x, waypoint.y - p.y) > 100)
    )
      g.keys.add(k.sprint);
  },
  waypoint(g, goal) {
    const m = g.map,
      p = g.player,
      cell = m.index(goal.x, goal.y);
    if (this.navGoal !== cell || this.navTimer <= 0) {
      m.flow(this.nav, goal.x, goal.y);
      this.navGoal = cell;
      this.navTimer = 0.5;
    }
    if (m.corridor(p.x, p.y, goal.x, goal.y, p.r + 1)) return goal;
    let n = m.index(p.x, p.y),
      point = m.point([n % m.w, Math.floor(n / m.w)]);
    for (let i = 0; i < 12; i++) {
      const next = [n - 1, n + 1, n - m.w, n + m.w]
        .filter(
          (v) =>
            v >= 0 &&
            v < this.nav.field.length &&
            this.nav.field[v] >= 0 &&
            this.nav.field[v] < this.nav.field[n],
        )
        .sort((a, b) => this.nav.field[a] - this.nav.field[b])[0];
      if (next === undefined) break;
      const q = m.point([next % m.w, Math.floor(next / m.w)]);
      if (!m.corridor(p.x, p.y, q.x, q.y, p.r + 1)) break;
      point = q;
      n = next;
    }
    return point;
  },
};
