() => {
  const g = X.game,
    old = JSON.stringify(X.profile),
    bank = X.Slots.exportData(),
    S = X.Slots,
    assert = (v, m) => {
      if (!v) throw Error(m);
    };
  const clean = () => {
    X.profile = X.Save.defaults();
    X.profile.owned = X.weapons.map((_, i) => i);
    X.profile.unlocked = 20;
    for (const a in X.ammo) X.profile.ammo[a] = 1000;
    g.start(1);
    g.waveTimer = 9999;
    g.loot = [];
  };
  const reloads = [];
  for (let i = 1; i < 13; i++) {
    clean();
    g.weapon = i;
    g.mags[i] = X.weapons[i].burst || 1;
    g.charge = 1;
    const reserve = g.ammo[X.weapons[i].ammo];
    g.fire(false);
    if (i === 4) g.burstStep(0.2);
    assert(
      g.mags[i] === 0 && g.reload > 0 && g.charge === 0,
      "last shot does not auto reload " + i,
    );
    if (i === 10)
      assert(
        g.shots.items.some((s) => s.active && s.wallPierce),
        "last charged rail loses wall penetration",
      );
    const timer = g.reload;
    g.mouse.left = g.mouse.right = false;
    g.update(1 / 60);
    assert(g.reload < timer && g.reload > 0, "reload requires input " + i);
    for (let t = 0; t < 220 && g.reload > 0; t++) g.update(1 / 60);
    assert(g.mags[i] === X.weapons[i].mag, "automatic refill " + i);
    assert(
      g.ammo[X.weapons[i].ammo] === reserve - X.weapons[i].mag,
      "automatic reload reserve cost " + i,
    );
    reloads.push(X.weapons[i].id);
  }
  clean();
  g.weapon = 10;
  g.mags[10] = 0;
  g.reload = 0;
  g.charge = 0.5;
  g.mouse.left = true;
  g.update(1 / 60);
  assert(
    g.reload > 0 && g.charge === 0 && g.stats.shots === 0,
    "empty rail charges instead of reloading",
  );
  g.reload = 0;
  g.charge = 0.5;
  g.beginReload();
  assert(g.reload > 0 && g.charge === 0, "manual R empty rail");
  clean();
  g.weapon = 10;
  g.mags[10] = 0;
  g.ammo.energy = 0;
  g.mouse.left = true;
  for (let t = 0; t < 120; t++) g.update(1 / 60);
  assert(
    g.reload === 0 && g.charge === 0 && g.stats.shots === 0,
    "empty reserve rail charges/fires",
  );
  g.loot = [
    {
      x: g.player.x,
      y: g.player.y,
      kind: "ammo",
      ammoType: "energy",
      amount: 1,
    },
  ];
  g.update(1 / 60);
  g.mouse.left = false;
  g.update(1 / 60);
  assert(g.reload > 0, "ammo pickup fails to start auto reload");
  clean();
  g.mags[10] = 0;
  g.charge = 0.5;
  g.switchWeapon(10);
  assert(g.reload > 0 && g.charge === 0, "switch to empty rail");
  clean();
  const legacy = JSON.parse(JSON.stringify(X.profile));
  legacy.checkpoint = g.snapshot();
  delete legacy.resumeMode;
  delete legacy.checkpoint.weaponState;
  const migrated = X.Save.validate(legacy);
  assert(
    migrated.resumeMode === "campaign" &&
      migrated.checkpoint.weaponState.reload === 0,
    "legacy weapon timers migration",
  );
  g.start(1, migrated.checkpoint);
  assert(g.reload === 0 && g.charge === 0, "legacy checkpoint restore");

  clean();
  S.entries = [null, null, null];
  X.profile.credits = 10000;
  X.profile.upgrades.dashCharges = 3;
  X.profile.weaponTuning.rail = 2;
  g.start(3);
  g.waveTimer = 999;
  g.time = 47;
  g.player.hp = 66;
  g.weapon = 10;
  g.mags[10] = 2;
  g.reload = 1.5;
  g.reloadTotal = 3;
  g.cool = 0.2;
  g.pause();
  assert(S.save(0), "campaign slot save");
  const first = JSON.stringify(S.entries[0]);
  X.profile.credits = 77;
  X.profile.upgrades.dashCharges = 0;
  g.player.hp = 22;
  X.Save.write(X.profile);
  assert(JSON.stringify(S.entries[0]) === first, "autosave mutates slot");
  X.profile.endless.manualUnlock = X.profile.endless.unlocked = true;
  X.profile.endless.stage = 27;
  X.profile.endless.seed = 999;
  X.profile.credits = 4567;
  X.profile.upgrades.stamina = 5;
  g.start(27);
  g.player.hp = 88;
  g.pause();
  assert(S.save(1), "endless slot save");
  X.profile.checkpoint = null;
  X.profile.resumeMode = "campaign";
  X.profile.level = 5;
  X.profile.credits = 900;
  g.state = "menu";
  assert(S.save(2), "between-mission slot");
  const all = JSON.stringify(S.entries);
  assert(
    S.restore(0) &&
      g.number === 3 &&
      g.player.hp === 66 &&
      X.profile.credits === 10000 &&
      g.reload === 1.5 &&
      g.mags[10] === 2,
    "campaign slot restore",
  );
  assert(
    X.profile.upgrades.dashCharges === 3 && X.profile.weaponTuning.rail === 2,
    "slot build restore",
  );
  g.player.hp = 1;
  X.profile.credits = 0;
  X.Save.write(X.profile);
  assert(
    JSON.stringify(S.entries) === all,
    "playing loaded slot changes snapshots",
  );
  assert(
    S.restore(1) &&
      g.number === 27 &&
      g.player.hp === 88 &&
      X.profile.endless.seed === 999 &&
      X.profile.resumeMode === "endless",
    "endless slot restore",
  );
  assert(
    S.restore(2) &&
      X.UI.next === 5 &&
      g.state === "menu" &&
      X.profile.credits === 900,
    "between-mission slot restore",
  );
  assert(JSON.stringify(S.entries) === all, "loading changes bank");
  X.UI.action("begin");
  assert(JSON.stringify(S.entries) === all, "new campaign deletes slots");
  const corrupt = S.exportData();
  corrupt.entries[1].profile = { version: 99 };
  const validated = S.validate(corrupt);
  assert(
    validated.valid &&
      validated.damaged.includes(2) &&
      validated.entries[0] &&
      validated.entries[2],
    "corrupt slot destroys bank",
  );
  S.importData(corrupt);
  assert(
    JSON.stringify(S.entries) === all,
    "corrupt imported slot overwrites good copy",
  );
  const root = JSON.stringify(X.profile);
  S.importData({ version: 777 });
  assert(
    JSON.stringify(X.profile) === root && JSON.stringify(S.entries) === all,
    "bad bank damages live data",
  );
  const set = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k, v) {
    if (k === S.key) throw Error("quota");
    return set.call(this, k, v);
  };
  assert(
    S.save(2) && !S.available && S.notice.includes("памяти"),
    "slot storage fallback",
  );
  Storage.prototype.setItem = set;
  S.write();
  assert(S.available, "slot storage recovery");
  X.profile.credits = 999;
  X.profile.upgrades.power = 6;
  X.profile.weaponMods.rail = 3;
  X.profile.weaponTuning.rail = 3;
  g.pause();
  X.Save.write(X.profile);
  const profileBefore = JSON.stringify(X.profile),
    slotsBefore = JSON.stringify(S.entries),
    stored = localStorage.getItem(X.Save.key),
    slotsStored = localStorage.getItem(S.key);
  X.Debug.enter();
  assert(
    X.profile.credits === 500000 &&
      Object.values(X.profile.upgrades).every((n) => n === 0) &&
      !Object.keys(X.profile.weaponMods).length &&
      !Object.keys(X.profile.weaponTuning).length,
    "sandbox inherits upgrades/budget",
  );
  assert(
    !S.save(0) && !S.restore(0) && !S.importData(bank),
    "sandbox accesses slots",
  );
  S.clear();
  X.UI.action("testArena");
  assert(X.UI.next === 0, "arena briefing");
  X.UI.action("deploy");
  assert(
    g.number === 0 &&
      X.levels.length === 20 &&
      g.level.name === "Открытая арена",
    "arena changes campaign",
  );
  for (let y = 0; y < g.map.h; y++)
    for (let x = 0; x < g.map.w; x++)
      assert(
        g.map.cells[y * g.map.w + x] ===
          (x === 0 || y === 0 || x === g.map.w - 1 || y === g.map.h - 1
            ? 1
            : 0),
        "internal wall in arena",
      );
  assert(
    g.map.field[g.map.index(g.exit.x, g.exit.y)] >= 0,
    "arena exit unreachable",
  );
  X.profile.upgrades.power = 1;
  X.UI.action("debug");
  assert(
    X.profile.upgrades.power === 1,
    "opening cheat menu resets current experiment",
  );
  X.Debug.code("BARRAGE");
  g.reload = 0;
  g.fire(false);
  assert(g.reload === 0, "infinite weapon auto reloads");
  X.UI.menu();
  assert(
    JSON.stringify(X.profile) === profileBefore &&
      JSON.stringify(S.entries) === slotsBefore &&
      localStorage.getItem(X.Save.key) === stored &&
      localStorage.getItem(S.key) === slotsStored,
    "sandbox leaks data",
  );
  X.Debug.enter();
  assert(
    X.profile.credits === 500000 &&
      Object.values(X.profile.upgrades).every((n) => n === 0),
    "second sandbox entry not fresh",
  );
  X.UI.menu();
  X.UI.action("doreset");
  assert(
    S.entries.every((e) => e === null),
    "full reset retains slots",
  );
  X.profile = X.Save.validate(JSON.parse(old));
  S.entries = bank.entries;
  S.write();
  X.Save.write(X.profile);
  X.UI.menu();
  return {
    automaticReloads: reloads,
    emptyRail: true,
    lastRailWallPierce: true,
    slots: 3,
    campaignAndEndless: true,
    immutableSnapshots: true,
    reloadState: true,
    legacyCheckpoint: true,
    newCampaignKeepsSlots: true,
    corruptSlotRecovery: true,
    storageFallback: true,
    arenaOpen: true,
    sandboxBudget: 500000,
    sandboxZeroUpgrades: true,
    sandboxIsolated: true,
  };
};
