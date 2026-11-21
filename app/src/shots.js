// Fixed scenes for screenshots and shared links.
//
//   ?shot=cover&photo=<pier|boulevard>&layout=<id>&caption=<text>&size=<WxH>
//     shows ONLY the finished cover, filling the viewport.
//   ?shot=editor&photo=<...>&layout=<id>
//     shows the full editor with that photo loaded into the panels.
//
// `photo` names the hero sample; multi-panel layouts bring in the other
// sample too, so a duet shot always shows both bundled photographs. When the
// scene has fully rendered, window.__ready (and __shotReady) become true.

const FILL_ORDERS = {
  poster: ['hero'],
  duet: ['hero', 'other'],
  triptych: ['hero', 'other', 'hero'],
  quad: ['hero', 'other', 'other', 'hero'],
};

export function parseSize(raw, fallback) {
  const m = /^(\d{3,4})x(\d{3,4})$/.exec(raw ?? '');
  if (!m) return fallback;
  return { w: Number(m[1]), h: Number(m[2]) };
}

/**
 * Applies a ?shot= scene through the editor's own controls (`api`), so a
 * screenshot shows exactly what a user would get by hand.
 */
export async function applyShot(query, api) {
  const mode = query.get('shot');
  const heroId = query.get('photo') === 'boulevard' ? 'boulevard' : 'pier';
  const otherId = heroId === 'pier' ? 'boulevard' : 'pier';
  const layoutId = query.get('layout') ?? (mode === 'editor' ? 'duet' : 'poster');

  await api.loadSamples();
  api.setLayout(layoutId);
  const order = FILL_ORDERS[layoutId] ?? FILL_ORDERS.poster;
  order.forEach((slot, i) => {
    api.assignPanel(i, slot === 'hero' ? heroId : otherId);
  });
  api.selectPanel(0);

  const caption = query.get('caption');
  const title = query.get('title') ?? caption;
  if (title) api.setTitle(title);
  const subtitle = query.get('subtitle');
  if (subtitle) api.setSubtitle(subtitle);
  const grade = query.get('grade');
  if (grade) api.setGrade(grade);

  if (mode === 'cover') {
    const size = parseSize(query.get('size'), { w: 1080, h: 1080 });
    api.setSize(size.w, size.h);
    api.enterCoverMode();
  }
  api.redraw();
  await api.whenPainted();
  window.__ready = true;
  window.__shotReady = true;
}
