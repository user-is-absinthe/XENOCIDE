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
    for (const key in X.ammo) X.profile.ammo[key] = 1000;
    g.start(1);
    g.waveTimer = 999;
    g.loot = [];
    g.weapon = X.weapons.findIndex((w) => w.id === id);
    if (!real) {
      g.map = new X.Map(60, 30);
      g.map.carve(1, 1, 58, 28);
      g.navSmall = g.map.navigation(14);
      g.navBig = g.map.navigation(34);
      g.navCore = g.map.navigation(34);
      g.player.x = 300;
      g.player.y = 600;
    }
    g.player.angle = 0;
    g.camera.x = 0;
    g.camera.y = 276;
    g.mouse.x = 900;
    g.mouse.y = 324;
  };
  const target = (x, y = 600) => {
    const e = g.spawn(0, x, y);
    e.hp = e.maxHp = 1e6;
    g.hash.insert(e);
    return e;
  };
  const advance = (n) => {
    for (let i = 0; i < n; i++) g.projectileStep(1 / 60);
  };
  const shotCount = () => g.shots.items.filter((s) => s.active).length;
  for (const id of Object.keys(X.Armory.definitions).filter(
    (id) => !X.Armory.definitions[id].newModes,
  )) {
    clean(id);
    const index = g.weapon;
    for (let n = 0; n < 5; n++)
      assert(X.Economy.mod(index) && X.Economy.tune(index), "buy A/B " + id);
    const credits = X.profile.credits;
    assert(
      !X.Economy.mod(index) &&
        !X.Economy.tune(index) &&
        X.profile.credits === credits,
      "cap A/B " + id,
    );
    const profile = X.Save.validate(JSON.parse(JSON.stringify(X.profile)));
    assert(
      profile.weaponMods[id] === 5 && profile.weaponTuning[id] === 5,
      "save A/B " + id,
    );
    const w = X.weapons[index],
      a = X.Armory.stats(w, false),
      b = X.Armory.stats(w, true),
      before = b.damage;
    X.profile.weaponMods[id] = 0;
    assert(
      near(X.Armory.stats(w, true).damage, before),
      "A affects B damage " + id,
    );
    X.profile.weaponMods[id] = 5;
    X.profile.weaponTuning[id] = 0;
    assert(
      near(X.Armory.stats(w, false).damage, a.damage),
      "B affects A damage " + id,
    );
    assert(X.Armory.mag(w) > w.mag, "A capacity " + id);
  }
  clean("shotgun", 5, 2);
  g.mags[g.weapon] = 5;
  g.ammo.shell = 0;
  const victims = [target(550), target(700), target(850)];
  g.fire(true);
  assert(shotCount() === 1 && g.mags[g.weapon] === 0, "shotgun whole magazine");
  advance(40);
  assert(
    victims.every((e) => near(e.maxHp - e.hp, 1120)),
    "shotgun sum/piercing",
  );
  const count = g.stats.shots;
  g.fire(true);
  assert(g.stats.shots === count, "empty shotgun B");
  clean("shotgun", 5);
  g.fire(false);
  const pellets = g.shots.items.filter((s) => s.active);
  assert(
    pellets.length === 13 &&
      pellets.every((s) => near(s.damage, 35)) &&
      X.Armory.mag(X.weapons[g.weapon]) === 20,
    "shotgun A all properties",
  );
  clean("shotgun");
  g.mags[g.weapon] = 1;
  g.ammo.shell = 0;
  g.fire(true);
  assert(
    g.shots.items.some((s) => s.active && near(s.damage, 160)),
    "one shell monoshot",
  );

  clean("flame", 5, 5);
  const flameBase = target(600);
  g.fire(true);
  for (let i = 0; i < 90 && !g.surfaces.items.some((o) => o.active); i++)
    g.projectileStep(1 / 60);
  const firePool = g.surfaces.items.find((o) => o.active);
  assert(
    firePool &&
      firePool.type === "fire" &&
      firePool.radius === 124 &&
      near(firePool.life, 6),
    "napalm on enemy",
  );
  const hp = flameBase.hp;
  g.surfaceStep(0.2);
  assert(
    flameBase.hp < hp && flameBase.poolFire > 0,
    "napalm damage/visible burn",
  );
  clean("flame", 0, 3);
  g.map.cells[12 * g.map.w + 10] = 1;
  g.fire(true);
  advance(60);
  assert(
    g.surfaces.items.some((o) => o.active && !g.map.blocked(o.x, o.y)),
    "napalm impact wall",
  );
  g.surfaces.clear();
  const front = target(600),
    behind = target(720);
  g.map.cells[12 * g.map.w + 13] = 1;
  g.addSurface(600, 600, 140, 100, 3, "fire");
  g.surfaceStep(0.2);
  assert(
    near(front.maxHp - front.hp, 20) && behind.hp === behind.maxHp,
    "pool damage through wall",
  );
  for (let i = 0; i < 80; i++) g.addSurface(600, 600, 100, 10, 3, "energy");
  assert(g.surfaces.items.filter((o) => o.active).length === 32, "surface cap");
  g.surfaceStep(20);
  assert(!g.surfaces.items.some((o) => o.active), "surface lifetime");

  clean("flame", 0, 3);
  target(600);
  g.objectives = [{ kind: "nest", x: 600, y: 600, hp: 10000, done: false }];
  g.blasts = [];
  g.fire(true);
  for (let i = 0; i < 90 && !g.surfaces.items.some((o) => o.active); i++)
    g.projectileStep(1 / 60);
  assert(
    g.surfaces.items.filter((o) => o.active).length === 1 &&
      g.blasts.length === 1,
    "payload explodes twice beside nest",
  );
  clean("plasma", 5, 0);
  let host = target(600);
  g.mags[g.weapon] = 3;
  g.ammo.energy = 0;
  g.fire(true);
  let bomb = g.shots.items.find((s) => s.active);
  assert(
    bomb.payload === "sticky" &&
      near(bomb.damage, 195) &&
      g.mags[g.weapon] === 0,
    "plasma summed charges",
  );
  for (let i = 0; i < 90 && !bomb.stuck; i++) g.projectileStep(1 / 60);
  assert(
    bomb.stuck &&
      host.hp === host.maxHp &&
      !g.surfaces.items.some((o) => o.active),
    "plasma not delayed",
  );
  host.x += 30;
  host.y += 20;
  g.hash.clear();
  g.hash.insert(host);
  g.projectileStep(1 / 60);
  assert(bomb.x === host.x && bomb.y === host.y, "sticky follows host");
  advance(55);
  assert(
    near(host.maxHp - host.hp, 195) &&
      g.surfaces.items.some((o) => o.active && o.type === "energy"),
    "plasma detonation/pool",
  );
  clean("plasma", 0, 5);
  host = target(600);
  g.mags[g.weapon] = 4;
  g.ammo.energy = 0;
  g.fire(true);
  bomb = g.shots.items.find((s) => s.active);
  assert(near(bomb.damage, 650), "plasma B damage scaling");
  for (let i = 0; i < 90 && !bomb.stuck; i++) g.projectileStep(1 / 60);
  const x = bomb.x;
  host.active = false;
  g.enemies.cursor = g.enemies.items.indexOf(host);
  const recycled = target(1700);
  assert(recycled === host, "test host reuse");
  g.projectileStep(1 / 60);
  assert(bomb.x === x, "sticky follows recycled enemy");

  clean("tesla", 5, 0);
  for (let i = 0; i < 10; i++) target(450 + i * 180);
  g.fire(false);
  assert(
    g.enemies.items.filter((e) => e.active && e.hp < e.maxHp).length === 10,
    "tesla A chain",
  );
  clean("tesla", 0, 3);
  const main = target(450),
    secondary = target(570),
    third = target(690);
  target(450, 720);
  target(450, 480);
  g.fire(true);
  assert(
    main.hp < main.maxHp &&
      secondary.hp < secondary.maxHp &&
      third.hp === third.maxHp,
    "tesla B recurses from secondary",
  );
  assert(
    near(main.maxHp - main.hp, (secondary.maxHp - secondary.hp) / 0.35),
    "tesla B damage ratio",
  );
  clean("tesla", 0, 3);
  target(450);
  g.mouse.x = 450;
  g.mouse.right = true;
  const ammo = g.mags[g.weapon];
  for (let i = 0; i < 60; i++) g.update(1 / 60);
  assert(
    g.stats.shots >= 11 && g.mags[g.weapon] === ammo - g.stats.shots,
    "continuous beam finite resource",
  );

  clean("rail", 5);
  target(600);
  g.charge = 0.65;
  g.fire(false);
  advance(12);
  assert(
    g.shots.items.some((s) => s.active && s.kind === "shard") &&
      g.shots.items
        .filter((s) => s.active && s.kind === "shard")
        .every((s) => s.shards === 0),
    "rail A shards/recurse",
  );
  clean("rail", 5, 5);
  const railVictim = target(600);
  g.charge = 1.2;
  g.mags[g.weapon] = 4;
  g.ammo.energy = 0;
  g.fire(true);
  assert(
    g.mags[g.weapon] === 0 &&
      g.shots.items.some((s) => s.active && near(s.damage, 5040)),
    "rail supercharge cost/damage",
  );
  advance(12);
  assert(
    railVictim.hp < railVictim.maxHp &&
      !g.shots.items.some((s) => s.active && s.kind === "shard"),
    "B creates A shards",
  );

  clean("grenade", 5, 5);
  g.fire(true);
  const umbrella = g.shots.items.filter((s) => s.active);
  assert(
    umbrella.length === 15 && g.mags[g.weapon] === 0,
    "grenade umbrella count/resource",
  );
  const radii = umbrella.map((s) => s.range + 25);
  assert(
    radii.filter((r) => near(r, 218)).length === 11 &&
      radii.filter((r) => near(r, 512)).length === 4,
    "umbrella rings",
  );
  clean("grenade", 5);
  g.fire(false);
  assert(
    near(g.cool, 0.32) && X.Armory.mag(X.weapons[g.weapon]) === 15,
    "grenade slow burst",
  );
  clean("rocket", 5, 5);
  g.fire(true);
  assert(
    shotCount() === 7 && g.mags[g.weapon] === 6,
    "rocket simultaneous salvo",
  );
  clean("rocket", 5, 5);
  g.mags[g.weapon] = 1;
  g.ammo.explosive = 0;
  g.fire(true);
  assert(shotCount() === 1 && g.mags[g.weapon] === 0, "partial rocket salvo");
  const turn = [];
  for (const a of [0, 5]) {
    clean("rocket", a);
    target(600, 700);
    g.fire(false);
    const missile = g.shots.items.find((s) => s.active);
    g.projectileStep(1 / 60);
    turn.push(missile.vy);
  }
  assert(turn[1] > turn[0], "homing upgrade ineffective");
  clean("rocket", 5);
  g.fire(false);
  assert(near(g.cool, 0.16), "rocket burst rate");

  clean("rifle");
  g.mags[g.weapon] = 3;
  g.ammo.heavy = 9;
  g.fire(false);
  assert(
    shotCount() === 1 && g.pendingBurst?.remaining === 2 && g.reload === 0,
    "rifle emits simultaneous bullets",
  );
  g.burstStep(0.04);
  assert(shotCount() === 1, "second bullet too soon");
  g.burstStep(0.04);
  assert(shotCount() === 2, "second bullet missing");
  g.burstStep(0.07);
  assert(
    shotCount() === 3 && !g.pendingBurst && g.reload > 0,
    "third bullet/auto reload missing",
  );
  clean("rifle");
  g.ammo.heavy = 6;
  g.fire(false);
  g.switchWeapon(1);
  assert(
    !g.pendingBurst && g.ammo.heavy === 8,
    "burst cancel loses unshot ammo",
  );
  clean("rifle", 0, 0, true);
  g.mags[4] = 3;
  g.ammo.heavy = 9;
  g.fire(false);
  g.checkpoint();
  let profile = X.Save.validate(JSON.parse(JSON.stringify(X.profile)));
  assert(profile.checkpoint.burstState.remaining === 2, "burst checkpoint");
  X.profile = profile;
  g.start(1, profile.checkpoint);
  assert(g.pendingBurst.remaining === 2 && g.reload === 0, "burst restore");
  g.burstStep(0.2);
  assert(!g.pendingBurst && g.reload > 0, "restored burst completion");

  clean("plasma", 5, 5, true);
  g.player.x = 600;
  g.player.y = 600;
  g.player.angle = 0;
  host = target(720);
  g.mags[8] = 4;
  g.ammo.energy = 0;
  g.fire(true);
  bomb = g.shots.items.find((s) => s.active);
  for (let i = 0; i < 60 && !bomb.stuck; i++) g.projectileStep(1 / 60);
  g.addSurface(600, 600, 90, 35, 5, "fire");
  g.checkpoint();
  profile = X.Save.validate(JSON.parse(JSON.stringify(X.profile)));
  assert(
    profile.checkpoint &&
      profile.checkpoint.weaponEffects.shots.length === 1 &&
      profile.checkpoint.weaponEffects.surfaces.length === 1,
    "effects validation",
  );
  const oldBank = JSON.stringify(X.Slots.entries);
  X.Slots.save(0);
  X.profile.upgrades.power = 6;
  X.Slots.restore(0);
  bomb = g.shots.items.find((s) => s.active && s.payload === "sticky");
  assert(
    bomb?.stuck &&
      bomb.host?.spawnId === bomb.hostId &&
      g.surfaces.items.some((o) => o.active),
    "effects slot restore",
  );
  const life = bomb.life,
    poolLife = g.surfaces.items.find((o) => o.active).life;
  g.pause();
  g.update(5);
  assert(
    bomb.life === life &&
      g.surfaces.items.find((o) => o.active).life === poolLife,
    "effects advance paused",
  );
  profile = X.Save.validate(JSON.parse(JSON.stringify(X.profile)));
  delete profile.weaponModesVersion;
  delete profile.checkpoint.weaponEffects;
  delete profile.checkpoint.burstState;
  const legacy = X.Save.validate(profile);
  assert(
    legacy.checkpoint &&
      legacy.weaponMods.plasma === 5 &&
      legacy.checkpoint.weaponEffects.surfaces.length === 0,
    "old effects migration",
  );
  profile.checkpoint.weaponEffects = {
    surfaces: [{ x: Infinity }],
    shots: [{ payload: "sticky", damage: Infinity }],
  };
  assert(
    X.Save.validate(profile).checkpoint.weaponEffects.shots.length === 0,
    "corrupted effects",
  );
  for (const id of Object.keys(X.Armory.definitions).filter(
    (id) => !X.Armory.definitions[id].newModes,
  ))
    for (const level of [0, 5])
      for (const alt of [false, true]) {
        clean(id, level, level);
        g.mags[g.weapon] = id === "flame" && alt ? 20 : 1;
        g.ammo[X.weapons[g.weapon].ammo] = 0;
        g.charge = g.weaponCharge(alt);
        g.fire(alt);
        assert(g.mags[g.weapon] === 0, "last round mode " + id);
        const attacks = g.stats.shots;
        g.fire(alt);
        assert(
          g.stats.shots === attacks && g.reload === 0,
          "finite mode " + id,
        );
      }
  clean("rocket", 5);
  target(700, 700);
  g.fire(false);
  const distantRocket = g.shots.items.find((s) => s.active);
  g.projectileStep(1 / 60);
  assert(distantRocket.vy > 0, "upgraded seeking radius");
  clean("rail", 5, 5);
  g.player.x = 240;
  g.player.y = 408;
  g.player.angle = 0;
  g.map.cells[8 * g.map.w + 7] = 1;
  const wallTarget = target(460, 408);
  g.charge = g.weaponCharge(true);
  g.fire(true);
  advance(20);
  assert(
    wallTarget.hp < wallTarget.maxHp && g.map.blocked(350, 408),
    "supercharge wall penetration",
  );
  X.profile = X.Save.validate(JSON.parse(old));
  X.Slots.entries = bank.entries;
  X.Slots.write();
  X.Save.write(X.profile);
  X.UI.menu();
  return {
    modeWeapons: 7,
    tiersPerBranch: 5,
    independentModes: true,
    magazineGrowth: true,
    shotgunSumPiercing: true,
    napalm: true,
    stickyPlasma: true,
    hostReuseSafe: true,
    teslaNoRecursion: true,
    railShardsAndSupercharge: true,
    grenadeUmbrella: true,
    rocketSalvoHoming: true,
    rifleSequential: true,
    burstRefund: true,
    effectsCheckpointSlots: true,
    pauseAndMigration: true,
    finiteModes: 28,
    upgradedSeekingRadius: true,
    superchargeWalls: true,
  };
};
