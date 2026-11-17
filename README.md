# తెలుగు తునకలు — apps

Live: <https://telugutunakalu.github.io/apps/> · Staging (beta): <https://telugutunakalu.github.io/apps/next/>

Every app is one HTML file at the repo root and its URL never changes. Upgraded apps load
the shared kit in `lib/v1/` for the design system, Telugu text handling, game shell and
three.js helpers.

## Layout
| Path | What |
|------|------|
| `*.html` | Live apps (GitHub Pages serves `main`) |
| `next/` | Staging: upgraded builds under test, `noindex`, not linked from the live gallery. `next/index.html` lists them; `next/kit-demo.html` shows every kit module |
| `lib/v1/` | Shared kit: `tt.css` (design tokens + components), `telugu.js` (aksharas, గుణింతం, digits, look-alikes), `shell.js` (top bar, settings, overlays, loop, input), `sfx.js` (sounds, Telugu speech), `three-kit.js` (renderer, Telugu glyph textures, particles, sky, voxels), `safe.js` (DOM without innerHTML), `words.js` + `data/words.json` (word bank), `vendor/three/` (three.js r160) |
| `apps.json` | Gallery data: one entry per Telugu app |
| `tests/` | `unit/` (node:test), `smoke.mjs` (Playwright at 4 screen sizes), `serve.mjs` (local server mirroring Pages) |
| `tools/promote.mjs` | Moves a tested build from `next/` to the root |

## Develop
```sh
npm install
npm run serve          # http://localhost:8080/apps/next/kit-demo.html
npm test               # unit tests
npm run smoke          # every page at 390×844, 320×640, 844×390, 1280×800 (needs Chrome)
```
ES modules don't load over `file://`, so always use the server.

## Shipping an upgraded app
1. Build it as `next/<slug>.html`. Set `"next": true` in `apps.json` so the beta gallery links it.
2. `npm test && npm run smoke -- next/<slug>.html`, then try it on a real Android and iPhone at `…/apps/next/<slug>.html`.
3. `node tools/promote.mjs <slug>`. This moves it to `<slug>.html`, rewrites `../` paths and marks it upgraded.
4. Review `git diff`, commit and push. To roll back, `git revert` the commit.

## Rules
- **URLs never change.** People share links on WhatsApp.
- **No `innerHTML` with dynamic text.** Use `el()` from `lib/v1/safe.js`. All apps share one origin and one localStorage.
- **Mobile first.** 320px to desktop, portrait and landscape. Controls are visible without scrolling and are at least 44px.
- **Telugu correctness.** Split words with `aksharalu()`, never `split('')`. Wait for `fontsReady()` before drawing text to a canvas.
- **`lib/v1` is append-only.** A breaking change goes into `lib/v2/` so live apps never break.

Licence: CC0 1.0 (see `LICENSE`). three.js is MIT (`lib/v1/vendor/three/LICENSE`).
