"use strict";
// Характеристики шести режимов; newModes выбирает подсистему поведения.
X.FieldArmory = {
  definitions: {
    blade: {
      a: "Рубящее комбо",
      b: "Парирование",
      descA:
        "Три последовательных удара: ×1 / ×1,3 / ×1,75. Урон и дальность растут; пауза более 1 с сбрасывает комбо.",
      descB:
        "Короткое окно парирования перед бойцом: отражает снаряды и контратакует ближний удар. Растут окно и отражённый урон, сокращается откат. Не защищает от взрывов и опасностей пола.",
    },
    pistol: {
      a: "Точная серия",
      b: "Метка уязвимости",
      descA:
        "Попадания без промаха накапливают до 5 бонусов урона. Промах сбрасывает серию. Растут базовый урон и бонус за попадание.",
      descB:
        "Два патрона: помечает одну цель, усиливая урон любого вашего оружия по ней. Новая метка снимает прежнюю. Растут усиление и длительность.",
    },
    smg: {
      a: "Огонь на ходу",
      b: "Рикошетный веер",
      descA:
        "Движение не добавляет разброс. Каждая ступень повышает урон и уменьшает базовый разброс на 10%.",
      descB:
        "Веер из 3–5 пуль, один патрон на пулю. Отскакивают от стен 1–3 раза, теряя по 20% урона. Растут урон, число пуль и отскоков.",
    },
    rifle: {
      a: "Бронебойная третья",
      b: "Отталкивающий импульс",
      descA:
        "Три последовательные пули. Третья игнорирует кинетическую броню; растут урон и бонус третьей пули.",
      descB:
        "Три патрона: короткий направленный импульс отталкивает и прерывает атаки. Растут урон, дальность и сила толчка. Стены блокируют; боссы устойчивее.",
    },
    machine: {
      a: "Тепловой разгон",
      b: "Огонь с упора",
      descA:
        "Попадать непрерывным огнём выгоднее: выстрелы нагревают ствол и увеличивают урон. Без стрельбы он остывает. Растут урон, темп и эффект нагрева.",
      descB:
        "Удерживайте ПКМ: точный подавляющий огонь с упора. Скорость движения 20%, рывок недоступен. Попадания замедляют и задерживают атаки; боссы устойчивее.",
    },
    sniper: {
      a: "Серия без промаха",
      b: "Сковывающий выстрел",
      descA:
        "Попадания накапливают до 4 бонусов урона. Один пробивающий выстрел даёт не более одного бонуса. Промах сбрасывает серию.",
      descB:
        "Два патрона: пробивает цели, обездвиживает и прерывает подготовленные атаки. Растут урон и длительность; боссы скованы вчетверо меньше.",
    },
  },
  stats(w, alt = false, p = X.profile) {
    const n = X.Armory.level(w, alt, p),
      power = 0.1 * (p.upgrades.power || 0);
    const t = {
      ...w,
      modeLevel: n,
      charge: 0,
      mag: w.mag,
      damage: w.damage * (1 + power + 0.12 * n),
      cost: 1,
    };
    if (w.id === "blade") {
      t.range *= 1 + 0.05 * n;
      t.rate *= 1 - 0.04 * n;
      if (alt) {
        t.parryWindow = 0.35 + 0.04 * n;
        t.rate = 2.8 - 0.2 * n;
        t.reflect = 2 + 0.3 * n;
        t.range = 90;
      }
    }
    if (w.id === "pistol") {
      t.seriesStep = 0.08 + 0.02 * n;
      if (alt) {
        t.damage *= 0.5;
        t.cost = 2;
        t.rate = 0.65;
        t.weakTime = 4 + n;
        t.weakFactor = 1.2 + 0.06 * n;
      }
    }
    if (w.id === "smg") {
      t.spread *= 1 - 0.1 * n;
      if (alt) {
        t.count = 3 + Math.floor(n / 2);
        t.rate = 0.35;
        t.spread = 0.32;
        t.ricochets = 1 + Math.floor(n / 2);
        t.damage *= 0.8;
      }
    }
    if (w.id === "rifle") {
      t.thirdBonus = 1.15 + 0.1 * n;
      if (alt) {
        t.cost = 3;
        t.range = 180 + 12 * n;
        t.rate = 0.9;
        t.damage *= 1.5;
        t.knockback = 110 + 14 * n;
        t.interrupt = 0.6 + 0.1 * n;
      }
    }
    if (w.id === "machine") {
      t.heatBonus = 0.5 + 0.1 * n;
      t.rate *= 1 - 0.04 * n;
      if (alt) {
        t.rate = 0.09 * (1 - 0.04 * n);
        t.spread = 0.025 / (1 + 0.12 * n);
        t.suppress = 0.45 + 0.1 * n;
      }
    }
    if (w.id === "sniper") {
      t.seriesStep = 0.12 + 0.03 * n;
      if (alt) {
        t.cost = 2;
        t.damage *= 0.65;
        t.rate = 1.25;
        t.cripple = 1 + 0.3 * n;
      }
    }
    return t;
  },
  summary(w, alt, p = X.profile) {
    const t = this.stats(w, alt, p),
      f = (n) => n.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
    if (!alt) {
      const extra =
        w.id === "blade"
          ? " · дальность " + f(t.range)
          : ["pistol", "sniper"].includes(w.id)
            ? " · за попадание +" + f(t.seriesStep * 100) + "%"
            : w.id === "smg"
              ? " · разброс " + f(t.spread)
              : w.id === "rifle"
                ? " · третья ×" + f(t.thirdBonus)
                : " · нагрев до +" + f(t.heatBonus * 100) + "%";
      return "Урон " + f(t.damage) + " · пауза " + f(t.rate) + " с" + extra;
    }
    if (w.id === "blade")
      return (
        "Окно " +
        f(t.parryWindow) +
        " с · откат " +
        f(t.rate) +
        " с · отражение ×" +
        f(t.reflect)
      );
    if (w.id === "pistol")
      return (
        "Урон цели ×" + f(t.weakFactor) + " · " + t.weakTime + " с · расход 2"
      );
    if (w.id === "smg")
      return (
        "Пуль " +
        t.count +
        " · отскоков " +
        t.ricochets +
        " · урон " +
        f(t.damage)
      );
    if (w.id === "rifle")
      return (
        "Дальность " +
        t.range +
        " · толчок " +
        t.knockback +
        " · урон " +
        f(t.damage) +
        " · расход 3"
      );
    if (w.id === "machine")
      return (
        "Урон " +
        f(t.damage) +
        " · пауза " +
        f(t.rate) +
        " с · подавление " +
        f(t.suppress) +
        " с"
      );
    return (
      "Урон " + f(t.damage) + " · сковывание " + f(t.cripple) + " с · расход 2"
    );
  },
};
for (const [id, spec] of Object.entries(X.FieldArmory.definitions))
  X.Armory.definitions[id] = { ...spec, magStep: 0, newModes: true };
