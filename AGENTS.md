# AGENTS.md

Desktop expense tracker built with Electron — plain JS, no framework, no bundler, no TypeScript. See [README.md](README.md) for features and usage instructions.

## Architecture

Standard Electron 3-process split — don't introduce exceptions to this pattern:

- **[main.js](main.js)** — main process. Owns the in-memory `data` object (`{ budget, expenses }`), reads/writes it to `data.json` in `app.getPath('userData')`, and computes overspend. All main↔renderer communication goes through `ipcMain.handle`/`ipcMain.on`.
- **[preload.js](preload.js)** — the only bridge to the renderer, via `contextBridge.exposeInMainWorld('electronAPI', ...)`. `main.js` sets `contextIsolation: true` and `nodeIntegration: false`; keep it that way — never expose `ipcRenderer` or Node APIs to the renderer directly.
- **renderer/** — plain HTML/CSS/JS, no bundler or module system. [renderer/app.js](renderer/app.js) is loaded via a single `<script>` tag in [renderer/index.html](renderer/index.html); all functions/state live in global scope (see the `STATE` object at the top of `app.js`).

Adding a new IPC call means editing three places in lockstep: the handler in `main.js`, the exposed method in `preload.js`, and the `window.electronAPI.*` call site in `renderer/app.js`.

## Data model

- `expenses`: `{ id, amount, category, description, date: 'YYYY-MM-DD', createdAt: epoch-ms }`
- `budget`: `{ type: 'daily'|'weekly'|'monthly', amount, setDate }`
- Persisted as a single JSON blob at `data.json` with no schema versioning — if you change the shape of `data`, add a migration in `loadData()` in `renderer/app.js` (see the existing `if (!STATE.budget.setDate)` backfill for the pattern).
- Period-boundary logic (start of day/week/month) is duplicated in both `main.js` (`getWeekStart`) and `renderer/app.js` (`weekStartISO`, etc.) — keep both in sync if the definition changes.

## Conventions

- Categories are a fixed set defined in two places that must stay in sync: `CATEGORY_MAP` in `renderer/app.js` and the `<select id="expenseCategory">` options in `renderer/index.html`.
- Any user-entered text (e.g. expense description) must go through `escapeHtml()` before being inserted via `innerHTML` — existing XSS-prevention pattern in `renderer/app.js`.

## Build and run

- `npm start` — run the app in dev mode.
- `npm run build:win` / `build:mac` / `build:linux` / `build:all` — package via `electron-builder` (config lives in [package.json](package.json)).
- No test suite or linter is configured in this project.
