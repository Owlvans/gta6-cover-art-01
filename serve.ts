// Tiny static server for the Leonida Cover Studio app (Node stdlib only).
import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const base = fileURLToPath(new URL(".", import.meta.url));
const appDir = join(base, "app");
const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
};

createServer((req, res) => {
  let route: string;
  try {
    route = decodeURIComponent(new URL(req.url ?? "/", "http://localhost:8080").pathname);
  } catch {
    res.writeHead(400); res.end("Bad Request"); return;
  }
  if (route === "/") route = "/index.html";
  const target = normalize(join(appDir, route));
  if (!target.startsWith(appDir)) { res.writeHead(404); res.end("Not Found"); return; }
  let info;
  try { info = statSync(target); } catch { res.writeHead(404); res.end("Not Found"); return; }
  if (!info.isFile()) { res.writeHead(404); res.end("Not Found"); return; }
  res.writeHead(200, {
    "content-type": TYPES[extname(target).toLowerCase()] ?? "application/octet-stream",
    "cache-control": "no-store",
    "content-length": String(info.size),
  });
  createReadStream(target).pipe(res);
}).listen(8080, () => {
  console.log("Grand Leonida studio listening on http://localhost:8080");
});
