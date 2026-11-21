// Leonida Cover Studio — editor wiring.
// Three steps: pick photos, write the caption, export. User photos are read
// locally with object URLs and never leave the device.
import { drawCover, defaultState, computeLayout, PANEL_DEFS } from './cover.js';

export const SIZES = {
  landscape: { w: 1920, h: 1080, label: '1920 × 1080' },
  portrait: { w: 1080, h: 1350, label: '1080 × 1350' },
  square: { w: 1080, h: 1080, label: '1080 × 1080' },
};

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export async function loadDefaultCast(state) {
  await Promise.all(state.panels.map(async (p) => {
    p.img = await loadImage(`samples/${p.file}`);
  }));
}

export function initEditor() {
  const state = defaultState();
  let selected = 0;               // index into state.panels
  let format = 'landscape';
  const canvas = document.getElementById('preview');
  const ctx = canvas.getContext('2d');
  const status = document.getElementById('status');
  const tray = document.getElementById('tray');
  const uploads = [];             // {name, img} user photos, local only

  function setCanvasSize() {
    const s = SIZES[format];
    canvas.width = s.w; canvas.height = s.h;
  }
  setCanvasSize();

  function redraw() {
    drawCover(ctx, canvas.width, canvas.height, state);
    // selection outline over the chosen panel
    const L = computeLayout(canvas.width, canvas.height);
    const r = L.rects[state.panels[selected].id];
    ctx.save();
    ctx.strokeStyle = '#37e0c8';
    ctx.lineWidth = Math.max(3, canvas.width * 0.0035);
    ctx.setLineDash([canvas.width * 0.012, canvas.width * 0.008]);
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.restore();
    document.getElementById('selName').textContent =
      `${state.panels[selected].tag} — panel ${selected + 1} of 8`;
    document.getElementById('tagInput').value = state.panels[selected].tag;
    document.getElementById('zoom').value = state.panels[selected].zoom;
  }

  // ---- tray: the cast of eight, plus anything the user adds
  function addThumb(img, label, onPick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thumb';
    const im = document.createElement('img');
    im.src = img.currentSrc || img.src;
    im.alt = label;
    const cap = document.createElement('span');
    cap.textContent = label;
    b.append(im, cap);
    b.addEventListener('click', () => {
      state.panels[selected].img = img;
      redraw();
      status.textContent = `${label} placed in ${state.panels[selected].tag}.`;
    });
    tray.appendChild(b);
    return b;
  }

  loadDefaultCast(state).then(() => {
    state.panels.forEach((p, i) => {
      const def = PANEL_DEFS[i];
      addThumb(p.img, def.tag, null);
    });
    redraw();
    status.textContent = 'Cast loaded — click a panel, then drag to pan it.';
  });

  document.getElementById('upload').addEventListener('change', async (e) => {
    for (const file of e.target.files) {
      const img = await loadImage(URL.createObjectURL(file));
      uploads.push({ name: file.name, img });
      addThumb(img, file.name.slice(0, 18), null);
    }
    if (e.target.files.length) {
      status.textContent = 'Your photos were added to the tray — they never leave this device.';
    }
    e.target.value = '';
  });

  // ---- preview interaction: click selects, drag pans
  function toCanvas(ev) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (ev.clientX - r.left) * (canvas.width / r.width),
      y: (ev.clientY - r.top) * (canvas.height / r.height),
    };
  }
  let drag = null;
  canvas.addEventListener('pointerdown', (ev) => {
    const pt = toCanvas(ev);
    const L = computeLayout(canvas.width, canvas.height);
    for (let i = 0; i < state.panels.length; i++) {
      const r = L.rects[state.panels[i].id];
      if (pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h) {
        selected = i;
        drag = { x: pt.x, y: pt.y, r };
        canvas.setPointerCapture(ev.pointerId);
        redraw();
        return;
      }
    }
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (!drag) return;
    const pt = toCanvas(ev);
    const p = state.panels[selected];
    p.dx = Math.min(0.6, Math.max(-0.6, p.dx - (pt.x - drag.x) / drag.r.w * 0.6));
    p.dy = Math.min(0.6, Math.max(-0.6, p.dy - (pt.y - drag.y) / drag.r.h * 0.6));
    drag.x = pt.x; drag.y = pt.y;
    redraw();
  });
  canvas.addEventListener('pointerup', () => { drag = null; });

  document.getElementById('zoom').addEventListener('input', (e) => {
    state.panels[selected].zoom = Number(e.target.value);
    redraw();
  });
  document.getElementById('flip').addEventListener('click', () => {
    state.panels[selected].flip = !state.panels[selected].flip;
    redraw();
  });
  document.getElementById('resetPanel').addEventListener('click', () => {
    const p = state.panels[selected];
    p.dx = 0; p.dy = 0; p.zoom = 1; p.flip = false;
    redraw();
  });

  // ---- caption fields
  const bind = (id, key) => document.getElementById(id).addEventListener('input', (e) => {
    state[key] = e.target.value;
    redraw();
  });
  bind('titleInput', 'title');
  bind('scriptInput', 'script');
  bind('taglineInput', 'tagline');
  bind('quoteInput', 'quote');
  bind('billingInput', 'billing');
  document.getElementById('tagInput').addEventListener('input', (e) => {
    state.panels[selected].tag = e.target.value.toUpperCase();
    redraw();
  });

  // ---- grades
  document.querySelectorAll('[data-grade]').forEach((b) => {
    b.addEventListener('click', () => {
      state.grade = b.dataset.grade;
      document.querySelectorAll('[data-grade]').forEach((x) =>
        x.classList.toggle('on', x === b));
      redraw();
    });
  });

  // ---- sizes + export
  document.querySelectorAll('[data-size]').forEach((b) => {
    b.addEventListener('click', () => {
      format = b.dataset.size;
      document.querySelectorAll('[data-size]').forEach((x) =>
        x.classList.toggle('on', x === b));
      setCanvasSize();
      redraw();
    });
  });

  function exportOne(fmt) {
    const s = SIZES[fmt];
    const c = document.createElement('canvas');
    c.width = s.w; c.height = s.h;
    drawCover(c.getContext('2d'), s.w, s.h, state);
    c.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `grand-leonida-${fmt}-${s.w}x${s.h}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      status.textContent = `Saved ${a.download}`;
    }, 'image/png');
  }
  document.getElementById('exportOne').addEventListener('click', () => exportOne(format));
  document.getElementById('exportAll').addEventListener('click', () => {
    exportOne('landscape');
    setTimeout(() => exportOne('portrait'), 350);
    setTimeout(() => exportOne('square'), 700);
  });

  redraw();
  return state;
}
