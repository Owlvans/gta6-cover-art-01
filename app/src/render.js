// Leonida Cover Studio — cover renderer.
// Layout definitions, polygon panel geometry, photo cover-fit drawing with
// pan/zoom framing, colour-grade overlays and bold caption lettering.
// Pure canvas code: no DOM lookups, no network, works at any export size.

export const LAYOUTS = [
  {
    id: 'hero-stack',
    name: 'Hero + Stack',
    buildPanels(aspect) {
      // Big angled hero on the left, two stacked panels on the right.
      const slant = aspect >= 1 ? 0.06 : 0.09;
      return [
        [[0, 0], [0.58, 0], [0.58 - slant, 1], [0, 1]],
        [[0.58 + 0.012, 0], [1, 0], [1, 0.52], [0.58 + 0.012 - slant * 0.4, 0.52]],
        [[0.58 - slant + 0.012, 0.545], [1, 0.545], [1, 1], [0.58 - slant * 1.4, 1]],
      ];
    },
  },
  {
    id: 'slash',
    name: 'Diagonal Slash',
    buildPanels(aspect) {
      // Four diagonal bands sweeping across the frame.
      const s = aspect >= 1 ? 0.16 : 0.22;
      return [
        [[0, 0], [0.62, 0], [0.62 - s, 1], [0, 1]],
        [[0.62 + 0.014, 0], [1, 0], [1, 0.38], [0.62 - s * 0.35 + 0.014, 0.38]],
        [[0.62 - s * 0.35 + 0.014, 0.405], [1, 0.405], [1, 0.68], [0.62 - s * 0.72 + 0.014, 0.68]],
        [[0.62 - s * 0.72 + 0.014, 0.705], [1, 0.705], [1, 1], [0.62 - s + 0.014, 1]],
      ];
    },
  },
  {
    id: 'grid-pop',
    name: 'Grid Pop',
    buildPanels(aspect) {
      // Four-panel grid with one corner kicked into a diagonal.
      const kick = 0.07;
      return [
        [[0, 0], [0.52, 0], [0.52 - kick, 0.5], [0, 0.5]],
        [[0.532, 0], [1, 0], [1, 0.5], [0.532 - kick, 0.5]],
        [[0, 0.515], [0.52 - kick, 0.515], [0.52, 1], [0, 1]],
        [[0.532 - kick, 0.515], [1, 0.515], [1, 1], [0.532, 1]],
      ];
    },
  },
  {
    id: 'triptych',
    name: 'Triptych Tilt',
    buildPanels(aspect) {
      // Three tall tilted columns.
      const t = aspect >= 1 ? 0.05 : 0.08;
      return [
        [[0, 0], [0.36, 0], [0.36 - t, 1], [0, 1]],
        [[0.372, 0], [0.68, 0], [0.68 - t, 1], [0.372 - t, 1]],
        [[0.692, 0], [1, 0], [1, 1], [0.692 - t, 1]],
      ];
    },
  },
];

export const GRADES = [
  {
    id: 'sunset',
    name: 'Leonida Sunset',
    top: 'rgba(255,94,58,0.16)', mid: 'rgba(255,45,120,0.10)', bottom: 'rgba(46,8,64,0.55)',
    glow: 'rgba(255,170,60,0.20)', saturate: 1.25, titleA: '#ffd23f', titleB: '#ff2e7e',
  },
  {
    id: 'neon',
    name: 'Neon Nights',
    top: 'rgba(0,229,255,0.14)', mid: 'rgba(124,58,237,0.14)', bottom: 'rgba(2,6,32,0.62)',
    glow: 'rgba(0,229,255,0.16)', saturate: 1.35, titleA: '#5ef2ff', titleB: '#c44dff',
  },
  {
    id: 'golden',
    name: 'Golden Hour',
    top: 'rgba(255,196,64,0.18)', mid: 'rgba(255,120,40,0.08)', bottom: 'rgba(58,22,4,0.50)',
    glow: 'rgba(255,214,120,0.22)', saturate: 1.15, titleA: '#fff3b0', titleB: '#ff8c42',
  },
  {
    id: 'noir',
    name: 'Midnight Noir',
    top: 'rgba(120,140,180,0.10)', mid: 'rgba(20,24,48,0.16)', bottom: 'rgba(0,0,0,0.68)',
    glow: 'rgba(160,180,255,0.10)', saturate: 0.85, titleA: '#f5f7ff', titleB: '#8ea2ff',
  },
];

export function findLayout(layoutId) {
  return LAYOUTS.find((l) => l.id === layoutId) || LAYOUTS[0];
}

export function findGrade(gradeId) {
  return GRADES.find((g) => g.id === gradeId) || GRADES[0];
}

/** Panels for a layout at a pixel size: array of point arrays in pixels. */
export function layoutPanelsInPixels(layoutId, width, height) {
  const layout = findLayout(layoutId);
  const aspect = width / height;
  return layout.buildPanels(aspect).map((poly) => poly.map(([x, y]) => [x * width, y * height]));
}

/** Shrink a polygon toward its centroid to open a dark gutter between panels. */
export function insetPolygon(points, amount) {
  let cx = 0; let cy = 0;
  for (const [x, y] of points) { cx += x; cy += y; }
  cx /= points.length; cy /= points.length;
  return points.map(([x, y]) => {
    const dx = x - cx; const dy = y - cy;
    const len = Math.hypot(dx, dy) || 1;
    const cut = Math.min(amount, len * 0.4);
    return [x - (dx / len) * cut, y - (dy / len) * cut];
  });
}

export function tracePolygonPath(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
}

export function pointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i]; const [xj, yj] = points[j];
    if (((yi > y) !== (yj > y)) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function polygonBounds(points) {
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  for (const [x, y] of points) {
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

/** Draw one photo cover-fitted into a panel's bounding box, honouring pan/zoom framing. */
export function drawPhotoInPanel(ctx, image, points, framing, saturate) {
  const box = polygonBounds(points);
  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;
  if (!iw || !ih) return;
  const zoom = framing ? framing.zoom : 1;
  const baseScale = Math.max(box.w / iw, box.h / ih);
  const scale = baseScale * zoom;
  const drawW = iw * scale; const drawH = ih * scale;
  const overflowX = Math.max(0, drawW - box.w);
  const overflowY = Math.max(0, drawH - box.h);
  const panX = framing ? framing.panX : 0;
  const panY = framing ? framing.panY : 0;
  const originX = box.minX + (box.w - drawW) / 2 + panX * overflowX * 0.5;
  const originY = box.minY + (box.h - drawH) / 2 + panY * overflowY * 0.5;
  ctx.save();
  tracePolygonPath(ctx, points);
  ctx.clip();
  if (saturate && saturate !== 1) {
    try { ctx.filter = `saturate(${saturate}) contrast(1.06)`; } catch (e) { /* older engines */ }
  }
  ctx.drawImage(image, originX, originY, drawW, drawH);
  try { ctx.filter = 'none'; } catch (e) { /* ignore */ }
  // Inner shading so panels read as separate plates.
  const shade = ctx.createLinearGradient(box.minX, box.minY, box.minX, box.maxY);
  shade.addColorStop(0, 'rgba(255,255,255,0.10)');
  shade.addColorStop(0.45, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = shade;
  ctx.fillRect(box.minX, box.minY, box.w, box.h);
  ctx.restore();
  // Bright rim on the panel edge.
  ctx.save();
  tracePolygonPath(ctx, points);
  ctx.strokeStyle = 'rgba(255,255,255,0.20)';
  ctx.lineWidth = Math.max(1.5, Math.min(box.w, box.h) * 0.004);
  ctx.stroke();
  ctx.restore();
}

function applyColourGrade(ctx, width, height, grade) {
  const wash = ctx.createLinearGradient(0, 0, 0, height);
  wash.addColorStop(0, grade.top);
  wash.addColorStop(0.5, grade.mid);
  wash.addColorStop(1, grade.bottom);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, width, height);
  const glow = ctx.createRadialGradient(width * 0.5, height * 0.18, 0, width * 0.5, height * 0.18, width * 0.75);
  glow.addColorStop(0, grade.glow);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  const vignette = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.35, width / 2, height / 2, Math.max(width, height) * 0.78);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}

const TITLE_FONT_STACK = '"Arial Narrow", "Helvetica Neue Condensed", Impact, "Franklin Gothic Medium", Arial, sans-serif';

function fitTitleFont(ctx, text, maxWidth, startSize) {
  let size = startSize;
  const setFont = () => { ctx.font = `900 ${size}px ${TITLE_FONT_STACK}`; };
  setFont();
  while (ctx.measureText(text).width > maxWidth && size > 14) {
    size *= 0.94;
    setFont();
  }
  return size;
}

function drawCaptionLettering(ctx, width, height, grade, title, subtitle) {
  const cleanTitle = (title || '').trim().toUpperCase();
  const cleanSub = (subtitle || '').trim().toUpperCase();
  const unit = Math.min(width, height);
  if (cleanSub) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const subSize = Math.max(15, unit * 0.034);
    ctx.font = `700 ${subSize}px ${TITLE_FONT_STACK}`;
    try { ctx.letterSpacing = `${Math.round(subSize * 0.42)}px`; } catch (e) { /* ignore */ }
    ctx.shadowColor = 'rgba(0,0,0,0.75)';
    ctx.shadowBlur = subSize * 0.35;
    ctx.shadowOffsetY = subSize * 0.08;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(cleanSub, width / 2, height - unit * 0.225);
    ctx.restore();
  }
  if (!cleanTitle) return;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const size = fitTitleFont(ctx, cleanTitle, width * 0.92, unit * 0.148);
  const baselineY = height - unit * 0.045;
  const gradient = ctx.createLinearGradient(0, baselineY - size, 0, baselineY);
  gradient.addColorStop(0, grade.titleA);
  gradient.addColorStop(0.55, grade.titleA);
  gradient.addColorStop(1, grade.titleB);
  ctx.shadowColor = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur = size * 0.22;
  ctx.shadowOffsetY = size * 0.07;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#12061f';
  ctx.lineWidth = size * 0.14;
  ctx.strokeText(cleanTitle, width / 2, baselineY);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = gradient;
  ctx.fillText(cleanTitle, width / 2, baselineY);
  // Thin top highlight pass for a printed-poster feel.
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#ffffff';
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, baselineY - size, width, size * 0.42);
  ctx.clip();
  ctx.fillText(cleanTitle, width / 2, baselineY);
  ctx.restore();
  ctx.restore();
}

/**
 * Render a complete cover.
 * state: { layout, grade, title, subtitle, photos: [image], assignments: [photoIdx per panel],
 *          framing: [{panX, panY, zoom} per panel], selectedPanel (editor only), showSelection }
 */
export function renderCover(ctx, width, height, state) {
  const grade = findGrade(state.grade);
  ctx.save();
  ctx.fillStyle = '#0a0514';
  ctx.fillRect(0, 0, width, height);
  const rawPanels = layoutPanelsInPixels(state.layout, width, height);
  const gutter = Math.max(3, Math.min(width, height) * 0.006);
  rawPanels.forEach((rawPoints, index) => {
    const points = insetPolygon(rawPoints, gutter);
    const photoIndex = state.assignments[index] ?? index % Math.max(1, state.photos.length);
    const image = state.photos[photoIndex];
    if (image) {
      drawPhotoInPanel(ctx, image, points, state.framing[index], grade.saturate);
    } else {
      ctx.save();
      tracePolygonPath(ctx, points);
      const fill = ctx.createLinearGradient(0, 0, width, height);
      fill.addColorStop(0, '#3b1454');
      fill.addColorStop(1, '#12081f');
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.restore();
    }
    if (state.showSelection && state.selectedPanel === index) {
      ctx.save();
      tracePolygonPath(ctx, points);
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = Math.max(3, Math.min(width, height) * 0.008);
      ctx.stroke();
      ctx.restore();
    }
  });
  applyColourGrade(ctx, width, height, grade);
  drawCaptionLettering(ctx, width, height, grade, state.title, state.subtitle);
  ctx.restore();
}

/** Panel index under a point given in cover pixel coordinates, or -1. */
export function panelIndexAtPoint(layoutId, width, height, x, y) {
  const panels = layoutPanelsInPixels(layoutId, width, height);
  for (let i = panels.length - 1; i >= 0; i--) {
    if (pointInPolygon(x, y, panels[i])) return i;
  }
  return -1;
}

/** Number of panels a layout has at the given aspect. */
export function panelCountForLayout(layoutId, width, height) {
  return layoutPanelsInPixels(layoutId, width, height).length;
}
