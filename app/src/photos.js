// Photo records for Leonida Cover Lab.
//
// Every photo carries a focal rectangle — the part of the picture where the
// person actually is, in fractions of the photo's own width and height. The
// renderer treats that rectangle as sacred: in "Whole subject" framing it is
// always drawn completely inside its panel, never sliced by a gutter.
//
// The two bundled samples were measured by eye against the shipped files:
//   pier.jpg      720x720 — the fisherman fills almost the whole frame,
//                 hat brim near the top, elbows and rod down to the bottom.
//   boulevard.jpg 544x720 — the woman stands centre-right, hair at the top,
//                 jeans running to the bottom edge.
// Uploads get a generous default box until the user pans or zooms.

export const SAMPLE_PHOTOS = [
  {
    id: 'pier',
    name: 'Pier fisherman',
    src: 'samples/pier.jpg',
    focal: { x0: 0.09, y0: 0.03, x1: 0.83, y1: 1.0 },
  },
  {
    id: 'boulevard',
    name: 'Boulevard driver',
    src: 'samples/boulevard.jpg',
    focal: { x0: 0.12, y0: 0.06, x1: 0.97, y1: 1.0 },
  },
];

export const UPLOAD_FOCAL = { x0: 0.12, y0: 0.04, x1: 0.88, y1: 1.0 };

let uploadCounter = 0;

/** Loads an image element from a URL and waits until it can be drawn. */
export function loadImageElement(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load image: ${url}`));
    img.src = url;
  });
}

/** Builds a photo record for one of the bundled samples. */
export async function loadSamplePhoto(def) {
  const img = await loadImageElement(def.src);
  return {
    id: def.id,
    name: def.name,
    img,
    thumbUrl: def.src,
    focal: { ...def.focal },
    builtin: true,
  };
}

/** Builds a photo record from a user-picked file. The file never leaves the machine. */
export async function loadUploadPhoto(file) {
  const url = URL.createObjectURL(file);
  const img = await loadImageElement(url);
  uploadCounter += 1;
  return {
    id: `upload-${uploadCounter}`,
    name: file.name.replace(/\.[^.]+$/, '') || `Photo ${uploadCounter}`,
    img,
    thumbUrl: url,
    focal: { ...UPLOAD_FOCAL },
    builtin: false,
  };
}

/** The focal box in source pixels, plus its centre — the renderer's anchor. */
export function focalPixels(photo) {
  const w = photo.img.naturalWidth;
  const h = photo.img.naturalHeight;
  const f = photo.focal;
  return {
    x: f.x0 * w,
    y: f.y0 * h,
    w: (f.x1 - f.x0) * w,
    h: (f.y1 - f.y0) * h,
    cx: ((f.x0 + f.x1) / 2) * w,
    cy: ((f.y0 + f.y1) / 2) * h,
  };
}
