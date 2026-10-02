// "...automatically use these models when set to auto-routing. There are a
// myriad of scenarios where local models are perfect." Cuts in on the last
// letters of a prompt, with Auto on. The hand goes to Send and clicks it on
// "use", and the app opens the new session. On "auto-routing" the timeline
// notes the switch to MAI Code 1.1 Flash and the camera eases in on that line
// while the local model gets to work under it through "a myriad of
// scenarios": it finds the date helpers, reads them and writes their tests.
import { bezier, clamp } from '../motion.mjs';
import { clock } from '../timeline.mjs';
import { AION, DH, DW, WIN, imagesDecoded, inside, loadAssets, r3, rect } from '../kit.mjs';
import { buildCursor, buildHome, buildStage, buildWindow, film, pointAt, showText } from '../app.mjs';
import { caretOn, makePath, typing } from '../input.mjs';
import { glide, inWin, look, makeCamera } from '../camera.mjs';
import { COL, SESSION_ICONS, buildSession, spinner } from '../session.mjs';

const T = clock('routed');
const DURATION = T.duration;
// Each cue names the words it lands on, so a new take moves them all.
const WORDS = {
  use: T.said('automatically [use] these models'),
  auto: T.said('set to [auto-routing]'),
  there: T.said('[there] are a myriad'),
  myriad: T.said('myriad'),
  local: T.said('where [local] models are perfect'),
  perfect: T.said('perfect'),
};
const PROMPT = 'Write unit tests for the date helpers';
const TITLE = 'Unit tests for date helpers';

// The click on Send lands just ahead of "use". Everything that leads up to it
// is timed back from it, never from the start of the film, so moving the cut
// a frame can't make the hand click while it is still on its way.
const SEND = WORDS.use - .03;
const CUE = {
  // The prompt is already being typed when the film cuts in.
  typing: [SEND - 5.27, SEND - .52],
  // The hand goes to Send as the last key goes in. The app opens the session
  // when the button comes up.
  toSend: [SEND - .5, SEND - .02],
  send: SEND,
  // The session gets its name once the first reply starts.
  title: WORDS.auto - .45,
  // The model line lands on "auto-routing"; the tool calls
  // follow at a working pace, a search and two reads in quick succession,
  // then the new test file and a test run.
  model: WORDS.auto - .08,
  thought: WORDS.there - .25,
  searched: WORDS.myriad - .1,
  view: WORDS.myriad + .18,
  config: WORDS.local - .2,
  create: WORDS.perfect - .1,
  run: WORDS.perfect + .35,
};

// A shot pushed in by k about the point f (desktop px), which stays put on
// screen.
const about = (shot, [fx, fy], k) => inWin({ x: fx + (shot.x - fx) / k, y: fy + (shot.y - fy) / k, s: shot.s * k });
// The shot whose frame spans window x from x0 to x1, with its top at `top`.
const fromTop = (x0, x1, top) => {
  const s = DW / (x1 - x0);
  return look(WIN.x + (x0 + x1) / 2, WIN.y + top + DH / 2 / s, s);
};
// The same, framing window x0 to x1 around the middle `y`.
const around = (x0, x1, y) => look(WIN.x + (x0 + x1) / 2, WIN.y + y, DW / (x1 - x0));
// Starts at speed and comes to rest, for a move the cut lands in.
const settle = u => 1 - (1 - u) ** 2;
// Gets going quickly and takes its time arriving.
const lift = bezier(.33, 0, .2, 1);

export default async function routed() {
  await loadAssets(SESSION_ICONS);
  const stage = buildStage();
  const { ui, session: side, showSession } = buildWindow(stage, { session: { project: 'local-auto', name: 'New session' } });
  const home = buildHome(ui, { chip: 'Auto · Efficiency' });
  const S = buildSession(ui, { chip: 'Auto · Efficiency' });
  const cursor = buildCursor(stage);
  side.dot.style.visibility = 'hidden';
  const sideSpin = spinner(side.spin, 0, 0);
  await imagesDecoded();

  // The app swaps to the new session a moment after the click.
  const open = CUE.send + .12;
  const tl = S.tl;
  const at = (item, t) => { item.at = t; return item; };
  at(tl.row({ icon: 'circle-check', text: 'Copilot session started' }), open);
  const bubble = at(tl.bubble(PROMPT), open);
  const modelRow = at(tl.model(AION, 'Local'), CUE.model);
  at(tl.row({ icon: 'circle-dashed', text: 'Thought for 1s' }), CUE.thought);
  at(tl.row({ icon: 'search', text: 'Searched src/**/date*' }), CUE.searched);
  at(tl.row({ icon: 'file-code', text: 'View src/utils/date.ts' }), CUE.view);
  // JSON files get the app's yellow braces (screenshot 08).
  at(tl.row({ icon: 'braces', color: '#bf8700', text: 'View package.json' }), CUE.config);
  at(tl.row({ icon: 'file-plus', text: 'Create src/utils/date.test.ts' }), CUE.create);
  const runRow = at(tl.row({ icon: 'terminal', text: 'Run the date tests', code: 'npx vitest run src/utils/date.test.ts' }), CUE.run);
  tl.work.from = open;
  tl.finish(DURATION);

  // The pointer rests between the composer and the suggestions while the
  // prompt is typed.
  const comp = rect(home.composer, WIN);
  const sendBox = rect(home.send, WIN);
  const desk = (x, y) => [WIN.x + x, WIN.y + y];
  const path = makePath(desk(comp.x + 560, comp.y + comp.h + 66));
  path.move(desk(sendBox.x + 13, sendBox.y + 12.5), CUE.toSend[0], CUE.toSend[1] - CUE.toSend[0], -14);
  path.click(CUE.send);
  // The hand eases off the button to watch the reply come in.
  path.move(desk(sendBox.x + 65, sendBox.y + 76), CUE.send + .45, .6, 10);
  path.check();
  const typed = typing(PROMPT, CUE.typing[0], CUE.typing[1], { seed: 23 });

  const mid = desk(comp.x + comp.w / 2, comp.y + comp.h / 2);
  const send = look(mid[0] + 24, mid[1] + 6, 1.5);
  const line = tl.where(modelRow, CUE.model);
  const runAt = tl.where(runRow, DURATION);
  const bubbleBox = rect(bubble.node.firstChild, WIN);
  const shots = {
    send,
    // A slight creep toward Send while the hand gets there.
    sendIn: about(send, desk(sendBox.x + 12, sendBox.y + 12), 1.035),
    // The conversation column with even margins, the header just out of
    // frame above it.
    thread: fromTop(COL.x + COL.w / 2 - DW / 2 / 1.6, COL.x + COL.w / 2 + DW / 2 / 1.6, 52),
    // A slow creep in on the tool rows, never higher than the thread shot so
    // the header stays out of frame.
    rows: around(COL.x + COL.w / 2 - DW / 2 / 1.66, COL.x + COL.w / 2 + DW / 2 / 1.66, Math.max((line.y + runAt.y + 2 * 28) / 2, 52 + DH / 2 / 1.6 + 6)),
  };
  const camera = makeCamera([
    [0, shots.send],
    [CUE.send, shots.sendIn, settle],
    // The push up into the thread starts with the click, so the camera is
    // already moving when the page changes, and lands as the model line
    // does. A beat to read it, then a slow glide down the rows.
    [CUE.model + .05, shots.thread, lift],
    [CUE.model + .65, shots.thread],
    [DURATION + .4, shots.rows, glide],
  ]);

  const pose = t => {
    t = clamp(t, 0, DURATION);
    film(stage, camera(t));
    const p = path.pointer(t);
    const opened = t >= open;
    home.page.style.visibility = opened ? 'hidden' : 'inherit';
    S.page.style.visibility = opened ? 'inherit' : 'hidden';
    showSession(opened);

    // Home: the prompt goes in and the hand sends it.
    showText(home, typed.text(t), caretOn(t, typed.lastKey(t)), home.send);
    const over = inside([p[0] - WIN.x, p[1] - WIN.y], sendBox);
    if (over) home.send.style.background = path.down(t) ? '#424a53' : '#32383f';

    // The session: the composer keeps focus, empty, while Copilot works.
    showText(S.composer, '', caretOn(t, open), null);
    S.composer.running(true);
    const name = t >= CUE.title ? TITLE : 'New session';
    S.rename(name);
    if (side.name.textContent !== name) side.name.textContent = name;
    tl.pose(t);
    sideSpin(t);
    pointAt(cursor, p);
  };

  return {
    pose,
    duration: DURATION,
    info: {
      open: r3(open),
      cue: Object.fromEntries(Object.entries(CUE).map(([k, v]) => [k, Array.isArray(v) ? v.map(r3) : r3(v)])),
      line: [line.x, line.y, line.w].map(r3),
      bubble: [bubbleBox.x, bubbleBox.y, bubbleBox.w].map(r3),
      run: [runAt.x, runAt.y].map(r3),
      keys: [r3(typed.keys[0][0]), r3(typed.keys.at(-1)[0]), typed.keys.length],
      shots: Object.fromEntries(Object.entries(shots).map(([k, v]) => [k, [r3(v.x), r3(v.y), r3(v.s)]])),
    },
  };
}
