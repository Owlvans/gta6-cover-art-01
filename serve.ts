import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { join, normalize, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const appRoot = join(root, "app");
const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
};

const server = createServer((req, res) => {
  let pathname: string;
  try {
    const url = new URL(req.url ?? "/", "http://localhost:8080");
    pathname = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400); res.end("Bad Request"); return;
  }
  if (pathname === "/") pathname = "/index.html";
  const filePath = normalize(join(appRoot, pathname));
  if (!filePath.startsWith(appRoot)) { res.writeHead(404); res.end("Not Found"); return; }
  let st;
  try { st = statSync(filePath); } catch { res.writeHead(404); res.end("Not Found"); return; }
  if (!st.isFile()) { res.writeHead(404); res.end("Not Found"); return; }
  res.writeHead(200, {
    "content-type": MIME[extname(filePath).toLowerCase()] ?? "application/octet-stream",
    "cache-control": "no-store",
    "content-length": String(st.size),
  });
  createReadStream(filePath).pipe(res);
});
server.listen(8080, () => {
  console.log("Leonida Cover Studio at http://localhost:8080");
});
