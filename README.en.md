# XENOCIDE

## Play in your browser

**[▶ Play XENOCIDE](https://user-is-absinthe.github.io/XENOCIDE/)**

Open the link on a computer, choose “Новая кампания” (New campaign), then start the operation. A keyboard and mouse are required. No installation is needed; audio starts after your first interaction. The game interface is in Russian.

The game is hosted on GitHub Pages. The repository page on github.com displays the source code; the link above opens the game itself. An internet connection is needed to load the page. There are no game servers or player accounts.

[Русская версия README](README.md)

XENOCIDE is a single-player, top-down sci-fi horde shooter with 20 campaign maps, bosses, 13 weapons with alternate attacks and upgrades, implants, endless seeded expeditions, and a sandbox with cheats. Graphics and audio are generated procedurally in the browser.

**This game was created with the help of GPT-6.1 Sol.**

## Controls

| Action | Input |
| --- | --- |
| Move / aim | WASD / mouse |
| Primary / alternate attack | Left / right mouse button |
| Reload / sprint / dash | R / Shift / Space |
| Interact | E; hold for terminals and repairs |
| Switch weapons | Mouse wheel, 1–9; 0 selects the next slot |
| Map / pause | M / Esc |

Main keys can be rebound in settings. After completing the objective, reach the airlock and press E.

## Saves and offline play

Progress, settings, three manual save slots, and local records are stored in your browser (`localStorage`). Export and import a JSON file in settings to transfer them. The online game, local folders, and different browser profiles do not share saves automatically. If browser storage is unavailable, export your save before closing the game.

To play without an internet connection:

1. Select **Code → Download ZIP** on the repository page and extract the entire archive.
2. Open `dist/index.html` in Microsoft Edge. Playing requires no server, Python, or Node.js.
3. To move the game to another computer, copy the entire `dist` folder, including `src` and `style.css`, and transfer your exported save separately.

Project checks have been run in Microsoft Edge on Windows 11. Other browsers, Windows 10, and low-end computers need separate verification. See [TESTING.md](TESTING.md) (Russian).

## Development

The game uses JavaScript, Canvas 2D, and Web Audio, with no game engine or network dependencies during gameplay. Source code lives in `src/`, the entry page is `index.html`, and the portable build is in `dist/`. The root `index.html` also runs without a build step.

Development tools require Python 3.12+, Node.js, and Microsoft Edge for browser tests. Keep dependencies local to the project; reuse `.venv` if it already exists:

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements-dev.txt
npm ci --ignore-scripts --no-audit --no-fund
```

```powershell
npm run format
.venv\Scripts\python tools\build.py
.venv\Scripts\python tools\test.py
.venv\Scripts\python tools\browser_test.py
.venv\Scripts\python tools\visual_test.py
```

`build.py` updates `dist/` and creates a local `XENOCIDE-offline.zip`. `test.py` checks syntax, assets, maps, and build consistency. Browser tests use separate Edge profiles inside `.venv`; reports and screenshots go to `artifacts/`. Development environments, test artifacts, and the build archive are excluded from Git.

### GitHub Pages deployment

The [Deploy game to GitHub Pages](.github/workflows/pages.yml) workflow builds the game, runs static checks, and publishes `dist/` on pushes to `master`. It can also be started manually in Actions. Set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**. See the [GitHub Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

### Project documentation

The following documents are in Russian:

- [Gameplay, sandbox, and game update history](GAMEPLAY.ru.md).
- [Architecture](ARCHITECTURE.md).
- [Verification results and known limitations](TESTING.md).
- [Development roadmap](ROADMAP.md) and [project progress](PROGRESS.md).
