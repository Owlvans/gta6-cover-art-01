# gta6-cover-art-01
[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Owlvans/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Owlvans/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

**Leonida Cover Studio** is a GTA-style cover art maker that runs entirely offline as static files. It opens on a finished-looking cover built from two bundled sample photos, then lets you make it yours in three steps:

1. **Photos** — add any photos (multi-select) to the tray, click a panel on the live preview to select it, click a tray photo to place it, or fill every panel with one photo for the classic single-photo collage look.
2. **Frame** — drag directly on the preview to pan the selected panel's photo, zoom with the slider, reset framing with one click.
3. **Style & words** — four angled polygon layouts (Hero + Stack, Diagonal Slash, Grid Pop, Triptych Tilt) with dark gutters between panels, four colour grades (Leonida Sunset, Neon Nights, Golden Hour, Midnight Noir), and an editable title + subtitle rendered as big bold condensed lettering with a gradient fill, dark outline and shadow.

Exports render offscreen at full size and download as PNG: **1080 × 1080**, **1080 × 1350** and **1920 × 1080**. Layouts adapt their panel geometry to the chosen aspect. No network, no libraries, no shipped fonts — system font stacks and hand-written canvas code only (`app/src/render.js` draws, `app/src/main.js` wires the editor). Shot modes for screenshots: `?shot=cover&w=1920&h=1080&layout=slash&grade=neon&caption=NEON%20TIDE` renders only the cover full-viewport; `?shot=editor` renders the editor. Both set `window.__coverReady` once samples are decoded and painted.

## Run it

```
node serve.ts
```

Then open http://localhost:8080 in a desktop browser.

To hand it in (copies `app/` and `screenshots/` to the output directory and writes `dossier.json`):

```
MAKEFUN_OUTPUT_DIR=out node main.ts
```

<sub>Entered on [make.fun](https://make.fun/?ref=owl&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
