() => {
  const g = X.game,
    old = JSON.stringify(X.profile);
  X.profile = X.Save.defaults();
  X.profile.settings.mute = true;
  g.start(1);
  const dirs = [
    [1, 0, "KeyD"],
    [-1, 0, "KeyA"],
    [0, 1, "KeyS"],
    [0, -1, "KeyW"],
    [0.707, 0.707, "KeyD", "KeyS"],
    [-0.707, 0.707, "KeyA", "KeyS"],
    [0.707, -0.707, "KeyD", "KeyW"],
    [-0.707, -0.707, "KeyA", "KeyW"],
    [0, 0],
  ];
  let steps = 0;
  const velocities = new Map();
  let exitNav = null;
  for (; steps < 42000 && g.state === "play"; steps++) {
    let p = g.player,
      near = null,
      distance = 1e9,
      es = g.enemies.items.filter((e) => e.active);
    for (const e of es) {
      let d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < distance && g.map.line(p.x, p.y, e.x, e.y)) {
        distance = d;
        near = e;
      }
    }
    g.camera.x = Math.max(0, Math.min(g.map.w * 48 - 1152, p.x - 576));
    g.camera.y = Math.max(0, Math.min(g.map.h * 48 - 648, p.y - 324));
    const prev = near ? velocities.get(near) : null,
      lead = Math.min(0.6, distance / 1000);
    g.mouse.x =
      (near ? near.x + (prev ? (near.x - prev.x) * 60 * lead : 0) : p.x + 100) -
      g.camera.x;
    g.mouse.y =
      (near ? near.y + (prev ? (near.y - prev.y) * 60 * lead : 0) : p.y) -
      g.camera.y;
    for (const e of es) velocities.set(e, { x: e.x, y: e.y });
    g.mouse.left = !!near;
    g.weapon = g.mags[1] + g.ammo.light > 0 ? 1 : 0;
    if (g.weapon === 1 && g.mags[1] < 5 && distance > 300) g.beginReload();
    let goal = null,
      best = 1e9;
    for (const l of g.loot) {
      let d = Math.hypot(l.x - p.x, l.y - p.y);
      if (d < best && (l.kind === "ammo" || p.hp < 75)) {
        best = d;
        goal = l;
      }
    }
    if (g.ready()) {
      goal = g.exit;
      if (!exitNav) {
        exitNav = g.map.navigation(14);
        g.map.flow(exitNav, g.exit.x, g.exit.y);
      }
    }
    let move = dirs.at(-1),
      score = -1e9;
    for (const v of dirs) {
      let x = p.x + v[0] * 100,
        y = p.y + v[1] * 100;
      if (!g.map.corridor(p.x, p.y, x, y, 16)) continue;
      let value = 0,
        min = 999;
      for (const e of es) {
        let d = Math.hypot(e.x - x, e.y - y);
        min = Math.min(min, d);
        if (d < 180) value -= (180 - d) * 5;
      }
      if (goal && g.map.line(p.x, p.y, goal.x, goal.y))
        value -= Math.hypot(x - goal.x, y - goal.y) * 0.35;
      else if (exitNav && exitNav.field[g.map.index(x, y)] >= 0)
        value -= exitNav.field[g.map.index(x, y)] * 30;
      else if (near) value -= Math.abs(min - 300) * 0.15;
      value -=
        Math.abs(x - g.map.w * 24) * 0.01 + Math.abs(y - g.map.h * 24) * 0.01;
      if (value > score) {
        score = value;
        move = v;
      }
    }
    g.keys.clear();
    for (const key of move.slice(2)) g.keys.add(key);
    if (distance < 100) g.keys.add("Space");
    if (distance < 150 && p.stamina > 15) g.keys.add("ShiftLeft");
    if (g.ready()) g.keys.add("KeyE");
    g.update(1 / 60);
  }
  const result = {
    state: g.state,
    seconds: +g.time.toFixed(1),
    kills: g.kills,
    hp: +g.player.hp.toFixed(1),
    ammo: g.mags[1] + g.ammo.light,
    steps,
    shots: g.stats.shots,
    wave: g.wave,
    enemies: g.activeEnemies(),
    reload: g.reload,
  };
  X.profile = X.Save.validate(JSON.parse(old));
  X.Save.write(X.profile);
  g.start(1);
  return result;
};
