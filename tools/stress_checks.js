() => {
  const g = X.game,
    old = JSON.stringify(X.profile),
    assert = (v, m) => {
      if (!v) throw Error(m);
    };
  X.profile.owned = X.weapons.map((w, i) => i);
  X.profile.ammo.energy = 99999;
  X.profile.settings.quality = 2;
  X.profile.settings.mute = true;
  g.start(20);
  g.player.x = 1200;
  g.player.y = 900;
  g.player.invuln = 99999;
  g.wave = g.level.waves;
  g.waveTimer = 99999;
  const rng = new X.RNG(971);
  let attempts = 0;
  while (g.activeEnemies() < 220 && attempts++ < 3000) {
    let x = 650 + rng.next() * 1100,
      y = 400 + rng.next() * 1000;
    if (
      g.map.fits(x, y, 34) &&
      Math.hypot(x - g.player.x, y - g.player.y) > 180
    )
      g.spawn(attempts % 10, x, y, attempts % 6 === 0);
  }
  assert(g.activeEnemies() === 220, "stress setup");
  g.weapon = 8;
  g.mouse.left = true;
  g.mouse.x = 900;
  g.mouse.y = 320;
  const samples = [],
    before = performance.memory?.usedJSHeapSize || 0;
  for (let i = 0; i < 900; i++) {
    const t = performance.now();
    g.update(1 / 60);
    X.Render.draw(g, 1 / 60);
    samples.push(performance.now() - t);
  }
  samples.sort((a, b) => a - b);
  assert(g.state === "play", "stress state");
  assert(g.activeEnemies() <= X.C.maxEnemies, "enemy cap");
  for (const o of [
    g.player,
    ...g.enemies.items.filter((e) => e.active),
    ...g.shots.items.filter((s) => s.active),
  ])
    assert(Number.isFinite(o.x) && Number.isFinite(o.y), "non finite entity");
  const result = {
    frames: 900,
    simulatedSeconds: 15,
    startedEnemies: 220,
    endingEnemies: g.activeEnemies(),
    meanMs: +(samples.reduce((a, b) => a + b, 0) / samples.length).toFixed(2),
    p95Ms: +samples[Math.floor(samples.length * 0.95)].toFixed(2),
    maxMs: +samples.at(-1).toFixed(2),
    heapBefore: before,
    heapAfter: performance.memory?.usedJSHeapSize || 0,
    particles: g.particles.items.filter((o) => o.active).length,
  };
  g.mouse.left = false;
  g.checkpoint();
  assert(
    X.Save.validate(JSON.parse(JSON.stringify(X.profile))).checkpoint,
    "stress checkpoint",
  );
  // Качество графики не меняет random-поток боя и лут.
  let seeds = [];
  for (let quality = 0; quality < 3; quality++) {
    X.profile.settings.quality = quality;
    g.start(1);
    for (let i = 0; i < 100; i++) g.fx(500, 500, "#fff", 20, 100);
    seeds.push(g.rng.seed);
  }
  assert(new Set(seeds).size === 1, "graphics changes gameplay RNG");
  X.profile = X.Save.validate(JSON.parse(old));
  X.Save.write(X.profile);
  g.start(1);
  return result;
};
