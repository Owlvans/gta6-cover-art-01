// Leonida Cover Studio — hand-in program for gta6-cover-art-01 (Node 22, standard library only).
// The app itself lives in app/ as plain static files that run offline in a desktop browser:
// a GTA-style cover art maker with polygon-panel collages, per-panel photo framing, colour
// grades and poster lettering, exporting PNG covers at 1080x1080, 1080x1350 and 1920x1080.
// This program copies app/ and screenshots/ from beside this file into the output directory
// and writes dossier.json there with the vendored make.fun library, so the judge reads exactly
// the bytes that were handed in.
//
// Try it locally first:  node serve.ts   then open http://localhost:8080
// Hand it in locally:    mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const entryDirectory = fileURLToPath(new URL('.', import.meta.url));
const outputDirectory = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDirectory, { recursive: true });
cpSync(join(entryDirectory, 'app'), join(outputDirectory, 'app'), { recursive: true });
mkdirSync(join(outputDirectory, 'screenshots'), { recursive: true });
if (existsSync(join(entryDirectory, 'screenshots'))) {
  cpSync(join(entryDirectory, 'screenshots'), join(outputDirectory, 'screenshots'), { recursive: true });
}

// The dossier caps come from the bounty's gate: the text cap shapes the dossier bytes, the rest
// make this program refuse anything the scorer would refuse anyway.
writeFileSync(
  join(outputDirectory, 'dossier.json'),
  buildDossier(outputDirectory, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
