"use strict";
X.generate = function (number, seed) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const rng = new X.RNG(
        (seed ^
          Math.imul(number, 2654435761) ^
          Math.imul(attempt, 2246822519)) >>>
          0,
      ),
      nodes = Array.from({ length: 9 }, (_, i) => i);
    for (let i = 8; i > 0; i--) {
      let j = rng.int(0, i);
      [nodes[i], nodes[j]] = [nodes[j], nodes[i]];
    }
    const count = rng.int(7, 9),
      rooms = [],
      centers = [];
    for (const n of nodes.slice(0, count)) {
      let x = 2 + (n % 3) * 18 + rng.int(0, 2),
        y = 2 + Math.floor(n / 3) * 14 + rng.int(0, 1),
        w = rng.int(10, 14),
        h = rng.int(8, 11);
      rooms.push([x, y, w, h]);
      centers.push([x + Math.floor(w / 2), y + Math.floor(h / 2)]);
    }
    // Каждый новый узел присоединяется к ближайшему предыдущему: связный остов.
    for (let i = 1; i < count; i++) {
      let a = centers[i],
        b = centers
          .slice(0, i)
          .reduce((best, p) =>
            Math.hypot(p[0] - a[0], p[1] - a[1]) <
            Math.hypot(best[0] - a[0], best[1] - a[1])
              ? p
              : best,
          ),
        mid = rng.next() < 0.5 ? [b[0], a[1]] : [a[0], b[1]];
      const link = (p, q) =>
        rooms.push([
          Math.min(p[0], q[0]) - 1,
          Math.min(p[1], q[1]) - 1,
          Math.abs(p[0] - q[0]) + 4,
          Math.abs(p[1] - q[1]) + 4,
        ]);
      link(a, mid);
      link(mid, b);
    }
    // Дополнительная петля даёт обходной маршрут.
    const a = centers[0],
      b = centers[count - 1];
    rooms.push(
      [Math.min(a[0], b[0]) - 1, a[1] - 1, Math.abs(a[0] - b[0]) + 4, 4],
      [b[0] - 1, Math.min(a[1], b[1]) - 1, 4, Math.abs(a[1] - b[1]) + 4],
    );
    const blocks = [];
    for (const [x, y, w, h] of rooms.slice(0, count))
      if (rng.next() < 0.7) blocks.push([x + 2, y + 2, 2, 2]);
    let mode =
      number % 5 === 0
        ? "boss"
        : ["activate", "nests", "clear", "defend"][((number - 21) % 5) % 4];
    const start = centers[0],
      exit = centers
        .slice(1)
        .reduce((best, p) =>
          Math.hypot(p[0] - start[0], p[1] - start[1]) >
          Math.hypot(best[0] - start[0], best[1] - start[1])
            ? p
            : best,
        );
    const targets =
      mode === "activate" || mode === "nests"
        ? centers.slice(1, 4)
        : mode === "defend"
          ? [centers[1]]
          : [];
    const level = {
      name: "Экспедиция " + (number - 20),
      chapter: "За пределами карантина",
      theme: rng.int(0, 3),
      w: 58,
      h: 46,
      rooms,
      blocks,
      start,
      exit,
      spawns: centers.slice(1),
      targets,
      resources: centers.slice(1),
      mode,
      boss: 10 + (Math.floor(number / 5) % 4),
      waves: Math.min(10, 8 + Math.floor((number - 21) / 15)),
      interval: 40,
      types: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      brief:
        "Процедурный сектор · seed " +
        seed +
        ". " +
        {
          activate: "Активируйте силовые узлы.",
          nests: "Уничтожьте биологические гнёзда.",
          clear: "Зачистите все помещения.",
          defend: "Активируйте и защитите передатчик.",
          boss: "Уничтожьте доминирующую особь.",
        }[mode] +
        " Затем доберитесь до шлюза. Масштабирование ограничено; поздние сектора усиливают состав стаи.",
    };
    try {
      X.makeMap(level);
      return level;
    } catch (e) {
      /* Новый детерминированный вариант при нарушении связности. */
    }
  }
  throw Error("Не удалось построить связный сектор");
};
