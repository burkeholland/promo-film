// "It clicks, types and fills in every field, one step at a time."
// Copilot's window has moved left, and Edge opens on the right. Copilot types
// the address, opens Contoso Expenses, takes a look (a screenshot arrives in
// the thread), starts a new report and fills it in: title, dates, then three
// expenses, each with its receipt. Every step is a row in the thread as it
// happens in Edge. The person's pointer stays put: Copilot works without it.
// The camera is wide and creeps in a little. Every beat is in story.mjs.
import { clamp } from '../motion.mjs';
import { clock } from '../timeline.mjs';
import { DH, DW, INTERACTIVE, WIN, imagesDecoded, loadAssets, px, r3 } from '../kit.mjs';
import { buildCursor, buildStage, buildWindow, film, pointAt, popIn, showMode, showText } from '../app.mjs';
import { caretOn } from '../input.mjs';
import { keep, linear, makeCamera } from '../camera.mjs';
import { SESSION_ICONS, buildSession, spinner } from '../session.mjs';
import { buildCaptions } from '../graphics.mjs';
import { EDGE_ICONS, buildEdge } from '../browser.mjs';
import { BEAT, EDGE, EXTRA_ICONS, PARK, START, THUMB, TITLE, WIN_X_FILL, buildThread, drawThumb, edgeAt } from '../story.mjs';
import { PROJECT } from './ask.mjs';

const T = clock('fill');
const DURATION = T.duration;
const o = START.fill;
const OPEN = BEAT.edge - o;
// A slow creep in, kept small so Edge and the session title stay in frame.
export const ZOOM = 1.02;
const creep = k => keep({ x: DW / 2, y: DH - DH / (2 * k), s: k });

export default async function fill() {
  await loadAssets([...SESSION_ICONS, ...EDGE_ICONS, ...EXTRA_ICONS]);
  const stage = buildStage();
  const { win, ui, session: side, showSession } = buildWindow(stage, { session: { project: PROJECT, name: TITLE } });
  win.style.left = px(WIN_X_FILL);
  const S = buildSession(ui, { mode: INTERACTIVE.label, branch: 'main' });
  S.rename(TITLE);
  const edge = buildEdge(stage, EDGE);
  const cursor = buildCursor(stage);
  side.dot.style.visibility = 'hidden';
  const sideSpin = spinner(side.spin, 0, 0);

  const tl = S.tl;
  buildThread(tl, 'fill', { thumb: drawThumb, thumbSize: THUMB });
  await imagesDecoded();
  tl.finish(DURATION);

  const camera = makeCamera([[0, creep(1)], [DURATION, creep(ZOOM), linear]]);
  const caption = buildCaptions([
    { from: .5, to: Infinity, parts: ['It clicks, types and fills in every field,', [' one step at a time.', 8]] },
  ]);
  const hand = [PARK[0] + WIN_X_FILL - WIN.x, PARK[1]];

  const pose = t => {
    t = clamp(t, 0, DURATION);
    film(stage, camera(t));
    showSession(true);
    const u = t + o;
    showMode(S.composer, INTERACTIVE, 'session');
    showText(S.composer, '', caretOn(t, 0), null);
    S.composer.running(true);
    popIn(edge.node, t, OPEN, .35, .97);
    edge.pose({ ...edgeAt(u), caret: caretOn(t, 0) });
    tl.pose(t);
    sideSpin(t);
    pointAt(cursor, hand);
    caption(t);
  };

  return {
    pose,
    duration: DURATION,
    info: { open: r3(OPEN), lines: BEAT.lines.map(([a]) => r3(a - o)), check: r3(BEAT.check - o) },
  };
}
