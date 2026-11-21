// A pocket static server for trying the studio locally: `node serve.ts`
// serves the app/ folder on http://localhost:8080. Standard library only,
// no caching, and no path may escape app/.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = fileURLToPath(new URL('./app/', import.meta.url));
const PORT = 8080;

const TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.json', 'application/json'],
]);

const server = createServer((req, res) => {
  let path;
  try {
    path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  } catch {
    res.writeHead(400).end('bad path');
    return;
  }
  if (path === '/') path = '/index.html';
  const file = join(appRoot, normalize(path).replace(/^[/\\]+/, ''));
  if (!file.startsWith(appRoot) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, {
    'content-type': TYPES.get(extname(file).toLowerCase()) ?? 'application/octet-stream',
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(res);
});

server.listen(PORT, () => console.log(`Leonida Cover Studio at http://localhost:${PORT}`));
