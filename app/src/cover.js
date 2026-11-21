// Leonida Cover Studio — canvas 2D cover renderer
export const PANEL_DEFS = [
  { id: "hero", file: "hero.jpg", tag: "THE DRIVER", color: "#ffb02e", fx: 0.50, fy: 0.33 },
  { id: "boss", file: "boss.jpg", tag: "THE BOSS", color: "#ff4fc3", fx: 0.50, fy: 0.31 },
  { id: "siren", file: "siren.jpg", tag: "THE SIREN", color: "#ff5a3c", fx: 0.50, fy: 0.30 },
  { id: "beard", file: "beard.jpg", tag: "THE FIXER", color: "#37e0c8", fx: 0.50, fy: 0.30 },
  { id: "curly", file: "curly.jpg", tag: "THE LOOKOUT", color: "#b78bff", fx: 0.50, fy: 0.34 },
  { id: "runner", file: "runner.jpg", tag: "THE RUNNER", color: "#7ee83a", fx: 0.50, fy: 0.30 },
  { id: "car", file: "car.jpg", tag: "THE GETAWAY", color: "#ffd94d", fx: 0.50, fy: 0.50 },
  { id: "motel", file: "motel.jpg", tag: "PALMS MOTEL", color: "#4db8ff", fx: 0.50, fy: 0.50 },
];
export const GRADES = ["sunset", "neon", "golden", "poster"];

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

export function computeLayout(W, H) {
  const format = formatOf(W, H);
  const M = Math.round(W * 0.018);
  const gut = Math.max(3, Math.round(W * 0.006));
  const quoteH = Math.round(H * (format === "landscape" ? 0.058 : 0.046));
  const billH = Math.round(H * (format === "landscape" ? 0.052 : 0.045));
  const mosX = M;
  const mosW = W - 2 * M;
  const mosY = M + quoteH + gut;
  let mosH;
  if (format === "landscape") mosH = H - mosY - billH - M;
  else if (format === "portrait") mosH = Math.round(H * 0.64);
  else mosH = Math.round(H * 0.62);
  const rects = {};
  if (format === "landscape") {
    const heroW = Math.round(mosW * 0.33);
    rects.hero = { x: mosX, y: mosY, w: heroW, h: mosH };
    const rx = mosX + heroW + gut;
    const rw = mosW - heroW - gut;
    const topH = Math.round(mosH * 0.52);
    const colW = (rw - 2 * gut) / 3;
    const topIds = ["boss", "siren", "beard"];
    topIds.forEach((id, i) => {
      rects[id] = { x: Math.round(rx + i * (colW + gut)), y: mosY, w: Math.round(colW), h: topH };
    });
    const botY = mosY + topH + gut;
    const botH = mosH - topH - gut;
    const col4 = (rw - 3 * gut) / 4;
    const botIds = ["curly", "runner", "car", "motel"];
    botIds.forEach((id, i) => {
      rects[id] = { x: Math.round(rx + i * (col4 + gut)), y: botY, w: Math.round(col4), h: botH };
    });
  } else {
    const heroH = Math.round(mosH * 0.44);
    rects.hero = { x: mosX, y: mosY, w: mosW, h: heroH };
    const rowH = (mosH - heroH - 2 * gut) / 3;
    const halfW = (mosW - gut) / 2;
    const y1 = mosY + heroH + gut;
    rects.boss = { x: mosX, y: Math.round(y1), w: Math.round(halfW), h: Math.round(rowH) };
    rects.siren = { x: Math.round(mosX + halfW + gut), y: Math.round(y1), w: Math.round(halfW), h: Math.round(rowH) };
    const y2 = y1 + rowH + gut;
    rects.beard = { x: mosX, y: Math.round(y2), w: Math.round(halfW), h: Math.round(rowH) };
    rects.curly = { x: Math.round(mosX + halfW + gut), y: Math.round(y2), w: Math.round(halfW), h: Math.round(rowH) };
    const y3 = y2 + rowH + gut;
    const thirdW = (mosW - 2 * gut) / 3;
    const row3 = ["runner", "car", "motel"];
    row3.forEach((id, i) => {
      rects[id] = { x: Math.round(mosX + i * (thirdW + gut)), y: Math.round(y3), w: Math.round(thirdW), h: Math.round(rowH) };
    });
  }
  return { format, M, gut, quoteH, billH, mosX, mosY, mosW, mosH, rects };
}

const gradeCache = new Map();
function clamp255(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }
function saturatePixel(d, i, amt) {
  const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  d[i] = clamp255(l + (d[i] - l) * amt);
  d[i + 1] = clamp255(l + (d[i + 1] - l) * amt);
  d[i + 2] = clamp255(l + (d[i + 2] - l) * amt);
}
function gradedImage(img, grade) {
  if (!img || grade === "none") return img;
  const key = grade + "|" + (img.src || img.width + "x" + img.height);
  if (gradeCache.has(key)) return gradeCache.get(key);
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const cx = c.getContext("2d", { willReadFrequently: true });
  cx.drawImage(img, 0, 0);
  try {
    const im = cx.getImageData(0, 0, w, h);
    const d = im.data;
    for (let y = 0; y < h; y++) {
      const t = h > 1 ? y / h : 0;
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        let r = d[i], g = d[i + 1], b = d[i + 2];
        if (grade === "sunset") {
          r = r * (1 + 0.16 * (1 - t)) + 14 * (1 - t);
          g = g * 1.02 + 2;
          b = b * (1 - 0.10 * (1 - t)) + 16 * t;
          r += 20 * t;
          d[i] = clamp255(r); d[i + 1] = clamp255(g); d[i + 2] = clamp255(b);
          saturatePixel(d, i, 1.12);
          const l = (d[i] + d[i + 1] + d[i + 2]) / 3;
          d[i] = clamp255(l + (d[i] - l) * 1.10);
          d[i + 1] = clamp255(l + (d[i + 1] - l) * 1.10);
          d[i + 2] = clamp255(l + (d[i + 2] - l) * 1.10);
        } else if (grade === "neon") {
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          r += (lum > 0.5 ? 26 : -6) + 10 * t;
          g += (lum > 0.5 ? -8 : 18) * (1 - lum);
          b += (lum > 0.5 ? 30 : 22) * (lum > 0.5 ? 1 : 0.6);
          d[i] = clamp255(r); d[i + 1] = clamp255(g); d[i + 2] = clamp255(b);
          saturatePixel(d, i, 1.35);
        } else if (grade === "golden") {
          r = r * 0.92 + 46; g = g * 0.88 + 30; b = b * 0.78 + 8;
          r = 26 + r * 0.92; g = 20 + g * 0.92; b = 10 + b * 0.92;
          d[i] = clamp255(r); d[i + 1] = clamp255(g); d[i + 2] = clamp255(b);
          saturatePixel(d, i, 1.08);
        } else if (grade === "poster") {
          d[i] = clamp255(Math.round((r / 255) * 5) * (255 / 5));
          d[i + 1] = clamp255(Math.round((g / 255) * 5) * (255 / 5));
          d[i + 2] = clamp255(Math.round((b / 255) * 5) * (255 / 5));
          saturatePixel(d, i, 1.30);
        }
      }
    }
    cx.putImageData(im, 0, 0);
  } catch { /* tainted or unavailable: use plain copy */ }
  gradeCache.set(key, c);
  return c;
}

function drawPhoto(ctx, panel, grade, r, expandBottom = 0) {
  const h = r.h + expandBottom;
  ctx.save();
  ctx.beginPath(); ctx.rect(r.x, r.y, r.w, h); ctx.clip();
  if (!panel.img) { ctx.fillStyle = "#241430"; ctx.fillRect(r.x, r.y, r.w, h); ctx.restore(); return; }
  const src = gradedImage(panel.img, grade);
  const iw = src.width || panel.img.naturalWidth || panel.img.width;
  const ih = src.height || panel.img.naturalHeight || panel.img.height;
  const zoom = Math.max(1, panel.zoom || 1);
  const scale = Math.max(r.w / iw, h / ih) * zoom;
  const sw = r.w / scale;
  const sh = h / scale;
  let sx = (iw - sw) * panel.fx + panel.dx * sw;
  let sy = (ih - sh) * panel.fy + panel.dy * sh;
  const panelAspect = r.w / h;
  const imgAspect = iw / ih;
  if (panelAspect / imgAspect > 1.9) {
    sy = panel.fy * ih - sh / 2 + panel.dy * sh;
  }
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

function fitFont(ctx, text, weight, maxSize, maxWidth, family, stylePrefix = "") {
  let size = maxSize;
  const set = () => { ctx.font = `${stylePrefix}${weight} ${size}px ${family}`; };
  set();
  while (ctx.measureText(text).width > maxWidth && size > 10) { size *= 0.94; set(); }
  return size;
}

function drawTag(ctx, panel, r, unit) {
  const size = Math.max(10, Math.round(unit * 15));
  ctx.save();
  ctx.font = `700 ${size}px 'Arial Narrow','Helvetica Neue Condensed',Impact,sans-serif`;
  const tw = ctx.measureText(panel.tag).width;
  const pad = size * 0.55;
  const slashW = size * 0.62;
  const chipW = tw + pad * 2 + slashW;
  const chipH = size * 1.72;
  const x = r.x + 5 * unit, y = r.y + 5 * unit;
  ctx.fillStyle = "rgba(5,3,10,0.86)";
  ctx.fillRect(x, y, chipW, chipH);
  ctx.fillStyle = panel.color;
  ctx.beginPath();
  const inset = size * 0.28;
  const slant = size * 0.22;
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

function drawSeal(ctx, cx, cy, rad) {
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(-0.22);
  ctx.shadowColor = "rgba(0,0,0,0.55)"; ctx.shadowBlur = rad * 0.25; ctx.shadowOffsetY = rad * 0.08;
  ctx.beginPath();
  for (let i = 0; i < 18 * 2; i++) {
    const ang = (Math.PI * i) / 18;
    const rr = i % 2 === 0 ? rad : rad * 0.80;
    const px = Math.cos(ang) * rr, py = Math.sin(ang) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = "#f5b921"; ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.lineWidth = Math.max(1.5, rad * 0.05); ctx.strokeStyle = "#7a4d00"; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, rad * 0.60, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = "#3a2400"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = `900 ${rad * 0.52}px Impact,'Arial Narrow',sans-serif`;
  ctx.fillText("★", 0, -rad * 0.16);
  ctx.font = `700 ${rad * 0.20}px 'Arial Narrow',sans-serif`;
  ctx.fillText("LEONIDA", 0, rad * 0.30);
  ctx.restore();
}

function drawBarcode(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = "#f4f1ea"; ctx.fillRect(x, y, w, h);
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  ctx.fillStyle = "#111111";
  let bx = x + w * 0.07;
  const endX = x + w * 0.90;
  while (bx < endX) {
    const bw = (0.008 + rnd() * 0.022) * w;
    const draw = rnd() > 0.42;
    if (draw) ctx.fillRect(bx, y + h * 0.10, bw, h * 0.62);
    bx += bw + (0.006 + rnd() * 0.014) * w;
  }
  ctx.fillStyle = "#111111";
  ctx.font = `${h * 0.17}px 'Courier New',monospace`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("8 901214 600613", x + w / 2, y + h * 0.90);
  ctx.restore();
}

export function drawCover(ctx, W, H, state) {
  const unit = W / 1000;
  const L = computeLayout(W, H);
  const { M, quoteH, billH, mosY, mosW, mosH, rects, format } = L;
  const mosBot = mosY + mosH;
  ctx.save();
  ctx.fillStyle = "#0d0714"; ctx.fillRect(0, 0, W, H);
  const gg = ctx.createLinearGradient(0, H * 0.55, 0, H);
  gg.addColorStop(0, "rgba(60,16,64,0)");
  gg.addColorStop(1, "rgba(94,24,84,0.55)");
  ctx.fillStyle = gg; ctx.fillRect(0, 0, W, H);

  // Quote strip
  ctx.save();
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = unit * 4;
  fitFont(ctx, state.quote, 700, H * 0.026, W * 0.92, "'Arial Narrow',Impact,sans-serif");
  ctx.fillStyle = "#f3d9a4";
  ctx.fillText(state.quote, W / 2, M + quoteH / 2);
  ctx.restore();
  ctx.fillStyle = "#c9973f";
  ctx.fillRect(M, M + quoteH - 1, mosW, Math.max(1, unit * 1.6));

  const order = ["hero", "boss", "siren", "beard", "curly", "runner", "car", "motel"];
  const byId = {};
  for (const p of state.panels) byId[p.id] = p;
  for (const id of order) {
    const p = byId[id]; const r = rects[id]; if (!p || !r) continue;
    if (id === "hero" && format === "landscape") {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.65)"; ctx.shadowBlur = unit * 16; ctx.shadowOffsetY = unit * 6;
      drawPhoto(ctx, p, state.grade, r, Math.round(r.h * 0.03));
      ctx.restore();
    } else {
      drawPhoto(ctx, p, state.grade, r, 0);
    }
  }

  // Scrim
  const scrimTop = format === "landscape" ? mosBot - mosH * 0.46 : mosBot - mosH * 0.16;
  const sg = ctx.createLinearGradient(0, scrimTop, 0, mosBot + H * 0.02);
  sg.addColorStop(0, "rgba(8,4,14,0)");
  sg.addColorStop(0.62, "rgba(8,4,14,0.52)");
  sg.addColorStop(1, "rgba(8,4,14,0.88)");
  ctx.fillStyle = sg; ctx.fillRect(0, scrimTop, W, mosBot + H * 0.02 - scrimTop);

  // Frames
  for (const id of order) {
    const r = rects[id]; if (!r) continue;
    ctx.save();
    if (id === "hero" && format === "landscape") {
      const eb = Math.round(r.h * 0.03);
      ctx.strokeStyle = "#ffcf5e"; ctx.lineWidth = Math.max(3, unit * 5.2);
      ctx.shadowColor = "rgba(0,0,0,0.65)"; ctx.shadowBlur = unit * 16; ctx.shadowOffsetY = unit * 6;
      ctx.strokeRect(r.x, r.y, r.w, r.h + eb);
    } else {
      ctx.strokeStyle = "#d9a441"; ctx.lineWidth = Math.max(2, unit * 3);
      ctx.strokeRect(r.x, r.y, r.w, r.h);
    }
    ctx.restore();
  }

  for (const id of order) {
    const p = byId[id]; const r = rects[id]; if (!p || !r) continue;
    drawTag(ctx, p, r, unit);
  }

  ctx.save();
  ctx.strokeStyle = "#e8b64c"; ctx.lineWidth = Math.max(3, unit * 4.5);
  ctx.strokeRect(M * 0.45, M * 0.45, W - M * 0.9, H - M * 0.9);
  ctx.restore();

  // Title
  const titleBase = format === "landscape" ? mosBot - H * 0.085 : mosBot + H * 0.085;
  ctx.save();
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  const titleSize = fitFont(ctx, state.title, 900, H * (format === "landscape" ? 0.155 : 0.105), W * 0.94, "'Arial Narrow',Impact,'Haettenschweiler',sans-serif");
  try { ctx.letterSpacing = `${titleSize * 0.02}px`; } catch {}
  const grad = ctx.createLinearGradient(0, titleBase - titleSize, 0, titleBase);
  grad.addColorStop(0.00, "#fff3c4");
  grad.addColorStop(0.34, "#ffb02e");
  grad.addColorStop(0.62, "#ff5e62");
  grad.addColorStop(0.82, "#e83e9e");
  grad.addColorStop(1.00, "#7b2ff7");
  ctx.lineJoin = "round";
  ctx.lineWidth = titleSize * 0.16; ctx.strokeStyle = "#0a0510";
  ctx.shadowColor = "rgba(0,0,0,0.65)"; ctx.shadowBlur = unit * 10; ctx.shadowOffsetY = unit * 6;
  ctx.strokeText(state.title, W / 2, titleBase);
  ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.fillStyle = grad;
  ctx.fillText(state.title, W / 2, titleBase);
  ctx.restore();

  // Script subtitle
  ctx.save();
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  const scriptSize = fitFont(ctx, state.script, 700, H * 0.048, W * 0.8, "Georgia,'Segoe Script',cursive", "italic ");
  ctx.fillStyle = "#ff6ec7";
  ctx.shadowColor = "#ff2ea6"; ctx.shadowBlur = unit * 16;
  const scriptY = titleBase + scriptSize * 1.18;
  ctx.fillText(state.script, W / 2, scriptY);
  ctx.fillText(state.script, W / 2, scriptY);
  ctx.restore();

  // Tagline
  ctx.save();
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  const tagSize = fitFont(ctx, state.tagline, 600, H * 0.020, W * 0.9, "'Arial Narrow',sans-serif");
  ctx.fillStyle = "#f6e7c8";
  ctx.shadowColor = "rgba(0,0,0,0.8)"; ctx.shadowBlur = unit * 5; ctx.shadowOffsetY = unit * 2;
  ctx.fillText(state.tagline, W / 2, titleBase + scriptSize * 1.18 + tagSize * 1.95);
  ctx.restore();

  const sealR = H * (format === "landscape" ? 0.052 : 0.042);
  drawSeal(ctx, M + sealR + unit * 6, H - M - sealR - unit * 4, sealR);
  const bw = W * (format === "landscape" ? 0.085 : 0.13);
  const bh = bw * 0.58;
  drawBarcode(ctx, W - M - bw - unit * 6, H - M - bh - unit * 4, bw, bh);

  ctx.save();
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  fitFont(ctx, state.billing, 600, H * 0.017, W * 0.62, "'Arial Narrow',sans-serif");
  ctx.fillStyle = "#cfc4d8";
  ctx.fillText(state.billing, W / 2, H - M - billH * 0.28);
  ctx.restore();
  ctx.restore();
}
