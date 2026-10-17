"use strict";
// Ветки семи пушек: A меняет ЛКМ, B — ПКМ. Магазин физически общий.
X.Armory = {
  max: 5,
  definitions: {
    shotgun: {
      magStep: 2,
      a: "Картечь",
      b: "Монозаряд",
      descA:
        "+2 патрона/ступень (+2 дополнительно на V), +15% урона дробины, +1 дробина, −8% базовой паузы.",
      descB:
        "Один точный заряд из ВСЕГО остатка магазина. Урон всех дробин всех базовых патронов × (1 + 20%/ступень). Пробивает всех врагов, останавливается стеной.",
    },
    flame: {
      magStep: 20,
      a: "Широкая струя",
      b: "Напалмовый заряд",
      descA: "+12% угла, +15% длины и урона, +20 топлива за ступень.",
      descB:
        "Один заряд топлива запускает снаряд. При ударе остаётся огненная лужа: растут урон, радиус и длительность.",
    },
    plasma: {
      magStep: 4,
      a: "Плазменный поток",
      b: "Липкий аккумулятор",
      descA:
        "+15% урона, −10% базовой паузы, +1 к радиусу сгустка и +4 заряда за ступень.",
      descB:
        "ВСЕ оставшиеся заряды в одном сгустке. Прилипает, через 0,8 с взрывается и оставляет плазму. Взрыв: сумма базовых зарядов × (1 + 30%/ступень).",
    },
    tesla: {
      magStep: 4,
      a: "Цепной разряд",
      b: "Непрерывная дуга",
      descA: "+12% урона, +1 цель, −10% базовой паузы и +4 заряда за ступень.",
      descB:
        "Удерживайте ПКМ: одна основная цель и вторичные только от неё. Дальше цепь не продолжается. Один заряд каждые 0,08 с.",
    },
    rail: {
      magStep: 2,
      a: "Осколочный выход",
      b: "Сверхзаряд",
      descA:
        "Осколки летят вперёд за каждой поражённой целью. +2 патрона и −10% базовой паузы за ступень; больше/сильнее осколки.",
      descB:
        "Долгий заряд, расход 2–4 патронов за выстрел. Урон каждого потраченного патрона усиливается; пробивает стены и цели.",
    },
    grenade: {
      magStep: 2,
      a: "Автоматическая подача",
      b: "Гранатный зонтик",
      descA:
        "+15% урона и +2 гранаты за ступень. Пауза уменьшается до 0,32 с — медленная очередь.",
      descB:
        "3–8 гранат одновременно вокруг бойца. Каждая тратит один патрон; при нехватке вылетит меньше. Растут урон и радиус взрыва.",
    },
    rocket: {
      magStep: 2,
      a: "Ракетная очередь",
      b: "Пакетный залп",
      descA:
        "+15% урона, +2 ракеты и более сильное наведение за ступень. Пауза до 0,16 с — очередь.",
      descB:
        "Одновременный залп 2–7 ракет. Каждая тратит один патрон, при нехватке залп меньше. Растут урон и наведение.",
    },
  },
  has(w) {
    return !!this.definitions[w.id] && !w.debugOnly;
  },
  level(w, alt, p = X.profile) {
    return Math.max(
      0,
      Math.min(this.max, (alt ? p.weaponTuning : p.weaponMods)?.[w.id] || 0),
    );
  },
  mag(w, p = X.profile) {
    if (!this.has(w)) return w.mag;
    const a = this.level(w, false, p);
    return (
      w.mag +
      this.definitions[w.id].magStep * a +
      (w.id === "shotgun" && a === 5 ? 2 : 0)
    );
  },
  charge(w, alt, p = X.profile) {
    return w.id === "rail"
      ? alt
        ? 0.95 + 0.05 * this.level(w, true, p)
        : 0.65
      : 0;
  },
  stats(w, alt = false, p = X.profile) {
    const n = this.level(w, alt, p),
      t = {
        ...w,
        mag: this.mag(w, p),
        modeLevel: n,
        charge: this.charge(w, alt, p),
      },
      power = 1 + 0.1 * (p.upgrades.power || 0);
    t.damage *= power;
    if (!alt) {
      if (["shotgun", "flame", "plasma", "grenade", "rocket"].includes(w.id))
        t.damage *= 1 + 0.15 * n;
      if (w.id === "shotgun") {
        t.pellets += n;
        t.rate *= 1 - 0.08 * n;
      }
      if (w.id === "flame") {
        t.range *= 1 + 0.15 * n;
        t.spread *= 1 + 0.12 * n;
      }
      if (w.id === "plasma") {
        t.rate *= 1 - 0.1 * n;
        t.radius = 7 + n;
      }
      if (w.id === "tesla") {
        t.damage *= 1 + 0.12 * n;
        t.links = 5 + n;
        t.rate *= 1 - 0.1 * n;
      }
      if (w.id === "rail") {
        t.rate *= 1 - 0.1 * n;
        t.shards = n > 0 ? 2 + n : 0;
        t.shardDamage = t.damage * (0.12 + 0.04 * n);
      }
      if (w.id === "grenade") t.rate = [0.95, 0.8, 0.65, 0.5, 0.4, 0.32][n];
      if (w.id === "rocket") {
        t.rate = [1.4, 1.1, 0.8, 0.5, 0.28, 0.16][n];
        t.homing = 2 + n * 0.9;
        t.seek = 300 + 40 * n;
      }
    } else {
      if (w.id === "shotgun") {
        t.damage *= w.pellets * (1 + 0.2 * n);
        t.pellets = 1;
        t.pierce = X.C.maxEnemies;
        t.spread = 0;
        t.range = 1000;
        t.speed = 1600;
        t.rate = 1.2;
        t.radius = 5;
      }
      if (w.id === "flame") {
        t.damage *= 2 * (1 + 0.25 * n);
        t.rate = 0.8 - 0.03 * n;
        t.range = 800;
        t.speed = 520;
        t.payload = "napalm";
        t.radius = 8;
        t.poolRadius = 64 + 12 * n;
        t.poolDps = 35 * (1 + 0.25 * n) * power;
        t.poolLife = 3 + 0.6 * n;
      }
      if (w.id === "plasma") {
        t.damage *= 1 + 0.3 * n;
        t.rate = 1.2;
        t.payload = "sticky";
        t.radius = 9;
        t.blast = 100 + 12 * n;
        t.poolRadius = 60 + 10 * n;
        t.poolDps = (24 + 8 * n) * power;
        t.poolLife = 3 + 0.4 * n;
        t.fuse = 0.8;
      }
      if (w.id === "tesla") {
        t.rate = 0.08;
        t.damage = 240 * (1 + 0.2 * n) * 0.08 * power;
        t.range = 450 + 20 * n;
        t.links = 2 + Math.floor(n / 2);
        t.secondaryRange = 140 + 10 * n;
      }
      if (w.id === "rail") {
        t.damage *= 1.5 + 0.3 * n;
        t.cost = 2 + Math.floor(n / 2);
        t.rate = 1.7;
        t.range = 2400;
      }
      if (w.id === "grenade") {
        t.damage *= 1 + 0.12 * n;
        t.blast *= 1 + 0.08 * n;
        t.count = 3 + n;
        t.rate = 1.3;
        t.range = 190 + 10 * n;
      }
      if (w.id === "rocket") {
        t.damage *= 1 + 0.12 * n;
        t.count = 2 + n;
        t.homing = 2 + 0.5 * n;
        t.seek = 300 + 20 * n;
        t.rate = 1.5;
      }
    }
    return t;
  },
  summary(w, alt, p = X.profile) {
    const t = this.stats(w, alt, p),
      f = (n) => n.toLocaleString("ru-RU", { maximumFractionDigits: 3 });
    if (!alt) {
      const extra =
        w.id === "shotgun"
          ? " · дробин " + t.pellets
          : w.id === "flame"
            ? " · дальность " +
              f(t.range) +
              " · конус " +
              f((t.spread * 180) / Math.PI) +
              "°"
            : w.id === "plasma"
              ? " · радиус " + t.radius
              : w.id === "tesla"
                ? " · целей " + t.links
                : w.id === "rail"
                  ? " · осколков " + t.shards
                  : w.id === "rocket"
                    ? " · наведение ×" + f(t.homing / 2)
                    : "";
      return (
        "Урон " +
        f(t.damage) +
        " · пауза " +
        f(t.rate) +
        " с · магазин " +
        t.mag +
        extra
      );
    }
    if (w.id === "shotgun")
      return "Урон на патрон " + f(t.damage) + " × весь остаток магазина";
    if (w.id === "flame")
      return (
        "Лужа " +
        f(t.poolDps) +
        " HP/с · радиус " +
        t.poolRadius +
        " · " +
        f(t.poolLife) +
        " с"
      );
    if (w.id === "plasma")
      return (
        "Взрыв " +
        f(t.damage) +
        " × остаток · лужа " +
        f(t.poolDps) +
        " HP/с на √зарядов · " +
        f(t.poolLife) +
        " с"
      );
    if (w.id === "tesla")
      return (
        "Основная цель " +
        f(t.damage / t.rate) +
        " HP/с · вторичных " +
        t.links +
        " по 35%"
      );
    if (w.id === "rail")
      return (
        "Урон " +
        f(t.damage) +
        " × до " +
        t.cost +
        " патронов · заряд " +
        f(t.charge) +
        " с"
      );
    return (
      "Одновременно до " +
      t.count +
      " · урон каждого " +
      f(t.damage) +
      " · расход 1 на снаряд"
    );
  },
};
