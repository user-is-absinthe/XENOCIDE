"use strict";
X.Game = class {
  constructor() {
    this.state = "menu";
    this.keys = new Set();
    this.mouse = { x: 576, y: 324, left: false, right: false };
    this.shots = new X.Pool(X.C.maxShots);
    this.particles = new X.Pool(X.C.maxParticles);
    this.enemies = new X.Pool(X.C.maxEnemies);
    this.surfaces = new X.Pool(32);
    this.hash = new X.Hash();
    this.camera = { x: 0, y: 0 };
    this.accumulator = 0;
    this.last = 0;
    this.fps = 60;
    this.mapOpen = false;
    this.damageFlash = 0;
    this.shake = 0;
    this.clock = 0;
    this.loot = [];
    this.marks = [];
  }
  start(number = 1, checkpoint = null) {
    if (number === 0 && !X.Debug.active) return;
    this.number = number;
    this.level =
      number === 0
        ? X.Debug.arena
        : number <= 20
          ? X.levels[number - 1]
          : X.generate(number, X.profile.endless.seed);
    this.map = X.makeMap(this.level);
    this.navSmall = this.map.navigation(14);
    this.navBig = this.map.navigation(34);
    this.navCore = this.map.navigation(34);
    this.rng = new X.RNG(4111 + number * 7919);
    this.visualRng = new X.RNG(number * 13 + 99);
    this.difficulty = X.profile.difficulty;
    this.pace = X.profile.settings.pace;
    this.diff = X.difficulties[this.difficulty];
    X.profile.resumeMode = number > 20 ? "endless" : "campaign";
    this.scoreResult = null;
    const p = this.map.point(this.level.start),
      u = X.profile.upgrades;
    this.player = {
      ...p,
      r: 14,
      hp: 100 + 25 * u.health,
      maxHp: 100 + 25 * u.health,
      armor: 20 * u.armor,
      maxArmor: 20 * u.armor,
      stamina: X.PlayerStats.stamina(u),
      maxStamina: X.PlayerStats.stamina(u),
      dashCharges: X.PlayerStats.dashCapacity(u),
      maxDashCharges: X.PlayerStats.dashCapacity(u),
      dash: 0,
      invuln: 1,
      angle: 0,
    };
    const experimental = X.weapons.findIndex((w) => w.debugOnly);
    this.weapon =
      X.Debug.active && X.profile.owned.includes(experimental)
        ? experimental
        : 1;
    this.ammo = { ...X.profile.ammo };
    this.mags = X.weapons.map((w, i) => {
      if (!w.ammo || !X.profile.owned.includes(i)) return 0;
      let n = Math.min(X.Armory.mag(w), this.ammo[w.ammo]);
      this.ammo[w.ammo] -= n;
      return n;
    });
    this.cool = 0;
    this.reload = 0;
    this.reloadTotal = 0;
    this.charge = 0;
    this.spin = 0;
    this.pendingBurst = null;
    this.gunState = this.newGunState();
    this.ammoNotice = 0;
    this.pulse = null;
    this.enemySerial = 0;
    this.moving = false;
    this.time = 0;
    this.kills = 0;
    this.earned = 0;
    this.wave = 0;
    this.rewardedWave = 0;
    this.dashHeld = false;
    this.repairing = false;
    this.waveTimer = 3;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.flowTimer = 0;
    this.checkTimer = 30;
    this.stats = { shots: 0, damage: 0, bladeKills: 0 };
    this.objectives = (this.level.targets || []).map((t) => ({
      ...this.map.point(t),
      kind: this.level.mode === "nests" ? "nest" : "terminal",
      done: false,
      hp: 450 + Math.min(number, 40) * 20,
      progress: 0,
    }));
    this.exit = this.map.point(this.level.exit);
    this.coreHp = X.C.coreMaxHp;
    this.defendTime = 0;
    this.shots.clear();
    this.enemies.clear();
    this.surfaces.clear();
    this.particles.clear();
    this.loot = [];
    this.marks = [];
    this.mapOpen = false;
    this.damageFlash = 0;
    this.shake = 0;
    this.bossSpawned = false;
    this.blasts = [];
    this.beams = [];
    this.arc = null;
    this.muzzle = 0;
    this.state = "play";
    this.keys.clear();
    this.mouse.left = this.mouse.right = false;
    this.map.bfs(p.x, p.y);
    this.map.flow(this.navSmall, p.x, p.y);
    this.map.flow(this.navBig, p.x, p.y);
    if (this.objectives[0])
      this.map.flow(this.navCore, this.objectives[0].x, this.objectives[0].y);
    this.seedLoot();
    if (checkpoint) this.restore(checkpoint);
    this.autoReload();
    X.Scoring.start(this);
    X.Render.prepare(this);
    X.UI.hide();
    X.UI.toast(this.level.brief, 6000);
  }
  creditReward(base) {
    const amount = Math.round(base * this.diff.economy);
    this.earned += amount;
    return amount;
  }
  seedLoot() {
    for (const [i, p] of (
      this.level.resources || [
        [8, 13],
        [28, 10],
      ]
    ).entries()) {
      let q = this.map.point(p);
      if (this.map.fits(q.x, q.y, 12)) {
        if (i % 3 === 0) this.loot.push({ ...q, kind: "health", amount: 1 });
        else this.addAmmoLoot(q.x, q.y);
      }
    }
  }
  interact(dt) {
    let p = this.player;
    for (const o of this.objectives)
      if (
        !o.done &&
        o.kind === "terminal" &&
        Math.hypot(o.x - p.x, o.y - p.y) < 95 &&
        this.map.line(p.x, p.y, o.x, o.y)
      ) {
        o.progress += dt;
        if (o.progress >= 1.5) {
          o.done = true;
          this.creditReward(150);
          X.UI.toast("Терминал активирован");
          X.Audio.play("pickup");
          this.checkpoint();
        }
        return;
      }
    const core = this.objectives[0];
    if (
      this.level.mode === "defend" &&
      core?.done &&
      this.coreHp > 0 &&
      this.coreHp < X.C.coreMaxHp &&
      Math.hypot(core.x - p.x, core.y - p.y) < 95 &&
      this.map.line(p.x, p.y, core.x, core.y)
    ) {
      this.coreHp = Math.min(
        X.C.coreMaxHp,
        this.coreHp + X.C.coreRepairRate * dt,
      );
      this.repairing = true;
      return;
    }
    if (this.ready() && Math.hypot(this.exit.x - p.x, this.exit.y - p.y) < 95)
      this.finish(true);
  }
  ready() {
    return (
      this.wave >= this.level.waves &&
      !this.spawnQueue.length &&
      !this.activeEnemies() &&
      this.objectives.every((o) => o.done) &&
      (this.level.mode !== "defend" || this.coreHp > 0)
    );
  }
  completeWave() {
    if (
      this.state !== "play" ||
      this.wave <= this.rewardedWave ||
      this.wave <= 0 ||
      this.spawnQueue.length ||
      this.activeEnemies()
    )
      return;
    this.rewardedWave = this.wave;
    if (this.player.hp <= 0) return;
    const healed = Math.min(
      this.player.maxHp - this.player.hp,
      this.player.maxHp * X.PlayerStats.waveHeal(X.profile.upgrades),
    );
    if (healed > 0) {
      this.player.hp += healed;
      this.fx(this.player.x, this.player.y, "#80e5a9", 12, 80);
      X.UI.toast(
        "Волна зачищена · регенерация +" + Math.ceil(healed) + " HP",
        2200,
      );
      X.Audio.play("pickup");
    }
  }
  newWave() {
    this.wave++;
    let count = Math.round(
      Math.min(
        100,
        9 +
          Math.min(this.number, 35) * 1.65 +
          this.wave * 2 +
          Math.log2(1 + Math.max(0, this.number - 20)) * 3,
      ) * this.diff.count,
    );
    if (
      this.level.mode === "boss" &&
      this.wave === this.level.waves &&
      !this.bossSpawned
    ) {
      this.bossSpawned = true;
      this.spawnQueue.push({ type: this.level.boss, elite: false });
      count = Math.round(count * 0.5);
    }
    for (let i = 0; i < count; i++)
      this.spawnQueue.push({
        type: this.rng.pick(this.level.types),
        elite:
          this.rng.next() <
          Math.min(
            0.38,
            this.diff.elite +
              Math.log2(1 + Math.max(0, this.number - 20)) * 0.025,
          ),
      });
    this.waveTimer = this.level.interval * X.profile.settings.pace;
    X.UI.toast("Контакт · волна " + this.wave + " / " + this.level.waves, 2200);
  }
  update(dt) {
    if (this.state !== "play") return;
    this.clock += dt;
    this.time += dt;
    this.gunStep(dt);
    this.cool = Math.max(0, this.cool - dt);
    this.shake = Math.max(0, this.shake - dt * 20);
    this.damageFlash = Math.max(0, this.damageFlash - dt * 2);
    let p = this.player,
      k = X.profile.settings.keys;
    let dx = (this.keys.has(k.right) ? 1 : 0) - (this.keys.has(k.left) ? 1 : 0),
      dy = (this.keys.has(k.down) ? 1 : 0) - (this.keys.has(k.up) ? 1 : 0),
      length = Math.hypot(dx, dy);
    if (length) {
      dx /= length;
      dy /= length;
    }
    this.camera.x = Math.max(0, Math.min(this.map.w * 48 - 1152, p.x - 576));
    this.camera.y = Math.max(0, Math.min(this.map.h * 48 - 648, p.y - 324));
    p.angle = Math.atan2(
      this.mouse.y + this.camera.y - p.y,
      this.mouse.x + this.camera.x - p.x,
    );
    this.muzzle = Math.max(0, this.muzzle - dt);
    let sprint = this.keys.has(k.sprint) && p.stamina > 0 && length;
    this.moving = !!length;
    let speed =
      185 *
      (1 + 0.06 * X.profile.upgrades.speed) *
      (sprint ? X.PlayerStats.sprint(X.profile.upgrades) : 1);
    if (
      X.weapons[this.weapon].kind === "machine" &&
      (this.mouse.left || this.mouse.right)
    )
      speed *= this.mouse.right ? 0.2 : 0.65;
    p.stamina = Math.max(
      0,
      Math.min(
        p.maxStamina,
        p.stamina +
          (sprint ? -32 : X.PlayerStats.staminaRegen(X.profile.upgrades)) * dt,
      ),
    );
    if (p.dashCharges < p.maxDashCharges) {
      p.dash = Math.max(0, p.dash - dt);
      if (p.dash <= 0) {
        p.dashCharges++;
        p.dash =
          p.dashCharges < p.maxDashCharges ? X.PlayerStats.dashCooldown : 0;
      }
    }
    p.invuln = Math.max(0, p.invuln - dt);
    const dashPressed = this.keys.has(k.dash);
    if (
      dashPressed &&
      !this.dashHeld &&
      p.dashCharges > 0 &&
      !(this.weapon === 5 && this.mouse.right)
    ) {
      let a = length ? Math.atan2(dy, dx) : p.angle;
      for (let i = 0; i < 12; i++)
        this.map.move(p, Math.cos(a) * 12, Math.sin(a) * 12);
      p.dashCharges--;
      if (p.dash <= 0) p.dash = X.PlayerStats.dashCooldown;
      p.invuln = 0.32;
      this.fx(p.x, p.y, "#78d8dc", 12, 100);
      X.Audio.play("dash");
    }
    this.dashHeld = dashPressed;
    this.map.move(p, dx * speed * dt, dy * speed * dt);
    this.camera.x = Math.max(0, Math.min(this.map.w * 48 - 1152, p.x - 576));
    this.camera.y = Math.max(0, Math.min(this.map.h * 48 - 648, p.y - 324));
    this.repairing = false;
    if (this.keys.has(k.interact)) this.interact(dt);
    if (this.state !== "play") return;
    if (this.repairing) this.cancelBurst();
    else this.burstStep(dt);
    this.autoReload();
    if (this.reload > 0) {
      this.reload -= dt;
      if (this.reload <= 0) {
        this.reload = 0;
        this.refillMagazine();
      }
    } else if (
      !this.repairing &&
      (!X.weapons[this.weapon].ammo || this.mags[this.weapon] > 0) &&
      (this.mouse.left || this.mouse.right) &&
      this.cool <= 0
    ) {
      let w = X.weapons[this.weapon];
      this.charge += dt;
      if (
        !this.weaponCharge(this.mouse.right) ||
        this.charge >= this.weaponCharge(this.mouse.right)
      ) {
        this.fire(this.mouse.right);
        this.charge = 0;
      }
    } else if (this.repairing || (!this.mouse.left && !this.mouse.right)) {
      this.charge = 0;
      this.spin = Math.max(0, this.spin - dt * 2);
    }
    if (this.mouse.left || this.mouse.right)
      this.spin = Math.min(1, this.spin + dt);
    this.waveTimer -= dt;
    const waveCleared =
      this.wave > 0 && !this.spawnQueue.length && !this.activeEnemies();
    if (waveCleared) this.completeWave();
    if (this.wave < this.level.waves && (this.waveTimer <= 0 || waveCleared))
      this.newWave();
    this.spawnTimer -= dt;
    if (
      this.spawnQueue.length &&
      this.spawnTimer <= 0 &&
      this.activeEnemies() < X.C.maxEnemies - 8
    ) {
      let s = this.rng.pick(this.level.spawns),
        q = this.map.point(s);
      if (Math.hypot(q.x - p.x, q.y - p.y) < 250) {
        let far = this.level.spawns.reduce((a, b) => {
          const pa = this.map.point(a),
            pb = this.map.point(b);
          return Math.hypot(pa.x - p.x, pa.y - p.y) >
            Math.hypot(pb.x - p.x, pb.y - p.y)
            ? a
            : b;
        });
        q = this.map.point(far);
      }
      let entry = this.spawnQueue.shift();
      this.spawn(entry.type, q.x, q.y, entry.elite);
      this.fx(q.x, q.y, "#a56ce4", 4, 40);
      this.spawnTimer = 0.13;
    }
    this.flowTimer -= dt;
    if (this.flowTimer <= 0) {
      this.map.bfs(p.x, p.y);
      this.map.flow(this.navSmall, p.x, p.y);
      this.map.flow(this.navBig, p.x, p.y);
      this.flowTimer = 0.35;
    }
    this.hash.clear();
    for (const e of this.enemies.items) if (e.active) this.hash.insert(e);
    for (const e of this.enemies.items) if (e.active) this.enemyStep(e, dt);
    if (this.state !== "play") return;
    this.projectileStep(dt);
    this.surfaceStep(dt);
    this.lootStep();
    this.completeWave();
    if (this.level.mode === "defend" && this.objectives.every((o) => o.done))
      this.defendTime += dt;
    for (const [x, y, w, h] of this.level.hazards || [])
      if (
        this.time % 6 > 4 &&
        p.x > x * 48 &&
        p.x < (x + w) * 48 &&
        p.y > y * 48 &&
        p.y < (y + h) * 48
      )
        this.hurtPlayer(12 * this.diff.damage);
    if (
      this.level.mode === "timed" &&
      this.time > this.level.limit * X.profile.settings.pace
    ) {
      this.finish(false, "Реактор достиг критической массы");
      return;
    }
    for (const o of this.particles.items)
      if (o.active) {
        o.life -= dt;
        if (o.life <= 0) o.active = false;
        else {
          o.x += o.vx * dt;
          o.y += o.vy * dt;
          o.vx *= 0.96;
          o.vy *= 0.96;
        }
      }
    this.checkTimer -= dt;
    if (this.checkTimer <= 0) {
      this.checkpoint();
      this.checkTimer = 30;
    }
    if (p.hp <= 0) this.finish(false);
  }
  lootStep() {
    const p = this.player,
      picked = {};
    for (let i = this.loot.length - 1; i >= 0; i--) {
      const l = this.loot[i];
      if (Math.hypot(l.x - p.x, l.y - p.y) >= 35) continue;
      if (l.kind === "health" && p.hp >= p.maxHp) continue;
      if (l.kind === "health")
        p.hp = Math.min(p.maxHp, p.hp + 30 * l.amount * this.diff.loot);
      else
        for (const a of l.ammoType ? [l.ammoType] : X.Loot.types()) {
          const n = X.Loot.quantity(a, l.amount, this.diff);
          this.ammo[a] = Math.min(99999, this.ammo[a] + n);
          picked[a] = (picked[a] || 0) + n;
        }
      this.loot.splice(i, 1);
      X.Audio.play("pickup");
    }
    if (Object.keys(picked).length)
      X.UI.toast(
        Object.entries(picked)
          .map(([a, n]) => X.ammo[a].name + " +" + n)
          .join(" · "),
        2200,
      );
  }
  fx(x, y, color, n, speed) {
    let limit = [100, 350, 700][X.profile.settings.quality];
    for (let i = 0; i < n; i++) {
      let o = null;
      for (let j = 0; j < limit; j++) {
        const candidate =
          this.particles.items[(this.particles.cursor + j) % limit];
        if (!candidate.active) {
          o = candidate;
          this.particles.cursor = (this.particles.cursor + j + 1) % limit;
          o.active = true;
          break;
        }
      }
      if (!o) return;
      const a = this.visualRng.next() * Math.PI * 2,
        v = this.visualRng.next() * speed;
      Object.assign(o, {
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: 0.15 + this.visualRng.next() * 0.35,
        color,
        size: 1 + this.visualRng.next() * 3,
      });
    }
  }
  beam(x, y, tx, ty, color, width = 3) {
    this.beams = this.beams || [];
    this.beams.push({ x, y, tx, ty, color, width, life: 0.14 });
    if (this.beams.length > 64) this.beams.shift();
  }
  checkpoint() {
    if (X.Debug?.active) return;
    if (this.state !== "play") return;
    X.profile.checkpoint = this.snapshot();
    X.Save.write(X.profile);
  }
  snapshot() {
    return {
      number: this.number,
      time: this.time,
      player: { ...this.player },
      weapon: this.weapon,
      ammo: { ...this.ammo },
      mags: [...this.mags],
      wave: this.wave,
      rewardedWave: this.rewardedWave,
      waveTimer: this.waveTimer,
      kills: this.kills,
      earned: this.earned,
      objectives: this.objectives.map((o) => ({ ...o })),
      enemies: this.enemies.items
        .filter((e) => e.active)
        .map((e) => ({ ...e })),
      spawnQueue: this.spawnQueue.map((e) => ({ ...e })),
      loot: this.loot.map((l) => ({ ...l })),
      coreHp: this.coreHp,
      defendTime: this.defendTime,
      bossSpawned: this.bossSpawned,
      seed: this.rng.seed,
      stats: { ...this.stats },
      weaponState: {
        cool: this.cool,
        reload: this.reload,
        reloadTotal: this.reloadTotal,
        charge: this.charge,
        spin: this.spin,
      },
      gunState: { ...this.gunState },
      burstState: this.pendingBurst
        ? {
            remaining: this.pendingBurst.remaining,
            timer: this.pendingBurst.timer,
            alt: this.pendingBurst.alt,
            per: this.pendingBurst.per,
            fired: this.pendingBurst.fired,
          }
        : null,
      weaponEffects: this.effectsSnapshot(),
    };
  }
  restore(c) {
    for (const key of [
      "time",
      "weapon",
      "wave",
      "waveTimer",
      "kills",
      "earned",
      "coreHp",
      "defendTime",
      "bossSpawned",
    ])
      if (c[key] !== undefined) this[key] = c[key];
    this.player = { ...c.player, r: 14, invuln: 2 };
    if (c.weaponState)
      for (const key of ["cool", "reload", "reloadTotal", "charge", "spin"])
        this[key] = X.Save.number(
          c.weaponState[key],
          0,
          key === "spin" ? 1 : 10,
        );
    this.gunState = { ...this.newGunState(), ...c.gunState };
    this.player.maxStamina = X.PlayerStats.stamina(X.profile.upgrades);
    this.player.maxDashCharges = X.PlayerStats.dashCapacity(X.profile.upgrades);
    this.player.dashCharges = Math.floor(
      X.Save.number(
        c.player.dashCharges,
        0,
        this.player.maxDashCharges,
        c.player.dash > 0 ? 0 : this.player.maxDashCharges,
      ),
    );
    this.player.stamina = X.Save.number(
      c.player.stamina,
      0,
      this.player.maxStamina,
    );
    this.rewardedWave = Math.floor(
      X.Save.number(c.rewardedWave, 0, c.wave, Math.max(0, c.wave - 1)),
    );
    this.ammo = { ...c.ammo };
    this.mags = [...c.mags];
    this.objectives = c.objectives.map((o) => ({ ...o }));
    this.spawnQueue = c.spawnQueue.map((e) => ({ ...e }));
    this.loot = [];
    for (const l of c.loot) {
      if (l.kind === "ammo" && !l.ammoType)
        this.addAmmoLoot(l.x, l.y, l.amount);
      else this.loot.push({ ...l });
    }
    this.enemySerial = Math.max(
      0,
      ...c.enemies.map((e) =>
        Number.isSafeInteger(e.spawnId) ? e.spawnId : 0,
      ),
    );
    for (const e of c.enemies) {
      let o = this.enemies.get();
      if (o)
        Object.assign(o, e, {
          active: true,
          spawnId:
            Number.isSafeInteger(e.spawnId) && e.spawnId > 0
              ? e.spawnId
              : ++this.enemySerial,
          r: X.enemies[e.type].radius,
          pathIndex: -1,
          pathX: e.x,
          pathY: e.y,
          losTimer: 0,
          clear: false,
        });
    }
    this.rng.seed = c.seed;
    this.stats = { shots: 0, damage: 0, bladeKills: 0, ...c.stats };
    this.map.bfs(this.player.x, this.player.y);
    this.map.flow(this.navSmall, this.player.x, this.player.y);
    this.map.flow(this.navBig, this.player.x, this.player.y);
    this.enemySerial = Math.max(
      0,
      ...this.enemies.items.filter((e) => e.active).map((e) => e.spawnId || 0),
    );
    this.restoreEffects(c.weaponEffects);
    this.restoreBurst(c.burstState);
  }
  finish(win, reason = "Боец погиб") {
    if (this.state !== "play") return;
    this.cancelBurst();
    this.state = win ? "victory" : "dead";
    this.resultReason = reason;
    this.keys.clear();
    this.mouse.left = this.mouse.right = false;
    this.scoreResult = X.Scoring.finish(this, win);
    X.profile.checkpoint = null;
    X.profile.stats.kills += this.kills;
    X.profile.stats.shots += this.stats.shots;
    X.profile.stats.time += this.time;
    if (win) {
      this.creditReward(
        350 +
          Math.min(20, this.number) * 85 +
          Math.sqrt(Math.max(0, this.number - 20)) * 170,
      );
      this.medals = [];
      if (this.stats.damage === 0) {
        const reward = this.creditReward(300);
        this.medals.push("БЕЗ ЕДИНОЙ ЦАРАПИНЫ +" + reward);
      }
      if (this.stats.bladeKills >= 20) {
        const reward = this.creditReward(250);
        this.medals.push("МАСТЕР КЛИНКА +" + reward);
      }
      X.profile.stats.medals += this.medals.length;
      X.profile.credits = Math.min(1e8, X.profile.credits + this.earned);
      for (const a in this.ammo) X.profile.ammo[a] = this.ammo[a];
      for (let i = 0; i < this.mags.length; i++) {
        let a = X.weapons[i].ammo;
        if (a) X.profile.ammo[a] += this.mags[i];
      }
      if (this.number <= 20) {
        if (!X.profile.completed.includes(this.number))
          X.profile.completed.push(this.number);
        X.profile.unlocked = Math.max(
          X.profile.unlocked,
          Math.min(20, this.number + 1),
        );
        X.profile.level = Math.min(20, this.number + 1);
        if (this.number === 20) X.profile.endless.unlocked = true;
      } else {
        X.profile.endless.stage = this.number + 1;
        X.profile.endless.best = Math.max(X.profile.endless.best, this.number);
      }
    } else X.profile.stats.deaths++;
    X.Save.write(X.profile);
    X.UI.result(win, reason);
  }
  pause() {
    if (this.state === "play") {
      this.checkpoint();
      this.state = "pause";
      this.keys.clear();
      this.dashHeld = false;
      this.mouse.left = this.mouse.right = false;
      X.UI.pause();
    }
  }
  resume() {
    if (this.state === "pause") {
      this.state = "play";
      this.keys.clear();
      this.dashHeld = false;
      X.UI.hide();
    }
  }
  frame(t) {
    if (!this.last) this.last = t;
    let dt = Math.min(0.1, (t - this.last) / 1000);
    this.last = t;
    this.fps = this.fps * 0.95 + (1 / Math.max(0.001, dt)) * 0.05;
    this.accumulator += dt;
    let n = 0;
    while (this.accumulator >= 1 / 60 && n++ < 6) {
      this.update(1 / 60);
      this.accumulator -= 1 / 60;
    }
    X.Render.draw(this, dt);
    if (this.state === "play") X.UI.hud(this);
    requestAnimationFrame((t) => this.frame(t));
  }
};
