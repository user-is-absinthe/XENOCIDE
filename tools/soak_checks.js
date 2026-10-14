() => {
  const g = X.game,
    old = JSON.stringify(X.profile),
    assert = (v, m) => {
      if (!v) throw Error(m);
    };
  X.profile.settings.mute = true;
  X.profile.settings.quality = 0;
  X.profile.owned = X.weapons.map((w, i) => i);
  X.profile.ammo.energy = 99999;
  g.start(20);
  g.player.invuln = 99999;
  g.wave = g.level.waves;
  g.weapon = 8;
  g.mouse.left = true;
  g.mouse.x = 900;
  g.mouse.y = 320;
  const rng = new X.RNG(972);
  for (let i = 0; i < 220; i++) {
    let a = rng.next() * Math.PI * 2,
      r = 200 + rng.next() * 400,
      x = g.player.x + Math.cos(a) * r,
      y = g.player.y + Math.sin(a) * r;
    if (g.map.fits(x, y, 34)) g.spawn(i % 10, x, y);
  }
  const t = performance.now();
  for (let i = 0; i < 36000; i++) {
    g.update(1 / 60);
    if (i % 60 === 0) X.Render.draw(g, 1 / 60);
  }
  assert(
    g.activeEnemies() <= 260 &&
      g.loot.length <= 300 &&
      g.marks.length <= 180 &&
      g.beams.length <= 64 &&
      g.blasts.length <= 20,
    "collection cap",
  );
  assert(
    g.shots.items.length === 1000 && g.particles.items.length === 700,
    "pool growth",
  );
  const result = {
    simulatedSeconds: 600,
    wallSeconds: +((performance.now() - t) / 1000).toFixed(2),
    active: g.activeEnemies(),
    loot: g.loot.length,
    marks: g.marks.length,
  };
  X.profile = X.Save.validate(JSON.parse(old));
  X.Save.write(X.profile);
  g.start(1);
  return result;
};
