"use strict";
X.Economy = {
  unlockAt: [1, 1, 1, 2, 3, 5, 6, 7, 8, 10, 12, 14, 16],
  spend(price, apply) {
    if (X.profile.checkpoint) {
      X.UI.toast("Сначала завершите или перезапустите текущую миссию");
      return false;
    }
    if (X.profile.credits < price) {
      X.UI.toast("Недостаточно кредитов");
      return false;
    }
    X.profile.credits -= price;
    apply();
    X.Save.write(X.profile);
    X.Audio.play("pickup");
    return true;
  },
  weapon(i) {
    const w = X.weapons[i];
    if (
      !w ||
      w.debugOnly ||
      X.profile.owned.includes(i) ||
      X.profile.unlocked < this.unlockAt[i]
    )
      return false;
    return this.spend(w.price, () => {
      X.profile.owned.push(i);
      X.profile.ammo[w.ammo] += w.mag * 3;
    });
  },
  ammo(a) {
    let pack = X.ammo[a];
    if (!pack) return false;
    return this.spend(
      pack.price,
      () =>
        (X.profile.ammo[a] = Math.min(99999, X.profile.ammo[a] + pack.pack)),
    );
  },
  upgrade(id) {
    const u = X.upgrades.find((u) => u.id === id),
      level = X.profile.upgrades[id];
    if (!u || level >= u.max) return false;
    return this.spend(
      Math.round(u.price * Math.pow(1.65, level)),
      () => X.profile.upgrades[id]++,
    );
  },
  mod(i) {
    const w = X.weapons[i],
      level = X.profile.weaponMods[w.id] || 0;
    if (
      !X.profile.owned.includes(i) ||
      w.debugOnly ||
      level >= X.WeaponStats.modMax
    )
      return false;
    return this.spend(
      Math.round((400 + w.price * 0.3) * Math.pow(1.8, level)),
      () => (X.profile.weaponMods[w.id] = level + 1),
    );
  },
  tune(i) {
    const w = X.weapons[i];
    if (!w || w.debugOnly || !X.profile.owned.includes(i)) return false;
    const level = X.profile.weaponTuning[w.id] || 0;
    if (level >= X.WeaponStats.branch(w).max) return false;
    return this.spend(
      Math.round((450 + w.price * 0.25) * Math.pow(1.8, level)),
      () => (X.profile.weaponTuning[w.id] = level + 1),
    );
  },
};
