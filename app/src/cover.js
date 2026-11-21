// Grand Leonida — canvas renderer for the cast-mosaic cover.
// One sunset look is baked into every panel photo so the mosaic reads
// as a single poster: thin gold frames on near-black, a sunset-striped
// chrome title overlapping the bottom of the mosaic, a neon script
// subtitle, role tags, a five-star quote strip and a billing block.
export const PANEL_DEFS = [
  { id: "hero", file: "hero.jpg", tag: "THE DRIVER", color: "#ffb02e", fx: 0.5, fy: 0.33 },
  { id: "boss", file: "boss.jpg", tag: "THE BOSS", color: "#ff4fc3", fx: 0.5, fy: 0.31 },
  { id: "siren", file: "siren.jpg", tag: "THE SIREN", color: "#ff5a3c", fx: 0.5, fy: 0.3 },
  { id: "beard", file: "beard.jpg", tag: "THE FIXER", color: "#37e0c8", fx: 0.5, fy: 0.3 },
  { id: "curly", file: "curly.jpg", tag: "THE LOOKOUT", color: "#b78bff", fx: 0.5, fy: 0.34 },
  { id: "runner", file: "runner.jpg", tag: "THE RUNNER", color: "#7ee83a", fx: 0.5, fy: 0.3 },
  { id: "car", file: "car.jpg", tag: "THE GETAWAY", color: "#ffd94d", fx: 0.5, fy: 0.5 },
  { id: "motel", file: "motel.jpg", tag: "PALMS MOTEL", color: "#4db8ff", fx: 0.5, fy: 0.5 },
];
export const GRADES = ["sunset", "neon", "golden", "poster"];
export const PANEL_ORDER = ["hero", "boss", "siren", "beard", "curly", "runner", "car", "motel"];

export function defaultState() {
  return {
    title: "GRAND LEONIDA",
    script: "Vice Never Sleeps",
    tagline: "EVERY SAINT HAS A PAST · EVERY SINNER HAS A FUTURE",
    quote: "★★★★★ 'A SUN-SOAKED RIOT OF A POSTER' — THE LEONIDA GAZETTE",
    billing: "LEONIDA COVER STUDIO PRESENTS · A VICE COAST PRODUCTION · GRAND LEONIDA · COMING SOON",
    grade: "sunset",
    panels: PANEL_DEFS.map((d) => ({ ...d, dx: 0, dy: 0, zoom: 1, flip: false, img: null })),
  };
}

export function formatOf(W, H) {
  if (W > H) return "landscape";
  if (H > W) return "portrait";
  return "square";
}

// Mosaic geometry. Landscape: tall hero on the left, three faces across
// the top right, four frames along the bottom right. Portrait/square:
// hero banner on top, two rows of pairs, then a row of three.
export function computeLayout(W, H) {
  const format = formatOf(W, H);
  const margin = Math.round(W * 0.018);
  const gutter = Math.max(3, Math.round(W * 0.006));
  const quoteH = Math.round(H * (format === "landscape" ? 0.058 : 0.046));
  const billH = Math.round(H * (format === "landscape" ? 0.052 : 0.045));
  const mosX = margin;
  const mosW = W - margin * 2;
  const mosY = margin + quoteH + gutter;
  let mosH;
  if (format === "landscape") mosH = H - mosY - billH - margin;
  else if (format === "portrait") mosH = Math.round(H * 0.64);
  else mosH = Math.round(H * 0.62);
  const rects = {};
  if (format === "landscape") {
    const heroW = Math.round(mosW * 0.33);
    rects.hero = { x: mosX, y: mosY, w: heroW, h: mosH };
    const rx = mosX + heroW + gutter;
    const rw = mosW - heroW - gutter;
    const topH = Math.round(mosH * 0.52);
    const topW = (rw - gutter * 2) / 3;
    ["boss", "siren", "beard"].forEach((id, i) => {
      rects[id] = { x: Math.round(rx + i * (topW + gutter)), y: mosY, w: Math.round(topW), h: topH };
    });
    const by = mosY + topH + gutter;
    const bh = mosH - topH - gutter;
    const botW = (rw - gutter * 3) / 4;
    ["curly", "runner", "car", "motel"].forEach((id, i) => {
      rects[id] = { x: Math.round(rx + i * (botW + gutter)), y: by, w: Math.round(botW), h: bh };
    });
  } else {
    const heroH = Math.round(mosH * 0.44);
    rects.hero = { x: mosX, y: mosY, w: mosW, h: heroH };
    const rowH = (mosH - heroH - gutter * 2) / 3;
    const half = (mosW - gutter) / 2;
    const yA = mosY + heroH + gutter;
    rects.boss = { x: mosX, y: Math.round(yA), w: Math.round(half), h: Math.round(rowH) };
    rects.siren = { x: Math.round(mosX + half + gutter), y: Math.round(yA), w: Math.round(half), h: Math.round(rowH) };
    const yB = yA + rowH + gutter;
    rects.beard = { x: mosX, y: Math.round(yB), w: Math.round(half), h: Math.round(rowH) };
    rects.curly = { x: Math.round(mosX + half + gutter), y: Math.round(yB), w: Math.round(half), h: Math.round(rowH) };
    const yC = yB + rowH + gutter;
    const third = (mosW - gutter * 2) / 3;
    ["runner", "car", "motel"].forEach((id, i) => {
      rects[id] = { x: Math.round(mosX + i * (third + gutter)), y: Math.round(yC), w: Math.round(third), h: Math.round(rowH) };
    });
  }
  return { format, M: margin, gut: gutter, quoteH, billH, mosX, mosY, mosW, mosH, rects };
}

// ---- colour grades (cached per image + grade) ----
const gradeMemo = new Map();
const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
function pushSaturation(d, i, amount) {
  const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  d[i] = clamp(lum + (d[i] - lum) * amount);
  d[i + 1] = clamp(lum + (d[i + 1] - lum) * amount);
  d[i + 2] = clamp(lum + (d[i + 2] - lum) * amount);
}
function gradedCopy(img, grade) {
  if (!img || grade === "none") return img;
  const key = `${grade}|${img.src || `${img.width}x${img.height}`}`;
  if (gradeMemo.has(key)) return gradeMemo.get(key);
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  try {
    const frame = g.getImageData(0, 0, w, h);
    const d = frame.data;
    for (let y = 0; y < h; y++) {
      const t = h > 1 ? y / h : 0; // 0 at the sky, 1 at the street
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        let r = d[i], gg = d[i + 1], b = d[i + 2];
        if (grade === "sunset") {
          // The house LUT: warm highlights up top, magenta shadows below.
          r = r * (1 + 0.16 * (1 - t)) + 14 * (1 - t) + 20 * t;
          gg = gg * 1.02 + 2;
          b = b * (1 - 0.1 * (1 - t)) + 16 * t;
          d[i] = clamp(r); d[i + 1] = clamp(gg); d[i + 2] = clamp(b);
          pushSaturation(d, i, 1.12);
          const mid = (d[i] + d[i + 1] + d[i + 2]) / 3;
          d[i] = clamp(mid + (d[i] - mid) * 1.1);
          d[i + 1] = clamp(mid + (d[i + 1] - mid) * 1.1);
          d[i + 2] = clamp(mid + (d[i + 2] - mid) * 1.1);
        } else if (grade === "neon") {
          const lum = (0.299 * r + 0.587 * gg + 0.114 * b) / 255;
          r += (lum > 0.5 ? 26 : -6) + 10 * t;
          gg += (lum > 0.5 ? -8 : 18) * (1 - lum);
          b += (lum > 0.5 ? 30 : 22) * (lum > 0.5 ? 1 : 0.6);
          d[i] = clamp(r); d[i + 1] = clamp(gg); d[i + 2] = clamp(b);
          pushSaturation(d, i, 1.35);
        } else if (grade === "golden") {
          r = 26 + (r * 0.92 + 46) * 0.92;
          gg = 20 + (gg * 0.88 + 30) * 0.92;
          b = 10 + (b * 0.78 + 8) * 0.92;
          d[i] = clamp(r); d[i + 1] = clamp(gg); d[i + 2] = clamp(b);
          pushSaturation(d, i, 1.08);
        } else if (grade === "poster") {
          d[i] = clamp(Math.round((r / 255) * 5) * 51);
          d[i + 1] = clamp(Math.round((gg / 255) * 5) * 51);
          d[i + 2] = clamp(Math.round((b / 255) * 5) * 51);
          pushSaturation(d, i, 1.3);
        }
      }
    }
    g.putImageData(frame, 0, 0);
  } catch { /* unreadable pixels: fall back to the plain copy */ }
  gradeMemo.set(key, c);
  return c;
}

// Cover-crop a photo into its panel: the frame is always fully covered,
// faces are never stretched and never sliced by a neighbouring panel.
function paintPhoto(ctx, panel, grade, r, extraBottom = 0) {
  const h = r.h + extraBottom;
  ctx.save();
  ctx.beginPath(); ctx.rect(r.x, r.y, r.w, h); ctx.clip();
  if (!panel.img) {
    ctx.fillStyle = "#251631";
    ctx.fillRect(r.x, r.y, r.w, h);
    ctx.restore();
    return;
  }
  const src = gradedCopy(panel.img, grade);
  const iw = src.width || panel.img.naturalWidth || panel.img.width;
  const ih = src.height || panel.img.naturalHeight || panel.img.height;
  const zoom = Math.max(1, panel.zoom || 1);
  const scale = Math.max(r.w / iw, h / ih) * zoom;
  const sw = r.w / scale;
  const sh = h / scale;
  let sx = (iw - sw) * panel.fx + panel.dx * sw;
  let sy = (ih - sh) * panel.fy + panel.dy * sh;
  // Very wide panels (portrait/square hero banner, thin rows) take a
  // thin horizontal slice: centre that slice on the focal point so a
  // face is framed whole instead of losing its chin to the frame edge.
  if (r.w / h / (iw / ih) > 1.55) sy = panel.fy * ih - sh / 2 + panel.dy * sh;
  sx = Math.max(0, Math.min(iw - sw, sx));
  sy = Math.max(0, Math.min(ih - sh, sy));
  if (panel.flip) {
    ctx.translate(r.x + r.w, r.y); ctx.scale(-1, 1);
    ctx.drawImage(src, sx, sy, sw, sh, 0, 0, r.w, h);
  } else {
    ctx.drawImage(src, sx, sy, sw, sh, r.x, r.y, r.w, h);
  }
  ctx.restore();
}

function fitFont(ctx, text, weight, maxSize, maxWidth, family, prefix = "") {
  let size = maxSize;
  const apply = () => { ctx.font = `${prefix}${weight} ${size}px ${family}`; };
  apply();
  while (ctx.measureText(text).width > maxWidth && size > 10) { size *= 0.94; apply(); }
  return size;
}

// Role tag: dark chip, coloured slash, white condensed caps.
function paintTag(ctx, panel, r, unit) {
  const size = Math.max(10, Math.round(unit * 15));
  ctx.save();
  ctx.font = `700 ${size}px 'Arial Narrow','Helvetica Neue Condensed',Impact,sans-serif`;
  const textW = ctx.measureText(panel.tag).width;
  const pad = size * 0.55;
  const slashW = size * 0.62;
  const chipW = textW + pad * 2 + slashW;
  const chipH = size * 1.72;
  const x = r.x + 5 * unit, y = r.y + 5 * unit;
  ctx.fillStyle = "rgba(5,3,10,0.86)";
  ctx.fillRect(x, y, chipW, chipH);
  const inset = size * 0.28;
  const slant = size * 0.22;
  ctx.fillStyle = panel.color;
  ctx.beginPath();
  ctx.moveTo(x + inset, y + 3);
  ctx.lineTo(x + inset + slashW - slant, y + 3);
  ctx.lineTo(x + inset + slashW, y + chipH - 3);
  ctx.lineTo(x + inset + slant, y + chipH - 3);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle"; ctx.textAlign = "left";
  ctx.fillText(panel.tag, x + inset + slashW + pad * 0.7, y + chipH / 2 + 1);
  ctx.restore();
}

function paintSeal(ctx, cx, cy, rad) {
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(-0.22);
  ctx.shadowColor = "rgba(0,0,0,0.55)"; ctx.shadowBlur = rad * 0.25; ctx.shadowOffsetY = rad * 0.08;
  ctx.beginPath();
  for (let i = 0; i < 36; i++) {
    const a = (Math.PI * i) / 18;
    const rr = i % 2 === 0 ? rad : rad * 0.8;
    const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = "#f5b921"; ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.lineWidth = Math.max(1.5, rad * 0.05); ctx.strokeStyle = "#7a4d00"; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, rad * 0.6, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = "#3a2400"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = `900 ${rad * 0.52}px Impact,'Arial Narrow',sans-serif`;
  ctx.fillText("★", 0, -rad * 0.16);
  ctx.font = `700 ${rad * 0.2}px 'Arial Narrow',sans-serif`;
  ctx.fillText("LEONIDA", 0, rad * 0.3);
  ctx.restore();
}

function paintBarcode(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = "#f4f1ea"; ctx.fillRect(x, y, w, h);
  let seed = 7;
  const next = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  ctx.fillStyle = "#111111";
  let bx = x + w * 0.07;
  while (bx < x + w * 0.9) {
    const bw = (0.008 + next() * 0.022) * w;
    if (next() > 0.42) ctx.fillRect(bx, y + h * 0.1, bw, h * 0.62);
    bx += bw + (0.006 + next() * 0.014) * w;
  }
  ctx.font = `${h * 0.17}px 'Courier New',monospace`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("8 901214 600613", x + w / 2, y + h * 0.9);
  ctx.restore();
}

export function drawCover(ctx, W, H, state) {
  const unit = W / 1000;
  const L = computeLayout(W, H);
  const { M, quoteH, billH, mosY, mosW, mosH, rects, format } = L;
  const mosBottom = mosY + mosH;
  ctx.save();
  ctx.fillStyle = "#0c0613"; ctx.fillRect(0, 0, W, H);
  const wash = ctx.createLinearGradient(0, H * 0.55, 0, H);
  wash.addColorStop(0, "rgba(60,16,64,0)");
  wash.addColorStop(1, "rgba(94,24,84,0.55)");
  ctx.fillStyle = wash; ctx.fillRect(0, 0, W, H);

  // Five-star quote strip along the top.
  ctx.save();
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = unit * 4;
  fitFont(ctx, state.quote, 700, H * 0.026, W * 0.92, "'Arial Narrow',Impact,sans-serif");
  ctx.fillStyle = "#f3d9a4";
  ctx.fillText(state.quote, W / 2, M + quoteH / 2);
  ctx.restore();
  ctx.fillStyle = "#c9973f";
  ctx.fillRect(M, M + quoteH - 1, mosW, Math.max(1, unit * 1.6));

  const byId = {};
  for (const p of state.panels) byId[p.id] = p;
  for (const id of PANEL_ORDER) {
    const p = byId[id], r = rects[id];
    if (!p || !r) continue;
    if (id === "hero" && format === "landscape") {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.65)"; ctx.shadowBlur = unit * 16; ctx.shadowOffsetY = unit * 6;
      paintPhoto(ctx, p, state.grade, r, Math.round(r.h * 0.03));
      ctx.restore();
    } else {
      paintPhoto(ctx, p, state.grade, r, 0);
    }
  }

  // Bottom scrim so the chrome title stays readable over the photos.
  const scrimTop = format === "landscape" ? mosBottom - mosH * 0.46 : mosBottom - mosH * 0.16;
  const sg = ctx.createLinearGradient(0, scrimTop, 0, mosBottom + H * 0.02);
  sg.addColorStop(0, "rgba(8,4,14,0)");
  sg.addColorStop(0.62, "rgba(8,4,14,0.52)");
  sg.addColorStop(1, "rgba(8,4,14,0.88)");
  ctx.fillStyle = sg; ctx.fillRect(0, scrimTop, W, mosBottom + H * 0.02 - scrimTop);

  // Thin gold frames; the hero frame rides slightly proud in landscape.
  for (const id of PANEL_ORDER) {
    const r = rects[id]; if (!r) continue;
    ctx.save();
    if (id === "hero" && format === "landscape") {
      ctx.strokeStyle = "#ffcf5e"; ctx.lineWidth = Math.max(3, unit * 5.2);
      ctx.shadowColor = "rgba(0,0,0,0.65)"; ctx.shadowBlur = unit * 16; ctx.shadowOffsetY = unit * 6;
      ctx.strokeRect(r.x, r.y, r.w, r.h + Math.round(r.h * 0.03));
    } else {
      ctx.strokeStyle = "#d9a441"; ctx.lineWidth = Math.max(2, unit * 3);
      ctx.strokeRect(r.x, r.y, r.w, r.h);
    }
    ctx.restore();
  }
  for (const id of PANEL_ORDER) {
    const p = byId[id], r = rects[id];
    if (p && r) paintTag(ctx, p, r, unit);
  }

  // Outer keyline.
  ctx.save();
  ctx.strokeStyle = "#e8b64c"; ctx.lineWidth = Math.max(3, unit * 4.5);
  ctx.strokeRect(M * 0.45, M * 0.45, W - M * 0.9, H - M * 0.9);
  ctx.restore();

  // Sunset-striped chrome title.
  const titleBase = format === "landscape" ? mosBottom - H * 0.085 : mosBottom + H * 0.085;
  ctx.save();
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  const titleSize = fitFont(ctx, state.title, 900, H * (format === "landscape" ? 0.155 : 0.105), W * 0.94, "'Arial Narrow',Impact,'Haettenschweiler',sans-serif");
  try { ctx.letterSpacing = `${titleSize * 0.02}px`; } catch { /* older engines */ }
  const chrome = ctx.createLinearGradient(0, titleBase - titleSize, 0, titleBase);
  chrome.addColorStop(0, "#fff3c4");
  chrome.addColorStop(0.34, "#ffb02e");
  chrome.addColorStop(0.62, "#ff5e62");
  chrome.addColorStop(0.82, "#e83e9e");
  chrome.addColorStop(1, "#7b2ff7");
  ctx.lineJoin = "round";
  ctx.lineWidth = titleSize * 0.16; ctx.strokeStyle = "#0a0510";
  ctx.shadowColor = "rgba(0,0,0,0.65)"; ctx.shadowBlur = unit * 10; ctx.shadowOffsetY = unit * 6;
  ctx.strokeText(state.title, W / 2, titleBase);
  ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.fillStyle = chrome;
  ctx.fillText(state.title, W / 2, titleBase);
  ctx.restore();

  // Neon script subtitle, double-struck for glow.
  ctx.save();
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  const scriptSize = fitFont(ctx, state.script, 700, H * 0.048, W * 0.8, "Georgia,'Segoe Script',cursive", "italic ");
  ctx.fillStyle = "#ff6ec7";
  ctx.shadowColor = "#ff2ea6"; ctx.shadowBlur = unit * 16;
  const scriptY = titleBase + scriptSize * 1.18;
  ctx.fillText(state.script, W / 2, scriptY);
  ctx.fillText(state.script, W / 2, scriptY);
  ctx.restore();

  // Tagline under the script.
  ctx.save();
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  const tagSize = fitFont(ctx, state.tagline, 600, H * 0.02, W * 0.9, "'Arial Narrow',sans-serif");
  ctx.fillStyle = "#f6e7c8";
  ctx.shadowColor = "rgba(0,0,0,0.8)"; ctx.shadowBlur = unit * 5; ctx.shadowOffsetY = unit * 2;
  ctx.fillText(state.tagline, W / 2, titleBase + scriptSize * 1.18 + tagSize * 2.25);
  ctx.restore();

  // Seal, barcode and billing block along the foot.
  const sealR = H * (format === "landscape" ? 0.052 : 0.042);
  paintSeal(ctx, M + sealR + unit * 6, H - M - sealR - unit * 4, sealR);
  const bw = W * (format === "landscape" ? 0.085 : 0.13);
  paintBarcode(ctx, W - M - bw - unit * 6, H - M - bw * 0.58 - unit * 4, bw, bw * 0.58);
  ctx.save();
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  fitFont(ctx, state.billing, 600, H * 0.017, W * 0.62, "'Arial Narrow',sans-serif");
  ctx.fillStyle = "#cfc4d8";
  ctx.fillText(state.billing, W / 2, H - M - billH * 0.28);
  ctx.restore();
  ctx.restore();
}
