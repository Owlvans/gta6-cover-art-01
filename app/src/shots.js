// Screenshot routing: ?shot=cover fills the stage canvas with the
// finished cover; anything else boots the interactive editor.
import { defaultState, drawCover } from "./cover.js";
import { SIZES, initEditor, loadDefaultCast } from "./editor.js";

const query = new URLSearchParams(location.search);
if (query.get("shot") === "cover") {
  document.body.classList.add("shot-cover");
  const wanted = query.get("format") || "landscape";
  const fmt = Object.hasOwn(SIZES, wanted) ? wanted : "landscape";
  const stage = document.querySelector("#stage");
  stage.hidden = false;
  stage.width = SIZES[fmt].w;
  stage.height = SIZES[fmt].h;
  const state = defaultState();
  loadDefaultCast(state).then(() => {
    drawCover(stage.getContext("2d"), stage.width, stage.height, state);
    requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
  });
} else {
  document.body.classList.add("shot-editor");
  initEditor();
}
