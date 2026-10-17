"use strict";
// Полигон работает с копией профиля. Читы не попадают в сохранение кампании.
X.Debug = {
  active: false,
  original: null,
  flags: { ammo: false, noReload: false, god: false },
  arena: {
    name: "Открытая арена",
    chapter: "Испытательный зал",
    theme: 1,
    w: 56,
    h: 40,
    rooms: [[1, 1, 54, 38]],
    blocks: [],
    start: [10, 20],
    exit: [52, 20],
    spawns: [
      [3, 3],
      [52, 3],
      [52, 36],
      [3, 36],
    ],
    targets: [],
    resources: [],
    mode: "clear",
    waves: 8,
    interval: 25,
    types: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    brief:
      "Открытая арена без внутренних стен. Проверяйте оружие и прокачку. Esc — полигон и читы; ARSENAL выдаёт весь штатный арсенал.",
  },
  enter() {
    if (this.active) return;
    if (X.game.state === "play") X.game.pause();
    this.original = X.profile;
    X.profile = X.Save.validate(JSON.parse(JSON.stringify(this.original)));
    X.profile.checkpoint = null;
    X.profile.unlocked = 20;
    X.profile.credits = 500000;
    X.profile.upgrades = X.Save.defaults().upgrades;
    X.profile.weaponMods = {};
    X.profile.weaponTuning = {};
    this.flags = { ammo: false, noReload: false, god: false };
    this.active = true;
    X.weapons.push(X.debugWeapon);
    X.game.state = "menu";
  },
  leave() {
    if (!this.active) return;
    X.profile = this.original;
    this.original = null;
    this.active = false;
    X.weapons = X.weapons.filter((w) => !w.debugOnly);
    X.game.weapon = 1;
    if (X.game.mags) X.game.mags.length = X.weapons.length;
    this.flags = { ammo: false, noReload: false, god: false };
    X.game.keys.clear();
    X.game.mouse.left = X.game.mouse.right = false;
    X.Audio.settings();
  },
  enabled(flag) {
    return this.active && this.flags[flag];
  },
  code(input) {
    if (!this.active) return false;
    const code = input.trim().toUpperCase(),
      g = X.game;
    let message = "";
    if (code === "CREDITS") {
      X.profile.credits = Math.min(1e8, X.profile.credits + 10000);
      message = "+10 000 кредитов";
    } else if (["AMMO", "NORELOAD", "GOD"].includes(code)) {
      const flag = { AMMO: "ammo", NORELOAD: "noReload", GOD: "god" }[code];
      this.flags[flag] = !this.flags[flag];
      if (flag === "noReload" && this.flags[flag] && g.player) g.beginReload();
      message =
        {
          AMMO: "Бесконечные патроны",
          NORELOAD: "Без перезарядки",
          GOD: "Бессмертие",
        }[code] + (this.flags[flag] ? ": ВКЛ" : ": ВЫКЛ");
    } else if (code === "MAXWEAPONS") {
      this.code("ARSENAL");
      for (const w of X.weapons)
        if (!w.debugOnly) {
          X.profile.weaponMods[w.id] = X.Armory.max;
          X.profile.weaponTuning[w.id] = X.Armory.max;
        }
      if (g.player && ["play", "pause"].includes(g.state)) {
        g.cancelBurst();
        g.mags = X.weapons.map((w) => X.Armory.mag(w));
        g.reload = 0;
        g.charge = 0;
      }
      message = "Весь штатный арсенал и все ветки оружия: максимум";
    } else if (code === "MAXPLAYER") {
      for (const u of X.upgrades) X.profile.upgrades[u.id] = u.max;
      if (g.player && ["play", "pause"].includes(g.state)) {
        const p = g.player,
          u = X.profile.upgrades;
        g.cancelBurst();
        p.hp = p.maxHp = 100 + 25 * u.health;
        p.armor = p.maxArmor = 20 * u.armor;
        p.stamina = p.maxStamina = X.PlayerStats.stamina(u);
        p.dashCharges = p.maxDashCharges = X.PlayerStats.dashCapacity(u);
        p.dash = 0;
      }
      message =
        "Все импланты персонажа: максимум · здоровье и ресурсы восстановлены";
    } else if (code === "ARSENAL") {
      X.profile.owned = [
        ...new Set([
          ...X.profile.owned,
          ...X.weapons.map((w, i) => i).filter((i) => !X.weapons[i].debugOnly),
        ]),
      ];
      for (const a in X.ammo)
        X.profile.ammo[a] = Math.max(X.profile.ammo[a], X.ammo[a].pack * 10);
      if (g.player && ["play", "pause"].includes(g.state)) {
        for (const a in X.ammo)
          g.ammo[a] = Math.max(g.ammo[a], X.ammo[a].pack * 10);
        g.cancelBurst();
        g.mags = X.weapons.map((w) => X.Armory.mag(w));
        g.reload = 0;
      }
      message = "Весь арсенал выдан";
    } else if (code === "BARRAGE") {
      const index = X.weapons.findIndex((w) => w.debugOnly);
      if (!X.profile.owned.includes(index)) X.profile.owned.push(index);
      if (g.player && ["play", "pause"].includes(g.state)) {
        g.mags[index] = 0;
        g.switchWeapon(index);
      }
      message = "Ракетный шторм выдан · бесконечные ракеты без перезарядки";
    } else {
      X.UI.toast(
        "Коды: CREDITS / AMMO / NORELOAD / GOD / ARSENAL / BARRAGE / MAXWEAPONS / MAXPLAYER",
      );
      return false;
    }
    X.UI.toast(message);
    return true;
  },
};
