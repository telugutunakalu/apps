// తెలుగు తునకలు · service worker — lets the apps work offline once visited / installed.
// Strategy: pages, data and the kit are network-first (always fresh when online, cached copy offline);
// three.js vendor files and Google Fonts are cache-first (they never change).
const VERSION = "tt-2026-11-17";
const CORE = [
  "./", "index.html", "apps.json", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png",
  "lib/v1/tt.css", "lib/v1/shell.js", "lib/v1/safe.js", "lib/v1/sfx.js", "lib/v1/telugu.js", "lib/v1/words.js",
  "lib/v1/three-kit.js", "lib/v1/data/words.json",
  "lib/v1/vendor/three/three.module.min.js",
  "lib/v1/vendor/three/addons/postprocessing/EffectComposer.js", "lib/v1/vendor/three/addons/postprocessing/RenderPass.js",
  "lib/v1/vendor/three/addons/postprocessing/UnrealBloomPass.js", "lib/v1/vendor/three/addons/postprocessing/OutputPass.js",
  "lib/v1/vendor/three/addons/postprocessing/Pass.js", "lib/v1/vendor/three/addons/postprocessing/ShaderPass.js",
  "lib/v1/vendor/three/addons/postprocessing/MaskPass.js", "lib/v1/vendor/three/addons/shaders/CopyShader.js",
  "lib/v1/vendor/three/addons/shaders/LuminosityHighPassShader.js", "lib/v1/vendor/three/addons/shaders/OutputShader.js",
];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(CORE);
    try {   // also pre-cache every live app page listed in the gallery
      const { apps } = await (await fetch("apps.json", { cache: "no-cache" })).json();
      await Promise.allSettled(apps.filter(a => a.live).map(a => cache.add(`${a.slug}.html`)));
    } catch { /* offline install: pages get cached on first visit instead */ }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== VERSION) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const font = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== location.origin && !font) return;
  if (font || url.pathname.includes("/vendor/")) e.respondWith(cacheFirst(req));
  else e.respondWith(networkFirst(req));
});

async function cacheFirst(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === "opaque") (await caches.open(VERSION)).put(req, res.clone());
  return res;
}
async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (res.ok) (await caches.open(VERSION)).put(req, res.clone());
    return res;
  } catch {
    const hit = await caches.match(req, { ignoreSearch: req.mode === "navigate" });
    if (hit) return hit;
    if (req.mode === "navigate") return (await caches.match("index.html")) ?? Response.error();
    return Response.error();
  }
}
