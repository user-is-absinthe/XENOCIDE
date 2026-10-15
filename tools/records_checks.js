() => {
  const assert = (v, m) => {
      if (!v) throw Error(m);
    },
    g = X.game,
    old = JSON.stringify(X.profile),
    S = X.Scoring;
  X.profile = X.Save.defaults();
  g.start(1);
  g.loot = [
    { x: g.player.x, y: g.player.y, kind: "health", amount: 1 },
    { x: g.player.x, y: g.player.y, kind: "health", amount: 1 },
    {
      x: g.player.x,
      y: g.player.y,
      kind: "ammo",
      ammoType: "light",
      amount: 1,
    },
  ];
  const ammo = g.ammo.light;
  g.lootStep();
  assert(
    g.loot.length === 2 && g.player.hp === 100 && g.ammo.light === ammo + 27,
    "full health consumes medkit or blocks ammo",
  );
  g.player.hp = 95;
  g.lootStep();
  assert(
    g.player.hp === 100 && g.loot.length === 1,
    "extra medkit consumed after healing",
  );
  g.lootStep();
  assert(g.loot.length === 1, "full health consumes remaining medkit");
  g.checkpoint();
  const cp = JSON.parse(JSON.stringify(X.profile.checkpoint));
  g.start(1, cp);
  g.lootStep();
  assert(g.loot.length === 1, "medkit lost after resume");
  g.player.hp = 50;
  g.lootStep();
  assert(
    g.player.hp === 80 && g.loot.length === 0,
    "injured player cannot collect medkit",
  );
  assert(
    S.points(1, 60, 1) > S.points(1, 120, 1) &&
      S.points(1, 120, 1) > S.points(1, 240, 1) &&
      S.points(1, 1e6, 1) > 0,
    "speed score not monotonic/positive",
  );
  X.profile = X.Save.defaults();
  X.profile.records.name = 'Тест <img src=x> "А"';
  const win = (n, time, difficulty = 1, pace = 1) => {
    X.profile.difficulty = difficulty;
    X.profile.settings.pace = pace;
    g.start(n);
    g.time = time;
    g.finish(true);
  };
  win(1, 120);
  assert(
    X.profile.records.levels[1].length === 1 &&
      g.scoreResult.points === S.points(1, 120, 1) &&
      X.profile.campaignRun.next === 2,
    "first score record",
  );
  const serial = X.profile.records.serial;
  g.finish(true);
  assert(X.profile.records.serial === serial, "duplicate finish records");
  const firstPoints = X.profile.campaignRun.points;
  g.start(2);
  g.time = 45;
  g.finish(false);
  assert(
    !X.profile.records.levels[2] &&
      X.profile.campaignRun.points === firstPoints &&
      X.profile.campaignRun.time === 165,
    "failure score/time",
  );
  win(1, 60);
  assert(
    X.profile.records.levels[1][0].time === 60 &&
      X.profile.campaignRun.next === 2 &&
      X.profile.campaignRun.points === firstPoints,
    "replay duplicates campaign score",
  );
  win(20, 5);
  assert(
    !X.profile.records.campaigns.length && X.profile.campaignRun.next === 2,
    "out of order campaign completion",
  );
  let expected = firstPoints,
    expectedTime = 230;
  for (let n = 2; n <= 20; n++) {
    const difficulty = n === 10 ? 2 : 1,
      time = 100 + n;
    expected += S.points(n, time, difficulty);
    expectedTime += time;
    win(n, time, difficulty);
  }
  assert(
    X.profile.records.campaigns.length === 1 && !X.profile.campaignRun,
    "complete campaign not recorded",
  );
  const campaign = X.profile.records.campaigns[0];
  assert(
    campaign.points === expected &&
      campaign.time === expectedTime &&
      campaign.difficulty === 4,
    "campaign sum/time/mixed conditions",
  );
  for (let i = 0; i < 15; i++) win(3, 30 + i);
  assert(
    X.profile.records.levels[3].length === 10 &&
      X.profile.records.levels[3][0].time === 30,
    "top ten prune/order",
  );
  for (let i = 0; i < 12; i++) win(3, 60 + i, 0);
  assert(
    S.rows("levels", 3, 0, 1).length === 10 &&
      S.rows("levels", 3, 1, 1).length === 10,
    "difficulty categories discarded",
  );
  win(3, 35, 1, 0.55);
  assert(S.rows("levels", 3, 1, 0.55).length === 1, "pace filter");
  X.Save.write(X.profile);
  const bank = JSON.stringify(X.profile.records),
    stored = localStorage.getItem(X.Save.key);
  X.Debug.enter();
  g.start(1);
  g.time = 1;
  g.finish(true);
  assert(
    g.scoreResult.test && localStorage.getItem(X.Save.key) === stored,
    "sandbox scores leak",
  );
  X.UI.menu();
  assert(
    JSON.stringify(X.profile.records) === bank,
    "sandbox alters leaderboard",
  );
  X.UI.action("begin");
  assert(
    JSON.stringify(X.profile.records) === bank &&
      X.profile.campaignRun.next === 1 &&
      X.profile.campaignRun.points === 0,
    "new campaign deletes records or keeps old score",
  );
  g.pause();
  const clock = g.time,
    points = S.points(1, g.time, g.difficulty);
  g.update(1);
  assert(
    g.time === clock && S.points(1, g.time, g.difficulty) === points,
    "pause penalizes score",
  );
  const roundtrip = X.Save.validate(JSON.parse(JSON.stringify(X.profile)));
  assert(
    JSON.stringify(roundtrip.records) === bank &&
      roundtrip.campaignRun.next === 1,
    "JSON record/run roundtrip",
  );
  const legacy = X.Save.defaults();
  delete legacy.records;
  delete legacy.campaignRun;
  const migrated = X.Save.validate(legacy);
  assert(
    !Object.keys(migrated.records.levels).length && !migrated.campaignRun,
    "old save migration",
  );
  legacy.records = {
    version: 1,
    name: "x".repeat(100),
    levels: { 1: [{ points: Infinity, time: -1 }] },
    campaigns: [null],
  };
  legacy.campaignRun = { legs: [{ level: 7 }], time: 0, startedAt: 1 };
  legacy.credits = 777;
  const safe = X.Save.validate(legacy);
  assert(
    safe.credits === 777 &&
      safe.records.name.length === 32 &&
      !Object.keys(safe.records.levels).length &&
      !safe.campaignRun,
    "corrupted ranking damages profile",
  );
  legacy.records.serial = Number.MAX_SAFE_INTEGER;
  assert(
    X.Save.validate(legacy).records.serial === 0,
    "unsafe serial increment",
  );
  X.UI.action("doreset");
  assert(
    !Object.keys(X.profile.records.levels).length &&
      !X.profile.records.campaigns.length &&
      !X.profile.campaignRun,
    "full reset keeps records",
  );
  X.profile = X.Save.validate(JSON.parse(old));
  X.Save.write(X.profile);
  g.start(1);
  X.UI.menu();
  return {
    healthPickup: true,
    scoreMonotonic: true,
    top10: true,
    filters: true,
    campaignSum: expected,
    campaignTime: expectedTime,
    mixedConditions: true,
    noDuplicates: true,
    sandboxExcluded: true,
    newCampaignKeepsRecords: true,
    jsonMigration: true,
  };
};
