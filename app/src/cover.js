// The cover renderer for Leonida Cover Lab.
//
// The framing rule that defines this app: in "Whole subject" mode a photo is
// scaled so its focal rectangle (see photos.js) fits ENTIRELY inside the
// panel — contain-fit on the person, not cover-fit on the picture. Whatever
// panel area the photograph itself cannot reach is filled with a backdrop
// brewed from that same photo: cover-scaled, blurred on a small offscreen
// canvas, darkened and tinted toward the grade. A person is therefore never
// sliced by a gutter, a divider or the title band; the band lives below the
// panels and no panel ever runs underneath it.

import { focalPixels } from './photos.js';
import { layoutById, gradeById } from './layouts.js';

const TITLE_FONT = 'Impact, "Arial Narrow Bold", "Franklin Gothic Medium", "Arial Narrow", sans-serif';
const SUB_FONT = '"Arial Narrow", "Franklin Gothic Medium", system-ui, sans-serif';

/** Geometry shared by the renderer and the editor's hit-testing. */
export function computeGeometry(w, h, layoutId) {
  const landscape = w > h;
  const bandH = Math.round(h * (landscape ? 0.19 : w === h ? 0.17 : 0.155));
  const margin = Math.round(Math.min(w, h) * 0.022);
  const area = { x: margin, y: margin, w: w - margin * 2, h: h - bandH - margin };
  const rects = layoutById(layoutId).panels(area);
  return { bandH, margin, area, rects, landscape };
}

function gradeFilter(grade, amt) {
  const sat = 1 + (grade.sat - 1) * amt;
  const con = 1 + (grade.con - 1) * amt;
  return `saturate(${sat.toFixed(3)}) contrast(${con.toFixed(3)})`;
}

/**
 * A small blurred cover-fit copy of the photo, cached per photo and size.
 * Drawing it stretched over a panel gives a soft, same-photo backdrop.
 */
function backdropFor(photo, pw, ph) {
  const key = `${Math.round(pw)}x${Math.round(ph)}`;
  if (photo._backdrop && photo._backdrop.key === key) return photo._backdrop.canvas;
  const bw = Math.max(2, Math.round(pw / 14));
  const bh = Math.max(2, Math.round(ph / 14));
  const small = document.createElement('canvas');
  small.width = bw;
  small.height = bh;
  const bctx = small.getContext('2d');
  const iw = photo.img.naturalWidth;
  const ih = photo.img.naturalHeight;
  const s = Math.max(bw / iw, bh / ih);
  bctx.filter = 'blur(2px) brightness(0.94) saturate(1.3)';
  bctx.drawImage(photo.img, (bw - iw * s) / 2, (bh - ih * s) / 2, iw * s, ih * s);
  photo._backdrop = { key, canvas: small };
  return small;
}

/** Draws one photo into one panel rect, honouring the panel's framing state. */
function drawPanelPhoto(ctx, rect, panel, grade, amt) {
  const photo = panel.photo;
  const iw = photo.img.naturalWidth;
  const ih = photo.img.naturalHeight;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();

  // Backdrop first: the same photo, blurred and darkened, so any area the
  // sharp photograph cannot reach still belongs to the picture.
  const backdrop = backdropFor(photo, rect.w, rect.h);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(backdrop, rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = grade.sky;
  ctx.globalAlpha = 0.18;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(8, 3, 18, 0.13)';
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

  // The sharp photograph, placed by the framing maths.
  const fp = focalPixels(photo);
  let scale;
  let dx;
  let dy;
  if (panel.fit === 'fill') {
    scale = Math.max(rect.w / iw, rect.h / ih) * panel.zoom;
    dx = rect.x + rect.w / 2 + panel.panX - fp.cx * scale;
    dy = rect.y + rect.h / 2 + panel.panY - fp.cy * scale;
  } else {
    // Whole subject: the focal box, scaled by this factor, fits the panel
    // on both axes at zoom 1 — so the whole person is inside, by construction.
    scale = Math.min(rect.w / fp.w, rect.h / fp.h) * panel.zoom;
    const fw = fp.w * scale;
    const fh = fp.h * scale;
    const fx = rect.x + (rect.w - fw) / 2 + panel.panX;
    const fy = rect.y + (rect.h - fh) / 2 + panel.panY;
    dx = fx - fp.x * scale;
    dy = fy - fp.y * scale;
  }
  ctx.filter = gradeFilter(grade, amt);
  ctx.drawImage(photo.img, dx, dy, iw * scale, ih * scale);
  ctx.filter = 'none';
  ctx.restore();
}

/** Placeholder art for a panel nobody has filled yet. */
function drawEmptyPanel(ctx, rect, index, grade) {
  ctx.save();
  ctx.fillStyle = '#22103d';
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.setLineDash([10, 8]);
  ctx.lineWidth = 2;
  ctx.strokeRect(rect.x + 12, rect.y + 12, rect.w - 24, rect.h - 24);
  ctx.setLineDash([]);
  ctx.fillStyle = grade.accent;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `400 ${Math.max(17, Math.round(rect.h * 0.055))}px ${TITLE_FONT}`;
  ctx.fillText(`PANEL ${index + 1}`, rect.x + rect.w / 2, rect.y + rect.h / 2 - 14);
  ctx.fillStyle = 'rgba(245, 238, 252, 0.75)';
  ctx.font = `600 ${Math.max(12, Math.round(rect.h * 0.032))}px ${SUB_FONT}`;
  ctx.fillText('click here, then “Use” a tray photo', rect.x + rect.w / 2, rect.y + rect.h / 2 + 16);
  ctx.restore();
}

/** The title band: its own strip below the panels, so text never covers a face. */
function drawTitleBand(ctx, w, h, geo, state, grade) {
  const bandY = h - geo.bandH;
  const grad = ctx.createLinearGradient(0, bandY, 0, h);
  grad.addColorStop(0, '#2b0f47');
  grad.addColorStop(1, '#12061f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, bandY, w, geo.bandH);
  const edge = ctx.createLinearGradient(0, 0, w, 0);
  edge.addColorStop(0, '#ffb340');
  edge.addColorStop(0.5, '#ff4fa3');
  edge.addColorStop(1, '#2ee6c8');
  ctx.fillStyle = edge;
  ctx.fillRect(0, bandY, w, Math.max(3, Math.round(geo.bandH * 0.03)));

  const title = (state.title || '').trim().toUpperCase();
  const sub = (state.subtitle || '').trim().toUpperCase();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (title) {
    let size = geo.bandH * (sub ? 0.46 : 0.58);
    ctx.font = `400 ${size}px ${TITLE_FONT}`;
    while (ctx.measureText(title).width > w * 0.92 && size > 14) {
      size -= 2;
      ctx.font = `400 ${size}px ${TITLE_FONT}`;
    }
    const titleY = bandY + geo.bandH * (sub ? 0.58 : 0.68);
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = size * 0.16;
    ctx.shadowOffsetY = size * 0.05;
    ctx.lineWidth = Math.max(2, size / 10);
    ctx.strokeStyle = '#1c0730';
    ctx.strokeText(title, w / 2, titleY);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, w / 2, titleY);
    ctx.restore();
  }
  if (sub) {
    let size = geo.bandH * 0.185;
    ctx.font = `700 ${size}px ${SUB_FONT}`;
    while (ctx.measureText(sub).width > w * 0.9 && size > 10) {
      size -= 1;
      ctx.font = `700 ${size}px ${SUB_FONT}`;
    }
    try { ctx.letterSpacing = '3px'; } catch { /* older engines: spacing is a garnish */ }
    ctx.fillStyle = grade.accent;
    ctx.fillText(sub, w / 2, bandY + geo.bandH * 0.87);
    try { ctx.letterSpacing = '0px'; } catch { /* no-op */ }
  }
}

/**
 * Renders the whole cover described by `state` onto `canvas` at the canvas's
 * own pixel size. Pure function of state + loaded photos: same inputs, same
 * pixels, which is what makes the screenshots reproducible.
 */
export function drawCover(canvas, state, opts = {}) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = gradeById(state.gradeId);
  const amt = state.gradeAmt;
  const geo = computeGeometry(w, h, state.layoutId);

  ctx.save();
  ctx.filter = 'none';
  ctx.fillStyle = '#150826';
  ctx.fillRect(0, 0, w, h);
  const glow = ctx.createRadialGradient(w * 0.78, h * 0.1, 10, w * 0.78, h * 0.1, Math.max(w, h) * 0.85);
  glow.addColorStop(0, 'rgba(255, 110, 90, 0.35)');
  glow.addColorStop(1, 'rgba(255, 110, 90, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  geo.rects.forEach((rect, i) => {
    const panel = state.panels[i];
    if (panel && panel.photo) drawPanelPhoto(ctx, rect, panel, grade, amt);
    else drawEmptyPanel(ctx, rect, i, grade);
  });

  // The grade wash over the panels only — the band keeps its own colours.
  if (amt > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(geo.area.x, geo.area.y, geo.area.w, geo.area.h + geo.margin);
    ctx.clip();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.62 * amt;
    const wash = ctx.createLinearGradient(0, geo.area.y, 0, geo.area.y + geo.area.h);
    wash.addColorStop(0, grade.washTop);
    wash.addColorStop(1, grade.washBottom);
    ctx.fillStyle = wash;
    ctx.fillRect(geo.area.x, geo.area.y, geo.area.w, geo.area.h + geo.margin);
    ctx.restore();

    const shade = ctx.createLinearGradient(0, geo.area.y + geo.area.h * 0.72, 0, geo.area.y + geo.area.h + geo.margin);
    shade.addColorStop(0, 'rgba(10, 2, 24, 0)');
    shade.addColorStop(1, `rgba(10, 2, 24, ${0.26 * amt})`);
    ctx.fillStyle = shade;
    ctx.fillRect(geo.area.x, geo.area.y, geo.area.w, geo.area.h + geo.margin);
  }

  // Panel frames: a dark keyline, a neon hairline, and — in the editor only —
  // a hot outline on the selected panel.
  geo.rects.forEach((rect, i) => {
    ctx.strokeStyle = 'rgba(5, 1, 12, 0.85)';
    ctx.lineWidth = 7;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = grade.accent;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 2;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.globalAlpha = 1;
    if (opts.showSelection && i === state.selected) {
      ctx.strokeStyle = '#ff4fa3';
      ctx.lineWidth = 5;
      ctx.strokeRect(rect.x - 3, rect.y - 3, rect.w + 6, rect.h + 6);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.setLineDash([14, 10]);
      ctx.lineWidth = 2;
      ctx.strokeRect(rect.x - 3, rect.y - 3, rect.w + 6, rect.h + 6);
      ctx.setLineDash([]);
    }
  });

  drawTitleBand(ctx, w, h, geo, state, grade);
  ctx.restore();
  return geo;
}
