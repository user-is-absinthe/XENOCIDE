() => {
  const assert = (v, m) => {
    if (!v) throw Error(m);
  };
  const g = X.game,
    original = JSON.stringify(X.profile);
  X.profile.owned = X.weapons.map((w, i) => i);
  const clean = () => {
    g.start(1);
    g.enemies.clear();
    g.shots.clear();
    g.hash.clear();
    g.waveTimer = 9999;
    g.player.x = 600;
    g.player.y = 600;
    g.player.angle = 0;
    g.mouse.x = 900;
    g.mouse.y = 324;
  };
  const target = (x = 720, y = 600, hp = 10000) => {
    let e = g.spawn(0, x, y);
    e.hp = e.maxHp = hp;
    g.hash.insert(e);
    return e;
  };
  let reports = [];
  for (let i = 1; i < X.weapons.length; i++) {
    clean();
    let w = X.weapons[i];
    g.weapon = i;
    g.mags[i] = w.mag;
    g.ammo[w.ammo] = 0;
    let e = target(w.kind === "grenade" ? 924 : 720);
    g.fire(false);
    for (let t = 0; t < 120; t++) g.projectileStep(1 / 60);
    assert(e.hp < e.maxHp || !e.active, w.id + " cannot hit");
    assert(g.mags[i] < w.mag, w.id + " no ammo cost");
    g.shots.clear();
    g.mags[i] = 0;
    g.reload = 0;
    const hp = e.hp,
      shots = g.stats.shots;
    g.fire(false);
    assert(
      e.hp === hp &&
        g.stats.shots === shots &&
        !g.shots.items.some((s) => s.active),
      w.id + " fires without ammo",
    );
    g.ammo[w.ammo] = 20;
    g.beginReload();
    assert(g.reload > 0, w.id + " cannot reload");
    g.reload = 0.001;
    g.update(1 / 60);
    assert(g.mags[i] > 0, w.id + " reload not completed");
    g.mags[i] = 0;
    g.ammo[w.ammo] = 20;
    g.beginReload();
    assert(g.reload > 0, w.id + " second reload blocked");
    reports.push(w.id);
  }
  clean();
  g.weapon = 0;
  let e = target(660);
  g.fire(false);
  assert(e.hp < 10000, "blade cannot hit");
  clean();
  g.weapon = 11;
  g.mags[11] = 18;
  let a = target(700),
    b = target(800);
  g.fire(false);
  assert(a.hp < 10000 && b.hp < 10000, "tesla chain");
  clean();
  g.weapon = 6;
  g.mags[6] = 6;
  a = target(700);
  b = target(800);
  g.fire(false);
  for (let t = 0; t < 30; t++) g.projectileStep(1 / 60);
  assert(a.hp < 10000 && b.hp < 10000, "sniper piercing");
  clean();
  a = target(660);
  g.weapon = 7;
  g.mags[7] = 140;
  g.fire(false);
  for (let t = 0; t < 20; t++) g.projectileStep(1 / 60);
  assert(a.burn > 0, "flame burn");
  clean();
  a = target(700);
  g.weapon = 8;
  g.mags[8] = 26;
  g.fire(false);
  for (let t = 0; t < 30; t++) g.projectileStep(1 / 60);
  assert(a.slow > 0, "plasma slow");
  clean();
  let armor = g.spawn(5, 700, 600);
  let before = armor.hp;
  g.hurtEnemy(armor, 100, "kinetic");
  assert(Math.abs(before - armor.hp - 35) < 0.01, "armor resistance");
  clean();
  let ranged = g.spawn(3, 900, 600);
  ranged.attack = 0;
  g.enemyStep(ranged, 1 / 60);
  assert(
    g.shots.items.some((s) => s.active && s.enemy),
    "ranged AI",
  );
  clean();
  let summon = g.spawn(6, 900, 600);
  summon.special = 0;
  g.enemyStep(summon, 1 / 60);
  assert(g.activeEnemies() >= 3, "summoner AI");
  X.profile = X.Save.validate(JSON.parse(original));
  g.start(1);
  return { weapons: reports, checks: reports.length * 5 + 8 };
};
