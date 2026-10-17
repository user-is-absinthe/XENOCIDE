() => {
  const g = X.game,
    old = JSON.stringify(X.profile),
    bank = X.Slots.exportData(),
    assert = (v, m) => {
      if (!v) throw Error(m);
    },
    near = (a, b) => Math.abs(a - b) < 1e-5;
  const clean = (id, a = 0, b = 0, real = false) => {
    X.profile = X.Save.defaults();
    X.profile.unlocked = 20;
    X.profile.owned = X.weapons.map((_, i) => i);
    X.profile.credits = 1e7;
    X.profile.weaponMods[id] = a;
    X.profile.weaponTuning[id] = b;
    for (const k in X.ammo) X.profile.ammo[k] = 1000;
    g.start(1);
    g.waveTimer = 9999;
    g.loot = [];
    g.weapon = X.weapons.findIndex((w) => w.id === id);
    if (!real) {
      g.map = new X.Map(60, 40);
      g.map.carve(1, 1, 58, 38);
      g.navSmall = g.map.navigation(14);
      g.navBig = g.map.navigation(34);
      g.navCore = g.map.navigation(34);
      g.player.x = 1000;
      g.player.y = 900;
    }
    g.player.angle = 0;
    g.mouse.x = 900;
    g.mouse.y = 324;
    g.hash.clear();
  };
  const target = (x = 1200, y = 900, type = 0) => {
    const e = g.spawn(type, x, y);
    e.hp = e.maxHp = 100000;
    g.hash.insert(e);
    return e;
  };
  const advance = (n) => {
    for (let i = 0; i < n; i++) g.projectileStep(1 / 60);
  };
  const shots = () => g.shots.items.filter((s) => s.active);
  for (const id of Object.keys(X.FieldArmory.definitions)) {
    clean(id);
    for (let n = 0; n < 5; n++)
      assert(X.Economy.mod(g.weapon) && X.Economy.tune(g.weapon), "buy " + id);
    assert(!X.Economy.mod(g.weapon) && !X.Economy.tune(g.weapon), "cap " + id);
    const p = X.Save.validate(JSON.parse(JSON.stringify(X.profile)));
    assert(
      p.weaponMods[id] === 5 && p.weaponTuning[id] === 5,
      "new ranks " + id,
    );
    const w = X.weapons[g.weapon],
      a = X.Armory.stats(w, false),
      b = X.Armory.stats(w, true);
    X.profile.weaponTuning[id] = 0;
    assert(
      near(X.Armory.stats(w, false).damage, a.damage),
      "B affects A " + id,
    );
    X.profile.weaponTuning[id] = 5;
    X.profile.weaponMods[id] = 0;
    assert(near(X.Armory.stats(w, true).damage, b.damage), "A affects B " + id);
  }
  clean("blade", 5);
  let e = target(1080),
    damage = [];
  for (let i = 0; i < 3; i++) {
    const hp = e.hp;
    g.fire(false);
    damage.push(hp - e.hp);
  }
  assert(
    damage[1] > damage[0] && damage[2] > damage[1] && g.gunState.combo === 0,
    "blade combo",
  );
  g.fire(false);
  g.gunStep(1.1);
  assert(g.gunState.combo === 0, "combo timeout");
  clean("blade", 0, 5);
  g.fire(true);
  assert(g.gunState.parry > 0, "parry window");
  const front = g.shot(
    1045,
    900,
    Math.PI,
    {
      kind: "enemy",
      damage: 10,
      speed: 250,
      range: 800,
      type: "enemy",
      radius: 6,
    },
    true,
  );
  const back = g.shot(
    955,
    900,
    0,
    {
      kind: "enemy",
      damage: 10,
      speed: 250,
      range: 800,
      type: "enemy",
      radius: 6,
    },
    true,
  );
  g.projectileStep(1 / 60);
  assert(
    !front.enemy && front.vx > 0 && near(front.damage, 35) && back.enemy,
    "projectile reflection / back guard",
  );
  e = target(1035);
  g.player.invuln = 0;
  const hp = g.player.hp;
  g.hurtPlayer(30, e);
  assert(g.player.hp === hp && e.hp < e.maxHp, "melee parry");
  g.player.invuln = 0;
  g.hurtPlayer(10);
  assert(g.player.hp < hp, "parry blocks hazards");
  const cooldown = g.gunState.parryCooldown;
  g.fire(true);
  assert(
    g.gunState.parryCooldown === cooldown,
    "parry repeats without cooldown",
  );
  g.switchWeapon(1);
  assert(
    g.gunState.parry === 0 && g.gunState.parryCooldown > 0,
    "switch bypasses parry cooldown",
  );
  clean("pistol", 5);
  e = target();
  const damageSeries = [];
  for (let i = 0; i < 3; i++) {
    const hp = e.hp;
    g.fire(false);
    advance(25);
    damageSeries.push(hp - e.hp);
    g.shots.clear();
  }
  assert(
    damageSeries[1] > damageSeries[0] &&
      damageSeries[2] > damageSeries[1] &&
      g.gunState.pistolStreak === 3,
    "pistol hit streak",
  );
  g.player.angle = Math.PI / 2;
  g.fire(false);
  advance(100);
  assert(g.gunState.pistolStreak === 0, "pistol miss reset");
  clean("pistol", 0, 5);
  e = target();
  g.fire(true);
  advance(25);
  assert(
    e.weakTime === 9 && near(e.weakFactor, 1.5) && g.mags[1] === 12,
    "mark values/cost",
  );
  let before = e.hp;
  g.hurtEnemy(e, 100, "energy");
  assert(near(before - e.hp, 150), "mark affects other damage");
  const second = target(1200, 1000);
  g.player.angle = Math.atan2(100, 200);
  g.fire(true);
  advance(30);
  assert(second.weakTime > 0 && e.weakTime === 0, "one mark only");
  clean("smg", 5);
  g.moving = true;
  g.rng = new X.RNG(77);
  g.fire(false);
  const moving = shots()[0].vy;
  clean("smg", 5);
  g.moving = false;
  g.rng = new X.RNG(77);
  g.fire(false);
  assert(near(shots()[0].vy, moving), "SMG movement spread");
  clean("smg", 0, 5);
  g.fire(true);
  assert(
    shots().length === 5 &&
      g.mags[2] === 40 &&
      shots().every((s) => s.ricochets === 3),
    "SMG fan",
  );
  g.shots.clear();
  const ric = g.shot(
    1100,
    900,
    0,
    {
      kind: "ricochet",
      damage: 100,
      speed: 600,
      range: 600,
      pierce: 1,
      type: "kinetic",
      ricochets: 3,
    },
    false,
  );
  g.map.cells[Math.floor(900 / 48) * g.map.w + 24] = 1;
  advance(8);
  assert(
    ric.active && ric.vx < 0 && ric.bounces === 1 && near(ric.damage, 80),
    "wall ricochet",
  );
  e = target(1050);
  advance(20);
  assert(e.hp < e.maxHp, "reflected fan cannot hit target");
  clean("rifle", 0);
  e = target(1200, 900, 5);
  g.fire(false);
  g.burstStep(0.2);
  const bullets = shots();
  assert(
    bullets.length === 3 && bullets.filter((s) => s.armorPierce).length === 1,
    "third round flags",
  );
  g.rng = new X.RNG(1);
  for (const s of bullets) {
    s.vx = 1100;
    s.vy = 0;
  }
  advance(20);
  assert(
    near(e.maxHp - e.hp, 24 * 0.35 * 2 + 24 * 1.15),
    "third round ignores armor",
  );
  clean("rifle", 5, 5);
  e = target(1120);
  const away = e.x;
  g.fire(true);
  assert(
    g.mags[4] === 33 && !g.pendingBurst && e.x > away && e.interrupt > 0,
    "rifle pulse/cost",
  );
  clean("rifle", 0, 5);
  e = target(1120);
  g.map.cells[Math.floor(900 / 48) * g.map.w + 22] = 1;
  g.fire(true);
  assert(e.x === 1120 && e.hp === e.maxHp, "pulse through wall");
  clean("machine", 5);
  g.fire(false);
  const cold = shots()[0].damage;
  g.shots.clear();
  for (let i = 0; i < 10; i++) g.fire(false);
  const hot = shots().at(-1).damage;
  assert(hot > cold && g.gunState.machineHeat > 0.99, "machine heat");
  g.mouse.left = false;
  g.gunStep(2);
  assert(g.gunState.machineHeat < 0.5, "machine cooling");
  clean("machine", 0, 5);
  e = target();
  g.fire(true);
  advance(20);
  assert(e.suppressed > 0 && e.interrupt > 0, "machine suppression");
  const slow = e.suppressed;
  g.mouse.right = true;
  g.keys.add("KeyD");
  g.keys.add("Space");
  const x = g.player.x,
    dashes = g.player.dashCharges;
  g.update(0.1);
  assert(
    near(g.player.x - x, 3.7) && g.player.dashCharges === dashes,
    "brace movement/dash",
  );
  clean("sniper", 5);
  e = target();
  target(1300);
  g.fire(false);
  advance(20);
  assert(g.gunState.sniperStreak === 1, "piercing streak counted twice");
  g.player.angle = Math.PI / 2;
  g.fire(false);
  advance(100);
  assert(g.gunState.sniperStreak === 0, "sniper miss reset");
  clean("sniper", 0, 5);
  e = target();
  e.attack = e.special = 0;
  g.fire(true);
  advance(20);
  assert(
    e.cripple === 2.5 && e.interrupt === 2.5 && g.mags[6] === 4,
    "sniper binding/cost",
  );
  const ex = e.x,
    ey = e.y;
  g.enemyStep(e, 0.1);
  assert(e.x === ex && e.y === ey, "binding moves");
  clean("sniper", 0, 5);
  e = target(1200, 900, 10);
  e.attack = e.special = 0;
  g.fire(true);
  advance(20);
  assert(
    near(e.cripple, 0.625) && near(e.interrupt, 0.625),
    "boss binding resistance",
  );
  g.shots.clear();
  g.enemyStep(e, 0.1);
  assert(!shots().some((s) => s.enemy), "binding does not interrupt boss");
  clean("flame", 0, 5);
  g.fire(true);
  assert(g.mags[7] === 120 && shots().length === 1, "napalm cost 20");
  g.shots.clear();
  g.mags[7] = 19;
  g.ammo.fuel = 0;
  const attacks = g.stats.shots;
  g.fire(true);
  assert(
    !shots().length && g.mags[7] === 19 && g.stats.shots === attacks,
    "napalm partial free shot",
  );
  g.fire(false);
  assert(shots().length === 3 && g.mags[7] === 18, "remaining fuel LMB");
  const rings = [];
  for (const level of [0, 2, 3, 5]) {
    clean("grenade", 5, level);
    const p = g.player,
      mag = g.mags[9],
      hp = p.hp;
    g.fire(true);
    assert(
      shots().length === mag && g.mags[9] === 0 && g.reload > 0,
      "umbrella whole magazine",
    );
    const centres = shots().map((s) => s.range + 25),
      nearR = X.Armory.stats(X.weapons[9], true).blast + p.r + 8;
    assert(
      centres.every(
        (r) =>
          near(r, nearR) ||
          near(r, nearR + X.Armory.stats(X.weapons[9], true).blast * 1.5),
      ),
      "ring radii",
    );
    const inner = centres.filter((r) => near(r, nearR)).length;
    assert(
      level < 3 ? inner === mag : inner > mag - inner,
      "outer ring not sparse",
    );
    advance(180);
    assert(
      g.blasts.length === mag &&
        g.blasts.every(
          (b) => Math.hypot(b.x - p.x, b.y - p.y) - b.r >= p.r + 5.99,
        ) &&
        p.hp === hp,
      "umbrella blast intersects player",
    );
    rings.push({ level, inner, outer: mag - inner });
  }
  clean("grenade", 5, 5);
  g.map.cells[Math.floor(g.player.y / 48) * g.map.w + 21] = 1;
  g.fire(true);
  advance(180);
  assert(
    g.blasts.every(
      (b) =>
        Math.hypot(b.x - g.player.x, b.y - g.player.y) - b.r >=
        g.player.r + 5.99,
    ),
    "umbrella wall safety",
  );
  // Поле состояния и эффекты врага сохраняются, старые записи остаются совместимыми.
  clean("pistol", 5, 5, true);
  g.player.x = 600;
  g.player.y = 600;
  g.player.angle = 0;
  e = target(720, 600);
  g.fire(true);
  advance(20);
  g.gunState.pistolStreak = 4;
  g.gunState.parryCooldown = 1.3;
  g.checkpoint();
  let profile = X.Save.validate(JSON.parse(JSON.stringify(X.profile)));
  assert(
    profile.checkpoint.gunState.pistolStreak === 4 &&
      profile.checkpoint.enemies[0].weakTime > 0,
    "combat checkpoint",
  );
  X.profile = profile;
  g.start(1, profile.checkpoint);
  assert(
    g.gunState.pistolStreak === 4 &&
      g.enemies.items.some((e) => e.active && e.weakTime > 0),
    "combat restore",
  );
  g.pause();
  const state = JSON.stringify(g.gunState);
  g.update(10);
  assert(JSON.stringify(g.gunState) === state, "combat pause");
  delete profile.checkpoint.gunState;
  for (const e of profile.checkpoint.enemies) {
    delete e.weakTime;
    delete e.weakFactor;
    delete e.cripple;
    delete e.suppressed;
    delete e.interrupt;
  }
  profile = X.Save.validate(profile);
  assert(
    profile.checkpoint.gunState.pistolStreak === 0 &&
      profile.checkpoint.enemies[0].weakFactor === 1,
    "legacy combat migration",
  );
  for (const id of ["pistol", "smg", "rifle", "machine", "sniper"])
    for (const alt of [false, true]) {
      clean(id, 5, 5);
      g.mags[g.weapon] = 0;
      g.ammo[X.weapons[g.weapon].ammo] = 0;
      g.fire(alt);
      assert(!shots().length && g.stats.shots === 0, "empty mode " + id);
    }
  for (const [id, cost] of [
    ["pistol", 2],
    ["rifle", 3],
    ["sniper", 2],
  ]) {
    clean(id, 5, 5);
    g.mags[g.weapon] = cost - 1;
    g.ammo[X.weapons[g.weapon].ammo] = 0;
    g.fire(true);
    assert(
      g.mags[g.weapon] === cost - 1 && g.stats.shots === 0 && !shots().length,
      "partial fixed cost " + id,
    );
  }
  X.profile = X.Save.validate(JSON.parse(old));
  X.Slots.entries = bank.entries;
  X.Slots.write();
  X.Save.write(X.profile);
  X.UI.menu();
  return {
    newWeapons: 6,
    tiers: 5,
    combo: true,
    parryReflectionAndMelee: true,
    parryHazardsUnblocked: true,
    precisionStreaks: true,
    singleMark: true,
    movingSMG: true,
    ricochets: true,
    thirdArmorPierce: true,
    pulse: true,
    heat: true,
    brace: true,
    suppression: true,
    bindingAndBossResistance: true,
    napalmCost: 20,
    partialFuelSafe: true,
    umbrella: rings,
    umbrellaWallSafe: true,
    combatCheckpoint: true,
    legacyMigration: true,
    finiteModes: 10,
  };
};
