// Shot routing: ?shot=cover renders the stage, otherwise the editor.
import { defaultState, drawCover } from "./cover.js";
import { SIZES, loadDefaultCast, initEditor } from "./editor.js";

const params = new URLSearchParams(location.search);
const shot = params.get("shot");
if (shot === "cover") {
  document.body.classList.add("shot-cover");
  const fmtParam = params.get("format") || "landscape";
  const fmt = SIZES[fmtParam] ? fmtParam : "landscape";
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
