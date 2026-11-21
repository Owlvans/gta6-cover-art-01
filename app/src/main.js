// Leonida Cover Studio — editor state and wiring.
// Photo tray, panel selection, drag-to-pan framing, live preview,
// full-size PNG export and the ?shot= modes used for screenshots.

import {
  LAYOUTS, GRADES, renderCover, panelIndexAtPoint, panelCountForLayout, findLayout,
} from './render.js';

const EXPORT_SIZES = [
  { id: 'square', label: '1080 × 1080', w: 1080, h: 1080 },
  { id: 'portrait', label: '1080 × 1350', w: 1080, h: 1350 },
  { id: 'wide', label: '1920 × 1080', w: 1920, h: 1080 },
];

const SAMPLE_SOURCES = [
  { src: 'samples/boulevard.jpg', name: 'Boulevard sample' },
  { src: 'samples/pier.jpg', name: 'Pier sample' },
];

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

function defaultFraming() {
  return { panX: 0, panY: 0, zoom: 1 };
}

function createEditorState() {
  return {
    photos: [],
    photoNames: [],
    selectedPhoto: 0,
    layout: 'hero-stack',
    grade: 'sunset',
    title: 'VICE HEAT',
    subtitle: 'LEONIDA · EST. SUNSET',
    assignments: [],
    framing: [],
    selectedPanel: 0,
    exportSize: EXPORT_SIZES[0],
  };
}

function ensurePanelState(state, width, height) {
  const count = panelCountForLayout(state.layout, width, height);
  while (state.assignments.length < count) {
    const next = state.assignments.length;
    state.assignments.push(state.photos.length ? next % state.photos.length : 0);
  }
  state.assignments.length = count;
  while (state.framing.length < count) state.framing.push(defaultFraming());
  state.framing.length = count;
  if (state.selectedPanel >= count) state.selectedPanel = 0;
}

async function bootEditor() {
  const state = createEditorState();
  const previewCanvas = document.getElementById('previewCanvas');
  const trayEl = document.getElementById('photoTray');
  const statusEl = document.getElementById('statusLine');
  const layoutSelect = document.getElementById('layoutSelect');
  const gradeSelect = document.getElementById('gradeSelect');
  const sizeSelect = document.getElementById('sizeSelect');
  const titleInput = document.getElementById('titleInput');
  const subtitleInput = document.getElementById('subtitleInput');
  const zoomRange = document.getElementById('zoomRange');
  const fileInput = document.getElementById('photoFiles');

  for (const layout of LAYOUTS) {
    const option = document.createElement('option');
    option.value = layout.id; option.textContent = layout.name;
    layoutSelect.appendChild(option);
  }
  for (const grade of GRADES) {
    const option = document.createElement('option');
    option.value = grade.id; option.textContent = grade.name;
    gradeSelect.appendChild(option);
  }
  for (const size of EXPORT_SIZES) {
    const option = document.createElement('option');
    option.value = size.id; option.textContent = size.label;
    sizeSelect.appendChild(option);
  }
  layoutSelect.value = state.layout;
  gradeSelect.value = state.grade;
  sizeSelect.value = state.exportSize.id;
  titleInput.value = state.title;
  subtitleInput.value = state.subtitle;

  function setStatus(message) { statusEl.textContent = message; }

  function syncZoomSlider() {
    const framing = state.framing[state.selectedPanel];
    if (framing) zoomRange.value = String(Math.round(framing.zoom * 100));
  }

  function drawPreview() {
    const size = state.exportSize;
    ensurePanelState(state, size.w, size.h);
    previewCanvas.width = size.w;
    previewCanvas.height = size.h;
    const ctx = previewCanvas.getContext('2d');
    renderCover(ctx, size.w, size.h, { ...state, showSelection: true });
  }

  function refreshTray() {
    trayEl.innerHTML = '';
    state.photos.forEach((photo, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tray-item' + (index === state.selectedPhoto ? ' is-selected' : '');
      const thumb = document.createElement('img');
      thumb.src = photo.src;
      thumb.alt = state.photoNames[index] || `Photo ${index + 1}`;
      const label = document.createElement('span');
      label.textContent = state.photoNames[index] || `Photo ${index + 1}`;
      button.appendChild(thumb);
      button.appendChild(label);
      button.addEventListener('click', () => {
        state.selectedPhoto = index;
        state.assignments[state.selectedPanel] = index;
        refreshTray();
        drawPreview();
        setStatus(`Panel ${state.selectedPanel + 1} now shows ${state.photoNames[index]}.`);
      });
      trayEl.appendChild(button);
    });
  }

  async function addPhotoSource(src, name) {
    const img = await loadImageElement(src);
    state.photos.push(img);
    state.photoNames.push(name);
    return state.photos.length - 1;
  }

  for (const sample of SAMPLE_SOURCES) {
    await addPhotoSource(sample.src, sample.name);
  }
  ensurePanelState(state, state.exportSize.w, state.exportSize.h);
  refreshTray();
  syncZoomSlider();
  drawPreview();
  setStatus('Samples loaded. Click a panel, then a photo — or add your own.');

  fileInput.addEventListener('change', async () => {
    const files = [...(fileInput.files || [])];
    for (const file of files) {
      const url = URL.createObjectURL(file);
      try {
        const index = await addPhotoSource(url, file.name);
        state.selectedPhoto = index;
        state.assignments[state.selectedPanel] = index;
      } catch (err) {
        setStatus(`Skipped ${file.name}: not a readable image.`);
      }
    }
    fileInput.value = '';
    refreshTray();
    drawPreview();
    if (files.length) setStatus(`${files.length} photo(s) added to the tray.`);
  });

  layoutSelect.addEventListener('change', () => {
    state.layout = layoutSelect.value;
    ensurePanelState(state, state.exportSize.w, state.exportSize.h);
    syncZoomSlider();
    drawPreview();
    setStatus(`Layout: ${findLayout(state.layout).name}.`);
  });
  gradeSelect.addEventListener('change', () => {
    state.grade = gradeSelect.value;
    drawPreview();
  });
  sizeSelect.addEventListener('change', () => {
    state.exportSize = EXPORT_SIZES.find((s) => s.id === sizeSelect.value) || EXPORT_SIZES[0];
    ensurePanelState(state, state.exportSize.w, state.exportSize.h);
    drawPreview();
  });
  titleInput.addEventListener('input', () => { state.title = titleInput.value; drawPreview(); });
  subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; drawPreview(); });

  document.getElementById('fillAllButton').addEventListener('click', () => {
    state.assignments = state.assignments.map(() => state.selectedPhoto);
    drawPreview();
    setStatus('Every panel now uses the selected photo.');
  });
  document.getElementById('resetFramingButton').addEventListener('click', () => {
    state.framing[state.selectedPanel] = defaultFraming();
    syncZoomSlider();
    drawPreview();
    setStatus(`Panel ${state.selectedPanel + 1} framing reset.`);
  });
  zoomRange.addEventListener('input', () => {
    const framing = state.framing[state.selectedPanel];
    if (framing) framing.zoom = Number(zoomRange.value) / 100;
    drawPreview();
  });

  let dragState = null;
  function canvasPoint(event) {
    const rect = previewCanvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * previewCanvas.width,
      y: ((event.clientY - rect.top) / rect.height) * previewCanvas.height,
    };
  }
  previewCanvas.addEventListener('pointerdown', (event) => {
    const point = canvasPoint(event);
    const index = panelIndexAtPoint(state.layout, previewCanvas.width, previewCanvas.height, point.x, point.y);
    if (index >= 0) {
      state.selectedPanel = index;
      const framing = state.framing[index];
      if (state.photos[state.assignments[index]]) {
        state.selectedPhoto = state.assignments[index];
      }
      dragState = { startX: event.clientX, startY: event.clientY, panX: framing.panX, panY: framing.panY };
      previewCanvas.setPointerCapture(event.pointerId);
      syncZoomSlider();
      refreshTray();
      drawPreview();
    }
  });
  previewCanvas.addEventListener('pointermove', (event) => {
    if (!dragState) return;
    const rect = previewCanvas.getBoundingClientRect();
    const framing = state.framing[state.selectedPanel];
    const dx = (event.clientX - dragState.startX) / rect.width;
    const dy = (event.clientY - dragState.startY) / rect.height;
    framing.panX = Math.max(-1, Math.min(1, dragState.panX + dx * 2.2));
    framing.panY = Math.max(-1, Math.min(1, dragState.panY + dy * 2.2));
    drawPreview();
  });
  const endDrag = () => { dragState = null; };
  previewCanvas.addEventListener('pointerup', endDrag);
  previewCanvas.addEventListener('pointercancel', endDrag);

  function exportCover(size) {
    const offscreen = document.createElement('canvas');
    offscreen.width = size.w;
    offscreen.height = size.h;
    const ctx = offscreen.getContext('2d');
    renderCover(ctx, size.w, size.h, { ...state, showSelection: false });
    offscreen.toBlob((blob) => {
      if (!blob) return;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `leonida-cover-${size.w}x${size.h}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 4000);
      setStatus(`Saved leonida-cover-${size.w}x${size.h}.png`);
    }, 'image/png');
  }
  document.querySelectorAll('[data-export-size]').forEach((button) => {
    button.addEventListener('click', () => {
      const size = EXPORT_SIZES.find((s) => s.id === button.getAttribute('data-export-size'));
      if (size) exportCover(size);
    });
  });

  window.__coverReady = true;
  return state;
}

async function bootShotCover(params) {
  document.body.classList.add('shot-cover-mode');
  const width = Number(params.get('w')) || 1080;
  const height = Number(params.get('h')) || 1080;
  const state = createEditorState();
  state.layout = params.get('layout') || 'hero-stack';
  state.grade = params.get('grade') || 'sunset';
  state.title = params.get('caption') || state.title;
  if (params.get('subtitle')) state.subtitle = params.get('subtitle');
  for (const sample of SAMPLE_SOURCES) {
    const img = await loadImageElement(sample.src);
    state.photos.push(img);
    state.photoNames.push(sample.name);
  }
  ensurePanelState(state, width, height);
  if (params.get('fill') === 'pier') state.assignments = state.assignments.map(() => 1);
  if (params.get('fill') === 'boulevard') state.assignments = state.assignments.map(() => 0);
  const canvas = document.getElementById('previewCanvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  renderCover(ctx, width, height, { ...state, showSelection: false });
  window.__coverReady = true;
}

async function boot() {
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  if (shot === 'cover') {
    await bootShotCover(params);
  } else {
    await bootEditor();
  }
}

boot().catch((err) => {
  console.error(err);
  const statusEl = document.getElementById('statusLine');
  if (statusEl) statusEl.textContent = 'Something failed to load — check the sample photos are present.';
  window.__coverReady = true;
});
