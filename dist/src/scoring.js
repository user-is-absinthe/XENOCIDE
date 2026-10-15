"use strict";
X.Scoring = {
  rules: {
    base: 10000,
    perLevel: 500,
    reference: 180,
    difficulty: [0.8, 1, 1.3, 1.6],
    limit: 10,
  },
  defaults() {
    return { version: 1, name: "Боец", serial: 0, levels: {}, campaigns: [] };
  },
  name(value) {
    return (
      (typeof value === "string"
        ? value
            .replace(/[\u0000-\u001f\u007f]/g, "")
            .trim()
            .slice(0, 32)
        : "") || "Боец"
    );
  },
  points(level, time, difficulty) {
    const r = this.rules;
    return Math.max(
      1,
      Math.floor(
        ((r.base + Math.min(40, level) * r.perLevel) *
          r.difficulty[difficulty] *
          r.reference) /
          (r.reference + Math.max(0, time)),
      ),
    );
  },
  compare(a, b) {
    return b.points - a.points || a.time - b.time || a.id - b.id;
  },
  trim(entries) {
    const count = new Map();
    return entries.sort(this.compare).filter((e) => {
      const key = e.difficulty + ":" + e.pace,
        n = count.get(key) || 0;
      count.set(key, n + 1);
      return n < this.rules.limit;
    });
  },
  validateRecords(s) {
    const d = this.defaults();
    if (!s || s.version !== 1) return d;
    d.name = this.name(s.name);
    const clean = (items, campaign) => {
      if (!Array.isArray(items)) return [];
      return this.trim(
        items
          .slice(0, 400)
          .filter(
            (e) =>
              e &&
              Number.isSafeInteger(e.id) &&
              e.id > 0 &&
              e.id <= 1e12 &&
              Number.isInteger(e.points) &&
              e.points >= 1 &&
              e.points <= 1e7 &&
              Number.isFinite(e.time) &&
              e.time >= 0 &&
              e.time <= 1e9 &&
              Number.isInteger(e.difficulty) &&
              e.difficulty >= 0 &&
              e.difficulty <= (campaign ? 4 : 3) &&
              [0.55, 1, 1.4, ...(campaign ? [0] : [])].includes(e.pace) &&
              Number.isFinite(e.date) &&
              e.date >= 0 &&
              e.date <= 8.64e15,
          )
          .map((e) => ({
            id: e.id,
            name: this.name(e.name),
            points: e.points,
            time: e.time,
            difficulty: e.difficulty,
            pace: e.pace,
            date: e.date,
          })),
      );
    };
    for (let n = 1; n <= 20; n++) {
      const rows = clean(s.levels?.[n], false);
      if (rows.length) d.levels[n] = rows;
    }
    d.campaigns = clean(s.campaigns, true);
    d.serial = Math.max(
      Number.isSafeInteger(s.serial) && s.serial >= 0 && s.serial <= 1e12
        ? s.serial
        : 0,
      ...Object.values(d.levels)
        .flat()
        .map((e) => e.id),
      ...d.campaigns.map((e) => e.id),
    );
    return d;
  },
  validateRun(s) {
    if (
      !s ||
      !Array.isArray(s.legs) ||
      s.legs.length >= 20 ||
      !Number.isFinite(s.time) ||
      s.time < 0 ||
      s.time > 1e9 ||
      !Number.isFinite(s.startedAt) ||
      s.startedAt < 0 ||
      s.startedAt > 8.64e15
    )
      return null;
    const legs = [];
    for (let i = 0; i < s.legs.length; i++) {
      const e = s.legs[i];
      if (
        !e ||
        e.level !== i + 1 ||
        !Number.isFinite(e.time) ||
        e.time < 0 ||
        e.time > 1e9 ||
        !Number.isInteger(e.difficulty) ||
        e.difficulty < 0 ||
        e.difficulty > 3 ||
        ![0.55, 1, 1.4].includes(e.pace)
      )
        return null;
      legs.push({
        level: e.level,
        time: e.time,
        points: this.points(e.level, e.time, e.difficulty),
        difficulty: e.difficulty,
        pace: e.pace,
      });
    }
    if (s.time + 0.001 < legs.reduce((sum, e) => sum + e.time, 0)) return null;
    return {
      startedAt: s.startedAt,
      next: legs.length + 1,
      time: s.time,
      points: legs.reduce((sum, e) => sum + e.points, 0),
      legs,
    };
  },
  start(g) {
    if (X.Debug.active || g.number !== 1 || X.profile.campaignRun) return;
    X.profile.campaignRun = {
      startedAt: Date.now(),
      next: 1,
      time: 0,
      points: 0,
      legs: [],
    };
    X.Save.write(X.profile);
  },
  finish(g, win) {
    const points = win ? this.points(g.number, g.time, g.difficulty) : 0;
    if (X.Debug.active) return { points, test: true };
    const p = X.profile,
      records = p.records,
      run = p.campaignRun;
    if (run && g.number <= 20) run.time += g.time;
    if (!win) return { points: 0 };
    const entry = {
      id: ++records.serial,
      name: records.name,
      points,
      time: g.time,
      difficulty: g.difficulty,
      pace: g.pace,
      date: Date.now(),
    };
    let rank = null,
      campaignRank = null,
      campaignPoints = null;
    if (g.number <= 20) {
      const rows = (records.levels[g.number] = this.trim([
        ...(records.levels[g.number] || []),
        entry,
      ]));
      const category = rows.filter(
        (e) => e.difficulty === g.difficulty && e.pace === g.pace,
      );
      const pos = category.findIndex((e) => e.id === entry.id);
      rank = pos >= 0 ? pos + 1 : null;
      if (run && g.number === run.next) {
        run.legs.push({
          level: g.number,
          time: g.time,
          points,
          difficulty: g.difficulty,
          pace: g.pace,
        });
        run.next++;
        run.points += points;
        campaignPoints = run.points;
        if (run.next === 21) {
          const difficulty = run.legs.every(
              (e) => e.difficulty === run.legs[0].difficulty,
            )
              ? run.legs[0].difficulty
              : 4,
            pace = run.legs.every((e) => e.pace === run.legs[0].pace)
              ? run.legs[0].pace
              : 0;
          const full = {
            ...entry,
            id: ++records.serial,
            points: run.points,
            time: run.time,
            difficulty,
            pace,
          };
          records.campaigns = this.trim([...records.campaigns, full]);
          const pos = records.campaigns
            .filter((e) => e.difficulty === difficulty && e.pace === pace)
            .findIndex((e) => e.id === full.id);
          campaignRank = pos >= 0 ? pos + 1 : null;
          p.campaignRun = null;
        }
      }
    }
    return { points, rank, campaignPoints, campaignRank };
  },
  rows(kind, level, difficulty = -1, pace = -1) {
    const rows =
      kind === "campaign"
        ? X.profile.records.campaigns
        : X.profile.records.levels[level] || [];
    return rows
      .filter(
        (e) =>
          (difficulty < 0 || e.difficulty === difficulty) &&
          (pace < 0 || e.pace === pace),
      )
      .slice()
      .sort(this.compare)
      .slice(0, this.rules.limit);
  },
};
