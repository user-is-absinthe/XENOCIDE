"use strict";
// Ручные снимки не изменяются автосохранением активного профиля.
X.Slots = {
  key: "xenocide.slots.v1",
  entries: [null, null, null],
  available: true,
  notice: "",
  validIndex(i) {
    return Number.isInteger(i) && i >= 0 && i < 3;
  },
  validate(data) {
    if (!data || data.version !== 1 || !Array.isArray(data.entries))
      return { valid: false, entries: [null, null, null], damaged: [] };
    const damaged = [],
      entries = Array.from({ length: 3 }, (_, i) => {
        const row = data.entries[i];
        if (row == null) return null;
        try {
          if (
            !Number.isFinite(row.savedAt) ||
            row.savedAt < 0 ||
            row.savedAt > 8.64e15
          )
            throw Error("date");
          return {
            savedAt: row.savedAt,
            profile: X.Save.validate(row.profile),
          };
        } catch (e) {
          damaged.push(i + 1);
          return null;
        }
      });
    return { valid: true, entries, damaged };
  },
  load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return;
      const result = this.validate(JSON.parse(raw));
      this.entries = result.entries;
      if (!result.valid || result.damaged.length)
        this.notice =
          "Некоторые ячейки повреждены. Активное автосохранение не затронуто.";
    } catch (e) {
      this.notice =
        "Ячейки недоступны или повреждены. Можно восстановить их из экспорта JSON.";
    }
  },
  exportData() {
    return JSON.parse(JSON.stringify({ version: 1, entries: this.entries }));
  },
  write() {
    if (X.Debug?.active) return false;
    try {
      localStorage.setItem(this.key, JSON.stringify(this.exportData()));
      this.available = true;
      if (this.notice.startsWith("Ячейки сохранены только в памяти"))
        this.notice = "";
      return true;
    } catch (e) {
      this.available = false;
      this.notice =
        "Ячейки сохранены только в памяти: хранилище недоступно или заполнено. Экспортируйте JSON перед закрытием игры.";
      X.UI?.toast(this.notice, 6000);
      return false;
    }
  },
  save(i) {
    if (!this.validIndex(i) || X.Debug.active) return false;
    if (X.game.state === "play") X.game.pause();
    this.entries[i] = {
      savedAt: Date.now(),
      profile: X.Save.validate(JSON.parse(JSON.stringify(X.profile))),
    };
    this.notice = "";
    this.write();
    return true;
  },
  restore(i) {
    if (!this.validIndex(i) || X.Debug.active || !this.entries[i]) return false;
    const profile = X.Save.validate(
      JSON.parse(JSON.stringify(this.entries[i].profile)),
    );
    X.game.state = "menu";
    X.game.keys.clear();
    X.game.mouse.left = X.game.mouse.right = false;
    X.profile = profile;
    X.Save.write(profile);
    X.Audio.settings();
    if (profile.checkpoint)
      X.game.start(profile.checkpoint.number, profile.checkpoint);
    else
      X.UI.brief(
        profile.resumeMode === "endless" && profile.endless.unlocked
          ? profile.endless.stage
          : profile.level,
      );
    return true;
  },
  importData(data) {
    if (X.Debug.active) return false;
    const result = this.validate(data);
    if (!result.valid) {
      this.notice = "Блок ячеек в JSON повреждён. Прежние ячейки сохранены.";
      return false;
    }
    // Повреждённая строка не стирает исправную ячейку, уже находящуюся в памяти.
    this.entries = result.entries.map((row, i) =>
      result.damaged.includes(i + 1) ? this.entries[i] : row,
    );
    this.notice = result.damaged.length
      ? "Повреждённые ячейки пропущены при импорте."
      : "";
    this.write();
    return true;
  },
  clear() {
    if (X.Debug.active) return;
    this.entries = [null, null, null];
    this.notice = "";
    this.write();
  },
  show() {
    if (X.Debug.active) return;
    if (X.game.state === "play") X.game.pause();
    const summary = (row) => {
      if (!row) return "Пустая ячейка";
      const p = row.profile,
        n =
          p.checkpoint?.number ??
          (p.resumeMode === "endless" ? p.endless.stage : p.level),
        implants = Object.values(p.upgrades).reduce((sum, n) => sum + n, 0),
        mods = [
          ...Object.values(p.weaponMods),
          ...Object.values(p.weaponTuning),
        ].reduce((sum, n) => sum + n, 0);
      return (
        (n > 20 ? "Экспедиция · сектор " : "Кампания · миссия ") +
        n +
        (p.checkpoint ? " · контрольная точка" : " · перед высадкой") +
        "<br>" +
        X.difficulties[p.difficulty].name +
        " · ₡ " +
        X.RecordsUI.number(p.credits) +
        "<br>Импланты: " +
        implants +
        " ступ. · оружие: " +
        mods +
        " ступ.<br>" +
        new Date(row.savedAt).toLocaleString("ru-RU")
      );
    };
    X.UI.show(
      '<div class="eyebrow">Ручные снимки / 3 ячейки</div><h2>Сохранения</h2><p>Сохраните текущий вариант прокачки перед экспериментом. Каждая ячейка содержит весь профиль: кампанию, экспедицию, снаряжение, рекорды и контрольную точку. Автосохранение работает отдельно и не перезаписывает ячейки.</p><div class="cards">' +
        this.entries
          .map(
            (row, i) =>
              '<article class="card save-slot"><h3>Ячейка ' +
              (i + 1) +
              "</h3><p>" +
              summary(row) +
              "</p>" +
              X.UI.button("saveSlot:" + i, "СОХРАНИТЬ СЮДА") +
              " " +
              X.UI.button("loadSlot:" + i, "ЗАГРУЗИТЬ", false, !row) +
              "</article>",
          )
          .join("") +
        '</div><p class="small">Новая кампания сохраняет ячейки. Полный сброс удаляет их. Экспорт JSON включает активный профиль и все три ячейки; полигон не может их менять.</p>' +
        (this.notice ? '<p class="warn">' + this.notice + "</p>" : "") +
        '<div class="row">' +
        X.UI.button("export", "ЭКСПОРТ ВСЕХ СОХРАНЕНИЙ") +
        X.UI.button("slotsBack", "НАЗАД", true) +
        "</div>",
      "slots",
    );
  },
  confirm(kind, i) {
    if (!this.validIndex(i) || X.Debug.active) return;
    const save = kind === "save";
    if (!save && !this.entries[i]) return;
    if (save && !this.entries[i]) {
      this.save(i);
      this.show();
      return;
    }
    X.UI.show(
      "<h2>" +
        (save ? "Перезаписать ячейку " : "Загрузить ячейку ") +
        (i + 1) +
        "?</h2><p>" +
        (save
          ? "Прежний снимок этой ячейки будет заменён текущим профилем."
          : "Активный профиль и автосохранение будут заменены снимком. При необходимости сначала сохраните текущий вариант в другую ячейку.") +
        '</p><div class="row">' +
        X.UI.button(
          (save ? "doSaveSlot:" : "doLoadSlot:") + i,
          "ПОДТВЕРДИТЬ",
          true,
        ) +
        X.UI.button("slots", "ОТМЕНА") +
        "</div>",
      "slot-confirm",
    );
  },
};
