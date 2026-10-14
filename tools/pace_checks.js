() => {
  const assert = (value, message) => {
      if (!value) throw Error(message);
    },
    g = X.game,
    old = JSON.stringify(X.profile);
  g.start(1);
  g.update(1 / 60);
  assert(g.wave === 0, "first wave warmup skipped");
  g.waveTimer = 0;
  g.update(1 / 60);
  assert(g.wave === 1 && g.spawnQueue.length > 0, "first wave failed");
  for (const e of g.enemies.items) if (e.active) g.hurtEnemy(e, 1e9, "energy");
  g.spawnTimer = 1;
  g.update(1 / 60);
  assert(g.wave === 1, "wave advanced while spawn queue pending");
  g.spawnQueue = [];
  let survivor = g.spawn(0, g.player.x + 200, g.player.y);
  g.waveTimer = 999;
  g.update(1 / 60);
  assert(g.wave === 1, "wave advanced with survivor");
  g.hurtEnemy(survivor, 1e9, "energy");
  g.update(1 / 60);
  assert(
    g.wave === 2 && g.spawnQueue.length > 0,
    "wave did not advance immediately",
  );
  g.enemies.clear();
  g.spawnQueue = [];
  const carrier = g.spawn(6, g.player.x + 200, g.player.y);
  carrier.special = 0;
  g.enemyStep(carrier, 1 / 60);
  g.hurtEnemy(carrier, 1e9, "energy");
  assert(g.activeEnemies() > 0, "summon test setup");
  g.waveTimer = 999;
  g.update(1 / 60);
  assert(g.wave === 2, "summons ignored");
  for (const e of g.enemies.items) if (e.active) g.hurtEnemy(e, 1e9, "energy");
  g.update(1 / 60);
  assert(g.wave === 3, "summon clear did not advance");
  g.pause();
  g.enemies.clear();
  g.spawnQueue = [];
  let wave = g.wave;
  g.update(1);
  assert(g.wave === wave, "pause advances wave");
  g.start(5);
  g.wave = g.level.waves - 1;
  g.waveTimer = 999;
  g.update(1 / 60);
  assert(g.wave === g.level.waves && g.bossSpawned, "early boss wave missing");
  const boss = g.enemies.items.find((e) => e.active && e.boss);
  assert(boss, "boss not spawned");
  g.spawnQueue = [];
  g.waveTimer = 999;
  g.update(1 / 60);
  assert(!g.ready(), "boss ignored by clear");
  g.hurtEnemy(boss, 1e9, "energy");
  g.update(1 / 60);
  assert(
    g.wave === g.level.waves && g.ready(),
    "final wave overflow or not complete",
  );
  g.start(4);
  g.wave = g.level.waves;
  g.spawnQueue = [];
  g.enemies.clear();
  assert(!g.ready(), "defence terminal not required");
  g.objectives[0].done = true;
  g.defendTime = 0;
  assert(g.ready(), "empty defence wait remains");
  g.coreHp = 0;
  assert(!g.ready(), "destroyed core considered success");
  g.start(1);
  g.wave = 1;
  g.waveTimer = 999;
  g.checkpoint();
  const cp = JSON.parse(JSON.stringify(X.profile.checkpoint));
  g.start(1, cp);
  g.update(1 / 60);
  assert(g.wave === 2, "resume between waves duplicates or skips wave");
  g.start(1);
  g.player.x = 600;
  g.player.y = 600;
  g.player.angle = 0;
  g.weapon = 7;
  g.mags[7] = 140;
  g.hash.clear();
  const target = g.spawn(0, 680, 600);
  target.hp = target.maxHp = 1000;
  g.hash.insert(target);
  g.fire(false);
  for (let i = 0; i < 30; i++) g.projectileStep(1 / 60);
  assert(target.burn > 0, "flamethrower does not ignite");
  const hp = target.hp,
    burn = target.burn;
  g.enemyStep(target, 0.1);
  assert(target.hp < hp && target.burn < burn, "burn damage stopped");
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 160;
  const ctx = canvas.getContext("2d"),
    fire = { ...target, x: 80, y: 110 };
  let qualityFrames = [];
  const seed = g.rng.seed;
  for (let quality = 0; quality < 3; quality++) {
    X.profile.settings.quality = quality;
    const frames = [];
    for (const time of [0, 0.25]) {
      ctx.clearRect(0, 0, 160, 160);
      X.Render.drawBurn(ctx, fire, time);
      frames.push(canvas.toDataURL());
      const pixels = ctx.getImageData(0, 0, 160, 160).data;
      assert(
        pixels.some((n, i) => i % 4 === 3 && n > 128),
        "fire invisible at quality " + quality,
      );
    }
    assert(frames[0] !== frames[1], "fire not animated");
    qualityFrames.push(frames[0]);
  }
  assert(g.rng.seed === seed, "render changes combat RNG");
  assert(
    new Set(qualityFrames).size === 3,
    "quality fire sprites not distinct",
  );
  X.profile = X.Save.validate(JSON.parse(old));
  X.Save.write(X.profile);
  g.start(1);
  return {
    earlyWave: true,
    queuedSpawns: true,
    summons: true,
    boss: true,
    defence: true,
    checkpoint: true,
    burnDamage: true,
    fireQualities: 3,
  };
};
