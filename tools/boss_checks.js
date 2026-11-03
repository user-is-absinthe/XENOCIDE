({ visual = false, difficulty = 1 } = {}) => {
  const g = X.game;
  const assert = (value, label) => {
    if (!value) throw Error(label);
  };
  const tick = (e, frames = 1) => {
    for (let i = 0; i < frames; i++) g.enemyStep(e, 1 / 60);
  };
  const until = (e, state, limit = 1800) => {
    for (let i = 0; i < limit && e.encounter.state !== state; i++) tick(e);
    assert(
      e.encounter.state === state,
      "expected " + state + ", got " + e.encounter.state,
    );
  };
  const active = () => g.enemies.items.filter((e) => e.active);
  const start = (n, phase = 1) => {
    g.start(n);
    const p = g.player;
    const pos = g.level.spawns
      .map((s) => g.map.point(s))
      .find(
        (q) =>
          g.map.fits(q.x, q.y, X.enemies[g.level.boss].radius) &&
          [-1, 1].some((sign) =>
            g.map.corridor(q.x, q.y, q.x + sign * 144, q.y, p.r),
          ),
      );
    assert(pos, "usable boss spawn " + n);
    const sign = g.map.corridor(pos.x, pos.y, pos.x + 144, pos.y, p.r) ? 1 : -1;
    Object.assign(p, { x: pos.x + sign * 144, y: pos.y, invuln: 0 });
    const e = g.spawn(g.level.boss, pos.x, pos.y);
    e.encounter.time = 0;
    if (phase === 2) {
      e.hp *= 0.48;
      tick(e);
      assert(e.encounter.state === "transition", "phase signal " + n);
      until(e, "approach");
    }
    return e;
  };
  const restore = () => {
    g.start(g.number, X.Save.checkpoint(g.snapshot(), X.profile));
    return active().find((e) => e.boss);
  };
  const exit = (e) => {
    g.wave = g.level.waves;
    g.spawnQueue = [];
    assert(!g.ready(), "premature exit " + g.number);
    g.hurtEnemy(e, 1e6, "kinetic");
    for (const add of active()) g.hurtEnemy(add, 1e6, "energy");
    assert(g.ready(), "closed exit " + g.number);
    Object.assign(g.player, g.exit);
    g.interact(0.1);
    assert(g.state === "victory", "exit interaction " + g.number);
  };
  const walk = (e, x, y) => {
    const p = g.player,
      a = Math.atan2(y - p.y, x - p.x);
    const frames = Math.ceil((Math.hypot(x - p.x, y - p.y) * 60) / 185);
    for (let i = 0; i < frames; i++) {
      g.map.move(p, (Math.cos(a) * 185) / 60, (Math.sin(a) * 185) / 60);
      tick(e);
    }
  };
  const sidestep = (e, clearance = 10) => {
    const p = g.player;
    for (let i = 0; i < 24; i++) {
      const a = (i * Math.PI) / 12;
      for (const distance of [72, 108, 150, 196]) {
        const x = p.x + distance * Math.cos(a),
          y = p.y + distance * Math.sin(a);
        if (
          g.bossDanger(e, x, y) >= clearance &&
          g.map.corridor(p.x, p.y, x, y, p.r)
        ) {
          walk(e, x, y);
          return;
        }
      }
    }
    throw Error("no walking escape " + g.number);
  };
  X.profile = X.Save.defaults();
  X.profile.endless.unlocked = true;
  X.profile.difficulty = difficulty;
  X.profile.settings.mute = true;
  X.profile.settings.quality = 0;
  if (visual) {
    const [n, dark] = visual;
    X.profile.settings.darkMode = dark;
    let e = start(n, n === 5 ? 1 : 2);
    if (n === 5) e.hp *= 0.8;
    const state = {
      5: "healing",
      10: "windup",
      15: "floorWarning",
      20: "guard",
    }[n];
    until(e, state);
    tick(e, 20);
    X.UI.hudClock = -1;
    X.UI.hud(g);
    assert(
      document.querySelector(".boss").textContent.includes(g.bossStatus(e)),
      "boss HUD",
    );
    document.getElementById("toast").classList.remove("visible");
    const canvas = X.Render.canvas;
    X.Render.draw(g, 0);
    const withCues = canvas.toDataURL();
    g.drawBossCues = () => {};
    X.Render.draw(g, 0);
    assert(
      withCues !== canvas.toDataURL(),
      "cue pixels " + n + " dark=" + dark,
    );
    delete g.drawBossCues;
    X.Render.draw(g, 0);
    return state;
  }

  g.start(10);
  const wall = g.level.blocks[0];
  const x = wall[0] * 48 - 175,
    y = (wall[1] + 0.5) * 48;
  let e = g.spawn(11, x, y);
  Object.assign(g.player, { x: x + 85, y, invuln: 0 });
  e.encounter.time = 0;
  tick(e);
  assert(
    e.encounter.state === "windup" && e.encounter.impact,
    "steel warning to wall",
  );
  const { angle, time } = e.encounter;
  e = restore();
  assert(
    e.encounter.angle === angle && e.encounter.time === time,
    "steel warning restore",
  );
  g.player.invuln = 0;
  const hp = g.player.hp;
  walk(e, g.player.x, g.player.y + 80);
  until(e, "recovery");
  assert(
    g.player.hp === hp && e.encounter.exposed && g.bossDamageFactor(e) > 1,
    "steel sidestep and impact",
  );
  e.hp = e.maxHp * 0.45;
  tick(e);
  assert(
    e.encounter.phase === 2 && e.encounter.state === "transition",
    "steel phase",
  );
  const old = g.snapshot();
  delete old.enemies[0].encounter;
  g.start(10, X.Save.checkpoint(old, X.profile));
  e = active()[0];
  assert(
    e.encounter.phase === 2 &&
      e.encounter.state === "approach" &&
      e.encounter.time > 0,
    "steel legacy",
  );
  e.encounter.cycle = 1;
  until(e, "windup");
  assert(e.encounter.remaining === 2, "steel double charge");
  until(e, "charge");
  until(e, "windup");
  assert(
    e.encounter.remaining === 1 && e.encounter.time > 1,
    "steel second warning",
  );
  until(e, "recovery");
  exit(e);

  e = start(5);
  e.hp *= 0.8;
  until(e, "healing");
  const patientHp = e.hp;
  for (let i = 0; i < 3; i++) {
    g.weapon = 1;
    g.player.angle = Math.atan2(e.y - g.player.y, e.x - g.player.x);
    g.hash.clear();
    g.hash.insert(e);
    g.cool = 0;
    g.fire(false);
    for (let frame = 0; frame < 18; frame++) {
      g.projectileStep(1 / 60);
      tick(e);
    }
  }
  assert(
    e.hp < patientHp && e.encounter.state === "recovery" && e.encounter.exposed,
    "stock pistol interrupts",
  );
  e = start(5, 2);
  until(e, "pulse");
  const before = g.player.hp;
  sidestep(e);
  until(e, "healing");
  const wounded = e.hp;
  until(e, "recovery");
  assert(
    g.player.hp === before && e.hp > wounded && e.encounter.phase === 2,
    "patient phase two dodge and heal",
  );
  for (let i = 0; i < 4; i++) {
    until(e, "pulse");
    sidestep(e);
    until(e, "recovery");
  }
  assert(
    e.encounter.healed <= e.maxHp * 0.14 + 0.001 &&
      e.encounter.healed >= e.maxHp * 0.13,
    "patient finite budget",
  );
  exit(e);

  e = start(20);
  until(e, "brood");
  until(e, "guard");
  assert(
    g.broodNodes(e).length === 1 && g.bossDamageFactor(e) < 1,
    "queen shield",
  );
  e = restore();
  g.hurtEnemy(g.broodNodes(e)[0], g.broodNodes(e)[0].hp, "kinetic");
  assert(
    e.encounter.exposed && e.encounter.state === "recovery",
    "last node opens queen",
  );
  e.hp *= 0.48;
  until(e, "guard");
  assert(g.broodNodes(e).length === 2, "queen phase two nodes");
  tick(e, 540);
  assert(
    active().filter((a) => a.broodOwner === e.spawnId && !a.broodNode)
      .length === 6,
    "queen reinforcement cap",
  );
  e = restore();
  assert(
    g.broodNodes(e).length === 2 && g.bossDamageFactor(e) < 1,
    "queen restore linked objects",
  );
  g.hurtEnemy(g.broodNodes(e)[0], g.broodNodes(e)[0].hp, "kinetic");
  assert(g.bossDamageFactor(e) < 1, "one node still shields");
  exit(e);

  const heart = (n, phase) => {
    let boss = start(n, phase);
    until(boss, "floorWarning");
    assert(boss.encounter.zones.length === phase, "heart zone count " + n);
    boss = restore();
    g.player.invuln = 0;
    const before = g.player.hp;
    sidestep(boss);
    until(boss, "discharge");
    if (phase === 2) {
      until(boss, "floorWarning");
      assert(boss.encounter.index === 1, "heart second zone");
      if (g.bossDanger(boss, g.player.x, g.player.y) <= 0) sidestep(boss);
    }
    until(boss, "recovery");
    assert(
      g.player.hp === before && g.bossDamageFactor(boss) > 1,
      "heart safe route",
    );
    exit(boss);
  };
  e = start(15);
  const pad = g.level.reactorPads[0].map((v) => v * 48);
  Object.assign(g.player, { x: pad[0] + pad[2] / 2, y: pad[1] + pad[3] / 2 });
  e.encounter.time = 0;
  const beforePad = g.player.hp;
  until(e, "floorWarning");
  assert(
    e.encounter.zones[0].every((v, i) => v === pad[i]),
    "campaign reactor pad",
  );
  until(e, "discharge");
  assert(g.player.hp === beforePad, "warning has no damage");
  tick(e);
  assert(g.player.hp < beforePad, "marked pad deals damage");
  heart(15, 1);
  heart(15, 2);
  for (const seed of [1, 51, 793, 4294967295]) {
    X.profile.endless.seed = seed;
    e = start(25, 2);
    until(e, "windup");
    assert(
      Math.hypot(e.encounter.bx - e.x, e.encounter.by - e.y) <= 504.001,
      "steel bounded expedition charge",
    );
    sidestep(e);
    until(e, "charge");
    until(e, "windup");
    if (g.bossDanger(e, g.player.x, g.player.y) < 0) sidestep(e);
    until(e, "recovery");
    exit(e);
    heart(30, 2);
    e = start(35, 2);
    until(e, "guard");
    assert(
      g.broodNodes(e).length === 2 &&
        g
          .broodNodes(e)
          .every((node) => g.navSmall.field[g.map.index(node.x, node.y)] >= 0),
      "procedural queen nodes " + seed,
    );
    exit(e);
    e = start(40, 2);
    until(e, "pulse");
    sidestep(e);
    until(e, "healing");
    exit(e);
  }
  X.Debug.enter();
  for (const n of [5, 10, 15, 20]) {
    e = start(n);
    assert(X.Debug.active && e.type === g.level.boss, "poligon boss " + n);
    exit(e);
  }
  X.Debug.leave();
  return {
    campaign: [5, 10, 15, 20],
    expeditions: [25, 30, 35, 40],
    seeds: 4,
    difficulty,
    field: 4,
  };
};
