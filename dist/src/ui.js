"use strict";
X.profile = X.Save.load();
X.Slots.load();
X.UI = {
  overlay: document.getElementById("overlay"),
  hudEl: document.getElementById("hud"),
  pendingKey: null,
  screen: "menu",
  hudClock: 0,
  button(a, text, primary = false, disabled = false) {
    return (
      "<button " +
      (primary ? 'class="primary" ' : "") +
      'data-act="' +
      a +
      '" ' +
      (disabled ? "disabled" : "") +
      ">" +
      text +
      "</button>"
    );
  },
  select(id, list, value, disabled = false) {
    return (
      '<select id="' +
      id +
      '" ' +
      (disabled ? "disabled" : "") +
      ">" +
      list
        .map(
          (v, i) =>
            '<option value="' +
            i +
            '" ' +
            (value === i ? "selected" : "") +
            ">" +
            v +
            "</option>",
        )
        .join("") +
      "</select>"
    );
  },
  show(html, screen) {
    this.hideWeaponTooltip();
    document.body.classList.remove("playing");
    this.screen = screen || this.screen;
    this.overlay.innerHTML = '<section class="panel">' + html + "</section>";
    this.hudEl.style.display = "none";
  },
  hide() {
    this.hideWeaponTooltip();
    document.body.classList.add("playing");
    this.overlay.innerHTML = "";
    this.hudEl.style.display = "block";
    this.screen = "game";
    document.activeElement?.blur();
  },
  toast(s, ms = 3000) {
    const t = document.getElementById("toast");
    t.textContent = s;
    t.classList.add("visible");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => t.classList.remove("visible"), ms);
  },
  hideWeaponTooltip() {
    document.getElementById("weapon-tooltip").hidden = true;
    if (this.tooltipCard) this.tooltipCard.removeAttribute("aria-describedby");
    this.tooltipCard = null;
  },
  weaponTooltip(card, x, y) {
    if (this.screen !== "shop") return;
    const w = X.weapons[Number(card.dataset.weapon)],
      tip = document.getElementById("weapon-tooltip");
    if (!w) return;
    if (this.tooltipCard !== card) {
      this.hideWeaponTooltip();
      this.tooltipCard = card;
      tip.innerHTML =
        "<h3>" +
        w.name +
        "</h3><p>" +
        w.desc +
        '</p><p class="tip-strength"><b>Сильные стороны</b><br>' +
        w.strengths +
        '</p><p class="tip-weakness"><b>Слабые стороны</b><br>' +
        w.weaknesses +
        "</p>";
      card.setAttribute("aria-describedby", "weapon-tooltip");
    }
    tip.hidden = false;
    const rect = card.getBoundingClientRect(),
      width = tip.offsetWidth,
      height = tip.offsetHeight;
    let left = (x ?? rect.right) + 16,
      top = (y ?? rect.top) + 16;
    if (left + width > window.innerWidth - 8)
      left = (x ?? rect.left) - width - 16;
    if (top + height > window.innerHeight - 8)
      top = (y ?? rect.bottom) - height - 16;
    tip.style.left =
      Math.max(8, Math.min(window.innerWidth - width - 8, left)) + "px";
    tip.style.top =
      Math.max(8, Math.min(window.innerHeight - height - 8, top)) + "px";
  },
  menu() {
    X.Debug.leave();
    const p = X.profile;
    X.game.state = "menu";
    this.show(
      '<div class="eyebrow">PROJECT XENOCIDE / автономный протокол</div><h1 class="brand">XENOCIDE</h1><div class="columns"><div><p class="lead">Сигнал потерян.<br>Карантин нарушен.</p><p>Двадцать секторов. Четыре источника заражения.<br>Один боец за последним шлюзом.</p><div class="rule"></div><div class="intel"><span>КАМПАНИЯ <b>' +
        p.completed.length +
        " / 20</b></span><span>УНИЧТОЖЕНО <b>" +
        p.stats.kills +
        "</b></span><span>РЕЗЕРВ <b>₡ " +
        p.credits +
        '</b></span></div><p class="small">WASD — движение · мышь — прицел · ЛКМ — огонь<br>Space — рывок · E — взаимодействие · Esc — пауза</p></div><div class="menu">' +
        this.button("new", "НОВАЯ КАМПАНИЯ", true) +
        this.button(
          "continue",
          p.checkpoint
            ? "ПРОДОЛЖИТЬ · КОНТРОЛЬНАЯ ТОЧКА"
            : p.resumeMode === "endless" && p.endless.unlocked
              ? "ПРОДОЛЖИТЬ · ЭКСПЕДИЦИЯ " + p.endless.stage
              : "ПРОДОЛЖИТЬ · СЕКТОР " + p.level,
        ) +
        this.button("levels", "ВЫБОР МИССИИ") +
        this.button("records", "ТАБЛИЦА ЛИДЕРОВ") +
        this.button("slots", "СОХРАНЕНИЯ · 3 ЯЧЕЙКИ") +
        this.button("debug", "ПОЛИГОН · УРОВНИ И ЧИТЫ") +
        this.button(
          "endless",
          "БЕСКОНЕЧНАЯ ЭКСПЕДИЦИЯ",
          false,
          !p.endless.unlocked,
        ) +
        this.button("shop", "АРСЕНАЛ И УЛУЧШЕНИЯ", false, !!p.checkpoint) +
        this.button("settings", "НАСТРОЙКИ И УПРАВЛЕНИЕ") +
        '</div></div><footer>OFFLINE / ОРИГИНАЛЬНАЯ ГРАФИКА И ЗВУК</footer><div class="game-version">v' +
        X.version +
        "</div>" +
        (X.Save.warning ? '<p class="warn">' + X.Save.warning + "</p>" : ""),
      "menu",
    );
  },
  confirm(title, text, act) {
    this.show(
      "<h2>" +
        title +
        "</h2><p>" +
        text +
        '</p><div class="row">' +
        this.button(act, "ПОДТВЕРДИТЬ", true) +
        this.button("menu", "ОТМЕНА") +
        "</div>",
      "confirm",
    );
  },
  setup() {
    this.show(
      '<div class="eyebrow">Операция / новая кампания</div><h2>Выбор протокола</h2><p>Клинок, пистолет, 140 патронов и 250 кредитов. Каждая пройденная миссия открывает следующую.</p><div class="row"><label>Сложность</label>' +
        this.select(
          "difficulty",
          X.difficulties.map((d) => d.name),
          X.profile.difficulty,
        ) +
        '</div><p>Лёгкая — знакомство. Нормальная — основная кампания. Сложная и Кошмар увеличивают натиск и уменьшают ресурсы.</p><div class="row">' +
        this.button("begin", "НАЧАТЬ ОПЕРАЦИЮ", true) +
        this.button("menu", "НАЗАД") +
        "</div>",
      "setup",
    );
  },
  levels() {
    this.show(
      '<h2>Выбор миссии</h2><div class="level-grid">' +
        X.levels
          .map((l, i) =>
            this.button(
              "brief:" + i,
              String(i + 1).padStart(2, "0") + " · " + l.name,
              false,
              i + 1 > X.profile.unlocked,
            ),
          )
          .join("") +
        '</div><div class="row">' +
        this.button("menu", "НАЗАД") +
        "</div>",
      "levels",
    );
  },
  brief(n) {
    this.next = n;
    const l =
      n === 0 && X.Debug.active
        ? X.Debug.arena
        : n <= 20
          ? X.levels[n - 1]
          : X.generate(n, X.profile.endless.seed);
    this.show(
      '<div class="eyebrow">' +
        l.chapter +
        " / Сектор " +
        n +
        "</div><h2>" +
        l.name +
        '</h2><div class="columns"><div><canvas id="preview" width="420" height="300"></canvas></div><div><p>' +
        l.brief +
        '</p><div class="row"><label>Сложность</label>' +
        this.select(
          "difficulty",
          X.difficulties.map((d) => d.name),
          X.profile.difficulty,
        ) +
        '</div><p class="small">' +
        l.waves +
        " волн · задачи: " +
        (l.targets.length || "зачистка") +
        '<br>Кредиты: ×<span id="credit-multiplier">' +
        X.difficulties[X.profile.difficulty].economy.toLocaleString("ru-RU") +
        "</span> за врагов, задания и завершение." +
        '<br>Контрольная точка каждые 30 секунд и при паузе.</p><div class="menu">' +
        this.button("deploy", "НАЧАТЬ МИССИЮ", true) +
        this.button("shop", "СНАБЖЕНИЕ") +
        this.button("menu", "ГЛАВНОЕ МЕНЮ") +
        "</div></div></div>",
      "brief",
    );
    const m = X.makeMap(l),
      g = document.getElementById("preview").getContext("2d"),
      s = Math.min(400 / m.w, 280 / m.h);
    g.fillStyle = "#07121c";
    g.fillRect(0, 0, 420, 300);
    for (let j = 0; j < m.h; j++)
      for (let i = 0; i < m.w; i++) {
        g.fillStyle = m.cells[j * m.w + i] ? "#1d333e" : "#62797a";
        g.fillRect(10 + i * s, 10 + j * s, s - 0.6, s - 0.6);
      }
    const mark = (a, c) => {
      g.fillStyle = c;
      g.fillRect(10 + a[0] * s, 10 + a[1] * s, s, s);
    };
    mark(l.start, "#fff");
    mark(l.exit, "#7fffc7");
    l.targets.forEach((a) => mark(a, "#ffad65"));
  },
  modeBranchInfo(w, level, alt) {
    const spec = X.Armory.definitions[w.id],
      maxed = level >= X.Armory.max,
      next = {
        ...X.profile,
        [alt ? "weaponTuning" : "weaponMods"]: {
          ...(alt ? X.profile.weaponTuning : X.profile.weaponMods),
          [w.id]: Math.min(X.Armory.max, level + 1),
        },
      },
      unit = w.id === "shotgun" && !alt ? "Урон одной дробины. " : "",
      note =
        w.id === "flame" && !alt
          ? " Урон последующего горения не меняется."
          : "";
    return (
      '<div class="' +
      (alt ? "weapon-tuning-info" : "weapon-mod-info") +
      '"><b>' +
      (alt ? "ПКМ · " : "ЛКМ · ") +
      spec[alt ? "b" : "a"] +
      " · " +
      level +
      "/5</b><br>" +
      spec[alt ? "descB" : "descA"] +
      "<br><strong>" +
      unit +
      X.Armory.summary(w, alt) +
      (maxed ? " · максимум" : " → " + X.Armory.summary(w, alt, next)) +
      '</strong><br><span class="small">' +
      (w.ammo ? "Магазин общий для обоих режимов. " : "Патроны не нужны. ") +
      "Учтён имплант, значения до сопротивлений цели." +
      note +
      "</span></div>"
    );
  },
  weaponModInfo(w, level) {
    if (X.Armory.has(w)) return this.modeBranchInfo(w, level, false);
    const stats = X.WeaponStats,
      maxed = level >= stats.modMax,
      damage = (n) =>
        stats
          .damage(w, n, X.profile.upgrades.power)
          .toLocaleString("ru-RU", { maximumFractionDigits: 2 }),
      label = w.pellets
        ? "Урон одной дробины"
        : w.kind === "flame"
          ? "Урон струи за один выстрел"
          : w.kind === "tesla"
            ? "Урон первой цели цепи"
            : w.blast
              ? "Урон в центре взрыва"
              : w.kind === "blade"
                ? "Урон удара"
                : "Урон одного снаряда";
    return (
      '<div class="weapon-mod-info"><b>Усиление урона · ' +
      level +
      "/" +
      stats.modMax +
      "</b><br>Каждый уровень: +" +
      Math.round(stats.modDamage * 100) +
      "% базового урона.<br>" +
      label +
      ": <strong>" +
      damage(level) +
      (maxed ? "" : " → " + damage(level + 1)) +
      "</strong>" +
      (maxed ? " · максимум" : " после покупки") +
      '<br><span class="small">Бонус этого оружия: +' +
      Math.round(level * stats.modDamage * 100) +
      "%. Учтён имплант усилителя; до сопротивлений цели и режима ПКМ." +
      (w.kind === "flame" ? " Урон последующего горения не меняется." : "") +
      "</span></div>"
    );
  },
  weaponTuningInfo(w, level) {
    if (X.Armory.has(w)) return this.modeBranchInfo(w, level, true);
    const stats = X.WeaponStats,
      branch = stats.branch(w),
      maxed = level >= branch.max,
      format = (n) => n.toLocaleString("ru-RU", { maximumFractionDigits: 3 }),
      value = (n) => {
        const t = stats.tuned(w, n);
        if (w.kind === "blade") return format(t.range) + " ед. дальности";
        if (w.kind === "flame")
          return (
            format(t.range) +
            " ед. / " +
            format((t.spread * 180) / Math.PI) +
            "° конуса"
          );
        if (w.kind === "plasma") return format(t.speed) + " ед./с";
        if (w.kind === "grenade") return format(t.blast) + " ед. радиуса";
        if (w.kind === "rail") return format(t.charge) + " с заряда";
        if (w.kind === "tesla")
          return t.links + " целей (ПКМ " + (t.links + 2) + ")";
        return format(t.rate) + " с между выстрелами";
      },
      effect =
        w.kind === "flame"
          ? "+15% дальности и +12% угла за ступень."
          : w.kind === "blade"
            ? "+15% дальности за ступень."
            : w.kind === "plasma"
              ? "+15% скорости снаряда за ступень."
              : w.kind === "grenade"
                ? "+12% радиуса взрыва за ступень."
                : w.kind === "rail"
                  ? "−12% базового времени заряда за ступень."
                  : w.kind === "tesla"
                    ? "+1 цель в цепи за ступень."
                    : "−8% базовой паузы между выстрелами за ступень.";
    return (
      '<div class="weapon-tuning-info"><b>' +
      branch.name +
      " · " +
      level +
      "/" +
      branch.max +
      "</b><br>" +
      effect +
      "<br><strong>" +
      value(level) +
      (maxed ? " · максимум" : " → " + value(level + 1)) +
      "</strong></div>"
    );
  },
  shop() {
    if (X.profile.checkpoint) {
      this.toast("Магазин доступен между миссиями");
      return;
    }
    // Покупка пересоздаёт карточки, но должна оставлять игрока на прежнем месте.
    const oldPanel =
      this.screen === "shop" ? this.overlay.querySelector(".panel") : null;
    const view = oldPanel
      ? {
          top: oldPanel.scrollTop,
          left: oldPanel.scrollLeft,
          focus: oldPanel.contains(document.activeElement)
            ? document.activeElement.dataset.act
            : null,
        }
      : null;
    const p = X.profile,
      B = (a, t, d) => this.button(a, t, false, d);
    const weapons = X.weapons
      .map((w, i) => {
        if (w.debugOnly) return "";
        const own = p.owned.includes(i),
          gate = X.Economy.unlockAt[i],
          locked = p.unlocked < gate,
          mod = p.weaponMods[w.id] || 0,
          cost = Math.round((400 + w.price * 0.3) * Math.pow(1.8, mod)),
          tune = p.weaponTuning[w.id] || 0,
          tuneCost = Math.round((450 + w.price * 0.25) * Math.pow(1.8, tune));
        if (locked && !own) return "";
        return (
          '<article class="card weapon-card" data-weapon="' +
          i +
          '" tabindex="0"><div class="tag">' +
          (own ? "НА ВООРУЖЕНИИ" : "СЕКТОР " + gate) +
          "</div><h3>" +
          w.name +
          "</h3><p>" +
          w.desc +
          "</p>" +
          B(
            "buyweapon:" + i,
            own
              ? "КУПЛЕНО"
              : locked
                ? "ОТКРОЕТСЯ В СЕКТОРЕ " + gate
                : "₡ " + w.price,
            own || locked || p.credits < w.price,
          ) +
          (own
            ? this.weaponModInfo(w, mod) +
              B(
                "mod:" + i,
                mod >= (X.Armory.has(w) ? X.Armory.max : X.WeaponStats.modMax)
                  ? "МАКСИМАЛЬНОЕ УСИЛЕНИЕ"
                  : "УЛУЧШИТЬ ДО " +
                      (mod + 1) +
                      "/" +
                      (X.Armory.has(w) ? X.Armory.max : X.WeaponStats.modMax) +
                      " · ₡ " +
                      cost,
                mod >=
                  (X.Armory.has(w) ? X.Armory.max : X.WeaponStats.modMax) ||
                  p.credits < cost,
              )
            : "") +
          (own
            ? this.weaponTuningInfo(w, tune) +
              B(
                "tune:" + i,
                tune >=
                  (X.Armory.has(w) ? X.Armory.max : X.WeaponStats.branch(w).max)
                  ? "ВТОРАЯ ВЕТКА: МАКСИМУМ"
                  : "РАЗВИТЬ ДО " +
                      (tune + 1) +
                      "/" +
                      (X.Armory.has(w)
                        ? X.Armory.max
                        : X.WeaponStats.branch(w).max) +
                      " · ₡ " +
                      tuneCost,
                tune >=
                  (X.Armory.has(w)
                    ? X.Armory.max
                    : X.WeaponStats.branch(w).max) || p.credits < tuneCost,
              )
            : "") +
          "</article>"
        );
      })
      .join("");
    const upgrades = X.upgrades
      .map((u) => {
        let lv = p.upgrades[u.id],
          price = Math.round(u.price * Math.pow(1.65, lv));
        return (
          '<article class="card" data-upgrade="' +
          u.id +
          '"><h3>' +
          u.name +
          " · " +
          (u.consumable
            ? lv
              ? "УСТАНОВЛЕН"
              : "ОДНОРАЗОВЫЙ"
            : lv + "/" + u.max) +
          "</h3><p>" +
          u.desc +
          "</p>" +
          B(
            "upgrade:" + u.id,
            lv >= u.max
              ? u.consumable
                ? "УСТАНОВЛЕН"
                : "МАКСИМУМ"
              : "₡ " + price,
            lv >= u.max || p.credits < price,
          ) +
          "</article>"
        );
      })
      .join("");
    const ammo = Object.entries(X.ammo)
      .map(
        ([k, a]) =>
          '<article class="card"><canvas class="ammo-icon" data-ammo="' +
          k +
          '" width="44" height="44"></canvas><h3>' +
          a.name +
          "</h3><p>В резерве: " +
          p.ammo[k] +
          "<br>Комплект: " +
          a.pack +
          "</p>" +
          B("buyammo:" + k, "₡ " + a.price, p.credits < a.price) +
          "</article>",
      )
      .join("");
    this.show(
      '<div class="row"><h2>Арсенал <span class="money">₡ ' +
        p.credits +
        "</span></h2>" +
        this.button(
          X.Debug.active ? "debug" : "shopnext",
          X.Debug.active
            ? "ПОЛИГОН · ВЫБРАТЬ КАРТУ"
            : "К МИССИИ " + (this.next || p.level),
          true,
        ) +
        this.button("menu", X.Debug.active ? "ВЫЙТИ ИЗ ПОЛИГОНА" : "МЕНЮ") +
        "</div>" +
        (X.Debug.active
          ? "<p>Магазин полигона. Прокачка полностью применяется при следующей высадке. Повторное открытие меню её не сбрасывает.</p>"
          : "") +
        '<p>Покупка оружия включает три магазина. ЛКМ и ПКМ развиваются отдельно, по пять ступеней. Магазин общий. Здоровье и броня восстанавливаются при высадке.</p><h3>Боеприпасы</h3><div class="cards">' +
        ammo +
        '</div><div class="rule"></div><h3>Импланты</h3><div class="cards">' +
        upgrades +
        '</div><div class="rule"></div><h3>Оружие</h3><div class="cards">' +
        weapons +
        "</div>",
      "shop",
    );
    for (const c of this.overlay.querySelectorAll("canvas[data-ammo]"))
      X.Loot.drawIcon(c.getContext("2d"), 22, 22, c.dataset.ammo, 1.2);
    if (view) {
      const panel = this.overlay.querySelector(".panel");
      if (view.focus) {
        const button = [...panel.querySelectorAll("button[data-act]")].find(
          (b) => b.dataset.act === view.focus,
        );
        if (button && !button.disabled) button.focus({ preventScroll: true });
      }
      panel.scrollTop = view.top;
      panel.scrollLeft = view.left;
    }
  },
  pause() {
    this.show(
      '<div class="eyebrow">Протокол приостановлен</div><h2>Пауза</h2><p>' +
        (X.Debug.active
          ? "Полигон: бой остановлен. Прогресс кампании сохранён отдельно."
          : "Контрольная точка сохранена. Бой остановлен.") +
        '</p><div class="menu">' +
        this.button("resume", "ПРОДОЛЖИТЬ", true) +
        this.button("settings", "НАСТРОЙКИ") +
        (X.Debug.active ? "" : this.button("slots", "СОХРАНЕНИЯ · 3 ЯЧЕЙКИ")) +
        this.button(
          "toggleMusic",
          X.profile.settings.musicEnabled
            ? "МУЗЫКА: ВКЛ · ОТКЛЮЧИТЬ"
            : "МУЗЫКА: ВЫКЛ · ВКЛЮЧИТЬ",
        ) +
        this.button(
          "toggleMute",
          X.profile.settings.mute
            ? "ЗВУК: ВЫКЛ · ВКЛЮЧИТЬ"
            : "ОТКЛЮЧИТЬ ВЕСЬ ЗВУК",
        ) +
        this.button(
          X.Debug.active ? "debug" : "debugEnter",
          X.Debug.active ? "ПОЛИГОН · ЧИТЫ И УРОВНИ" : "ОТКРЫТЬ ПОЛИГОН",
        ) +
        this.button("export", "ЭКСПОРТ ПРОГРЕССА") +
        this.button("abandon", "ПЕРЕЗАПУСТИТЬ МИССИЮ") +
        this.button("menu", "ГЛАВНОЕ МЕНЮ") +
        "</div>",
      "pause",
    );
  },
  debug() {
    if (!X.Debug.active) X.Debug.enter();
    if (X.game.state === "play") X.game.pause();
    const flag = (code, key, title) =>
      this.button(
        "cheat:" + code,
        title + " · " + (X.Debug.flags[key] ? "ВКЛ" : "ВЫКЛ"),
      );
    this.show(
      '<div class="eyebrow">Режим тестирования</div><h2>Полигон <span class="money">₡ ' +
        X.profile.credits +
        '</span></h2><p>При каждом входе: 500 000 кредитов и нулевая прокачка бойца/обеих веток оружия. Все 20 карт и открытая арена доступны. Читы и прогресс полигона не записываются в сохранение кампании.</p><section class="debug-supply"><h3>Снабжение и ручная прокачка</h3><p class="small">Соберите свой вариант развития через обычные покупки.</p>' +
        this.button("shop", "МАГАЗИН ПОЛИГОНА · ПРОКАЧКА", true) +
        '</section><section class="debug-cheats"><h3>Читы для испытаний</h3><div class="row">' +
        this.button("cheat:CREDITS", "CREDITS · +10 000 ₡") +
        this.button("cheat:ARSENAL", "ARSENAL · ВЕСЬ АРСЕНАЛ") +
        this.button("cheat:MAXWEAPONS", "MAXWEAPONS · ПОЛНАЯ ПРОКАЧКА ОРУЖИЯ") +
        this.button(
          "cheat:MAXPLAYER",
          "MAXPLAYER · ПОЛНАЯ ПРОКАЧКА ПЕРСОНАЖА",
        ) +
        this.button("cheat:BARRAGE", "BARRAGE · РАКЕТНЫЙ ШТОРМ") +
        flag("AMMO", "ammo", "Бесконечные патроны") +
        flag("NORELOAD", "noReload", "Без перезарядки") +
        flag("GOD", "god", "Бессмертие") +
        '</div><p class="small">MAXWEAPONS выдаёт весь штатный арсенал и ставит обе ветки на V. MAXPLAYER развивает все импланты, восстанавливает здоровье и ресурсы в бою. BARRAGE выдаёт экспериментальную ракетницу с темпом ПП, без патронов и перезарядки.</p><div class="row"><label for="cheat-code">Чит-код</label><input id="cheat-code" maxlength="32" autocomplete="off" placeholder="MAXWEAPONS / MAXPLAYER / …">' +
        this.button("runCheat", "ВВЕСТИ") +
        '</div></section><div class="rule"></div><h3>Карты испытаний</h3><div class="row">' +
        this.button("testArena", "ОТКРЫТАЯ АРЕНА · БЕЗ ВНУТРЕННИХ СТЕН", true) +
        '</div><div class="level-grid">' +
        X.levels
          .map((l, i) =>
            this.button(
              "testLevel:" + (i + 1),
              String(i + 1).padStart(2, "0") + " · " + l.name,
            ),
          )
          .join("") +
        '</div><div class="row">' +
        (X.game.state === "pause"
          ? this.button("resume", "ВЕРНУТЬСЯ В БОЙ", true)
          : "") +
        this.button("menu", "ВЫЙТИ ИЗ ПОЛИГОНА") +
        "</div>",
      "debug",
    );
  },
  result(win, reason) {
    const g = X.game,
      final = g.number === 20;
    this.next = win ? g.number + 1 : g.number;
    this.show(
      '<div class="eyebrow">Отчёт операции / ' +
        g.number +
        "</div><h2>" +
        (X.Debug.active
          ? win
            ? "Полигон: сектор зачищен"
            : reason
          : win
            ? final
              ? "Источник заражения уничтожен"
              : "Сектор зачищен"
            : reason) +
        "</h2><p>" +
        (X.Debug.active
          ? "Результат не меняет сохранение кампании. Можно выбрать следующую карту для проверки."
          : win
            ? final
              ? "Кампания завершена. Бесконечная экспедиция разблокирована."
              : g.level.chapter + " · операция продолжается."
            : "Снаряжение до высадки сохранено. Выплачено 50% заработанных в бою кредитов. Использованные одноразовые импланты остаются израсходованными.") +
        '</p><div class="score-summary"><strong>' +
        X.RecordsUI.number(g.scoreResult?.points || 0) +
        "</strong> очков за скорость" +
        (X.Debug.active
          ? " · тестовый результат"
          : g.scoreResult?.rank
            ? " · место " + g.scoreResult.rank + " для этих условий"
            : "") +
        (g.scoreResult?.campaignPoints != null
          ? '<div class="small">Кампания: ' +
            X.RecordsUI.number(g.scoreResult.campaignPoints) +
            " очков" +
            (g.scoreResult.campaignRank
              ? " · место " + g.scoreResult.campaignRank
              : "") +
            "</div>"
          : "") +
        '</div><div class="stats"><div><b>' +
        g.kills +
        "</b>уничтожено</div><div><b>" +
        this.time(g.time) +
        "</b>время</div><div><b>" +
        g.creditsAwarded +
        "</b>кредиты получены</div><div><b>" +
        g.stats.shots +
        '</b>атак</div></div><p class="small">Коэффициент кредитов сложности: ×' +
        g.diff.economy.toLocaleString("ru-RU") +
        '</p><div class="row">' +
        this.button(
          X.Debug.active
            ? "debug"
            : win
              ? final
                ? "endless"
                : "shop"
              : "retry",
          X.Debug.active
            ? "ВЫБРАТЬ ТЕСТОВЫЙ УРОВЕНЬ"
            : win
              ? final
                ? "БЕСКОНЕЧНАЯ ЭКСПЕДИЦИЯ"
                : "СНАБЖЕНИЕ И СЛЕДУЮЩАЯ МИССИЯ"
              : "ПОВТОРИТЬ",
          true,
        ) +
        this.button("shop", "АРСЕНАЛ") +
        (X.Debug.active ? "" : this.button("records", "ТАБЛИЦА ЛИДЕРОВ")) +
        this.button("menu", "МЕНЮ") +
        "</div>",
      "result",
    );
  },
  time(n) {
    return (
      Math.floor(n / 60) + ":" + String(Math.floor(n % 60)).padStart(2, "0")
    );
  },
  settings() {
    const s = X.profile.settings,
      paused = X.game.state === "pause" || !!X.profile.checkpoint,
      names = {
        up: "Вперёд",
        down: "Назад",
        left: "Влево",
        right: "Вправо",
        reload: "Перезарядка",
        sprint: "Бег",
        dash: "Рывок",
        interact: "Взаимодействие",
        map: "Карта",
      };
    this.show(
      '<h2>Настройки и управление</h2><div class="columns"><div><div class="row"><label>Сложность (между миссиями)</label>' +
        this.select(
          "difficulty",
          X.difficulties.map((d) => d.name),
          X.profile.difficulty,
          paused,
        ) +
        '</div><div class="row"><label>Темп волн</label>' +
        this.select(
          "pace",
          ["Быстрый бой", "Стандартный", "Продолжительный"],
          [0.55, 1, 1.4].indexOf(s.pace),
          paused,
        ) +
        '</div><div class="row"><label>Качество</label>' +
        this.select("quality", ["Низкое", "Среднее", "Высокое"], s.quality) +
        "</div>" +
        ["lights", "blood", "shake", "mute", "musicEnabled"]
          .map(
            (k, i) =>
              '<div class="row"><label>' +
              [
                "Освещение",
                "Следы крови",
                "Дрожание камеры",
                "Отключить звук",
                "Фоновая музыка",
              ][i] +
              '</label><input type="checkbox" data-setting="' +
              k +
              '" ' +
              (s[k] ? "checked" : "") +
              "></div>",
          )
          .join("") +
        ["sfx", "music"]
          .map(
            (k, i) =>
              '<div class="row"><label>' +
              ["Громкость эффектов", "Громкость музыки"][i] +
              '</label><input type="range" data-volume="' +
              k +
              '" min="0" max="1" step=".05" value="' +
              s[k] +
              '"></div>',
          )
          .join("") +
        this.button("fullscreen", "ПОЛНЫЙ ЭКРАН") +
        this.button(
          "unlockEndless",
          X.profile.endless.unlocked
            ? "БЕСКОНЕЧНЫЙ РЕЖИМ УЖЕ ОТКРЫТ"
            : "РАЗБЛОКИРОВАТЬ БЕСКОНЕЧНЫЙ РЕЖИМ",
          false,
          X.profile.endless.unlocked,
        ) +
        "</div><div><h3>Переназначение клавиш</h3>" +
        Object.keys(names)
          .map(
            (k) =>
              '<div class="binding"><span>' +
              names[k] +
              "</span>" +
              this.button("key:" + k, s.keys[k].replace("Key", "")) +
              "</div>",
          )
          .join("") +
        '<p class="small">ЛКМ — основной огонь · ПКМ — альтернативный режим<br>Расход ПКМ зависит от оружия: смотрите описание в магазине.<br>Колесо — оружие · 1–9 — слоты · 0 — следующий слот<br>Esc — пауза · потеря фокуса останавливает бой.</p></div></div><div class="rule"></div><p class="small">Экспорт JSON включает активный профиль и три ручные ячейки. Импорт полного экспорта заменяет оба; старый одиночный JSON меняет только активный профиль.</p><div class="row">' +
        this.button("export", "ЭКСПОРТ JSON") +
        this.button("import", "ИМПОРТ JSON") +
        this.button("reset", "СБРОСИТЬ ПРОГРЕСС") +
        this.button("back", "НАЗАД", true) +
        "</div>" +
        (X.Save.warning ? '<p class="warn">' + X.Save.warning + "</p>" : ""),
      "settings",
    );
  },
  hud(g) {
    if (g.time - this.hudClock < 0.1 && g.time >= this.hudClock) return;
    this.hudClock = g.time;
    const p = g.player,
      w = X.weapons[g.weapon],
      boss = g.enemies.items.find((e) => e.active && e.boss),
      done = g.objectives.filter((o) => o.done).length,
      extra =
        g.level.mode === "defend"
          ? " · передатчик " +
            Math.ceil((Math.max(0, g.coreHp) / X.C.coreMaxHp) * 100) +
            "% · " +
            (done
              ? g.repairing
                ? "ремонт +" + X.C.coreRepairRate + " HP/с · огонь остановлен"
                : "отражайте волны · " +
                  X.profile.settings.keys.interact.replace("Key", "") +
                  " рядом: ремонт"
              : "активируйте " +
                X.profile.settings.keys.interact.replace("Key", ""))
          : g.level.mode === "timed"
            ? " · до аварии " +
              this.time(
                Math.max(0, g.level.limit * X.profile.settings.pace - g.time),
              )
            : "";
    this.hudEl.innerHTML =
      '<div class="hud-top"><div class="mission"><b>' +
      String(g.number).padStart(2, "0") +
      " / " +
      g.level.name +
      "</b><span>" +
      (g.ready()
        ? "ШЛЮЗ ОТКРЫТ · зелёный маркер на карте · " +
          X.profile.settings.keys.interact.replace("Key", "")
        : "Волна " +
          g.wave +
          "/" +
          g.level.waves +
          " · врагов " +
          (g.activeEnemies() + g.spawnQueue.length) +
          (g.objectives.length
            ? " · задачи " + done + "/" + g.objectives.length
            : "") +
          extra) +
      '</span></div><div class="hint">' +
      Math.min(999, Math.round(g.fps)) +
      (X.Debug.active ? " FPS · ПОЛИГОН · " : " FPS · ") +
      X.difficulties[X.profile.difficulty].name +
      "<br>Esc · пауза / " +
      X.profile.settings.keys.map.replace("Key", "") +
      " · карта<br>Очки за текущий темп: " +
      X.RecordsUI.number(X.Scoring.points(g.number, g.time, g.difficulty)) +
      '</div></div><div class="hud-bottom"><div class="vitals">ЗДОРОВЬЕ ' +
      Math.max(0, Math.ceil(p.hp)) +
      " / " +
      p.maxHp +
      '<div class="bar"><i style="width:' +
      Math.max(0, (p.hp / p.maxHp) * 100) +
      '%"></i></div><span class="hint">БРОНЯ ' +
      Math.ceil(p.armor) +
      ' · ВЫНОСЛИВОСТЬ</span><div class="bar stamina"><i style="width:' +
      (p.stamina / p.maxStamina) * 100 +
      '%"></i></div><span class="hint">' +
      Math.ceil(p.stamina) +
      "/" +
      p.maxStamina +
      " · РЫВКИ " +
      p.dashCharges +
      "/" +
      p.maxDashCharges +
      (p.dash > 0 ? " · +1 через " + p.dash.toFixed(1) + " с" : " · ГОТОВЫ") +
      " · УБИЙСТВА " +
      g.kills +
      "</span>" +
      (X.profile.upgrades.secondChance
        ? '<br><span class="hint">ВТОРОЙ ШАНС · ГОТОВ</span>'
        : g.reviveFX
          ? '<br><span class="hint">ВТОРОЙ ШАНС · ИЗРАСХОДОВАН</span>'
          : "") +
      '</div><div class="weapon"><div class="hint">' +
      w.name +
      "</div>" +
      (X.Armory.has(w)
        ? '<div class="hint">' +
          (g.mouse.right
            ? "ПКМ · " + X.Armory.definitions[w.id].b
            : "ЛКМ · " + X.Armory.definitions[w.id].a) +
          "</div>"
        : "") +
      "<strong>" +
      (w.ammo
        ? g.ammoStatus().mag + " <small>/ " + g.ammoStatus().total + "</small>"
        : "∞") +
      "</strong>" +
      (g.gunHint() ? '<div class="hint">' + g.gunHint() + "</div>" : "") +
      '<div class="hint">' +
      (w.ammo
        ? X.ammo[w.ammo].name + " · всего этого типа"
        : "Бесконечный ресурс") +
      '</div><div class="hint">' +
      (g.reload > 0
        ? "ПЕРЕЗАРЯДКА " + g.reload.toFixed(1)
        : g.charge > 0
          ? "ЗАРЯД " +
            Math.min(
              100,
              Math.round((g.charge / g.weaponCharge(g.mouse.right)) * 100),
            ) +
            "%"
          : X.profile.settings.keys.reload.replace("Key", "") +
            " · перезарядка / колесо · оружие") +
      '</div><div class="money">₡ ' +
      (X.profile.credits + g.earned) +
      "</div></div></div>" +
      (boss
        ? '<div class="boss">' +
          X.enemies[boss.type].name +
          '<div class="bar"><i style="width:' +
          Math.max(0, (boss.hp / boss.maxHp) * 100) +
          '%"></i></div></div>'
        : "");
  },
  action(a) {
    X.Audio.start();
    X.Audio.play("menu");
    let [act, v] = a.split(":"),
      p = X.profile,
      g = X.game;
    if (
      X.Debug.active &&
      [
        "new",
        "begin",
        "import",
        "export",
        "reset",
        "doreset",
        "slots",
        "saveSlot",
        "loadSlot",
        "doSaveSlot",
        "doLoadSlot",
      ].includes(act)
    ) {
      this.toast(
        "Для управления сохранением вернитесь из полигона в главное меню",
      );
      return;
    }
    switch (act) {
      case "slots":
        X.Slots.show();
        break;
      case "slotsBack":
        g.state === "pause" ? this.pause() : this.menu();
        break;
      case "saveSlot":
        X.Slots.confirm("save", +v);
        break;
      case "loadSlot":
        X.Slots.confirm("load", +v);
        break;
      case "doSaveSlot":
        X.Slots.save(+v);
        X.Slots.show();
        break;
      case "doLoadSlot":
        X.Slots.restore(+v);
        break;
      case "records":
        if (X.Debug.active) {
          this.toast("Таблицы рекордов доступны после выхода из полигона");
          break;
        }
        if (this.screen !== "records") {
          this.recordsReturn = { screen: this.screen };
          if (this.screen === "result") {
            X.RecordsUI.view.kind = g.scoreResult?.campaignRank
              ? "campaign"
              : "levels";
            X.RecordsUI.view.level = Math.min(20, g.number);
          }
        }
        X.RecordsUI.show(v);
        break;
      case "recordsBack":
        if (this.recordsReturn?.screen === "result")
          this.result(g.state === "victory", g.resultReason || "Боец погиб");
        else this.menu();
        break;
      case "debugEnter":
      case "debug":
        X.Debug.enter();
        this.debug();
        break;
      case "cheat":
        X.Debug.code(v);
        this.debug();
        break;
      case "runCheat":
        X.Debug.code(document.getElementById("cheat-code").value);
        this.debug();
        break;
      case "testLevel":
        if (X.Debug.active && Number.isInteger(+v) && +v >= 1 && +v <= 20)
          this.brief(+v);
        break;
      case "testArena":
        if (X.Debug.active) this.brief(0);
        break;
      case "toggleMusic":
      case "toggleMute": {
        const key = act === "toggleMusic" ? "musicEnabled" : "mute";
        p.settings[key] = !p.settings[key];
        X.Audio.settings();
        X.Save.write(p);
        this.pause();
        break;
      }
      case "new":
        p.stats.kills || p.completed.length || p.checkpoint
          ? this.confirm(
              "Новая кампания?",
              "Текущий прогресс будет заменён. Таблицы рекордов сохранятся. Экспортируйте JSON для резервной копии.",
              "setup",
            )
          : this.setup();
        break;
      case "setup":
        this.setup();
        break;
      case "begin": {
        const records = p.records,
          manualUnlock = p.endless.manualUnlock,
          settings = p.settings,
          difficulty = p.difficulty;
        X.profile = X.Save.defaults();
        X.profile.settings = settings;
        X.profile.records = records;
        X.profile.endless.manualUnlock = manualUnlock;
        X.profile.endless.unlocked = !!manualUnlock;
        X.profile.difficulty = difficulty;
        X.Save.write(X.profile);
        this.next = 1;
        g.start(1);
        break;
      }
      case "continue":
        if (p.checkpoint) g.start(p.checkpoint.number, p.checkpoint);
        else
          this.brief(
            p.resumeMode === "endless" && p.endless.unlocked
              ? p.endless.stage
              : p.level,
          );
        break;
      case "brief":
        if (+v + 1 <= p.unlocked) {
          if (p.checkpoint)
            this.confirm(
              "Начать миссию заново?",
              "Контрольная точка будет удалена. Снаряжение до высадки сохранится.",
              "discard:" + v,
            );
          else this.brief(+v + 1);
        }
        break;
      case "discard":
        p.checkpoint = null;
        X.Save.write(p);
        this.brief(+v + 1);
        break;
      case "levels":
        this.levels();
        break;
      case "deploy":
        p.checkpoint = null;
        X.Save.write(p);
        g.start(this.next);
        break;
      case "retry":
        this.brief(g.number);
        break;
      case "abandon":
        this.confirm(
          "Перезапустить миссию?",
          "Контрольная точка будет удалена.",
          "discard:" + (g.number - 1),
        );
        break;
      case "resume":
        g.resume();
        break;
      case "menu":
        this.menu();
        break;
      case "settings":
        this.settings();
        break;
      case "shop":
        this.shop();
        break;
      case "shopnext":
        this.brief(this.next || p.level);
        break;
      case "buyweapon":
        X.Economy.weapon(+v);
        this.shop();
        break;
      case "buyammo":
        X.Economy.ammo(v);
        this.shop();
        break;
      case "upgrade":
        X.Economy.upgrade(v);
        this.shop();
        break;
      case "mod":
        X.Economy.mod(+v);
        this.shop();
        break;
      case "tune":
        X.Economy.tune(+v);
        this.shop();
        break;
      case "unlockEndless":
        p.endless.manualUnlock = p.endless.unlocked = true;
        X.Save.write(p);
        this.settings();
        this.toast("Бесконечный режим открыт. Доступен в главном меню.");
        break;
      case "key":
        this.pendingKey = v;
        this.toast("Нажмите новую клавишу. Esc — отмена.", 8000);
        break;
      case "back":
        g.state === "pause" ? this.pause() : this.menu();
        break;
      case "export":
        if (g.state === "play") g.checkpoint();
        X.Save.export(p);
        break;
      case "import":
        document.getElementById("import").click();
        break;
      case "reset":
        this.confirm(
          "Удалить весь прогресс?",
          "Кампания, арсенал, кредиты, контрольная точка, рекорды и все три ручные ячейки будут удалены. Настройки сохранятся.",
          "doreset",
        );
        break;
      case "doreset": {
        let s = p.settings;
        X.profile = X.Save.defaults();
        X.profile.settings = s;
        X.Save.warning = "";
        X.Slots.clear();
        X.Save.write(X.profile);
        this.next = 1;
        this.menu();
        break;
      }
      case "fullscreen":
        document.fullscreenElement
          ? document.exitFullscreen()
          : document.documentElement
              .requestFullscreen()
              .catch(() => this.toast("Полный экран недоступен"));
        break;
      case "endless":
        if (p.endless.unlocked) this.endless();
        break;
      case "restartExpedition": {
        const seed = Number(document.getElementById("seed")?.value);
        if (!Number.isInteger(seed) || seed < 1 || seed > 4294967295) {
          this.toast("Введите целое число seed в указанном диапазоне");
          break;
        }
        this.restartSeed = seed;
        this.show(
          '<h2>Новая экспедиция с сектора 21?</h2><p>Текущая контрольная точка будет удалена. Прокачка, арсенал, деньги и рекорд экспедиций сохранятся. Для возврата к прежнему варианту сначала используйте ручную ячейку.</p><div class="row">' +
            this.button("doRestartExpedition", "НАЧАТЬ С СЕКТОРА 21", true) +
            this.button("endless", "ОТМЕНА") +
            "</div>",
          "restart-expedition",
        );
        break;
      }
      case "doRestartExpedition":
        if (!p.endless.unlocked || !Number.isInteger(this.restartSeed)) break;
        p.endless.stage = 21;
        p.endless.seed = this.restartSeed;
        p.resumeMode = "endless";
        p.checkpoint = null;
        X.Save.write(p);
        this.brief(21);
        break;
    }
  },
  endless() {
    this.show(
      '<div class="eyebrow">Экспедиция / процедурные сектора</div><h2>За пределами карантина</h2><p>Рекорд: сектор ' +
        X.profile.endless.best +
        ". Продолжение: " +
        X.profile.endless.stage +
        '. Каждая пятая экспедиция включает босса.</p><div class="row"><label>Seed (1–4294967295)</label><input id="seed" type="number" min="1" max="4294967295" value="' +
        X.profile.endless.seed +
        '"></div><div class="row">' +
        this.button(
          "expedition",
          "ПРОДОЛЖИТЬ · СЕКТОР " +
            (X.profile.checkpoint?.number > 20
              ? X.profile.checkpoint.number
              : X.profile.endless.stage),
          true,
        ) +
        this.button("restartExpedition", "НОВАЯ ЭКСПЕДИЦИЯ · С СЕКТОРА 21") +
        this.button("slots", "СОХРАНЕНИЯ · 3 ЯЧЕЙКИ") +
        this.button("menu", "НАЗАД") +
        "</div>",
      "endless",
    );
  },
};
document.addEventListener("pointerover", (e) => {
  const card = e.target.closest("[data-weapon]");
  if (card) X.UI.weaponTooltip(card, e.clientX, e.clientY);
});
document.addEventListener("pointermove", (e) => {
  const card = e.target.closest("[data-weapon]");
  if (card) X.UI.weaponTooltip(card, e.clientX, e.clientY);
});
document.addEventListener("pointerout", (e) => {
  const card = e.target.closest("[data-weapon]");
  if (card && !card.contains(e.relatedTarget)) X.UI.hideWeaponTooltip();
});
document.addEventListener("focusin", (e) => {
  const card = e.target.closest("[data-weapon]");
  if (card) X.UI.weaponTooltip(card);
});
document.addEventListener("focusout", (e) => {
  if (X.UI.tooltipCard && !X.UI.tooltipCard.contains(e.relatedTarget))
    X.UI.hideWeaponTooltip();
});
document.addEventListener(
  "scroll",
  () => {
    const card = X.UI.tooltipCard;
    if (!card) return;
    const rect = card.getBoundingClientRect(),
      panel = card.closest(".panel").getBoundingClientRect();
    if (
      rect.bottom > panel.top &&
      rect.top < panel.bottom &&
      (card.matches(":hover") || card.contains(document.activeElement))
    )
      X.UI.weaponTooltip(card);
    else X.UI.hideWeaponTooltip();
  },
  true,
);
window.addEventListener("resize", () => X.UI.hideWeaponTooltip());
X.game = new X.Game();
X.Render.init();
X.UI.menu();
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-act]");
  if (!b) return;
  if (b.dataset.act === "expedition") {
    const seed = Number(document.getElementById("seed").value);
    if (!Number.isInteger(seed) || seed < 1 || seed > 4294967295) {
      X.UI.toast("Введите целое число seed в указанном диапазоне");
      return;
    }
    if (seed !== X.profile.endless.seed) {
      X.profile.endless.seed = seed;
      X.profile.endless.stage = 21;
      X.profile.checkpoint = null;
    }
    X.Save.write(X.profile);
    if (X.profile.checkpoint?.number > 20)
      X.game.start(X.profile.checkpoint.number, X.profile.checkpoint);
    else X.UI.brief(X.profile.endless.stage);
  } else X.UI.action(b.dataset.act);
});
document.addEventListener("change", (e) => {
  if (e.target.id.startsWith("records-")) return;
  if (
    e.target.id === "difficulty" &&
    X.game.state !== "pause" &&
    !X.profile.checkpoint
  )
    X.profile.difficulty = +e.target.value;
  if (e.target.id === "quality") X.profile.settings.quality = +e.target.value;
  if (
    e.target.id === "pace" &&
    X.game.state !== "pause" &&
    !X.profile.checkpoint
  )
    X.profile.settings.pace = [0.55, 1, 1.4][+e.target.value];
  if (e.target.dataset.setting)
    X.profile.settings[e.target.dataset.setting] = e.target.checked;
  if (e.target.dataset.volume)
    X.profile.settings[e.target.dataset.volume] = +e.target.value;
  X.Save.write(X.profile);
  const creditMultiplier = document.getElementById("credit-multiplier");
  if (e.target.id === "difficulty" && creditMultiplier)
    creditMultiplier.textContent =
      X.difficulties[X.profile.difficulty].economy.toLocaleString("ru-RU");
  X.Audio.settings?.();
});
document.getElementById("import").addEventListener("change", async (e) => {
  try {
    if (X.Debug.active)
      throw Error("Выйдите из полигона перед импортом сохранений");
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 8e6) throw Error("Файл слишком большой");
    const data = JSON.parse(await f.text()),
      profile = X.Save.validate(data);
    if (X.Debug.active)
      throw Error("Выйдите из полигона перед импортом сохранений");
    if (Object.hasOwn(data, "saveSlots")) X.Slots.importData(data.saveSlots);
    X.profile = profile;
    X.Save.write(profile);
    X.UI.menu();
    X.UI.toast(
      "Профиль импортирован" + (X.Slots.notice ? ". " + X.Slots.notice : ""),
    );
  } catch (err) {
    X.UI.toast("Ошибка импорта: " + err.message);
  }
  e.target.value = "";
});
window.addEventListener("keydown", (e) => {
  if (
    e.code === "Escape" &&
    X.UI.screen === "shop" &&
    !document.getElementById("weapon-tooltip").hidden
  ) {
    X.UI.hideWeaponTooltip();
    e.preventDefault();
    return;
  }
  if (e.code === "Tab" && X.game.state !== "play") return;

  if (e.target.id === "cheat-code" && e.code === "Enter") {
    e.preventDefault();
    X.UI.action("runCheat");
    return;
  }
  if (X.UI.pendingKey) {
    e.preventDefault();
    let k = X.UI.pendingKey;
    X.UI.pendingKey = null;
    if (e.code === "Escape") {
      X.UI.toast("Переназначение отменено");
      return;
    }
    if (
      !/^(Key[A-Z]|ShiftLeft|ShiftRight|Space|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|ControlLeft)$/.test(
        e.code,
      ) ||
      Object.entries(X.profile.settings.keys).some(
        ([id, c]) => id !== k && c === e.code,
      )
    ) {
      X.UI.toast("Клавиша занята или зарезервирована");
      return;
    }
    X.profile.settings.keys[k] = e.code;
    X.Save.write(X.profile);
    X.UI.settings();
    return;
  }
  if (e.target.matches("input,select,button")) {
    if (e.code !== "Escape") return;
    e.target.blur();
  }
  if (
    [
      "Space",
      "Tab",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
    ].includes(e.code)
  )
    e.preventDefault();
  if (e.code === "Escape") {
    if (X.game.state === "play") X.game.pause();
    else if (X.game.state === "pause") X.game.resume();
    return;
  }
  if (X.game.state !== "play") return;
  X.game.keys.add(e.code);
  if (e.repeat) return;
  const k = X.profile.settings.keys;
  if (e.code === k.reload) X.game.beginReload();
  if (e.code === k.map) X.game.mapOpen = !X.game.mapOpen;
  if (/^Digit[1-9]$/.test(e.code)) X.game.switchWeapon(+e.code.slice(5) - 1);
  if (e.code === "Digit0") X.game.cycle(1);
});
window.addEventListener("keyup", (e) => X.game.keys.delete(e.code));
X.Render.canvas.addEventListener("mousemove", (e) => {
  const r = X.Render.canvas.getBoundingClientRect(),
    scale = Math.min(r.width / 1152, r.height / 648);
  X.game.mouse.x = (e.clientX - r.left - (r.width - 1152 * scale) / 2) / scale;
  X.game.mouse.y = (e.clientY - r.top - (r.height - 648 * scale) / 2) / scale;
});
X.Render.canvas.addEventListener("mousedown", (e) => {
  X.Audio.start();
  if (X.game.state !== "play") return;
  if (e.button === 0) X.game.mouse.left = true;
  if (e.button === 2) X.game.mouse.right = true;
});
window.addEventListener("mouseup", (e) => {
  if (e.button === 0) X.game.mouse.left = false;
  if (e.button === 2) X.game.mouse.right = false;
});
X.Render.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
X.Render.canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    if (X.game.state === "play") X.game.cycle(e.deltaY > 0 ? 1 : -1);
  },
  { passive: false },
);
window.addEventListener("blur", () => X.game.pause());
document.addEventListener("visibilitychange", () => {
  if (document.hidden) X.game.pause();
});
window.addEventListener("pagehide", () => {
  if (X.game.state === "play") X.game.checkpoint();
});
requestAnimationFrame((t) => X.game.frame(t));
