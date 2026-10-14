async () => {
  const assert = (value, message) => {
      if (!value) throw Error(message);
    },
    g = X.game,
    original = X.Save.validate(JSON.parse(JSON.stringify(X.profile)));
  X.profile = X.Save.defaults();
  X.Save.write(X.profile);
  g.start(1);
  g.waveTimer = 999;
  assert(
    getComputedStyle(X.Render.canvas).cursor === "none",
    "game cursor visible",
  );
  g.mags[1] = 10;
  g.ammo.light = 134;
  assert(g.ammoStatus().text === "10/144", "total ammo convention");
  const ctx = X.Render.ctx,
    text = [],
    fill = ctx.fillText,
    arcs = [],
    arc = ctx.arc;
  ctx.fillText = function (t, ...args) {
    text.push(t);
    return fill.call(this, t, ...args);
  };
  ctx.arc = function (...args) {
    arcs.push(args);
    return arc.apply(this, args);
  };
  g.beginReload();
  const total = g.reloadTotal;
  g.update(0.25);
  X.Render.crosshair(ctx, g);
  assert(
    text.includes("10/144") && text.includes("ПЕРЕЗАРЯДКА"),
    "crosshair information",
  );
  assert(
    arcs.some((a) => a[2] === 20 && a[4] > a[3]) && g.reload < total,
    "reload arc",
  );
  ctx.fillText = fill;
  ctx.arc = arc;
  g.pause();
  assert(
    getComputedStyle(X.Render.canvas).cursor !== "none",
    "pause cursor missing",
  );
  X.profile.checkpoint = null;
  X.UI.shop();
  assert(
    !X.UI.overlay.textContent.includes(X.weapons[3].name) &&
      !X.UI.overlay.textContent.includes(X.weapons[12].name),
    "locked gun leaked",
  );
  assert(
    X.UI.overlay.textContent.includes(X.weapons[2].name),
    "available gun hidden",
  );
  assert(
    X.UI.overlay.querySelectorAll("canvas[data-ammo]").length === 6,
    "shop ammo icons",
  );
  X.profile.owned = [0, 1, 3];
  X.profile.ammo.shell = 30;
  g.start(1);
  g.waveTimer = 999;
  g.loot = [];
  g.addAmmoLoot(700, 600);
  assert(
    new Set(g.loot.map((l) => l.ammoType)).size === 2,
    "typed supply unpacking",
  );
  const beforeLight = g.ammo.light,
    beforeShell = g.ammo.shell;
  g.loot = [
    {
      x: g.player.x,
      y: g.player.y,
      kind: "ammo",
      ammoType: "shell",
      amount: 1,
    },
  ];
  g.lootStep();
  assert(
    g.ammo.light === beforeLight && g.ammo.shell === beforeShell + 7,
    "shell pickup changes wrong reserve",
  );
  g.loot = [{ x: g.player.x, y: g.player.y, kind: "ammo", amount: 1 }];
  const oldCheckpoint = g.snapshot();
  g.start(1, oldCheckpoint);
  assert(
    g.loot.every((l) => l.ammoType) && g.loot.length === 2,
    "legacy loot migration",
  );
  const icons = new Set();
  for (const a in X.ammo) {
    const c = document.createElement("canvas");
    c.width = c.height = 44;
    X.Loot.drawIcon(c.getContext("2d"), 22, 22, a);
    icons.add(c.toDataURL());
  }
  assert(icons.size === 6, "identical ammo icons");
  const oldSettings = { ...X.Save.defaults(), settings: {} };
  assert(
    X.Save.validate(oldSettings).settings.musicEnabled === true,
    "old music setting migration",
  );
  g.pause();
  X.Save.write(X.profile);
  const persisted = localStorage.getItem(X.Save.key),
    campaign = JSON.stringify(X.profile);
  X.UI.action("debug");
  assert(
    X.Debug.active &&
      X.UI.overlay.querySelectorAll('[data-act^="testLevel:"]').length === 20,
    "test selector",
  );
  let credits = X.profile.credits;
  X.Debug.code("credits");
  assert(X.profile.credits === credits + 10000, "credit code");
  X.Debug.code("ARSENAL");
  assert(X.profile.owned.length === 13, "arsenal code");
  g.start(20);
  g.waveTimer = 999;
  g.player.invuln = 0;
  X.Debug.code("GOD");
  const hp = g.player.hp,
    armor = g.player.armor;
  g.hurtPlayer(1000);
  assert(g.player.hp === hp && g.player.armor === armor, "god code");
  X.Debug.code("GOD");
  g.hurtPlayer(10);
  assert(g.player.hp < hp, "god cannot turn off");
  X.Debug.code("AMMO");
  g.weapon = 1;
  g.mags[1] = 0;
  g.ammo.light = 0;
  g.beginReload();
  assert(g.reload > 0, "infinite ammo bypasses magazine reload");
  g.reload = 0.001;
  g.update(1 / 60);
  assert(g.mags[1] === 14 && g.ammo.light === 0, "infinite reserve reload");
  X.Debug.code("NORELOAD");
  let shots = g.stats.shots;
  for (let i = 0; i < 80; i++) g.fire(false);
  assert(
    g.stats.shots === shots + 80 && g.reload === 0 && g.ammo.light === 0,
    "combined ammo/no reload codes",
  );
  X.Debug.code("AMMO");
  g.mags[1] = 0;
  g.ammo.light = 4;
  g.beginReload();
  assert(
    g.mags[1] === 4 && g.ammo.light === 0,
    "no reload still spends finite ammo",
  );
  for (let i = 0; i < 6; i++) g.fire(false);
  assert(g.mags[1] === 0, "finite ammo negative");
  g.checkpoint();
  X.Save.write(X.profile);
  g.finish(true);
  assert(
    localStorage.getItem(X.Save.key) === persisted,
    "sandbox overwrote campaign storage",
  );
  X.UI.menu();
  assert(
    JSON.stringify(X.profile) === campaign &&
      !X.Debug.active &&
      !X.Debug.enabled("god"),
    "sandbox profile restoration",
  );
  X.profile = original;
  X.Save.warning = "";
  X.Save.write(X.profile);
  g.start(1);
  g.pause();
  X.Audio.start();
  await X.Audio.ctx.resume();
  X.profile.settings.musicEnabled = true;
  X.profile.settings.mute = false;
  X.Audio.settings();
  const scheduled = X.Music.scheduled;
  await new Promise((r) => setTimeout(r, 450));
  assert(X.Music.scheduled > scheduled, "music scheduler silent");
  X.UI.action("toggleMusic");
  await new Promise((r) => setTimeout(r, 450));
  assert(
    !X.profile.settings.musicEnabled && X.Music.output.gain.value < 0.001,
    "music off",
  );
  X.UI.action("toggleMusic");
  X.UI.action("toggleMute");
  await new Promise((r) => setTimeout(r, 450));
  assert(
    X.profile.settings.mute &&
      X.Audio.effects.gain.value < 0.001 &&
      X.Audio.ambient.gain.value < 0.001 &&
      X.Music.output.gain.value < 0.001,
    "master mute buses " +
      JSON.stringify({
        mute: X.profile.settings.mute,
        effects: X.Audio.effects.gain.value,
        ambient: X.Audio.ambient.gain.value,
        music: X.Music.output.gain.value,
      }),
  );
  X.UI.action("toggleMute");
  const offline = new OfflineAudioContext(1, 44100 * 3, 44100),
    music = {
      ...X.Music,
      ctx: offline,
      voices: 0,
      scheduled: 0,
      rng: new X.RNG(123),
    };
  music.output = offline.createGain();
  music.output.gain.value = 0.4;
  music.output.connect(offline.destination);
  for (let i = 0; i < 16; i++)
    music.scheduleStep(0.05 + (i * 60) / 104 / 4, i, 0.8);
  const buffer = await offline.startRendering(),
    samples = buffer.getChannelData(0);
  let square = 0,
    peak = 0;
  for (const n of samples) {
    assert(Number.isFinite(n), "music non finite sample");
    square += n * n;
    peak = Math.max(peak, Math.abs(n));
  }
  const rms = Math.sqrt(square / samples.length);
  assert(
    rms > 0.001 && peak > 0.005 && peak < 1,
    "generated music waveform invalid",
  );
  X.profile = original;
  X.Save.write(X.profile);
  X.Audio.settings();
  X.UI.menu();
  return {
    cursor: true,
    crosshairReload: true,
    typedAmmoIcons: 6,
    cheatCodes: 5,
    testMaps: 20,
    profileIsolated: true,
    musicRMS: +rms.toFixed(5),
    musicPeak: +peak.toFixed(4),
  };
};
