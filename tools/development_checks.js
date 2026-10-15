() => {
  const g = X.game,
    old = JSON.stringify(X.profile),
    assert = (v, m) => {
      if (!v) throw Error(m);
    },
    near = (a, b) => Math.abs(a - b) < 1e-6;
  const clean = (n = 1) => {
    X.profile = X.Save.defaults();
    X.profile.credits = 1000000;
    X.profile.owned = X.weapons.map((w, i) => i);
    X.profile.unlocked = 20;
    for (const a in X.ammo) X.profile.ammo[a] = 1000;
    g.start(n);
    g.waveTimer = 9999;
    g.loot = [];
  };
  const room = () => {
    g.map = new X.Map(30, 20);
    g.map.carve(1, 1, 28, 18);
    g.player.x = 200;
    g.player.y = 400;
    g.player.angle = 0;
    g.shots.clear();
    g.enemies.clear();
    g.hash.clear();
    g.moving = false;
  };
  const target = (x, y = 400) => {
    const e = g.spawn(0, x, y);
    e.hp = e.maxHp = 10000;
    g.hash.insert(e);
    return e;
  };
  clean();
  for (const id of ["dashCharges", "sprint", "stamina", "regeneration"]) {
    const max = X.upgrades.find((u) => u.id === id).max;
    for (let i = 0; i < max; i++)
      assert(X.Economy.upgrade(id), "new implant purchase " + id);
    const credits = X.profile.credits;
    assert(
      !X.Economy.upgrade(id) && X.profile.credits === credits,
      "implant cap " + id,
    );
  }
  g.start(1);
  g.waveTimer = 9999;
  g.loot = [];
  assert(
    g.player.dashCharges === 5 && g.player.maxDashCharges === 5,
    "five dash capacity",
  );
  assert(
    g.player.stamina === 225 && g.player.maxStamina === 225,
    "stamina capacity",
  );
  const startX = g.player.x;
  g.keys.add("KeyD");
  g.keys.add("ShiftLeft");
  g.update(0.1);
  assert(near(g.player.x - startX, 40.7), "sprint speed actual");
  assert(near(g.player.stamina, 221.8), "sprint drain");
  g.keys.clear();
  g.player.stamina = 100;
  g.update(0.1);
  assert(near(g.player.stamina, 103.8), "stamina recharge");
  for (let i = 0; i < 5; i++) {
    g.keys.add("Space");
    g.update(0.01);
    g.keys.clear();
    g.update(0.01);
  }
  assert(g.player.dashCharges === 0, "five separate dashes");
  g.keys.add("Space");
  g.update(0.01);
  assert(g.player.dashCharges === 0, "sixth free dash");
  for (let i = 0; i < 150; i++) g.update(1 / 60);
  assert(
    g.player.dashCharges === 1,
    "dash does not recover one at a time or holding repeats",
  );
  g.keys.clear();
  g.update(0.01);
  g.keys.add("Space");
  g.update(0.01);
  g.keys.clear();
  assert(g.player.dashCharges === 0, "recovered dash cannot be spent");
  g.checkpoint();
  const saved = X.Save.validate(JSON.parse(JSON.stringify(X.profile)));
  assert(
    saved.checkpoint.player.dashCharges === 0 &&
      saved.checkpoint.player.maxStamina === 225,
    "new checkpoint fields",
  );
  g.start(1, saved.checkpoint);
  assert(
    g.player.dashCharges === 0 && g.player.maxStamina === 225,
    "dash checkpoint restore",
  );
  g.pause();
  const dash = g.player.dash,
    stamina = g.player.stamina;
  g.update(5);
  assert(
    g.player.dash === dash && g.player.stamina === stamina,
    "pause advances movement resources",
  );
  clean();
  const legacy = JSON.parse(JSON.stringify(X.profile));
  delete legacy.weaponTuning;
  for (const id of ["dashCharges", "sprint", "stamina", "regeneration"])
    delete legacy.upgrades[id];
  g.checkpoint();
  legacy.checkpoint = g.snapshot();
  delete legacy.checkpoint.rewardedWave;
  for (const k of ["maxStamina", "maxDashCharges", "dashCharges"])
    delete legacy.checkpoint.player[k];
  legacy.checkpoint.player.dash = 1;
  const migrated = X.Save.validate(legacy);
  assert(
    migrated.upgrades.dashCharges === 0 &&
      migrated.weaponTuning.rail === 0 &&
      migrated.checkpoint.player.dashCharges === 0,
    "legacy migration",
  );
  g.start(1, migrated.checkpoint);
  for (let i = 0; i < 65; i++) g.update(1 / 60);
  assert(g.player.dashCharges === 1, "legacy cooldown recovery");

  clean();
  for (let i = 0; i < 13; i++) {
    for (let n = 0; n < 3; n++)
      assert(X.Economy.tune(i), "tuning purchase " + i);
    const credits = X.profile.credits;
    assert(
      !X.Economy.tune(i) && X.profile.credits === credits,
      "tuning cap " + i,
    );
  }
  const tunedProfile = X.Save.validate(JSON.parse(JSON.stringify(X.profile)));
  assert(
    Object.values(tunedProfile.weaponTuning).every((n) => n === 3),
    "tuning save",
  );
  g.start(1);
  room();
  g.weapon = 1;
  g.mags[1] = 14;
  g.fire(false);
  assert(
    near(g.cool, 0.228) && g.mags[1] === 13,
    "rate branch actual cooldown/ammo",
  );
  room();
  g.weapon = 0;
  let e = target(345);
  g.fire(false);
  assert(e.hp < 10000, "blade reach branch");
  room();
  g.weapon = 7;
  g.mags[7] = 140;
  g.rng = new X.RNG(99);
  g.fire(false);
  let shots = g.shots.items.filter((s) => s.active);
  assert(
    shots.length === 3 && near(shots[0].range, 333.5),
    "flame range branch",
  );
  const wide = Math.max(...shots.map((s) => Math.abs(Math.atan2(s.vy, s.vx))));
  X.profile.weaponTuning.flame = 0;
  g.shots.clear();
  g.rng = new X.RNG(99);
  g.fire(false);
  const narrow = Math.max(
    ...g.shots.items
      .filter((s) => s.active)
      .map((s) => Math.abs(Math.atan2(s.vy, s.vx))),
  );
  assert(wide > narrow, "flame cone branch");
  room();
  g.weapon = 8;
  g.fire(false);
  let s = g.shots.items.find((s) => s.active);
  assert(near(Math.hypot(s.vx, s.vy), 783), "plasma velocity branch");
  room();
  g.weapon = 9;
  g.mouse.x = 900;
  g.fire(false);
  s = g.shots.items.find((s) => s.active);
  assert(near(s.blast, 190.4), "grenade blast branch");
  e = target(390);
  g.explode(200, 400, s.blast, s.damage, false);
  assert(e.hp < 10000, "larger explosion cannot hit outer target");
  room();
  g.weapon = 11;
  for (let i = 0; i < 8; i++) target(300 + i * 45);
  g.fire(false);
  assert(
    g.enemies.items.filter((e) => e.active && e.hp < 10000).length === 8,
    "tesla eight targets",
  );
  room();
  g.weapon = 10;
  g.map.cells[8 * g.map.w + 7] = 1;
  g.player.x = 240;
  g.player.y = 408;
  g.player.angle = 0;
  e = target(460, 408);
  g.charge = 0.2;
  g.fire(false);
  for (let t = 0; t < 20; t++) g.projectileStep(1 / 60);
  assert(e.hp === 10000, "partial charge penetrates wall");
  g.shots.clear();
  g.charge = 0.417;
  g.fire(false);
  assert(
    g.shots.items.some((s) => s.active && s.wallPierce),
    "full tuned charge lacks wall flag",
  );
  for (let t = 0; t < 20; t++) g.projectileStep(1 / 60);
  assert(e.hp < 10000, "rail cannot hit through wall");
  assert(g.map.blocked(350, 408), "rail destroys map walls");
  g.shots.clear();
  g.weapon = 6;
  g.fire(false);
  const hp = e.hp;
  for (let t = 0; t < 20; t++) g.projectileStep(1 / 60);
  assert(e.hp === hp, "sniper penetrates wall");
  g.shots.clear();
  g.weapon = 10;
  g.charge = 0.417;
  g.fire(false);
  for (let t = 0; t < 100; t++) g.projectileStep(1 / 60);
  assert(
    !g.shots.items.some((s) => s.active),
    "rail leaves world without expiring",
  );
  clean();
  X.profile.weaponTuning.rail = 3;
  g.weapon = 10;
  g.mouse.left = true;
  g.waveTimer = 999;
  for (let t = 0; t < 24; t++) g.update(1 / 60);
  assert(g.stats.shots === 0, "tuned rail fires before charge");
  g.update(1 / 60);
  assert(g.stats.shots === 1, "tuned rail charge threshold");
  assert(
    g.shots.items.some((s) => s.active && s.wallPierce),
    "real charged rail not penetrating",
  );

  clean();
  X.profile.upgrades.regeneration = 5;
  g.player.hp = 50;
  g.wave = 1;
  g.spawnQueue.push({ type: 0 });
  g.completeWave();
  assert(g.player.hp === 50, "heal with pending spawn");
  g.spawnQueue = [];
  e = g.spawn(0, g.player.x + 200, g.player.y);
  g.completeWave();
  assert(g.player.hp === 50, "heal with living enemy");
  e.active = false;
  g.completeWave();
  assert(g.player.hp === 70, "wave healing amount");
  g.completeWave();
  assert(g.player.hp === 70, "duplicate wave healing");
  g.checkpoint();
  const healCp = g.snapshot();
  g.start(1, healCp);
  g.completeWave();
  assert(g.player.hp === 70, "checkpoint repeats wave heal");
  g.wave = 2;
  g.player.hp = 95;
  g.completeWave();
  assert(g.player.hp === 100, "heal exceeds max HP");
  g.wave = 3;
  g.player.hp = 0;
  g.completeWave();
  assert(g.player.hp === 0, "wave implant resurrects");
  const repairs = [];
  for (const n of [4, 9]) {
    clean(n);
    const o = g.objectives[0];
    g.player.x = o.x + 50;
    g.player.y = o.y;
    g.coreHp = 100;
    for (let t = 0; t < 91; t++) g.interact(1 / 60);
    assert(o.done, "defense activation broken");
    g.coreHp = 100;
    g.keys.add("KeyE");
    g.mouse.left = true;
    for (let t = 0; t < 60; t++) g.update(1 / 60);
    assert(
      near(g.coreHp, 130) && g.repairing && g.stats.shots === 0,
      "continuous repair/weapon block " + n,
    );
    g.keys.clear();
    g.mouse.left = false;
    g.update(1 / 60);
    assert(!g.repairing, "repair does not stop on release");
    g.player.x = o.x + 100;
    g.interact(1);
    assert(near(g.coreHp, 130), "remote repair");
    g.player.x = o.x + 90;
    const index = Math.floor(o.y / 48) * g.map.w + Math.floor(o.x / 48) + 1,
      before = g.map.cells[index];
    g.map.cells[index] = 1;
    g.interact(1);
    assert(near(g.coreHp, 130), "repair through wall");
    g.map.cells[index] = before;
    g.player.x = o.x + 50;
    g.coreHp = 499;
    g.interact(1);
    assert(g.coreHp === 500, "repair exceeds max");
    g.coreHp = 0;
    g.interact(1);
    assert(g.coreHp === 0, "repair resurrects destroyed core");
    g.coreHp = 200;
    g.keys.add("KeyE");
    g.pause();
    g.update(1);
    assert(g.coreHp === 200, "paused repair");
    g.resume();
    g.keys.add("KeyE");
    g.update(0.1);
    g.checkpoint();
    const cp = X.Save.validate(
      JSON.parse(JSON.stringify(X.profile)),
    ).checkpoint;
    assert(cp.coreHp > 200, "repair checkpoint");
    g.start(n, cp);
    assert(g.coreHp === cp.coreHp, "repair restore");
    repairs.push(n);
  }

  clean();
  X.UI.menu();
  X.UI.action("unlockEndless");
  assert(
    X.profile.endless.unlocked && X.profile.completed.length === 0,
    "manual unlock completes campaign",
  );
  const un = X.Save.validate(JSON.parse(JSON.stringify(X.profile)));
  assert(
    un.endless.manualUnlock && un.endless.unlocked,
    "unlock not persisted",
  );
  X.UI.action("begin");
  assert(X.profile.endless.unlocked, "new campaign loses manual unlock");
  X.UI.action("doreset");
  assert(
    !X.profile.endless.unlocked && !X.profile.endless.manualUnlock,
    "reset retains unlock",
  );
  clean();
  g.pause();
  const stored = localStorage.getItem(X.Save.key),
    original = JSON.stringify(X.profile);
  assert(
    !X.Debug.code("BARRAGE") && X.weapons.length === 13,
    "debug weapon accessible outside sandbox",
  );
  X.Debug.enter();
  assert(X.weapons.length === 14, "debug weapon missing");
  assert(X.Debug.code("BARRAGE"), "barrage code");
  const index = X.weapons.findIndex((w) => w.debugOnly);
  assert(
    !X.Economy.weapon(index) && !X.Economy.tune(index) && !X.Economy.mod(index),
    "debug weapon purchasable",
  );
  assert(
    !X.Save.validate(JSON.parse(JSON.stringify(X.profile))).owned.includes(
      index,
    ),
    "debug weapon survives normal import",
  );
  g.start(1);
  g.waveTimer = 999;
  g.switchWeapon(index);
  const ammo = JSON.stringify(g.ammo);
  g.mouse.left = true;
  for (let t = 0; t < 120; t++) g.update(1 / 60);
  assert(
    g.stats.shots >= 25 && g.reload === 0 && JSON.stringify(g.ammo) === ammo,
    "barrage rate/reload/ammo",
  );
  X.Debug.code("ARSENAL");
  assert(X.profile.owned.includes(index), "arsenal removes barrage");
  g.finish(true);
  assert(
    localStorage.getItem(X.Save.key) === stored,
    "sandbox changes persistent profile",
  );
  X.UI.menu();
  assert(
    X.weapons.length === 13 && JSON.stringify(X.profile) === original,
    "sandbox weapon leaks",
  );
  X.profile = X.Save.validate(JSON.parse(old));
  X.Save.write(X.profile);
  X.UI.menu();
  return {
    dashCharges: 5,
    stamina: 225,
    sprintSpeed: 407,
    legacyCheckpoint: true,
    tuningBranches: 13,
    railWalls: true,
    waveHealing: true,
    repairs,
    manualUnlock: true,
    barrageIsolated: true,
  };
};
