"use strict";
X.Save = {
  key: "xenocide.profile.v1",
  available: true,
  warning: "",
  defaults() {
    return {
      version: 1,
      level: 1,
      unlocked: 1,
      completed: [],
      difficulty: 1,
      credits: 250,
      owned: [0, 1],
      ammo: {
        light: 140,
        shell: 0,
        heavy: 0,
        fuel: 0,
        energy: 0,
        explosive: 0,
      },
      upgrades: { health: 0, armor: 0, speed: 0, reload: 0, power: 0 },
      weaponMods: {},
      stats: { kills: 0, deaths: 0, shots: 0, time: 0, medals: 0 },
      endless: { unlocked: false, stage: 21, best: 20, seed: 12345 },
      settings: {
        quality: 1,
        lights: true,
        blood: true,
        shake: true,
        music: 0.2,
        musicEnabled: true,
        sfx: 0.55,
        mute: false,
        pace: 1,
        keys: {
          up: "KeyW",
          down: "KeyS",
          left: "KeyA",
          right: "KeyD",
          reload: "KeyR",
          sprint: "ShiftLeft",
          dash: "Space",
          interact: "KeyE",
          map: "KeyM",
        },
      },
      checkpoint: null,
      records: X.Scoring.defaults(),
      campaignRun: null,
    };
  },
  number(v, min, max, fallback = 0) {
    return typeof v === "number" && Number.isFinite(v)
      ? Math.max(min, Math.min(max, v))
      : fallback;
  },
  validate(s) {
    if (!s || s.version !== 1 || !Array.isArray(s.owned))
      throw Error("Неверный формат или версия профиля");
    const d = this.defaults(),
      num = (v, a, b, f = 0) => this.number(v, a, b, f);
    d.records = X.Scoring.validateRecords(s.records);
    d.campaignRun = X.Scoring.validateRun(s.campaignRun);
    for (const k of ["level", "unlocked"])
      d[k] = Math.floor(num(s[k], 1, 20, 1));
    d.difficulty = Math.floor(num(s.difficulty, 0, 3, 1));
    d.credits = Math.floor(num(s.credits, 0, 1e8));
    d.owned = [
      ...new Set([
        0,
        1,
        ...s.owned.filter(
          (n) => Number.isInteger(n) && n >= 0 && n < X.weapons.length,
        ),
      ]),
    ];
    for (const a in d.ammo)
      d.ammo[a] = Math.floor(num(s.ammo?.[a], 0, 99999, d.ammo[a]));
    for (const u of X.upgrades)
      d.upgrades[u.id] = Math.floor(num(s.upgrades?.[u.id], 0, u.max));
    for (const w of X.weapons)
      d.weaponMods[w.id] = Math.floor(num(s.weaponMods?.[w.id], 0, 3));
    for (const k in d.stats) d.stats[k] = num(s.stats?.[k], 0, 1e10);
    d.completed = Array.isArray(s.completed)
      ? [
          ...new Set(
            s.completed.filter((n) => Number.isInteger(n) && n >= 1 && n <= 20),
          ),
        ]
      : [];
    d.endless.unlocked = d.completed.includes(20);
    d.endless.stage = Math.floor(num(s.endless?.stage, 21, 1e6, 21));
    d.endless.best = Math.floor(num(s.endless?.best, 20, 1e6, 20));
    d.endless.seed = Math.floor(num(s.endless?.seed, 1, 4294967295, 12345));
    const settings = s.settings || {};
    d.settings.quality = Math.floor(num(settings.quality, 0, 2, 1));
    for (const k of ["lights", "blood", "shake", "mute", "musicEnabled"])
      if (typeof settings[k] === "boolean") d.settings[k] = settings[k];
    for (const k of ["music", "sfx"])
      d.settings[k] = num(settings[k], 0, 1, d.settings[k]);
    d.settings.pace = [0.55, 1, 1.4].includes(settings.pace)
      ? settings.pace
      : 1;
    const keys = settings.keys || {},
      used = new Set();
    for (const k in d.settings.keys) {
      let v = keys[k];
      if (
        typeof v === "string" &&
        /^(Key[A-Z]|ShiftLeft|ShiftRight|Space|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|ControlLeft)$/.test(
          v,
        ) &&
        !used.has(v)
      ) {
        d.settings.keys[k] = v;
        used.add(v);
      } else used.add(d.settings.keys[k]);
    }
    if (
      new Set(Object.values(d.settings.keys)).size !==
      Object.keys(d.settings.keys).length
    )
      d.settings.keys = this.defaults().settings.keys;
    if (s.checkpoint) {
      try {
        d.checkpoint = this.checkpoint(s.checkpoint, d);
      } catch (e) {
        this.warning =
          "Контрольная точка повреждена. Доступен перезапуск миссии; остальной профиль восстановлен.";
      }
    }
    return d;
  },
  checkpoint(c, p) {
    const finite = (n) => typeof n === "number" && Number.isFinite(n),
      integer = (n) => Number.isInteger(n) && n >= 0;
    if (
      !c ||
      !Number.isInteger(c.number) ||
      c.number < 1 ||
      c.number > 1e6 ||
      (c.number > 20 && !p.endless.unlocked)
    )
      throw Error("checkpoint level");
    const l =
        c.number <= 20
          ? X.levels[c.number - 1]
          : X.generate(c.number, p.endless.seed),
      m = X.makeMap(l);
    if (
      !c.player ||
      ![
        "x",
        "y",
        "hp",
        "maxHp",
        "armor",
        "maxArmor",
        "stamina",
        "dash",
        "invuln",
        "angle",
      ].every((k) => finite(c.player[k])) ||
      c.player.hp <= 0 ||
      c.player.hp > c.player.maxHp ||
      c.player.maxHp < 1 ||
      c.player.maxHp > 250 ||
      !m.fits(c.player.x, c.player.y, 14)
    )
      throw Error("checkpoint player");
    if (
      !p.owned.includes(c.weapon) ||
      !Array.isArray(c.mags) ||
      c.mags.length !== X.weapons.length ||
      !c.mags.every((n, i) => integer(n) && n <= X.weapons[i].mag)
    )
      throw Error("checkpoint weapon");
    if (
      !Object.keys(p.ammo).every(
        (a) => finite(c.ammo?.[a]) && c.ammo[a] >= 0 && c.ammo[a] <= 99999,
      )
    )
      throw Error("checkpoint ammo");
    if (
      ![
        "time",
        "wave",
        "waveTimer",
        "kills",
        "earned",
        "coreHp",
        "defendTime",
        "seed",
      ].every((k) => finite(c[k])) ||
      c.wave < 0 ||
      c.wave > l.waves ||
      c.time < 0
    )
      throw Error("checkpoint scenario");
    if (
      !Array.isArray(c.enemies) ||
      c.enemies.length > X.C.maxEnemies ||
      !c.enemies.every(
        (e) =>
          integer(e.type) &&
          e.type < X.enemies.length &&
          [
            "x",
            "y",
            "r",
            "hp",
            "maxHp",
            "attack",
            "phase",
            "age",
            "burn",
            "slow",
            "stun",
            "special",
          ].every((k) => finite(e[k])) &&
          e.hp > 0 &&
          e.maxHp > 0 &&
          e.hp <= e.maxHp &&
          m.fits(e.x, e.y, X.enemies[e.type].radius),
      )
    )
      throw Error("checkpoint enemies");
    if (
      !Array.isArray(c.spawnQueue) ||
      c.spawnQueue.length > 2000 ||
      !c.spawnQueue.every((e) => integer(e.type) && e.type < X.enemies.length)
    )
      throw Error("checkpoint queue");
    if (
      !Array.isArray(c.objectives) ||
      c.objectives.length !== l.targets.length ||
      !c.objectives.every(
        (o, i) =>
          finite(o.hp) &&
          finite(o.progress) &&
          typeof o.done === "boolean" &&
          ["nest", "terminal"].includes(o.kind) &&
          o.x === m.point(l.targets[i]).x &&
          o.y === m.point(l.targets[i]).y,
      )
    )
      throw Error("checkpoint objectives");
    if (
      !Array.isArray(c.loot) ||
      c.loot.length > 2000 ||
      !c.loot.every(
        (o) =>
          finite(o.x) &&
          finite(o.y) &&
          finite(o.amount) &&
          o.amount > 0 &&
          ["health", "ammo"].includes(o.kind) &&
          (o.ammoType === undefined || Object.hasOwn(X.ammo, o.ammoType)),
      )
    )
      throw Error("checkpoint loot");
    if (
      !c.stats ||
      !["shots", "damage"].every((k) => finite(c.stats[k]) && c.stats[k] >= 0)
    )
      throw Error("checkpoint stats");
    return JSON.parse(JSON.stringify(c));
  },
  load() {
    try {
      const s = localStorage.getItem(this.key);
      return s ? this.validate(JSON.parse(s)) : this.defaults();
    } catch (e) {
      this.warning =
        "Локальный профиль недоступен или повреждён. Можно начать заново либо импортировать JSON.";
      try {
        localStorage.setItem(this.key + ".probe", "1");
        localStorage.removeItem(this.key + ".probe");
      } catch (err) {
        this.available = false;
      }
      return this.defaults();
    }
  },
  write(p) {
    if (X.Debug?.active) return;
    try {
      localStorage.setItem(this.key, JSON.stringify(p));
      this.available = true;
    } catch (e) {
      this.available = false;
      this.warning =
        "Edge запретил локальное хранилище. Прогресс в памяти: экспортируйте JSON перед закрытием.";
      if (X.UI) X.UI.toast(this.warning, 6000);
    }
  },
  export(p) {
    const a = document.createElement("a"),
      url = URL.createObjectURL(
        new Blob([JSON.stringify(p, null, 2)], { type: "application/json" }),
      );
    a.href = url;
    a.download = "xenocide-save.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
