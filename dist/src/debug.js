"use strict";
// Полигон работает с копией профиля. Читы не попадают в сохранение кампании.
X.Debug = {
  active: false,
  original: null,
  flags: { ammo: false, noReload: false, god: false },
  enter() {
    if (this.active) return;
    if (X.game.state === "play") X.game.pause();
    this.original = X.profile;
    X.profile = X.Save.validate(JSON.parse(JSON.stringify(this.original)));
    X.profile.checkpoint = null;
    X.profile.unlocked = 20;
    this.flags = { ammo: false, noReload: false, god: false };
    this.active = true;
    X.game.state = "menu";
  },
  leave() {
    if (!this.active) return;
    X.profile = this.original;
    this.original = null;
    this.active = false;
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
    } else if (code === "ARSENAL") {
      X.profile.owned = X.weapons.map((w, i) => i);
      for (const a in X.ammo)
        X.profile.ammo[a] = Math.max(X.profile.ammo[a], X.ammo[a].pack * 10);
      if (g.player && ["play", "pause"].includes(g.state)) {
        for (const a in X.ammo)
          g.ammo[a] = Math.max(g.ammo[a], X.ammo[a].pack * 10);
        g.mags = X.weapons.map((w) => w.mag);
        g.reload = 0;
      }
      message = "Весь арсенал выдан";
    } else {
      X.UI.toast("Неизвестный код. CREDITS / AMMO / NORELOAD / GOD / ARSENAL");
      return false;
    }
    X.UI.toast(message);
    return true;
  },
};
