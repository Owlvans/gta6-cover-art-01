// Grand Leonida — Leonida Cover Studio: handover driver.
// Copies the static app and its screenshots into the output directory,
// then writes a dossier describing exactly what was handed over.
import { cpSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-app.ts";

const here = fileURLToPath(new URL(".", import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
mkdirSync(outDir, { recursive: true });

cpSync(join(here, "app"), join(outDir, "app"), { recursive: true });
cpSync(join(here, "screenshots"), join(outDir, "screenshots"), { recursive: true });

function collect(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collect(full, acc);
    else acc.push(full);
  }
  return acc;
}

const shotList = collect(join(outDir, "screenshots"))
  .filter((f) => /\.(png|jpe?g)$/i.test(f))
  .sort();
if (shotList.length < 3) {
  throw new Error(`grand-leonida: handover refused, only ${shotList.length} screenshot(s) found`);
}
const shotBytes = shotList.reduce((sum, f) => sum + statSync(f).size, 0);
const appFiles = collect(join(outDir, "app")).sort();
console.log(`grand-leonida: ${shotList.length} screenshots (${shotBytes} bytes), ${appFiles.length} app files -> ${outDir}`);
for (const f of shotList) console.log(`grand-leonida: shot ${f.split("/").pop()} ${statSync(f).size} bytes`);

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outDir, "dossier.json"), JSON.stringify(dossier, null, 2));
