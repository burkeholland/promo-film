// "...automatically use these models when set to auto-routing. There are a
// myriad of scenarios..." The hand clicks into the prompt box just ahead of
// "use" and types a prompt until "auto-routing", then the camera eases in on
// the composer from "There are a myriad" to the end.
import { clamp } from '../motion.mjs';
import { clock } from '../timeline.mjs';
import { OPUS, WIN, imagesDecoded, loadAssets, r3, rect } from '../kit.mjs';
import { buildCursor, buildHome, buildStage, buildWindow, film, pointAt, showText } from '../app.mjs';
import { caretOn, makePath, typing } from '../input.mjs';
import { glide, look, makeCamera, wide } from '../camera.mjs';

// The part of the edit this film plays: { film: 'routed', from, to }.
const T = clock('routed');
const DURATION = T.duration;
const PROMPT = 'Explain how this project works';

// 1. Cues. Every time is when a word is said, or hangs off one that is.
// A click lands two or three frames ahead of its word.
const CLICK = T.said('automatically [use]') - .08;
const CUE = {
  toField: [CLICK - .7, CLICK - .05],
  click: CLICK,
  typing: [CLICK + .35, T.said('set to [auto-routing]')],
  push: [T.said('there are a myriad'), DURATION],
};

export default async function skeleton() {
  // 2. Build the stage, the window, the page and the pointer, then wait for
  // the pictures.
  await loadAssets();
  const stage = buildStage();
  const { ui } = buildWindow(stage);
  const home = buildHome(ui, { chip: `${OPUS.name} · Medium` });
  const cursor = buildCursor(stage);
  await imagesDecoded();

  // 3. Measure once, before the camera ever moves. Boxes are in window px;
  // the pointer and the camera work in desktop px.
  const box = rect(home.composer, WIN);
  const desk = (x, y) => [WIN.x + x, WIN.y + y];

  // 4. The pointer's path and the keys.
  const path = makePath(desk(box.x + 560, box.y + box.h + 66));
  path.reach(desk(box.x + 300, box.y + 30), CUE.toField[0], CUE.toField[1] - CUE.toField[0], -14);
  path.click(CUE.click);
  path.check();
  const typed = typing(PROMPT, ...CUE.typing, { seed: 11 });

  // 5. The camera: name the shots, then key them. One move.
  const close = look(WIN.x + box.x + box.w / 2, WIN.y + box.y + box.h / 2, 1.45);
  const camera = makeCamera([[0, wide], [CUE.push[0], wide], [CUE.push[1], close, glide]]);

  // 6. pose(t) sets everything from t alone. Nothing is remembered between
  // calls, so any frame can be drawn on its own, in any order.
  const pose = t => {
    t = clamp(t, 0, DURATION);
    film(stage, camera(t));
    const since = Math.max(CUE.click, typed.lastKey(t));
    showText(home, typed.text(t), t >= CUE.click && caretOn(t, since), home.send);
    pointAt(cursor, path.pointer(t));
  };

  // `info` is printed by --stills and --sheet: put the numbers you will want
  // to check there.
  return { pose, duration: DURATION, info: { cue: Object.fromEntries(Object.entries(CUE).map(([k, v]) => [k, [v].flat().map(r3)])) } };
}
