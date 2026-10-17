() => {
  const g = X.game,
    old = JSON.stringify(X.profile),
    assert = (v, m) => {
      if (!v) throw Error(m);
    };
  const clean = (difficulty = 1, n = 1) => {
    X.profile = X.Save.defaults();
    X.profile.difficulty = difficulty;
    g.start(n);
    g.waveTimer = 9999;
    g.loot = [];
    g.enemies.clear();
    g.shots.clear();
    g.hash.clear();
  };
  const implant = X.upgrades.find((u) => u.id === "secondChance");
  assert(
    implant.price === 10000 && implant.max === 1 && implant.consumable,
    "implant config",
  );
  clean();
  X.profile.credits = 9999;
  assert(
    !X.Economy.upgrade("secondChance") && X.profile.credits === 9999,
    "insufficient funds",
  );
  X.profile.credits = 20000;
  assert(
    X.Economy.upgrade("secondChance") &&
      X.profile.credits === 10000 &&
      X.profile.upgrades.secondChance === 1,
    "buy implant",
  );
  assert(
    !X.Economy.upgrade("secondChance") && X.profile.credits === 10000,
    "duplicate implant purchase",
  );
  g.start(1);
  g.waveTimer = 9999;
  g.loot = [];
  g.player.x = 600;
  g.player.y = 600;
  g.player.invuln = 0;
  const target = g.spawn(0, 660, 600);
  target.hp = target.maxHp = 10000;
  const x = target.x;
  const bullet = g.shot(
    650,
    600,
    Math.PI,
    { damage: 10, speed: 250, range: 800, type: "enemy" },
    true,
  );
  const ammo = JSON.stringify(g.ammo),
    time = g.time;
  g.hurtPlayer(999);
  assert(
    g.state === "play" &&
      g.player.hp === g.player.maxHp &&
      g.player.invuln === 3,
    "revive health/shield",
  );
  assert(
    X.profile.upgrades.secondChance === 0 && g.reviveFX?.life === 2.4,
    "consume/revive effect",
  );
  assert(
    target.x > x && target.stun > 0 && !bullet.active,
    "shockwave push/projectile removal",
  );
  assert(
    JSON.stringify(g.ammo) === ammo &&
      g.time === time &&
      X.profile.stats.deaths === 0,
    "revive changes ammo/time/deaths",
  );
  let saved = X.Save.validate(JSON.parse(localStorage.getItem(X.Save.key)));
  assert(
    saved.upgrades.secondChance === 0 &&
      saved.checkpoint?.player.hp === g.player.maxHp &&
      saved.checkpoint.reviveFX.life === 2.4,
    "revive not immediately saved",
  );
  assert(!X.Economy.upgrade("secondChance"), "buy implant during checkpoint");
  g.hurtPlayer(999);
  assert(g.player.hp === g.player.maxHp, "shield not protecting");
  g.pause();
  const life = g.reviveFX.life;
  g.update(5);
  assert(g.reviveFX.life === life, "effect advances paused");
  g.start(1, saved.checkpoint);
  assert(
    X.profile.upgrades.secondChance === 0 &&
      g.reviveFX.life === 2.4 &&
      g.player.invuln === 3,
    "checkpoint revive restore",
  );
  g.enemies.clear();
  for (let i = 0; i < 181; i++) g.update(1 / 60);
  assert(!g.reviveFX && g.player.invuln === 0, "shield/effect never expire");
  g.hurtPlayer(999);
  g.update(1 / 60);
  assert(
    g.state === "dead" &&
      X.profile.stats.deaths === 1 &&
      X.profile.upgrades.secondChance === 0,
    "second fatal hit revives twice",
  );
  assert(
    X.Economy.upgrade("secondChance") &&
      X.profile.upgrades.secondChance === 1 &&
      X.profile.credits === 0,
    "rebuy after use",
  );
  g.start(2);
  assert(
    X.profile.upgrades.secondChance === 1,
    "unused implant lost at mission start",
  );
  g.stats.damage = 1;
  g.finish(true);
  assert(
    X.profile.upgrades.secondChance === 1,
    "victory consumes unused implant",
  );
  clean(1, 4);
  X.profile.upgrades.secondChance = 1;
  g.earned = 101;
  g.finish(false, "Обороняемый передатчик уничтожен");
  assert(
    X.profile.upgrades.secondChance === 1 &&
      g.state === "dead" &&
      g.creditsAwarded === 50,
    "mission failure consumes implant",
  );
  clean();
  const legacy = X.Save.defaults();
  delete legacy.upgrades.secondChance;
  assert(X.Save.validate(legacy).upgrades.secondChance === 0, "legacy implant");
  for (const bad of [-1, "yes", 999]) {
    const profile = X.Save.defaults();
    profile.upgrades.secondChance = bad;
    assert(
      [0, 1].includes(X.Save.validate(profile).upgrades.secondChance),
      "invalid implant count",
    );
  }
  const matrix = [];
  for (let d = 0; d < 4; d++) {
    clean(d);
    g.stats.damage = 1;
    g.stats.bladeKills = 99;
    g.creditReward(101);
    const gross = g.earned,
      before = X.profile.credits,
      inventory = JSON.stringify(X.profile.ammo);
    g.finish(false);
    assert(
      g.creditsAwarded === Math.floor(gross * 0.5) &&
        X.profile.credits === before + Math.floor(gross * 0.5),
      "loss half multiplier " + d,
    );
    assert(
      g.earned === gross &&
        JSON.stringify(X.profile.ammo) === inventory &&
        !X.profile.completed.length,
      "loss changes gross/inventory/progress",
    );
    assert(!g.scoreResult?.points, "loss awards score");
    const paid = X.profile.credits;
    g.finish(false);
    assert(X.profile.credits === paid, "double defeat payment");
    matrix.push({
      factor: X.difficulties[d].economy,
      gross,
      paid: g.creditsAwarded,
    });
  }
  clean();
  X.profile.credits = 1e8 - 1;
  g.earned = 100;
  g.finish(false);
  assert(X.profile.credits === 1e8, "credit cap");
  clean();
  g.earned = 0;
  const zero = X.profile.credits;
  g.finish(false);
  assert(
    g.creditsAwarded === 0 && X.profile.credits === zero,
    "empty loss payout",
  );
  clean();
  g.player.hp = 0;
  g.loot = [{ x: g.player.x, y: g.player.y, kind: "health", amount: 1 }];
  g.lootStep();
  assert(g.player.hp === 0 && g.loot.length === 1, "medkit revives corpse");
  const stored = localStorage.getItem(X.Save.key),
    original = JSON.stringify(X.profile);
  g.state = "menu";
  X.Debug.enter();
  X.Debug.code("MAXPLAYER");
  g.start(0);
  g.player.invuln = 0;
  g.hurtPlayer(9999);
  assert(
    X.profile.upgrades.secondChance === 0 &&
      g.player.hp === 250 &&
      localStorage.getItem(X.Save.key) === stored,
    "sandbox revive leaks save",
  );
  X.UI.menu();
  assert(
    JSON.stringify(X.profile) === original,
    "sandbox revive leaks profile",
  );
  X.profile = X.Save.validate(JSON.parse(old));
  X.Save.write(X.profile);
  X.UI.menu();
  return {
    purchaseAndCap: true,
    consumableRebuy: true,
    reviveHealthShield: true,
    shockwave: true,
    spentCheckpoint: true,
    restore: true,
    onceOnly: true,
    pause: true,
    missionFailureNoRevive: true,
    legacy: true,
    halfRewardMatrix: matrix,
    noVictoryBonusOnLoss: true,
    noDoublePayout: true,
    creditCap: true,
    corpseNoMedkit: true,
    sandboxIsolated: true,
  };
};
