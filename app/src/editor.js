// Grand Leonida — editor behaviour: tray, panel editing, export.
import { computeLayout, defaultState, drawCover } from "./cover.js";

export const SIZES = {
  landscape: { w: 1920, h: 1080, label: "1920 × 1080" },
  portrait: { w: 1080, h: 1350, label: "1080 × 1350" },
  square: { w: 1080, h: 1080, label: "1080 × 1080" },
};

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

export async function loadDefaultCast(state) {
  await Promise.all(state.panels.map(async (panel) => {
    try { panel.img = await loadImage(`samples/${panel.file}`); }
    catch { panel.img = null; }
  }));
  return state;
}

const clampTo = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function initEditor() {
  const state = defaultState();
  let selectedIdx = 0;
  let activeFormat = "landscape";
  const canvas = document.querySelector("#preview");
  const ctx = canvas.getContext("2d");
  const selName = document.querySelector("#selName");
  const statusEl = document.querySelector("#status");
  const tagField = document.querySelector("#tagInput");
  const zoomField = document.querySelector("#zoom");
  const tray = document.querySelector("#tray");
  const announce = (text) => { if (statusEl) statusEl.textContent = text; };

  function redraw() {
    const size = SIZES[activeFormat];
    // Only touch the canvas size when the format actually changed:
    // assigning width/height clears the bitmap and flickers on every pan.
    if (canvas.width !== size.w) canvas.width = size.w;
    if (canvas.height !== size.h) canvas.height = size.h;
    drawCover(ctx, size.w, size.h, state);
    const layout = computeLayout(size.w, size.h);
    const panel = state.panels[selectedIdx];
    const rect = layout.rects[panel.id];
    if (rect) {
      ctx.save();
      ctx.strokeStyle = "#3fe3cb";
      ctx.lineWidth = Math.max(3, size.w * 0.0035);
      ctx.setLineDash([size.w * 0.012, size.w * 0.008]);
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      ctx.restore();
    }
    if (selName) selName.textContent = `${panel.tag} — panel ${selectedIdx + 1} of ${state.panels.length}`;
    if (tagField) tagField.value = panel.tag;
    if (zoomField) zoomField.value = String(panel.zoom);
  }

  function addToTray(img, label) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "thumb";
    const thumb = document.createElement("img");
    thumb.src = img.src;
    thumb.alt = label;
    const caption = document.createElement("span");
    caption.textContent = label;
    btn.append(thumb, caption);
    btn.addEventListener("click", () => {
      const panel = state.panels[selectedIdx];
      panel.img = img;
      announce(`${label} now sits in ${panel.tag}.`);
      redraw();
    });
    tray.appendChild(btn);
  }

  loadDefaultCast(state).then(() => {
    for (const panel of state.panels) if (panel.img) addToTray(panel.img, panel.tag);
    redraw();
    announce("Cast is in — click a panel on the cover, then drag to pan its photo.");
  });

  const uploader = document.querySelector("#upload");
  if (uploader) uploader.addEventListener("change", async () => {
    const files = [...(uploader.files || [])];
    for (const file of files) {
      try { addToTray(await loadImage(URL.createObjectURL(file)), file.name.slice(0, 18)); }
      catch { /* skip unreadable files */ }
    }
    if (files.length) announce("Added to the tray — and still only on this device.");
    uploader.value = "";
  });

  // Pointer handling: click selects a panel, drag pans its photo.
  let dragAt = null;
  canvas.addEventListener("pointerdown", (ev) => {
    const box = canvas.getBoundingClientRect();
    const px = (ev.clientX - box.left) * (canvas.width / box.width);
    const py = (ev.clientY - box.top) * (canvas.height / box.height);
    const layout = computeLayout(canvas.width, canvas.height);
    state.panels.forEach((panel, i) => {
      const r = layout.rects[panel.id];
      if (r && px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) selectedIdx = i;
    });
    dragAt = { x: ev.clientX, y: ev.clientY };
    canvas.setPointerCapture(ev.pointerId);
    redraw();
  });
  canvas.addEventListener("pointermove", (ev) => {
    if (!dragAt) return;
    const box = canvas.getBoundingClientRect();
    const layout = computeLayout(canvas.width, canvas.height);
    const panel = state.panels[selectedIdx];
    const r = layout.rects[panel.id];
    if (!r) return;
    const moveX = (ev.clientX - dragAt.x) * (canvas.width / box.width);
    const moveY = (ev.clientY - dragAt.y) * (canvas.height / box.height);
    dragAt = { x: ev.clientX, y: ev.clientY };
    panel.dx = clampTo(panel.dx - (moveX / r.w) * 0.6, -0.6, 0.6);
    panel.dy = clampTo(panel.dy - (moveY / r.h) * 0.6, -0.6, 0.6);
    redraw();
  });
  const stopDrag = () => { dragAt = null; };
  canvas.addEventListener("pointerup", stopDrag);
  canvas.addEventListener("pointercancel", stopDrag);

  if (zoomField) zoomField.addEventListener("input", () => {
    state.panels[selectedIdx].zoom = parseFloat(zoomField.value) || 1;
    redraw();
  });
  const flipBtn = document.querySelector("#flip");
  if (flipBtn) flipBtn.addEventListener("click", () => {
    const panel = state.panels[selectedIdx];
    panel.flip = !panel.flip;
    redraw();
  });
  const resetBtn = document.querySelector("#resetPanel");
  if (resetBtn) resetBtn.addEventListener("click", () => {
    const panel = state.panels[selectedIdx];
    panel.dx = 0; panel.dy = 0; panel.zoom = 1; panel.flip = false;
    redraw();
  });

  const bindText = (selector, key) => {
    const el = document.querySelector(selector);
    if (el) el.addEventListener("input", () => { state[key] = el.value; redraw(); });
  };
  bindText("#titleInput", "title");
  bindText("#scriptInput", "script");
  bindText("#taglineInput", "tagline");
  bindText("#quoteInput", "quote");
  bindText("#billingInput", "billing");
  if (tagField) tagField.addEventListener("input", () => {
    state.panels[selectedIdx].tag = tagField.value.toUpperCase();
    redraw();
  });

  document.querySelectorAll("[data-grade]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.grade = btn.getAttribute("data-grade");
      document.querySelectorAll("[data-grade]").forEach((other) => other.classList.toggle("on", other === btn));
      redraw();
    });
  });
  document.querySelectorAll("[data-size]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeFormat = btn.getAttribute("data-size");
      document.querySelectorAll("[data-size]").forEach((other) => other.classList.toggle("on", other === btn));
      redraw();
    });
  });

  function downloadPng(fmt) {
    const size = SIZES[fmt];
    const off = document.createElement("canvas");
    off.width = size.w; off.height = size.h;
    drawCover(off.getContext("2d"), size.w, size.h, state);
    off.toBlob((blob) => {
      if (!blob) return;
      const name = `grand-leonida-${fmt}-${size.w}x${size.h}.png`;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 4000);
      announce(`Saved ${name}`);
    }, "image/png");
  }
  const oneBtn = document.querySelector("#exportOne");
  if (oneBtn) oneBtn.addEventListener("click", () => downloadPng(activeFormat));
  const allBtn = document.querySelector("#exportAll");
  if (allBtn) allBtn.addEventListener("click", () => {
    downloadPng("landscape");
    setTimeout(() => downloadPng("portrait"), 350);
    setTimeout(() => downloadPng("square"), 700);
  });

  redraw();
  return state;
}
