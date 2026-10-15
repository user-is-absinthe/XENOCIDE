"use strict";
X.RecordsUI = {
  view: { kind: "levels", level: 1, difficulty: -1, pace: -1 },
  escape(value) {
    return String(value).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  },
  number(n) {
    return n.toLocaleString("ru-RU");
  },
  duration(n) {
    const h = Math.floor(n / 3600),
      m = Math.floor((n % 3600) / 60),
      s = Math.floor(n % 60);
    return (
      (h ? h + ":" + String(m).padStart(2, "0") : String(m)) +
      ":" +
      String(s).padStart(2, "0")
    );
  },
  pace(n) {
    return {
      0: "Смешанный",
      0.55: "Быстрый",
      1: "Стандартный",
      1.4: "Продолжительный",
    }[n];
  },
  show(kind) {
    if (kind) this.view.kind = kind;
    const v = this.view,
      p = X.profile,
      rows = X.Scoring.rows(v.kind, v.level, v.difficulty, v.pace),
      run = p.campaignRun,
      E = this.escape;
    const option = (value, text, current) =>
      '<option value="' +
      value +
      '" ' +
      (String(value) === String(current) ? "selected" : "") +
      ">" +
      text +
      "</option>";
    X.UI.show(
      '<div class="eyebrow">Локальные рекорды / топ 10</div><h2>Таблица лидеров</h2><p>Очки начисляются за скорость выхода с уровня. Сложность даёт множитель: 0,8 / 1 / 1,3 / 1,6. Результаты разных настроек можно отфильтровать.</p><div class="row"><label for="records-name">Имя для новых результатов</label><input id="records-name" type="text" maxlength="32" value="' +
        E(p.records.name) +
        '"></div><div class="row">' +
        X.UI.button("records:levels", "ПО УРОВНЯМ", v.kind === "levels") +
        X.UI.button(
          "records:campaign",
          "ПОЛНАЯ КАМПАНИЯ",
          v.kind === "campaign",
        ) +
        '</div><div class="row">' +
        (v.kind === "levels"
          ? '<select id="records-level" aria-label="Уровень">' +
            X.levels
              .map((l, i) =>
                option(
                  i + 1,
                  String(i + 1).padStart(2, "0") + " · " + l.name,
                  v.level,
                ),
              )
              .join("") +
            "</select>"
          : "") +
        '<select id="records-difficulty" aria-label="Сложность рекордов">' +
        option(-1, "Все сложности", v.difficulty) +
        [...X.difficulties.map((d) => d.name), "Смешанная"]
          .map((name, i) => option(i, name, v.difficulty))
          .join("") +
        '</select><select id="records-pace" aria-label="Темп рекордов">' +
        option(-1, "Все темпы", v.pace) +
        [0.55, 1, 1.4, 0].map((n) => option(n, this.pace(n), v.pace)).join("") +
        '</select></div><div class="record-table-wrap"><table class="record-table"><thead><tr><th>Место</th><th>Имя</th><th>Очки</th><th>Время</th><th>Условия</th><th>Дата</th></tr></thead><tbody>' +
        rows
          .map(
            (r, i) =>
              "<tr><td>" +
              (i + 1) +
              "</td><td>" +
              E(r.name) +
              '</td><td class="record-points">' +
              this.number(r.points) +
              "</td><td>" +
              this.duration(r.time) +
              "</td><td>" +
              (X.difficulties[r.difficulty]?.name || "Смешанная") +
              '<br><span class="small">' +
              this.pace(r.pace) +
              "</span></td><td>" +
              E(new Date(r.date).toLocaleDateString("ru-RU")) +
              "</td></tr>",
          )
          .join("") +
        "</tbody></table></div>" +
        (!rows.length
          ? '<p class="record-empty">Пока нет результатов для этих условий. ' +
            (v.kind === "campaign"
              ? "Пройдите все 20 уровней кампании."
              : "Завершите выбранный уровень.") +
            "</p>"
          : "") +
        (run
          ? '<p class="record-run">Текущее прохождение: ' +
            run.legs.length +
            "/20 · " +
            this.number(run.points) +
            " очков · " +
            this.duration(run.time) +
            " боя.</p>"
          : "") +
        '<p class="small">Кампания: сумма очков 20 уровней, пройденных по порядку. Переигровки не добавляют очки повторно; общее время включает завершённые неудачные и дополнительные бои. Полигон не записывает рекорды. Новая кампания сохраняет таблицы; полный сброс удаляет их.</p><div class="row">' +
        X.UI.button("recordsBack", "НАЗАД", true) +
        "</div>",
      "records",
    );
  },
};
document.addEventListener("change", (e) => {
  const id = e.target.id;
  if (!id.startsWith("records-")) return;
  if (id === "records-name") {
    X.profile.records.name = X.Scoring.name(e.target.value);
    e.target.value = X.profile.records.name;
    X.Save.write(X.profile);
    return;
  }
  const key = {
    "records-level": "level",
    "records-difficulty": "difficulty",
    "records-pace": "pace",
  }[id];
  if (key) {
    X.RecordsUI.view[key] = Number(e.target.value);
    X.RecordsUI.show();
  }
});
