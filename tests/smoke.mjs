// Smoke test every page at phone, small-phone, landscape and desktop sizes.
//   STRICT pages (next/* and apps marked "upgraded" in apps.json) must have:
//     no page errors / console errors, no horizontal overflow.
//   LEGACY pages are only reported (they get fixed by being upgraded).
// Screenshots land in tests/.out/ (uploaded as a CI artifact).
//   npm run smoke            all pages
//   npm run smoke -- next/carushikaru.html   one page
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { startServer } from "./serve.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tests", ".out");
fs.mkdirSync(OUT, { recursive: true });
const VIEWPORTS = [
  { name: "phone", width: 390, height: 844, mobile: true },
  { name: "small", width: 320, height: 640, mobile: true },
  { name: "landscape", width: 844, height: 390, mobile: true },
  { name: "desktop", width: 1280, height: 800, mobile: false },
];

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "apps.json"), "utf8"));
const upgraded = new Set(manifest.apps.filter(a => a.upgraded).map(a => `${a.slug}.html`));
const nextPages = fs.existsSync(path.join(ROOT, "next")) ? fs.readdirSync(path.join(ROOT, "next")).filter(f => f.endsWith(".html")).map(f => `next/${f}`) : [];
const livePages = manifest.apps.filter(a => a.live).map(a => `${a.slug}.html`);
const only = process.argv.slice(2);
const pages = (only.length ? only : [...nextPages, ...livePages]).map(p => ({ page: p, strict: p.startsWith("next/") || upgraded.has(p) }));

const PORT = 8090 + Math.floor(Math.random() * 500);
const server = await startServer(PORT);
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
});

let failures = 0;
for (const { page: pagePath, strict } of pages) {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.mobile, hasTouch: vp.mobile, deviceScaleFactor: vp.mobile ? 2 : 1 });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", e => errors.push("pageerror: " + e.message));
    page.on("console", m => { if (m.type() === "error" && !/favicon|fonts\.g/.test(m.text())) errors.push("console: " + m.text().slice(0, 200)); });
    page.on("requestfailed", r => { if (!/fonts\.(googleapis|gstatic)/.test(r.url())) errors.push("requestfailed: " + r.url()); });
    try {
      await page.goto(`http://127.0.0.1:${PORT}/apps/${pagePath}`, { waitUntil: "load", timeout: 30000 });
      await page.waitForTimeout(1800);
    } catch (e) { errors.push("load: " + e.message.split("\n")[0]); }
    const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: innerWidth })).catch(() => ({ sw: 0, w: 0 }));
    if (m.sw > m.w + 1) errors.push(`horizontal overflow: ${m.sw}px > ${m.w}px`);
    const shot = path.join(OUT, `${pagePath.replace(/[\/.]/g, "_")}_${vp.name}.png`);
    await page.screenshot({ path: shot }).catch(() => {});
    const status = errors.length ? (strict ? "FAIL" : "warn") : "ok";
    if (status === "FAIL") failures++;
    console.log(`${status.padEnd(4)} ${pagePath} @${vp.name}${errors.length ? "\n       " + errors.slice(0, 5).join("\n       ") : ""}`);
    await ctx.close();
  }
}
await browser.close();
server.close();
console.log(failures ? `\n${failures} strict failure(s)` : "\nall strict checks passed");
process.exit(failures ? 1 : 0);
