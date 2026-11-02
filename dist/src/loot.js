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
  icons: {},
  icon(type) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 48;
    const g = canvas.getContext("2d");
    g.translate(24, 24);
    g.fillStyle = "#00000080";
    g.beginPath();
    g.ellipse(1, 11, 17, 7, 0, 0, 7);
    g.fill();
    const panel = (x, y, w, h, color) => {
      g.fillStyle = "#0a1115";
      g.fillRect(x - 1, y - 1, w + 2, h + 2);
      g.fillStyle = color;
      g.fillRect(x, y, w, h);
      const shade = g.createLinearGradient(x, y, x + w, y + h);
      shade.addColorStop(0, "#c7c5ab40");
      shade.addColorStop(0.4, "#00000000");
      shade.addColorStop(1, "#01070bb0");
      g.fillStyle = shade;
      g.fillRect(x, y, w, h);
      g.fillStyle = "#bdc2aa55";
      g.fillRect(x + 1, y, w - 2, 1);
    };
    if (["light", "heavy", "shell"].includes(type)) {
      panel(-14, -10, 28, 23, type === "shell" ? "#514341" : "#414d42");
      g.fillStyle = "#141e20";
      g.fillRect(-11, -7, 22, 16);
      const heavy = type === "heavy",
        count = heavy ? 2 : 3;
      for (let i = 0; i < count; i++) {
        const x = -9 + i * (heavy ? 10 : 7),
          w = heavy ? 7 : 5;
        panel(
          x,
          -5,
          w,
          13,
          type === "shell" ? "#78443b" : heavy ? "#797963" : "#a08c60",
        );
        g.fillStyle = type === "shell" ? "#ad9867" : "#b7ac83";
        g.fillRect(x, -7, w, 3);
        g.fillRect(x, 6, w, 2);
        g.fillStyle = "#d1c59b55";
        g.fillRect(x + 1, -4, 1, 9);
      }
      g.fillStyle = "#89917c";
      g.fillRect(-13, 10, 26, 2);
      g.fillStyle = "#202b29";
      g.fillRect(-12, -12, 24, 3);
    } else if (type === "fuel") {
      panel(-10, -9, 20, 23, "#67553c");
      g.strokeStyle = "#9a9679";
      g.lineWidth = 3;
      g.strokeRect(-5, -14, 10, 6);
      g.fillStyle = "#171e20";
      g.fillRect(5, -11, 6, 3);
      g.strokeStyle = "#343b31";
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(-6, -3);
      g.lineTo(6, 9);
      g.moveTo(6, -3);
      g.lineTo(-6, 9);
      g.stroke();
      g.fillStyle = "#a09b7a55";
      g.fillRect(-8, -7, 2, 17);
      g.fillStyle = "#b39a65";
      g.fillRect(-3, 1, 6, 4);
    } else if (type === "energy") {
      panel(-10, -10, 20, 24, "#4c5c5c");
      g.fillStyle = "#172a33";
      g.fillRect(-6, -6, 12, 16);
      for (let i = 0; i < 3; i++) {
        g.fillStyle = "#426c82";
        g.fillRect(-4, -4 + i * 4, 8, 2);
        g.fillStyle = "#89b2bf";
        g.fillRect(-3, -4 + i * 4, 2, 1);
      }
      g.fillStyle = "#a29d7b";
      g.fillRect(-5, -13, 3, 3);
      g.fillRect(2, -13, 3, 3);
      g.fillStyle = "#202d32";
      g.fillRect(-12, -5, 3, 15);
      g.fillRect(9, -5, 3, 15);
    } else if (type === "explosive") {
      for (const x of [-11, 2]) {
        panel(x, -5, 10, 18, "#5b654d");
        g.fillStyle = "#202b2a";
        g.fillRect(x + 1, -10, 8, 5);
        g.fillStyle = "#95937a";
        g.fillRect(x + 3, -11, 7, 2);
        g.fillStyle = "#26322c";
        g.fillRect(x + 1, 1, 8, 2);
        g.fillRect(x + 1, 6, 8, 2);
        g.fillStyle = "#a39061";
        g.fillRect(x + 3, -2, 3, 3);
      }
    } else if (type === "health") {
      panel(-15, -8, 30, 21, "#64716a");
      g.strokeStyle = "#89968a";
      g.lineWidth = 3;
      g.strokeRect(-6, -12, 12, 5);
      g.fillStyle = "#22302e";
      g.fillRect(-12, -5, 24, 14);
      g.fillStyle = "#c2bda2";
      g.fillRect(-2, -4, 4, 12);
      g.fillRect(-6, 0, 12, 4);
      g.fillStyle = "#9a9f8b";
      g.fillRect(-12, 8, 3, 5);
      g.fillRect(9, 8, 3, 5);
    }
    // Small scratches and recessed fasteners connect the kit to the environment palette.
    g.fillStyle = "#b2b39a45";
    g.fillRect(-9, 11, 4, 1);
    g.fillRect(7, 8, 2, 1);
    g.fillStyle = "#101b1e";
    g.fillRect(-12, -7, 1, 1);
    g.fillRect(11, 10, 1, 1);
    return canvas;
  },
  drawIcon(g, x, y, type, scale = 1) {
    const icon = this.icons[type] || (this.icons[type] = this.icon(type));
    g.save();
    g.translate(Math.round(x), Math.round(y));
    g.scale(scale, scale);
    g.imageSmoothingEnabled = false;
    g.drawImage(icon, -24, -24);
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
