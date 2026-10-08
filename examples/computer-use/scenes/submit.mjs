// "And it checks with you before anything is sent."
// Same desktop as fill. Copilot says the report is ready and asks before it
// submits. The question card rises over the composer; the pointer goes to
// "Submit it" and clicks it, which answers the card at once. Copilot clicks
// Submit in Edge, the report shows "Submitted for approval", and Copilot
// wraps up. The camera keeps fill's slow creep. Every beat is in story.mjs.
import { clamp, span } from '../motion.mjs';
import { clock } from '../timeline.mjs';
import { DH, DW, INTERACTIVE, WIN, imagesDecoded, inside, loadAssets, px, r3 } from '../kit.mjs';
import { buildCursor, buildStage, buildWindow, film, pointAt, popInOut, showMode, showText } from '../app.mjs';
import { caretOn, makePath } from '../input.mjs';
import { keep, linear, makeCamera } from '../camera.mjs';
import { SESSION_ICONS, buildQuestion, buildSession, spinner } from '../session.mjs';
import { buildCaptions } from '../graphics.mjs';
import { EDGE_ICONS, buildEdge } from '../browser.mjs';
import { BEAT, CHOICES, EDGE, EXTRA_ICONS, PARK, QUESTION, START, THUMB, TITLE, WIN_X_FILL, buildThread, drawThumb, edgeAt } from '../story.mjs';
import { PROJECT } from './ask.mjs';
import { ZOOM } from './fill.mjs';

const T = clock('submit');
const DURATION = T.duration;
const o = START.submit;
const UP = BEAT.ask - o;
const ANSWER = BEAT.answer - o;
const CUE = { toChoice: [ANSWER - 1.0, .8], click: ANSWER };
// fill creeps from 1 to ZOOM over its length; this goes on at the same rate.
const RATE = (ZOOM - 1) / clock('fill').duration;
const creep = k => keep({ x: DW / 2, y: DH - DH / (2 * k), s: k });

export default async function submit() {
  await loadAssets([...SESSION_ICONS, ...EDGE_ICONS, ...EXTRA_ICONS]);
  const stage = buildStage();
  const { win, ui, session: side, showSession } = buildWindow(stage, { session: { project: PROJECT, name: TITLE } });
  win.style.left = px(WIN_X_FILL);
  const S = buildSession(ui, { mode: INTERACTIVE.label, branch: 'main' });
  S.rename(TITLE);
  const Q = buildQuestion(S.page, { question: QUESTION, choices: CHOICES });
  const edge = buildEdge(stage, EDGE);
  const cursor = buildCursor(stage);
  side.dot.style.visibility = 'hidden';
  const sideSpin = spinner(side.spin, 0, 0);

  const tl = S.tl;
  const thread = buildThread(tl, 'submit', { thumb: drawThumb, thumbSize: THUMB });
  await imagesDecoded();
  const open = t => (t < UP ? 0 : t < ANSWER + .15 ? span(t, UP, UP + .25) : 1 - span(t, ANSWER + .15, ANSWER + .35));
  tl.finish(DURATION, { endAt: t => tl.end(t) + Q.lift * open(t) });

  // From where it rested in fill to the first choice, then the click.
  const dx = WIN_X_FILL;
  const row = Q.boxes[0];
  const rowBox = { x: dx + row.x, y: WIN.y + row.y, w: row.w, h: row.h };
  const target = [rowBox.x + 120, rowBox.y + row.h / 2 + 2];
  const path = makePath([PARK[0] + dx - WIN.x, PARK[1]]);
  path.move(target, ...CUE.toChoice, 10);
  path.click(CUE.click);
  path.check();

  const k0 = ZOOM;
  const camera = makeCamera([[0, creep(k0)], [DURATION, creep(k0 + RATE * DURATION), linear]]);
  const caption = buildCaptions([
    { from: .3, to: Infinity, parts: ['And it checks with you before anything is sent.'] },
  ]);

  const pose = t => {
    t = clamp(t, 0, DURATION);
    film(stage, camera(t));
    showSession(true);
    const u = t + o;
    const working = u < BEAT.idle;
    showMode(S.composer, INTERACTIVE, 'session');
    showText(S.composer, '', caretOn(t, 0), null);
    S.composer.running(working);
    side.spin.style.visibility = working ? 'inherit' : 'hidden';
    edge.pose({ ...edgeAt(u), caret: caretOn(t, 0) });
    popInOut(Q.card, t, UP, ANSWER + .15, .25, .96, .2);
    const p = path.pointer(t);
    Q.mark(-1, inside(p, rowBox) ? 0 : -1);
    thread.asked(t);
    tl.pose(t);
    sideSpin(t);
    pointAt(cursor, p);
    caption(t);
  };

  return {
    pose,
    duration: DURATION,
    info: {
      cue: Object.fromEntries(Object.entries(CUE).map(([k, v]) => [k, [v].flat().map(r3)])),
      up: r3(UP),
      submit: r3(BEAT.submit - o),
      sent: BEAT.sent.map(t => r3(t - o)),
      zoom: r3(k0 + RATE * DURATION),
    },
  };
}
