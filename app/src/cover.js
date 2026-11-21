// Leonida Cover Studio — cover renderer.
// Pure canvas 2D. drawCover(ctx, W, H, state) paints the whole poster at any
// pixel size. No blur fill, no borrowed art: every pixel is either drawn
// here or comes from one of the eight cast photos in the state.

export const PANEL_DEFS = [
  { id: 'hero',   file: 'hero.jpg',   tag: 'THE DRIVER',  color: '#ffb02e', fx: 0.50, fy: 0.33 },
  { id: 'boss',   file: 'boss.jpg',   tag: 'THE BOSS',    color: '#ff4fc3', fx: 0.50, fy: 0.31 },
  { id: 'siren',  file: 'siren.jpg',  tag: 'THE SIREN',   color: '#ff5a3c', fx: 0.50, fy: 0.30 },
  { id: 'beard',  file: 'beard.jpg',  tag: 'THE FIXER',   color: '#37e0c8', fx: 0.50, fy: 0.30 },
  { id: 'curly',  file: 'curly.jpg',  tag: 'THE LOOKOUT', color: '#b78bff', fx: 0.50, fy: 0.34 },
  { id: 'runner', file: 'runner.jpg', tag: 'THE RUNNER',  color: '#7ee83a', fx: 0.50, fy: 0.30 },
  { id: 'car',    file: 'car.jpg',    tag: 'THE GETAWAY', color: '#ffd94d', fx: 0.50, fy: 0.50 },
  { id: 'motel',  file: 'motel.jpg',  tag: 'PALMS MOTEL', color: '#4db8ff', fx: 0.50, fy: 0.50 },
];

export const GRADES = ['sunset', 'neon', 'golden', 'poster'];

export function defaultState() {
  return {
    title: 'GRAND LEONIDA',
    script: 'Vice Never Sleeps',
    tagline: 'EVERY SAINT HAS A PAST · EVERY SINNER HAS A FUTURE',
    quote: "★★★★★ 'A SUN-SOAKED RIOT OF A POSTER' — THE LEONIDA GAZETTE",
    billing: 'LEONIDA COVER STUDIO PRESENTS · A VICE COAST PRODUCTION · GRAND LEONIDA · COMING SOON',
    grade: 'sunset',
    panels: PANEL_DEFS.map((d) => ({
      id: d.id, file: d.file, tag: d.tag, color: d.color,
      fx: d.fx, fy: d.fy, dx: 0, dy: 0, zoom: 1, flip: false, img: null,
    })),
  };
}

// ---------------------------------------------------------------- grades
// Each grade is baked into an offscreen copy of the photo so one grade sits
// over the whole cast and the eight shots feel like a single shoot.

const gradeCache = new Map();

function clamp255(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }

function saturate(r, g, b, amt) {
  const l = 0.299 * r + 0.587 * g + 0.114 * b;
  return [l + (r - l) * amt, l + (g - l) * amt, l + (b - l) * amt];
}

function gradedCanvas(img, grade) {
  const key = (img.currentSrc || img.src || '') + '|' + grade + '|' + img.naturalWidth;
  if (gradeCache.has(key)) return gradeCache.get(key);
  const w = img.naturalWidth, h = img.naturalHeight;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  if (grade === 'none') { gradeCache.set(key, c); return c; }
  const data = g.getImageData(0, 0, w, h);
  const px = data.data;
  for (let y = 0; y < h; y++) {
    const t = y / h; // 0 at the top of the photo, 1 at the bottom
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let r = px[i], gg = px[i + 1], b = px[i + 2];
      if (grade === 'sunset') {
        // warm strip: orange multiplies in from the top, magenta from below
        r = r * (1 + 0.16 * (1 - t)) + 14 * (1 - t);
        gg = gg * 1.02 + 2;
        b = b * (1 - 0.10 * (1 - t)) + 16 * t;
        r += 20 * t; // magenta blush low in the frame
        [r, gg, b] = saturate(r, gg, b, 1.12);
        const l = (r + gg + b) / 3; // gentle S-curve contrast
        const k = 1.10;
        r = l + (r - l) * k; gg = l + (gg - l) * k; b = l + (b - l) * k;
      } else if (grade === 'neon') {
        // teal shadows, magenta highlights, saturation pushed
        const l = (0.299 * r + 0.587 * gg + 0.114 * b) / 255;
        r += (l > 0.5 ? 26 : -6) + 10 * t;
        gg += (l > 0.5 ? -8 : 18) * (1 - l);
        b += (l > 0.5 ? 30 : 22) * (l > 0.5 ? 1 : 0.6);
        [r, gg, b] = saturate(r, gg, b, 1.35);
      } else if (grade === 'golden') {
        // strong gold wash, blacks lifted toward amber
        r = r * 0.92 + 46; gg = gg * 0.88 + 30; b = b * 0.78 + 8;
        r = 26 + r * 0.92; gg = 20 + gg * 0.92; b = 10 + b * 0.92;
        [r, gg, b] = saturate(r, gg, b, 1.08);
      } else if (grade === 'poster') {
        // quantize toward flat illustration, then re-saturate
        const levels = 5;
        const q = (v) => Math.round((v / 255) * levels) * (255 / levels);
        r = q(r); gg = q(gg); b = q(b);
        [r, gg, b] = saturate(r, gg, b, 1.30);
      }
      px[i] = clamp255(r); px[i + 1] = clamp255(gg); px[i + 2] = clamp255(b);
    }
  }
  g.putImageData(data, 0, 0);
  gradeCache.set(key, c);
  return c;
}

// ---------------------------------------------------------------- layout
// computeLayout is shared with the editor so click hit-testing always
// matches what drawCover paints.

export function formatOf(W, H) {
  if (W > H) return 'landscape';
  if (H > W) return 'portrait';
  return 'square';
}

export function computeLayout(W, H) {
  const format = formatOf(W, H);
  const M = Math.round(W * 0.018);            // outer margin
  const gut = Math.max(3, Math.round(W * 0.006));
  const quoteH = Math.round(H * (format === 'landscape' ? 0.058 : 0.046));
  const billH = Math.round(H * (format === 'landscape' ? 0.052 : 0.045));
  const mosX = M, mosW = W - 2 * M;
  const mosY = M + quoteH + gut;
  let mosH;
  if (format === 'landscape') mosH = H - mosY - billH - M;
  else mosH = Math.round(H * (format === 'portrait' ? 0.64 : 0.62));
  const rects = {};
  if (format === 'landscape') {
    const heroW = Math.round(mosW * 0.33);
    rects.hero = { x: mosX, y: mosY, w: heroW, h: mosH };
    const rx = mosX + heroW + gut, rw = mosW - heroW - gut;
    const topH = Math.round(mosH * 0.52);
    const botY = mosY + topH + gut, botH = mosH - topH - gut;
    const tw = (rw - 2 * gut) / 3;
    ['boss', 'siren', 'beard'].forEach((id, i) => {
      rects[id] = { x: rx + i * (tw + gut), y: mosY, w: tw, h: topH };
    });
    const bw = (rw - 3 * gut) / 4;
    ['curly', 'runner', 'car', 'motel'].forEach((id, i) => {
      rects[id] = { x: rx + i * (bw + gut), y: botY, w: bw, h: botH };
    });
  } else {
    const heroH = Math.round(mosH * 0.44);
    rects.hero = { x: mosX, y: mosY, w: mosW, h: heroH };
    const rowH = (mosH - heroH - 2 * gut) / 3;
    const half = (mosW - gut) / 2, third = (mosW - 2 * gut) / 3;
    const y1 = mosY + heroH + gut, y2 = y1 + rowH + gut, y3 = y2 + rowH + gut;
    rects.boss = { x: mosX, y: y1, w: half, h: rowH };
    rects.siren = { x: mosX + half + gut, y: y1, w: half, h: rowH };
    rects.beard = { x: mosX, y: y2, w: half, h: rowH };
    rects.curly = { x: mosX + half + gut, y: y2, w: half, h: rowH };
    rects.runner = { x: mosX, y: y3, w: third, h: rowH };
    rects.car = { x: mosX + third + gut, y: y3, w: third, h: rowH };
    rects.motel = { x: mosX + 2 * (third + gut), y: y3, w: third, h: rowH };
  }
  return { format, M, gut, quoteH, billH, mosX, mosY, mosW, mosH, rects };
}

// ---------------------------------------------------------------- pieces

function drawPhoto(ctx, panel, grade, r, expandBottom = 0) {
  const img = panel.img;
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h + expandBottom);
  ctx.clip();
  if (!img || !img.naturalWidth) {
    ctx.fillStyle = '#241430';
    ctx.fillRect(r.x, r.y, r.w, r.h + expandBottom);
    ctx.restore();
    return;
  }
  const src = gradedCanvas(img, grade);
  const iw = src.width, ih = src.height;
  const zoom = Math.max(1, panel.zoom || 1);
  const scale = Math.max(r.w / iw, (r.h + expandBottom) / ih) * zoom;
  const sw = r.w / scale, sh = (r.h + expandBottom) / scale;
  let sx = (iw - sw) * (panel.fx ?? 0.5) + (panel.dx || 0) * sw;
  let sy = (ih - sh) * (panel.fy ?? 0.35) + (panel.dy || 0) * sh;
  // Very wide panel, portrait photo: the cover-fit slice is a thin band, so
  // centre that band on the focal point (the face) instead of interpolating
  // from the top — eyes, nose and mouth stay in frame, no mid-face seam.
  if ((r.w / (r.h + expandBottom)) / (iw / ih) > 1.9) {
    sy = (panel.fy ?? 0.35) * ih - sh / 2 + (panel.dy || 0) * sh;
  }
  sx = Math.min(Math.max(sx, 0), Math.max(0, iw - sw));
  sy = Math.min(Math.max(sy, 0), Math.max(0, ih - sh));
  if (panel.flip) {
    ctx.translate(r.x + r.w, r.y);
    ctx.scale(-1, 1);
    ctx.drawImage(src, sx, sy, sw, sh, 0, 0, r.w, r.h + expandBottom);
  } else {
    ctx.drawImage(src, sx, sy, sw, sh, r.x, r.y, r.w, r.h + expandBottom);
  }
  ctx.restore();
}

function drawTag(ctx, panel, r, unit) {
  const size = Math.max(10, Math.round(unit * 15));
  ctx.save();
  ctx.font = `700 ${size}px 'Arial Narrow', 'Helvetica Neue Condensed', Impact, sans-serif`;
  const text = panel.tag || '';
  const tw = ctx.measureText(text).width;
  const pad = size * 0.55, slashW = size * 0.62;
  const bw = tw + pad * 2 + slashW, bh = size * 1.72;
  const x = r.x + unit * 5, y = r.y + unit * 5;
  ctx.fillStyle = 'rgba(5,3,10,0.86)';
  ctx.fillRect(x, y, bw, bh);
  ctx.fillStyle = panel.color || '#ffb02e';
  ctx.beginPath(); // coloured slash block
  ctx.moveTo(x + pad * 0.55, y + bh * 0.18);
  ctx.lineTo(x + pad * 0.55 + slashW, y + bh * 0.18);
  ctx.lineTo(x + pad * 0.55 + slashW * 0.62, y + bh * 0.82);
  ctx.lineTo(x + pad * 0.55 - slashW * 0.38, y + bh * 0.82);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + pad + slashW, y + bh * 0.54);
  ctx.restore();
}

function fitFont(ctx, text, weight, maxSize, maxWidth, family) {
  let size = maxSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size *= 0.94;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

function drawSeal(ctx, cx, cy, rad) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.22);
  ctx.beginPath();
  const spikes = 18;
  for (let i = 0; i < spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2;
    const rr = i % 2 === 0 ? rad : rad * 0.80;
    const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#f5b921';
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = rad * 0.18; ctx.shadowOffsetY = rad * 0.06;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = rad * 0.05; ctx.strokeStyle = '#7a4d00'; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, rad * 0.60, 0, Math.PI * 2);
  ctx.lineWidth = rad * 0.045; ctx.stroke();
  ctx.fillStyle = '#3a2400';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `900 ${rad * 0.52}px Impact, 'Arial Narrow', sans-serif`;
  ctx.fillText('★', 0, -rad * 0.16);
  ctx.font = `700 ${rad * 0.20}px 'Arial Narrow', sans-serif`;
  ctx.fillText('LEONIDA', 0, rad * 0.30);
  ctx.restore();
}

function drawBarcode(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = '#f4f1ea';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#111';
  // deterministic bar pattern — same cover, same barcode, every render
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  let bx = x + w * 0.07;
  const top = y + h * 0.10, bh = h * 0.62;
  while (bx < x + w * 0.90) {
    const bw = (0.008 + rnd() * 0.022) * w;
    if (rnd() > 0.42) ctx.fillRect(bx, top, bw, bh);
    bx += bw + (0.006 + rnd() * 0.014) * w;
  }
  ctx.font = `400 ${h * 0.17}px 'Courier New', monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('8 901214 600613', x + w / 2, y + h * 0.90);
  ctx.restore();
}

// ---------------------------------------------------------------- cover

export function drawCover(ctx, W, H, state) {
  const L = computeLayout(W, H);
  const unit = W / 1000; // scale unit for strokes and tag metrics
  const byId = {};
  for (const p of state.panels) byId[p.id] = p;
  const order = ['hero', 'boss', 'siren', 'beard', 'curly', 'runner', 'car', 'motel'];

  // ground: near-black deep plum with a faint sunset glow low down
  ctx.fillStyle = '#0d0714';
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createLinearGradient(0, H * 0.55, 0, H);
  glow.addColorStop(0, 'rgba(60,16,64,0)');
  glow.addColorStop(1, 'rgba(94,24,84,0.55)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // quote strip across the top
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  fitFont(ctx, state.quote, '700', H * 0.026, W * 0.92,
    `'Arial Narrow', Impact, sans-serif`);
  ctx.fillStyle = '#f3d9a4';
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 4;
  ctx.fillText(state.quote, W / 2, L.M + L.quoteH / 2);
  ctx.restore();
  ctx.fillStyle = '#c9973f';
  ctx.fillRect(L.M, L.M + L.quoteH - 1, L.mosW, Math.max(1, unit * 1.6));

  // mosaic photos
  const heroBreak = Math.round(L.rects.hero.h * 0.03);
  for (const id of order) {
    const r = L.rects[id];
    if (id === 'hero' && L.format === 'landscape') {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.65)';
      ctx.shadowBlur = unit * 16; ctx.shadowOffsetY = unit * 6;
      drawPhoto(ctx, byId[id], state.grade, r, heroBreak);
      ctx.restore();
    } else {
      drawPhoto(ctx, byId[id], state.grade, r, 0);
    }
  }

  // scrim behind the title so lettering sits ON the mosaic, GTA style
  const mosBot = L.mosY + L.mosH;
  const scrimTop = L.format === 'landscape' ? mosBot - L.mosH * 0.46 : mosBot - L.mosH * 0.16;
  const scrim = ctx.createLinearGradient(0, scrimTop, 0, mosBot + H * 0.02);
  scrim.addColorStop(0, 'rgba(8,4,14,0)');
  scrim.addColorStop(0.62, 'rgba(8,4,14,0.52)');
  scrim.addColorStop(1, 'rgba(8,4,14,0.88)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, scrimTop, W, mosBot + H * 0.02 - scrimTop);

  // panel frames: thin gold everywhere, hero gets the heavy break frame
  for (const id of order) {
    const r = L.rects[id];
    ctx.save();
    if (id === 'hero' && L.format === 'landscape') {
      ctx.strokeStyle = '#ffcf5e';
      ctx.lineWidth = Math.max(3, unit * 5.2);
      ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = unit * 10;
      ctx.strokeRect(r.x, r.y, r.w, r.h + heroBreak);
    } else {
      ctx.strokeStyle = '#d9a441';
      ctx.lineWidth = Math.max(2, unit * 3);
      ctx.strokeRect(r.x, r.y, r.w, r.h);
    }
    ctx.restore();
  }
  // role tags last among panel art: top-left, never under the title
  for (const id of order) drawTag(ctx, byId[id], L.rects[id], unit);

  // strong outer border
  ctx.strokeStyle = '#e8b64c';
  ctx.lineWidth = Math.max(3, unit * 4.5);
  ctx.strokeRect(L.M * 0.45, L.M * 0.45, W - L.M * 0.9, H - L.M * 0.9);

  // ---- title block across the lower third, on top of the mosaic
  const cx = W / 2;
  let titleBase;
  if (L.format === 'landscape') titleBase = mosBot - H * 0.085;
  else titleBase = mosBot + H * 0.085;
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const tSize = fitFont(ctx, state.title, '900', H * (L.format === 'landscape' ? 0.155 : 0.105),
    W * 0.94, `'Arial Narrow', Impact, 'Haettenschweiler', sans-serif`);
  try { ctx.letterSpacing = `${Math.round(tSize * 0.02)}px`; } catch { /* older canvas */ }
  const grad = ctx.createLinearGradient(0, titleBase - tSize, 0, titleBase);
  grad.addColorStop(0.00, '#fff3c4');
  grad.addColorStop(0.34, '#ffb02e');
  grad.addColorStop(0.62, '#ff5e62');
  grad.addColorStop(0.82, '#e83e9e');
  grad.addColorStop(1.00, '#7b2ff7');
  ctx.shadowColor = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur = unit * 10; ctx.shadowOffsetY = unit * 6;
  ctx.lineWidth = tSize * 0.16; ctx.lineJoin = 'round';
  ctx.strokeStyle = '#0a0510';
  ctx.strokeText(state.title, cx, titleBase);
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = grad;
  ctx.fillText(state.title, cx, titleBase);
  try { ctx.letterSpacing = '0px'; } catch { /* noop */ }
  ctx.restore();

  // script subtitle with neon glow
  const sSize = fitFont(ctx, state.script, 'italic 700', H * 0.048, W * 0.8,
    `Georgia, 'Segoe Script', cursive`);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = `italic 700 ${sSize}px Georgia, 'Segoe Script', cursive`;
  ctx.shadowColor = '#ff2ea6'; ctx.shadowBlur = unit * 16;
  ctx.fillStyle = '#ff6ec7';
  ctx.fillText(state.script, cx, titleBase + sSize * 1.18);
  ctx.fillText(state.script, cx, titleBase + sSize * 1.18);
  ctx.restore();

  // tagline under the script
  ctx.save();
  ctx.textAlign = 'center';
  const tgSize = fitFont(ctx, state.tagline, '600', H * 0.020, W * 0.9,
    `'Arial Narrow', sans-serif`);
  ctx.fillStyle = '#f6e7c8';
  ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 5;
  ctx.fillText(state.tagline, cx, titleBase + sSize * 1.18 + tgSize * 1.95);
  ctx.restore();

  // seal + barcode in the bottom corners
  const sealR = H * (L.format === 'landscape' ? 0.052 : 0.042);
  drawSeal(ctx, L.M + sealR + unit * 6, H - L.M - sealR - unit * 4, sealR);
  const bw = W * (L.format === 'landscape' ? 0.085 : 0.13);
  const bh = bw * 0.58;
  drawBarcode(ctx, W - L.M - bw - unit * 6, H - L.M - bh - unit * 4, bw, bh);

  // billing block: tiny caps at the very bottom, clear of seal and barcode
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  fitFont(ctx, state.billing, '600', H * 0.017, W * 0.62,
    `'Arial Narrow', sans-serif`);
  ctx.fillStyle = '#cfc4d8';
  ctx.fillText(state.billing, cx, H - L.M - L.billH * 0.28);
  ctx.restore();
}
