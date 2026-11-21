// Leonida Cover Studio — handover program.
// The studio itself is the static web app in app/ (open app/index.html in a
// browser, or `node serve.ts` and visit localhost:8080). This program's job
// is only delivery: copy app/ and screenshots/ into the output directory
// and stamp the folder with the dossier the judges read, built by the
// vendored make.fun library so the bytes match what the scorer rebuilds.
// Run it with:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(here, 'app'), join(outDir, 'app'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// My own housekeeping on top of the plumbing: a cover studio that ships
// without its proof shots is not finished, so refuse to hand over an entry
// whose screenshots folder is short, and log a one-line manifest of what
// actually went out the door.
const shotNames = existsSync(join(here, 'screenshots'))
  ? readdirSync(join(here, 'screenshots')).filter((n) => /\.(png|jpe?g)$/i.test(n)).sort()
  : [];
if (shotNames.length < 3) {
  throw new Error(`handover refused: only ${shotNames.length} screenshot(s) present, need at least 3`);
}
const shotBytes = shotNames.reduce((n, name) => n + statSync(join(here, 'screenshots', name)).size, 0);
const appFiles = readdirSync(join(here, 'app'), { recursive: true }).length;
console.log(`leonida-cover-studio: ${shotNames.length} screenshots (${shotBytes} bytes), ${appFiles} app entries -> ${outDir}`);

writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
