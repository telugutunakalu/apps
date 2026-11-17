// Generate gallery thumbnails (thumbs/<slug>.jpg), the social preview (thumbs/og.jpg) and app icons (icons/*.png).
//   node tools/thumbs.mjs            (needs Chrome; CHROME_PATH overrides /usr/bin/google-chrome)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { startServer } from "../tests/serve.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
fs.mkdirSync(path.join(ROOT, "thumbs"), { recursive: true });
fs.mkdirSync(path.join(ROOT, "icons"), { recursive: true });
const PORT = 8790, server = await startServer(PORT), BASE = `http://127.0.0.1:${PORT}/apps/`;
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const { apps } = JSON.parse(fs.readFileSync(path.join(ROOT, "apps.json"), "utf8"));

// icons: drawn by the browser so the Telugu text is shaped correctly
const page = await browser.newPage();
await page.goto(BASE + "index.html"); await page.waitForTimeout(800);
for (const [name, size, pad] of [["icon-192", 192, 0], ["icon-512", 512, 0], ["maskable-512", 512, 0.12]]) {
  const dataUrl = await page.evaluate(async ({ size, pad }) => {
    await document.fonts.load("100px Ramabhadra", "తు");
    const c = document.createElement("canvas"); c.width = c.height = size;
    const g = c.getContext("2d");
    const grad = g.createLinearGradient(0, 0, size, size); grad.addColorStop(0, "#ff8a3d"); grad.addColorStop(1, "#f2b544");
    g.fillStyle = pad ? "#ff8a3d" : "#0f0c16"; g.fillRect(0, 0, size, size);
    const inset = size * (pad || 0.06), r = size * 0.22;
    g.fillStyle = grad; g.beginPath(); g.roundRect(inset, inset, size - inset * 2, size - inset * 2, pad ? 0 : r); g.fill();
    g.fillStyle = "#1f0c00"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `${size * (pad ? 0.42 : 0.5)}px Ramabhadra`; g.fillText("తు", size / 2, size * 0.54);
    return c.toDataURL("image/png");
  }, { size, pad });
  fs.writeFileSync(path.join(ROOT, "icons", `${name}.png`), Buffer.from(dataUrl.split(",")[1], "base64"));
  console.log("icon", name);
}
await page.close();

// thumbnails: each live app at 800×500, overlays hidden, after its scene has rendered
for (const a of apps.filter(x => x.live)) {
  const p = await browser.newPage({ viewport: { width: 800, height: 500 } });
  await p.addInitScript(() => { try { localStorage.clear(); } catch {} });
  await p.goto(`${BASE}${a.slug}.html`, { waitUntil: "load" }).catch(() => {});
  // headless Linux has no emoji font: load one so picture clues render in the thumbnail
  await p.addStyleTag({ url: "https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap" }).catch(() => {});
  await p.waitForTimeout(1500);
  // show gameplay, not the start card: press the primary card button (start → level intro → play)
  for (let k = 0; k < 2; k++) {
    const btn = p.locator(".tt-overlay:not([hidden]) .tt-card .tt-btn:not(.tt-btn--ghost)").first();
    if (await btn.isVisible().catch(() => false)) { await btn.click().catch(() => {}); await p.waitForTimeout(1500); }
  }
  await p.waitForTimeout(2500);
  await p.addStyleTag({ content: ".tt-overlay,.tt-toasts,.loading,dialog{display:none!important}" }).catch(() => {});
  await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(ROOT, "thumbs", `${a.slug}.jpg`), type: "jpeg", quality: 72 });
  console.log("thumb", a.slug);
  await p.close();
}
// social preview of the gallery
const og = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await og.goto(BASE + "index.html"); await og.waitForTimeout(3500);
await og.screenshot({ path: path.join(ROOT, "thumbs", "og.jpg"), type: "jpeg", quality: 78 });
await browser.close(); server.close();
console.log("done");
