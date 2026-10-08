// "It reads your receipts, then asks before it controls any app."
// The session the request opened. Copilot says what it will do, looks at the
// receipts folder and the three photos in it, and lists the open apps. Before
// it touches Edge, the approval card rises over the composer, and the pointer
// (still near Send) picks "Allow for this session". The card closes and
// Copilot starts Edge. The camera holds on the top of the thread, then tilts
// down once to the composer as the card comes up. No voice: the times are
// for the eye. Every beat is in story.mjs.
import { clamp, span } from '../motion.mjs';
import { clock } from '../timeline.mjs';
import { DH, INTERACTIVE, WIN, imagesDecoded, inside, loadAssets, r3, rect } from '../kit.mjs';
import { buildCursor, buildStage, buildWindow, film, pointAt, popInOut, showMode, showText } from '../app.mjs';
import { caretOn, makePath } from '../input.mjs';
import { glide, keep, look, makeCamera } from '../camera.mjs';
import { COL, SESSION_ICONS, buildApproval, buildSession, spinner } from '../session.mjs';
import { buildCaptions } from '../graphics.mjs';
import { EDGE_ICONS } from '../browser.mjs';
import { APPROVAL, BEAT, EXTRA_ICONS, START, THUMB, TITLE, buildThread, drawThumb } from '../story.mjs';
import { PROJECT } from './ask.mjs';

const T = clock('allow');
const DURATION = T.duration;
const o = START.allow;
const [UP, CLICK] = BEAT.approve.map(t => t - o);
const CUE = {
  toAllow: [UP + .55, .75],
  click: CLICK,
  tilt: [UP - .7, UP + .5],
};

export default async function allow() {
  await loadAssets([...SESSION_ICONS, ...EDGE_ICONS, ...EXTRA_ICONS]);
  const stage = buildStage();
  const { ui, session: side, showSession } = buildWindow(stage, { session: { project: PROJECT, name: 'New session' } });
  const S = buildSession(ui, { mode: INTERACTIVE.label, branch: 'main' });
  const card = buildApproval(S.page, APPROVAL);
  const cursor = buildCursor(stage);
  side.dot.style.visibility = 'hidden';
  const sideSpin = spinner(side.spin, 0, 0);

  const tl = S.tl;
  const thread = buildThread(tl, 'allow', { thumb: drawThumb, thumbSize: THUMB });
  await imagesDecoded();
  // The card pushes the thread up while it is open.
  const open = t => (t < UP ? 0 : t < CLICK + .1 ? span(t, UP, UP + .25) : 1 - span(t, CLICK + .1, CLICK + .3));
  tl.finish(DURATION, { endAt: t => tl.end(t) + card.lift * open(t) });

  // The hand is where it clicked Send. It goes to the first choice and clicks.
  const sendBox = rect(S.composer.send, WIN);
  const desk = (x, y) => [WIN.x + x, WIN.y + y];
  const row = card.boxes[0];
  const target = desk(row.x + 150, row.y + row.h / 2 + 2);
  const path = makePath(desk(sendBox.x + 13, sendBox.y + 12.5));
  path.move(target, ...CUE.toAllow, -10);
  path.click(CUE.click);
  path.check();
  const rowBox = { x: WIN.x + row.x, y: WIN.y + row.y, w: row.w, h: row.h };

  // The top of the thread, close, then one tilt down to the composer and
  // the strip of desktop under the window, where the caption sits.
  const s = 1.6;
  const x = WIN.x + COL.x + COL.w / 2;
  const top = look(x, WIN.y + 54 + DH / s / 2, s);
  const foot = look(x, DH - DH / s / 2, s, keep);
  const camera = makeCamera([[0, top], [CUE.tilt[0], top], [CUE.tilt[1], foot, glide]]);

  const caption = buildCaptions([
    { from: .2, to: Infinity, parts: ['It reads your receipts,', [' then asks before it controls any app.', UP - .2]] },
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
    const name = u >= BEAT.rename ? TITLE : 'New session';
    S.rename(name);
    if (side.name.textContent !== name) side.name.textContent = name;

    popInOut(card.card, t, UP, CLICK + .1, .25, .96, .2);
    const p = path.pointer(t);
    card.mark(0, path.down(t) && inside(p, rowBox) ? 0 : -1);
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
      card: [r3(card.top), r3(card.h)],
      target: target.map(r3),
    },
  };
}
