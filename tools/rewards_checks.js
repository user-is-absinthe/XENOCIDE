() => {
  const g = X.game,
    old = JSON.stringify(X.profile),
    assert = (v, m) => {
      if (!v) throw Error(m);
    },
    factors = [0.8, 1, 1.5, 2.5],
    report = [];
  const clean = (difficulty, n = 1) => {
    X.profile = X.Save.defaults();
    X.profile.difficulty = difficulty;
    g.start(n);
    g.waveTimer = 9999;
    g.player.invuln = 999;
  };
  for (let difficulty = 0; difficulty < 4; difficulty++) {
    const factor = factors[difficulty];
    clean(difficulty);
    assert(g.diff.economy === factor, "factor " + difficulty);
    assert(
      g.creditReward(1000) === 1000 * factor && g.earned === 1000 * factor,
      "base payout " + difficulty,
    );
    g.earned = 0;
    let e = g.spawn(0, 720, 600);
    g.kill(e);
    const kill = Math.round(X.enemies[0].credit * factor);
    assert(g.earned === kill, "kill multiplier");
    e = g.spawn(0, 720, 600, true);
    g.kill(e);
    assert(
      g.earned === kill + Math.round(X.enemies[0].credit * 1.8 * factor),
      "elite multiplier",
    );
    clean(difficulty, 4);
    const o = g.objectives[0];
    g.player.x = o.x + 50;
    g.player.y = o.y;
    g.interact(2);
    assert(o.done && g.earned === Math.round(150 * factor), "terminal reward");
    clean(difficulty);
    g.weapon = 0;
    g.player.x = 600;
    g.player.y = 600;
    g.player.angle = 0;
    g.objectives = [{ kind: "nest", x: 660, y: 600, hp: 1, done: false }];
    g.fire(false);
    assert(
      g.objectives[0].done && g.earned === Math.round(200 * factor),
      "nest reward",
    );
    clean(difficulty);
    g.stats.damage = 1;
    const before = X.profile.credits;
    g.finish(true);
    const completion = Math.round(435 * factor);
    assert(
      g.earned === completion && X.profile.credits === before + completion,
      "mission completion",
    );
    const awarded = X.profile.credits;
    g.finish(true);
    assert(X.profile.credits === awarded, "duplicate completion");
    clean(difficulty);
    g.stats.bladeKills = 20;
    g.finish(true);
    assert(
      g.earned ===
        completion + Math.round(300 * factor) + Math.round(250 * factor),
      "medal rewards",
    );
    assert(
      g.medals.some((s) => s.endsWith("+" + Math.round(300 * factor))) &&
        g.medals.some((s) => s.endsWith("+" + Math.round(250 * factor))),
      "medal labels",
    );
    clean(difficulty, 21);
    g.stats.damage = 1;
    g.finish(true);
    assert(
      g.earned === Math.round((350 + 20 * 85 + 170) * factor),
      "endless completion",
    );
    clean(difficulty);
    g.creditReward(137);
    g.checkpoint();
    let p = X.Save.validate(JSON.parse(JSON.stringify(X.profile)));
    const earned = g.earned;
    X.profile = p;
    g.start(1, p.checkpoint);
    assert(g.earned === earned, "checkpoint rescaled");
    g.stats.damage = 1;
    g.finish(true);
    assert(g.earned === earned + completion, "checkpoint double multiplier");
    clean(difficulty);
    g.creditReward(1000);
    const credits = X.profile.credits;
    g.finish(false);
    assert(X.profile.credits === credits, "defeat pays reward");
    report.push({
      difficulty: X.difficulties[difficulty].name,
      factor,
      kill,
      completion,
    });
  }
  X.profile = X.Save.validate(JSON.parse(old));
  X.Save.write(X.profile);
  g.state = "menu";
  X.UI.menu();
  return {
    factors: report,
    terminals: true,
    nests: true,
    medals: true,
    endless: true,
    checkpoint: true,
    defeat: true,
    noDuplicatePayout: true,
  };
};
