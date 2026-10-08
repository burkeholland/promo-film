// "Tell Copilot what you need done, and which app to use."
// The home page in Interactive mode. The pointer clicks into the box, the
// request goes in (an expense report, with the receipts' folder and the site
// to use) and the hand sends it. The cut to the session lands just after
// that click. The camera pushes in on the composer while the request is
// typed. No voice: the line is on screen and the times are for the eye.
import { clamp } from '../motion.mjs';
import { clock } from '../timeline.mjs';
import { DH, DW, INTERACTIVE, W, WIN, imagesDecoded, inside, loadAssets, r3, rect } from '../kit.mjs';
import { buildCursor, buildHome, buildStage, buildWindow, film, paintSend, pointAt, showMode, showText } from '../app.mjs';
import { caretOn, makePath, typing } from '../input.mjs';
import { glide, look, makeCamera } from '../camera.mjs';
import { buildCaptions } from '../graphics.mjs';

const T = clock('ask');
const DURATION = T.duration;
// DRAWN: the request, the folder name and the project name.
export const PROMPT = 'File an expense report for my Seattle trip. The receipts are in Downloads\\seattle-receipts. Use Contoso Expenses in Edge.';
export const PROJECT = 'expenses';

// The film ends a moment after the send click, where the app opens the
// session, so everything before it is timed back from there.
const SEND = DURATION - .2;
const CUE = {
  toField: [.45, .55],
  focus: 1.15,
  typing: [1.4, SEND - 1.15],
  toSend: [SEND - .95, .5],
  send: SEND,
};

export default async function ask() {
  await loadAssets();
  const stage = buildStage();
  const { ui } = buildWindow(stage, { session: { project: PROJECT, name: 'New session' } });
  const home = buildHome(ui, { project: PROJECT, branch: 'main' });
  const cursor = buildCursor(stage);
  await imagesDecoded();

  const comp = rect(home.composer, WIN);
  const sendBox = rect(home.send, WIN);
  const desk = (x, y) => [WIN.x + x, WIN.y + y];

  const path = makePath(desk(comp.x + 590, comp.y - 70));
  path.move(desk(comp.x + 360, comp.y + 30), ...CUE.toField, -12);
  path.click(CUE.focus);
  path.move(desk(sendBox.x + 13, sendBox.y + 12.5), ...CUE.toSend, -14);
  path.click(CUE.send);
  path.check();
  const typed = typing(PROMPT, ...CUE.typing, { seed: 31 });

  // The main pane, sidebar out of frame, with room under the composer for the
  // caption. Then one slow push toward the composer while the request goes in.
  const s = DW / (W - 279);
  const pane = look(WIN.x + 279 + (W - 279) / 2, WIN.y + 70 + DH / s / 2, s);
  const close = look(WIN.x + comp.x + comp.w / 2, WIN.y + 108.5 + DH / 1.6 / 2, 1.6);
  const camera = makeCamera([[0, pane], [CUE.focus, pane], [SEND - .3, close, glide]]);

  const caption = buildCaptions([
    { from: .3, to: Infinity, parts: ['Tell Copilot what you need done,', [' and which app to use.', CUE.focus + 1.2]] },
  ]);

  const pose = t => {
    t = clamp(t, 0, DURATION);
    film(stage, camera(t));
    const p = path.pointer(t);
    const local = [p[0] - WIN.x, p[1] - WIN.y];
    showMode(home, INTERACTIVE, 'home');
    const text = typed.text(t);
    const focused = t >= CUE.focus && caretOn(t, Math.max(CUE.focus, typed.lastKey(t)));
    showText(home, text, focused, home.send);
    paintSend(home.send, INTERACTIVE, { ready: Boolean(text.trim()), over: inside(local, sendBox), down: path.down(t) });
    pointAt(cursor, p);
    caption(t);
  };

  return {
    pose,
    duration: DURATION,
    info: {
      cue: Object.fromEntries(Object.entries(CUE).map(([k, v]) => [k, [v].flat().map(r3)])),
      composer: Object.values(comp).map(r3),
      keys: [r3(typed.keys[0][0]), r3(typed.keys.at(-1)[0])],
    },
  };
}
