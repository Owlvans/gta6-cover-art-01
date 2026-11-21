// Leonida Cover Lab — editor wiring.
//
// Owns the cover state (which photo sits in which panel, how each panel is
// framed, the words, the grade, the export size), renders the tray and the
// segmented controls, handles drag / wheel framing on the canvas, and serves
// the ?shot= scenes through the very same code paths a user would drive.

import { drawCover, computeGeometry } from './cover.js';
import { LAYOUTS, GRADES, layoutById, gradeById } from './layouts.js';
import { SAMPLE_PHOTOS, loadSamplePhoto, loadUploadPhoto } from './photos.js';
import { applyShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('stage');
const els = {
  tray: $('tray'),
  dropzone: $('dropzone'),
  fileInput: $('fileInput'),
  layoutRow: $('layoutRow'),
  panelSelect: $('panelSelect'),
  fitSelect: $('fitSelect'),
  zoomRange: $('zoomRange'),
  zoomVal: $('zoomVal'),
  resetFrameBtn: $('resetFrameBtn'),
  titleInput: $('titleInput'),
  subInput: $('subInput'),
  gradeRow: $('gradeRow'),
  gradeRange: $('gradeRange'),
  gradeVal: $('gradeVal'),
  sizeSelect: $('sizeSelect'),
  exportBtn: $('exportBtn'),
  status: $('status'),
};

const state = {
  size: { w: 1080, h: 1350 },
  layoutId: 'duet',
  gradeId: 'vice',
  gradeAmt: 0.7,
  title: els.titleInput.value,
  subtitle: els.subInput.value,
  panels: [],
  selected: 0,
};

let photos = [];
let coverMode = false;
let lastGeo = null;

function freshPanel(photo = null) {
  return { photo, fit: 'whole', zoom: 1, panX: 0, panY: 0 };
}

function panelCount() {
  return layoutById(state.layoutId).panels({ x: 0, y: 0, w: 100, h: 100 }).length;
}

function ensurePanels() {
  const n = panelCount();
  while (state.panels.length < n) state.panels.push(freshPanel());
  if (state.selected >= n) state.selected = 0;
}

function selectedPanel() {
  ensurePanels();
  return state.panels[state.selected];
}

function photoById(id) {
  return photos.find((p) => p.id === id) ?? null;
}

function redraw() {
  ensurePanels();
  if (canvas.width !== state.size.w) canvas.width = state.size.w;
  if (canvas.height !== state.size.h) canvas.height = state.size.h;
  lastGeo = drawCover(canvas, state, { showSelection: !coverMode });
  syncPanelControls();
}

function whenPainted() {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

/* ---------- tray ---------- */

function renderTray() {
  els.tray.textContent = '';
  for (const photo of photos) {
    const item = document.createElement('div');
    item.className = 'tray-item';
    const img = document.createElement('img');
    img.src = photo.thumbUrl;
    img.alt = '';
    const meta = document.createElement('div');
    meta.className = 'meta';
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = photo.name;
    const sub = document.createElement('div');
    sub.className = 'sub';
    sub.textContent = `${photo.img.naturalWidth} × ${photo.img.naturalHeight}${photo.builtin ? ' · sample' : ''}`;
    meta.append(name, sub);
    const use = document.createElement('button');
    use.type = 'button';
    use.className = 'btn use';
    use.textContent = 'Use';
    use.title = `Put ${photo.name} in the selected panel`;
    use.addEventListener('click', () => {
      selectedPanel().photo = photo;
      redraw();
      els.status.textContent = `${photo.name} is in panel ${state.selected + 1}.`;
    });
    item.append(img, meta, use);
    els.tray.append(item);
  }
}

async function addFiles(fileList) {
  const files = [...fileList].filter((f) => f.type.startsWith('image/'));
  for (const file of files) {
    try {
      const photo = await loadUploadPhoto(file);
      photos.push(photo);
      const panel = selectedPanel();
      if (!panel.photo) panel.photo = photo;
      els.status.textContent = `${photo.name} added — whole-subject framing is on, so nobody gets cropped.`;
    } catch {
      els.status.textContent = `Could not read ${file.name}.`;
    }
  }
  renderTray();
  redraw();
}

els.fileInput.addEventListener('change', () => {
  addFiles(els.fileInput.files ?? []);
  els.fileInput.value = '';
});
for (const evt of ['dragenter', 'dragover']) {
  els.dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    els.dropzone.classList.add('dragging');
  });
}
for (const evt of ['dragleave', 'drop']) {
  els.dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    els.dropzone.classList.remove('dragging');
  });
}
els.dropzone.addEventListener('drop', (e) => addFiles(e.dataTransfer?.files ?? []));

/* ---------- layout & grade segmented rows ---------- */

function buildSegRow(row, items, currentId, onPick) {
  row.textContent = '';
  for (const item of items) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'seg';
    b.textContent = item.label;
    b.setAttribute('aria-pressed', String(item.id === currentId));
    b.addEventListener('click', () => onPick(item.id));
    row.append(b);
  }
}

function refreshSegRows() {
  buildSegRow(els.layoutRow, LAYOUTS, state.layoutId, (id) => {
    state.layoutId = id;
    ensurePanels();
    refreshSegRows();
    redraw();
  });
  buildSegRow(els.gradeRow, GRADES, state.gradeId, (id) => {
    state.gradeId = id;
    refreshSegRows();
    redraw();
  });
}

/* ---------- panel controls ---------- */

function syncPanelControls() {
  const n = panelCount();
  if (els.panelSelect.options.length !== n) {
    els.panelSelect.textContent = '';
    for (let i = 0; i < n; i++) {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = `Panel ${i + 1}`;
      els.panelSelect.append(opt);
    }
  }
  els.panelSelect.value = String(state.selected);
  const panel = selectedPanel();
  els.fitSelect.value = panel.fit;
  els.zoomRange.value = String(Math.round(panel.zoom * 100));
  els.zoomVal.textContent = `${Math.round(panel.zoom * 100)}%`;
}

els.panelSelect.addEventListener('change', () => {
  state.selected = Number(els.panelSelect.value);
  redraw();
});
els.fitSelect.addEventListener('change', () => {
  selectedPanel().fit = els.fitSelect.value;
  redraw();
});
els.zoomRange.addEventListener('input', () => {
  selectedPanel().zoom = Number(els.zoomRange.value) / 100;
  els.zoomVal.textContent = `${els.zoomRange.value}%`;
  redraw();
});
els.resetFrameBtn.addEventListener('click', () => {
  const panel = selectedPanel();
  panel.zoom = 1;
  panel.panX = 0;
  panel.panY = 0;
  redraw();
});

/* ---------- words, grade, size, export ---------- */

els.titleInput.addEventListener('input', () => {
  state.title = els.titleInput.value;
  redraw();
});
els.subInput.addEventListener('input', () => {
  state.subtitle = els.subInput.value;
  redraw();
});
els.gradeRange.addEventListener('input', () => {
  state.gradeAmt = Number(els.gradeRange.value) / 100;
  els.gradeVal.textContent = `${els.gradeRange.value}%`;
  redraw();
});
els.sizeSelect.addEventListener('change', () => {
  const [w, h] = els.sizeSelect.value.split('x').map(Number);
  state.size = { w, h };
  redraw();
});
els.exportBtn.addEventListener('click', () => {
  const out = document.createElement('canvas');
  out.width = state.size.w;
  out.height = state.size.h;
  drawCover(out, state, { showSelection: false });
  out.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `leonida-cover-${state.size.w}x${state.size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    els.status.textContent = `Saved leonida-cover-${state.size.w}x${state.size.h}.png`;
  }, 'image/png');
});

/* ---------- canvas pan / zoom / select ---------- */

function canvasPoint(evt) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((evt.clientX - r.left) / r.width) * canvas.width,
    y: ((evt.clientY - r.top) / r.height) * canvas.height,
  };
}

let drag = null;
canvas.addEventListener('pointerdown', (evt) => {
  if (coverMode) return;
  const pt = canvasPoint(evt);
  const geo = lastGeo ?? computeGeometry(canvas.width, canvas.height, state.layoutId);
  const idx = geo.rects.findIndex((r) => pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h);
  if (idx === -1) return;
  state.selected = idx;
  const panel = selectedPanel();
  drag = { startX: pt.x, startY: pt.y, panX: panel.panX, panY: panel.panY };
  canvas.setPointerCapture(evt.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (evt) => {
  if (!drag) return;
  const pt = canvasPoint(evt);
  const panel = selectedPanel();
  panel.panX = drag.panX + (pt.x - drag.startX);
  panel.panY = drag.panY + (pt.y - drag.startY);
  redraw();
});
for (const evt of ['pointerup', 'pointercancel']) {
  canvas.addEventListener(evt, () => { drag = null; });
}
canvas.addEventListener('wheel', (evt) => {
  if (coverMode) return;
  evt.preventDefault();
  const panel = selectedPanel();
  const factor = evt.deltaY < 0 ? 1.07 : 0.93;
  panel.zoom = Math.min(2.5, Math.max(0.6, panel.zoom * factor));
  redraw();
}, { passive: false });

/* ---------- shot scenes ---------- */

const api = {
  async loadSamples() {
    if (photos.length) return;
    for (const def of SAMPLE_PHOTOS) photos.push(await loadSamplePhoto(def));
    renderTray();
  },
  setLayout(id) {
    if (LAYOUTS.some((l) => l.id === id)) state.layoutId = id;
    ensurePanels();
    refreshSegRows();
  },
  assignPanel(i, photoId) {
    ensurePanels();
    const photo = photoById(photoId);
    if (photo && state.panels[i]) state.panels[i].photo = photo;
  },
  selectPanel(i) {
    state.selected = i;
  },
  setTitle(text) {
    state.title = text;
    els.titleInput.value = text;
  },
  setSubtitle(text) {
    state.subtitle = text;
    els.subInput.value = text;
  },
  setGrade(id) {
    if (GRADES.some((g) => g.id === id)) {
      state.gradeId = id;
      refreshSegRows();
    }
  },
  setSize(w, h) {
    state.size = { w, h };
    const key = `${w}x${h}`;
    if ([...els.sizeSelect.options].some((o) => o.value === key)) els.sizeSelect.value = key;
  },
  enterCoverMode() {
    coverMode = true;
    document.body.classList.add('shot-cover');
  },
  redraw,
  whenPainted,
};

/* ---------- boot ---------- */

refreshSegRows();
const query = new URLSearchParams(location.search);
if (query.get('shot')) {
  applyShot(query, api).catch((err) => {
    els.status.textContent = `Shot setup failed: ${err.message}`;
    window.__ready = true;
  });
} else {
  api.loadSamples()
    .then(() => {
      ensurePanels();
      state.panels[0].photo = photoById('pier');
      if (state.panels[1]) state.panels[1].photo = photoById('boulevard');
      redraw();
      return whenPainted();
    })
    .then(() => { window.__ready = true; })
    .catch(() => { window.__ready = true; });
}
