// Static server that mirrors GitHub Pages: the repo is served under /apps/.
//   npm run serve  →  http://localhost:8080/apps/next/kit-demo.html
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".webp": "image/webp", ".mp4": "video/mp4", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8" };

export function startServer(port = 8080) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    if (!url.pathname.startsWith("/apps/")) { res.writeHead(302, { location: "/apps/" }); return res.end(); }
    let file = path.join(ROOT, decodeURIComponent(url.pathname.slice("/apps/".length)));
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404); return res.end("not found"); }
      res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream", "cache-control": "no-store" });
      res.end(buf);
    });
  });
  return new Promise(resolve => server.listen(port, "127.0.0.1", () => resolve(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = +(process.env.PORT || 8080);
  await startServer(port);
  console.log(`serving ${ROOT} at http://localhost:${port}/apps/`);
}
