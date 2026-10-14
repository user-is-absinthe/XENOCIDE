"use strict";
X.Loot = {
  types() {
    return [
      ...new Set(X.profile.owned.map((i) => X.weapons[i].ammo).filter(Boolean)),
    ];
  },
  quantity(type, amount, diff) {
    return Math.ceil(X.ammo[type].pack * 0.22 * amount * diff.loot);
  },
  drawIcon(g, x, y, type, scale = 1) {
    g.save();
    g.translate(x, y);
    g.scale(scale, scale);
    g.fillStyle = "#07121bdd";
    g.fillRect(-15, -14, 30, 29);
    g.strokeStyle = X.ammo[type].color;
    g.lineWidth = 1;
    g.strokeRect(-15.5, -14.5, 31, 30);
    if (type === "light" || type === "heavy") {
      const heavy = type === "heavy";
      for (let i = 0; i < (heavy ? 2 : 3); i++) {
        let px = (heavy ? -8 : -10) + i * (heavy ? 10 : 7);
        g.fillStyle = heavy ? "#9dbe89" : "#eac581";
        g.fillRect(px, -4, heavy ? 7 : 5, heavy ? 14 : 10);
        g.beginPath();
        g.moveTo(px, -4);
        g.lineTo(px + (heavy ? 3.5 : 2.5), heavy ? -12 : -9);
        g.lineTo(px + (heavy ? 7 : 5), -4);
        g.fill();
        g.fillStyle = "#80613d";
        g.fillRect(px, heavy ? 8 : 5, heavy ? 7 : 5, 3);
      }
    } else if (type === "shell") {
      for (const px of [-10, 2]) {
        g.fillStyle = "#bc5149";
        g.fillRect(px, -9, 8, 15);
        g.fillStyle = "#f0c16c";
        g.fillRect(px, 5, 8, 5);
        g.fillStyle = "#ee9c80";
        g.fillRect(px + 1, -7, 2, 10);
      }
    } else if (type === "fuel") {
      g.fillStyle = "#c78555";
      g.fillRect(-9, -8, 17, 19);
      g.fillStyle = "#f0bb73";
      g.fillRect(-7, -12, 10, 4);
      g.strokeStyle = "#eee1a2";
      g.lineWidth = 2;
      g.strokeRect(-3, -2, 5, 7);
      g.beginPath();
      g.moveTo(5, -10);
      g.lineTo(11, -8);
      g.lineTo(11, 6);
      g.stroke();
    } else if (type === "energy") {
      g.fillStyle = "#477780";
      g.fillRect(-10, -10, 20, 22);
      g.fillStyle = "#8ff8ee";
      g.fillRect(-7, -7, 14, 16);
      g.fillStyle = "#244e63";
      g.beginPath();
      g.moveTo(2, -7);
      g.lineTo(-5, 2);
      g.lineTo(0, 2);
      g.lineTo(-2, 8);
      g.lineTo(6, -2);
      g.lineTo(1, -2);
      g.fill();
      g.fillStyle = "#bdebe0";
      g.fillRect(-4, -13, 8, 3);
    } else if (type === "explosive") {
      g.fillStyle = "#a4ad88";
      g.fillRect(-9, -3, 18, 13);
      g.fillStyle = "#e9c37c";
      g.fillRect(-5, -10, 10, 8);
      g.fillStyle = "#626c5c";
      g.fillRect(-3, -13, 9, 4);
      g.strokeStyle = "#eef1c5";
      g.lineWidth = 2;
      g.beginPath();
      g.arc(9, -10, 4, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = "#d4d0a8";
      for (let i = 0; i < 3; i++) g.fillRect(-7 + i * 5, 0, 2, 8);
    }
    g.restore();
  },
};
Object.assign(X.Game.prototype, {
  addAmmoLoot(x, y, amount = 1) {
    const types = X.Loot.types();
    types.forEach((ammoType, i) => {
      const angle = (i / types.length) * Math.PI * 2,
        spread = types.length > 1 ? 36 : 0;
      let px = x + Math.cos(angle) * spread,
        py = y + Math.sin(angle) * spread;
      if (!this.map.fits(px, py, 12)) {
        px = x;
        py = y;
      }
      this.loot.push({ x: px, y: py, kind: "ammo", ammoType, amount });
    });
    while (this.loot.length > 300) this.loot.shift();
  },
});
