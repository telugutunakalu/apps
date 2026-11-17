// Promote a tested build from next/ to the live root.
//   node tools/promote.mjs carushikaru          (moves next/carushikaru.html → carushikaru.html)
//   node tools/promote.mjs carushikaru --dry    (show what would change)
// Rewrites "../" references (lib/, gallery link, data) to "./" ones, drops the
// noindex tag, and marks the app as upgraded in apps.json. Review with `git diff`, then commit.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [slug, flag] = process.argv.slice(2);
if (!slug) { console.error("usage: node tools/promote.mjs <slug> [--dry]"); process.exit(1); }
const src = path.join(ROOT, "next", `${slug}.html`), dst = path.join(ROOT, `${slug}.html`);
if (!fs.existsSync(src)) { console.error(`missing ${path.relative(ROOT, src)}`); process.exit(1); }

let html = fs.readFileSync(src, "utf8");
const before = (html.match(/(["'(`])\.\.\//g) ?? []).length;
// "../x" → "./x" (not "x"): import-map addresses must start with "./", "../" or "/".
html = html.replace(/(["'(`])\.\.\//g, "$1./").replace(/\s*<meta name="robots" content="noindex">/, "");
const left = (html.match(/\.\.\//g) ?? []).length;

console.log(`${path.relative(ROOT, src)} → ${path.relative(ROOT, dst)}: rewrote ${before} "../" reference(s)${left ? `, ${left} left — check them!` : ""}`);
if (flag === "--dry") process.exit(0);

fs.writeFileSync(dst, html);
fs.rmSync(src);
const mPath = path.join(ROOT, "apps.json");
const manifest = JSON.parse(fs.readFileSync(mPath, "utf8"));
const entry = manifest.apps.find(a => a.slug === slug);
if (entry) Object.assign(entry, { live: true, next: false, upgraded: true });
fs.writeFileSync(mPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`apps.json: ${slug} marked live + upgraded. Next: npm run smoke -- ${slug}.html && git diff`);
