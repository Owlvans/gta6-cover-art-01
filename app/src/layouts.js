// Panel layouts and colour grades for Leonida Cover Lab.
//
// A layout is a function of the panel area (the cover minus its title band)
// returning plain rectangles. Rectangles — never diagonal photo clips — so a
// panel edge is always a straight gutter the framing maths can respect. The
// GTA flavour comes from the neon gutter stripes and the angled accent slash
// drawn over the gutters, not from slicing photographs at a slant.

const GUTTER = 16;

export const LAYOUTS = [
  {
    id: 'poster',
    label: 'Poster',
    panels(area) {
      return [{ ...area }];
    },
  },
  {
    id: 'duet',
    label: 'Duet',
    panels(area) {
      const w = (area.w - GUTTER) / 2;
      return [
        { x: area.x, y: area.y, w, h: area.h },
        { x: area.x + w + GUTTER, y: area.y, w, h: area.h },
      ];
    },
  },
  {
    id: 'triptych',
    label: 'Triptych',
    panels(area) {
      const heroW = Math.round(area.w * 0.56);
      const sideX = area.x + heroW + GUTTER;
      const sideW = area.w - heroW - GUTTER;
      const sideH = (area.h - GUTTER) / 2;
      return [
        { x: area.x, y: area.y, w: heroW, h: area.h },
        { x: sideX, y: area.y, w: sideW, h: sideH },
        { x: sideX, y: area.y + sideH + GUTTER, w: sideW, h: sideH },
      ];
    },
  },
  {
    id: 'quad',
    label: 'Quad',
    panels(area) {
      const w = (area.w - GUTTER) / 2;
      const h = (area.h - GUTTER) / 2;
      return [
        { x: area.x, y: area.y, w, h },
        { x: area.x + w + GUTTER, y: area.y, w, h },
        { x: area.x, y: area.y + h + GUTTER, w, h },
        { x: area.x + w + GUTTER, y: area.y + h + GUTTER, w, h },
      ];
    },
  },
];

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}

// Colour grades. `wash` is painted over the finished panels in 'overlay'
// composite; `sky` tints the blurred backdrop behind a whole-subject photo;
// sat/con are canvas filter amounts at full intensity (the renderer blends
// them toward neutral by the intensity slider).
export const GRADES = [
  {
    id: 'vice',
    label: 'Vice Sunset',
    washTop: 'rgba(255, 122, 60, 0.55)',
    washBottom: 'rgba(214, 36, 132, 0.62)',
    sky: '#57194d',
    accent: '#ffb340',
    sat: 1.3,
    con: 1.06,
  },
  {
    id: 'neon',
    label: 'Neon Night',
    washTop: 'rgba(38, 64, 220, 0.5)',
    washBottom: 'rgba(255, 47, 214, 0.55)',
    sky: '#131a4d',
    accent: '#2ee6c8',
    sat: 1.45,
    con: 1.12,
  },
  {
    id: 'dusk',
    label: 'Palm Dusk',
    washTop: 'rgba(255, 176, 92, 0.42)',
    washBottom: 'rgba(96, 44, 122, 0.55)',
    sky: '#3c2044',
    accent: '#ff8a5c',
    sat: 1.12,
    con: 1.03,
  },
  {
    id: 'clean',
    label: 'Clean',
    washTop: 'rgba(255, 255, 255, 0)',
    washBottom: 'rgba(20, 10, 40, 0.16)',
    sky: '#241433',
    accent: '#ffffff',
    sat: 1.0,
    con: 1.0,
  },
];

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) ?? GRADES[0];
}
