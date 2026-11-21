// Leonida Cover Studio — editor wiring
import { defaultState, drawCover, computeLayout } from "./cover.js";

export const SIZES = {
  landscape: { w: 1920, h: 1080, label: "1920 × 1080" },
  portrait: { w: 1080, h: 1350, label: "1080 × 1350" },
  square: { w: 1080, h: 1080, label: "1080 × 1080" },
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
    try { p.img = await loadImage(`samples/${p.file}`); } catch { p.img = null; }
  }));
  return state;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export function initEditor() {
  const state = defaultState();
  let selected = 0;
  let format = "landscape";
  const canvas = document.querySelector("#preview");
  const ctx = canvas.getContext("2d");
  const selName = document.querySelector("#selName");
  const statusEl = document.querySelector("#status");
  const tagInput = document.querySelector("#tagInput");
  const zoomInput = document.querySelector("#zoom");
  const tray = document.querySelector("#tray");
  const setStatus = (t) => { if (statusEl) statusEl.textContent = t; };

  function redraw() {
    const size = SIZES[format];
    if (canvas.width !== size.w) canvas.width = size.w;
    if (canvas.height !== size.h) canvas.height = size.h;
    drawCover(ctx, canvas.width, canvas.height, state);
    const L = computeLayout(canvas.width, canvas.height);
    const p = state.panels[selected];
    const r = L.rects[p.id];
    if (r) {
      ctx.save();
      ctx.strokeStyle = "#37e0c8";
      ctx.lineWidth = Math.max(3, canvas.width * 0.0035);
      ctx.setLineDash([canvas.width * 0.012, canvas.width * 0.008]);
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.restore();
    }
    if (selName) selName.textContent = `${p.tag} — panel ${selected + 1} of 8`;
    if (tagInput) tagInput.value = p.tag;
    if (zoomInput) zoomInput.value = String(p.zoom);
  }

  function addThumb(img, label) {
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "thumb";
    const im = document.createElement("img");
    im.src = img.src; im.alt = label;
    const span = document.createElement("span");
    span.textContent = label;
    btn.appendChild(im); btn.appendChild(span);
    btn.addEventListener("click", () => {
      const p = state.panels[selected];
      p.img = img;
      setStatus(`${label} placed in ${p.tag}.`);
      redraw();
    });
    tray.appendChild(btn);
    return btn;
  }

  loadDefaultCast(state).then(() => {
    for (const p of state.panels) if (p.img) addThumb(p.img, p.tag);
    redraw();
    setStatus("Cast loaded — click a panel, then drag to pan it.");
  });

  const upload = document.querySelector("#upload");
  if (upload) upload.addEventListener("change", async () => {
    const files = Array.from(upload.files || []);
    for (const f of files) {
      try {
        const img = await loadImage(URL.createObjectURL(f));
        addThumb(img, f.name.slice(0, 18));
      } catch {}
    }
    if (files.length) setStatus("Your photos were added to the tray — they never leave this device.");
    upload.value = "";
  });

  let drag = null;
  canvas.addEventListener("pointerdown", (ev) => {
    const rect = canvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left) * (canvas.width / rect.width);
    const y = (ev.clientY - rect.top) * (canvas.height / rect.height);
    const L = computeLayout(canvas.width, canvas.height);
    for (let i = 0; i < state.panels.length; i++) {
      const r = L.rects[state.panels[i].id];
      if (r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) { selected = i; break; }
    }
    drag = { x: ev.clientX, y: ev.clientY };
    canvas.setPointerCapture(ev.pointerId);
    redraw();
  });
  canvas.addEventListener("pointermove", (ev) => {
    if (!drag) return;
    const rect = canvas.getBoundingClientRect();
    const L = computeLayout(canvas.width, canvas.height);
    const p = state.panels[selected];
    const r = L.rects[p.id]; if (!r) return;
    const dxPx = (ev.clientX - drag.x) * (canvas.width / rect.width);
    const dyPx = (ev.clientY - drag.y) * (canvas.height / rect.height);
    drag = { x: ev.clientX, y: ev.clientY };
    p.dx = clamp(p.dx - (dxPx / r.w) * 0.6, -0.6, 0.6);
    p.dy = clamp(p.dy - (dyPx / r.h) * 0.6, -0.6, 0.6);
    redraw();
  });
  const endDrag = () => { drag = null; };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  if (zoomInput) zoomInput.addEventListener("input", () => {
    state.panels[selected].zoom = parseFloat(zoomInput.value) || 1;
    redraw();
  });
  const flipBtn = document.querySelector("#flip");
  if (flipBtn) flipBtn.addEventListener("click", () => { state.panels[selected].flip = !state.panels[selected].flip; redraw(); });
  const resetBtn = document.querySelector("#resetPanel");
  if (resetBtn) resetBtn.addEventListener("click", () => {
    const p = state.panels[selected]; p.dx = 0; p.dy = 0; p.zoom = 1; p.flip = false; redraw();
  });

  const bind = (sel, key) => {
    const el = document.querySelector(sel);
    if (el) el.addEventListener("input", () => { state[key] = el.value; redraw(); });
  };
  bind("#titleInput", "title");
  bind("#scriptInput", "script");
  bind("#taglineInput", "tagline");
  bind("#quoteInput", "quote");
  bind("#billingInput", "billing");
  if (tagInput) tagInput.addEventListener("input", () => {
    state.panels[selected].tag = tagInput.value.toUpperCase();
    if (selName) selName.textContent = `${state.panels[selected].tag} — panel ${selected + 1} of 8`;
    redraw();
  });

  document.querySelectorAll("[data-grade]").forEach((b) => {
    b.addEventListener("click", () => {
      state.grade = b.getAttribute("data-grade");
      document.querySelectorAll("[data-grade]").forEach((x) => x.classList.toggle("on", x === b));
      redraw();
    });
  });
  document.querySelectorAll("[data-size]").forEach((b) => {
    b.addEventListener("click", () => {
      format = b.getAttribute("data-size");
      document.querySelectorAll("[data-size]").forEach((x) => x.classList.toggle("on", x === b));
      const s = SIZES[format]; canvas.width = s.w; canvas.height = s.h;
      redraw();
    });
  });

  function exportOne(fmt) {
    const s = SIZES[fmt];
    const c = document.createElement("canvas"); c.width = s.w; c.height = s.h;
    drawCover(c.getContext("2d"), s.w, s.h, state);
    c.toBlob((blob) => {
      if (!blob) return;
      const name = `grand-leonida-${fmt}-${s.w}x${s.h}.png`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = name; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      setStatus(`Saved ${name}`);
    }, "image/png");
  }
  const exOne = document.querySelector("#exportOne");
  if (exOne) exOne.addEventListener("click", () => exportOne(format));
  const exAll = document.querySelector("#exportAll");
  if (exAll) exAll.addEventListener("click", () => {
    exportOne("landscape");
    setTimeout(() => exportOne("portrait"), 350);
    setTimeout(() => exportOne("square"), 700);
  });

  redraw();
  return state;
}
