() => {
  const g = X.game,
    old = JSON.stringify(X.profile),
    fail = [];
  let cases = 0;
  X.profile.settings.sfx = 0;
  X.profile.settings.mute = true;
  for (let n = 1; n <= 20; n++) {
    g.start(n);
    g.level = { ...g.level, mode: "clear" };
    for (const type of [2, 10])
      for (const a of g.level.spawns) {
        g.enemies.clear();
        g.hash.clear();
        const q = g.map.point(a),
          e = g.spawn(type, q.x, q.y);
        e.special = e.attack = 99999;
        g.hash.insert(e);
        const initial = Math.hypot(e.x - g.player.x, e.y - g.player.y);
        let best = initial;
        for (let i = 0; i < 4800 && best > 450; i++) {
          g.enemyStep(e, 1 / 60);
          best = Math.min(best, Math.hypot(e.x - g.player.x, e.y - g.player.y));
        }
        if (best > 450)
          fail.push({ level: n, type, initial, best, x: e.x, y: e.y });
        cases++;
      }
  }
  X.profile = X.Save.validate(JSON.parse(old));
  g.start(1);
  if (fail.length) throw Error("Navigation failures " + JSON.stringify(fail));
  return { largeEnemyPaths: cases };
};
