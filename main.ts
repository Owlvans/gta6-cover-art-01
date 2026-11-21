import { cpSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-app.ts";

const root = fileURLToPath(new URL(".", import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
mkdirSync(outDir, { recursive: true });

const appSrc = join(root, "app");
const shotsSrc = join(root, "screenshots");
cpSync(appSrc, join(outDir, "app"), { recursive: true });
cpSync(shotsSrc, join(outDir, "screenshots"), { recursive: true });

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const shotFiles = walk(join(outDir, "screenshots")).filter((f) => /\.(png|jpe?g)$/i.test(f));
if (shotFiles.length < 3) {
  throw new Error(`leonida-cover-studio: refusing handover, only ${shotFiles.length} screenshots`);
}
let totalBytes = 0;
for (const f of shotFiles) totalBytes += statSync(f).size;
const appEntries = walk(join(outDir, "app")).length;
console.log(`leonida-cover-studio: ${shotFiles.length} screenshots (${totalBytes} bytes), ${appEntries} app entries -> ${outDir}`);

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outDir, "dossier.json"), JSON.stringify(dossier, null, 2));
