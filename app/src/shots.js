// Shot-mode bootstrap, imported by index.html.
//   ?shot=cover&format=landscape|portrait|square — the cover alone, painted
//     at full export pixels on a stage canvas fitted to the window.
//   ?shot=editor (or no query at all) — the full studio with the cast loaded.
import { drawCover, defaultState } from './cover.js';
import { initEditor, loadDefaultCast, SIZES } from './editor.js';

const q = new URLSearchParams(location.search);
const shot = q.get('shot');

if (shot === 'cover') {
  document.body.classList.add('shot-cover');
  const fmt = SIZES[q.get('format')] ? q.get('format') : 'landscape';
  const { w, h } = SIZES[fmt];
  const stage = document.getElementById('stage');
  stage.hidden = false;
  stage.width = w;
  stage.height = h;
  const state = defaultState();
  loadDefaultCast(state).then(() => {
    drawCover(stage.getContext('2d'), w, h, state);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      window.__shotReady = true;
    }));
  });
} else {
  document.body.classList.add('shot-editor');
  initEditor();
}
