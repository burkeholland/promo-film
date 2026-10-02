// "...and still have access to your local models, which is perfect for
// working disconnected or when you just don't have an internet connection."
// Cuts in wide on "completely
// offline", where the take leaves Burke, on a session that's already at work: the local model is redacting a
// customer export. The hand drops to the bottom of the screen, the hidden
// taskbar slides up under it, and a click on the network icons opens Quick
// Settings as the camera settles into that corner. Airplane mode goes on with
// "local models", Wi-Fi and Bluetooth go out, and the app notes it's offline.
// Nothing else changes: Copilot carries on and starts the full run, which
// finishes as "don't have" is said, and its reply comes in over "an internet
// connection". The reply says what it did and makes no promise about where
// the data went.
import { bezier, clamp, easeIn, inOut, out, span } from '../motion.mjs';
import { clock } from '../timeline.mjs';
import { AION, DH, DW, WIN, imagesDecoded, inside, loadAssets, r3, rect } from '../kit.mjs';
import { buildCursor, buildHome, buildStage, buildWindow, film, pointAt, showText } from '../app.mjs';
import { caretOn, makePath } from '../input.mjs';
import { glide, keep, look, makeCamera, wide } from '../camera.mjs';
import { COL, SESSION_ICONS, buildSession, spinner } from '../session.mjs';
import { BAR, TRAY, buildQuickSettings, buildTaskbar, poseQuickSettings, poseTaskbar } from '../windows.mjs';

const T = clock('offline');
const DURATION = T.duration;
// Measured onsets; "local", "have", "internet" and "connection" keep Whisper's times.
const WORDS = T.words({
  still: 118.185, access: 118.975, local: 119.32, which: 120.135, disconnected: 121.69,
  have: 123.815, internet: 124.575, connection: 124.835,
});

// The settings film plays this session on to its end, so it shares these.
export const PROMPT = 'Redact the customer PII in exports/customers.csv';
export const TITLE = 'Redact customer PII';
// The film opens on "completely offline", straight from the automation's zero credits. PRE
// is when "offline" ends, and the hand starts moving there, so the first
// moment just shows the session at work.
const PRE = T.at(117.633);
// When the session started, before this film's first frame.
export const START = PRE - 27;
const PLAN = 'The email, phone and address columns hold personal data. I\'ll write a script that masks those, try it on a sample, then run it on the whole export.';
const SAID = 'The sample looks right. Now the full export, all 48,210 rows.';
const DONE = 'Done. I masked the email, phone and address columns in all 48,210 rows and saved the result to `exports/customers.redacted.csv`.';
// The last row of pixels: the pointer can't go lower.
const EDGE = DH - .5;

export const CUE = {
  // Copilot is mid-task at the cut: it edits the script once more.
  edit: PRE + .45,
  // The hand drops to the bottom edge under the tray. The taskbar comes up
  // a beat after the pointer touches the edge.
  toEdge: [PRE + .05, PRE + .7],
  // Onto the network icons, a click, and the flyout opens as it comes up.
  toTray: [PRE + .82, PRE + 1.0],
  tray: PRE + 1.08,
  toPlane: [PRE + 1.3, PRE + 1.72],
  // The button goes down on "local" and comes up before "models". The
  // radios take a moment longer to go out.
  plane: WORDS.local + .06,
  wifi: WORDS.local + .36,
  bluetooth: WORDS.local + .46,
  icon: WORDS.local + .44,
  // The app notices, and keeps going.
  note: WORDS.which + .05,
  // Back up into the app, where a click on empty space closes the flyout.
  // The taskbar hides once it's gone.
  toApp: [PRE + 3.0, PRE + 3.55],
  dismiss: PRE + 3.68,
  hide: PRE + 3.9,
  toRest: [PRE + 4.05, .6],
  said: [PRE + 4.1, PRE + 4.7],
  run: PRE + 4.95,
  // The run's time shows after "have", then a look at what it wrote and the
  // reply through "internet connection". Copilot is idle at the cut.
  took: WORDS.have + .285,
  view: WORDS.internet - .175,
  done: [WORDS.internet + .125, WORDS.connection + .765],
  idle: WORDS.connection + .865,
};

// The whole session, finished. Times are in this film's time; the settings
// film plays it on from where this one ends.
export function buildThread(tl) {
  const at = (item, t) => { item.at = t; return item; };
  const s = START;
  at(tl.row({ icon: 'circle-check', text: 'Copilot session started' }), s);
  const bubble = at(tl.bubble(PROMPT), s);
  at(tl.model(AION, 'Local'), s + .9);
  at(tl.row({ icon: 'circle-dashed', text: 'Thought for 1s' }), s + 1.6);
  at(tl.row({ icon: 'file-text', text: 'View exports/customers.csv' }), s + 2.3);
  tl.stream(tl.md(PLAN), s + 2.9, s + 4.6, 11);
  at(tl.row({ icon: 'file-plus', text: 'Create scripts/redact.py', diff: [52, 0] }), s + 12);
  at(tl.row({
    icon: 'terminal', text: 'Run the script on a sample', code: 'python scripts/redact.py --sample 20 exports/customers.csv', took: '1s',
  }), s + 19);
  at(tl.row({ icon: 'file-pen', text: 'Edit scripts/redact.py', diff: [3, 1] }), CUE.edit);
  const offRow = at(tl.row({ icon: 'wifi-off', text: 'You\'re offline', detail: 'Copilot keeps working on local models' }), CUE.note);
  const said = tl.stream(tl.md(SAID), CUE.said[0], CUE.said[1], 7);
  const run = at(tl.row({
    icon: 'terminal', text: 'Run the redaction script', code: 'python scripts/redact.py exports/customers.csv', took: '2s',
  }), CUE.run);
  // The run time stays hidden until the run finishes.
  const took = [...run.line.querySelectorAll('.dot, .d')];
  at(tl.row({ icon: 'file-text', text: 'View exports/customers.redacted.csv' }), CUE.view);
  const reply = tl.stream(tl.md(DONE), CUE.done[0], CUE.done[1], 7);
  tl.work.from = s;
  tl.work.to = CUE.idle;
  return { bubble, offRow, said, run, took, reply };
}

// The same, framing window x0 to x1 around the middle `y`.
const around = (x0, x1, y) => look(WIN.x + (x0 + x1) / 2, WIN.y + y, DW / (x1 - x0));
// A shot of zoom s held in the desktop's bottom right corner.
const corner = s => keep({ x: DW - DW / 2 / s, y: DH - DH / 2 / s, s });
// The pointer, pinned to the screen.
const pin = p => [p[0], Math.min(p[1], EDGE)];

// The shot this film ends on, which the settings film starts from.
export function endShot(tl, { offRow, reply }) {
  const off = tl.where(offRow, DURATION), end = tl.where(reply, DURATION);
  const mid = COL.x + COL.w / 2;
  return around(mid - DW / 2 / 1.5, mid + DW / 2 / 1.5, (off.y + end.y + 4 * 24) / 2);
}

export default async function offline() {
  await loadAssets([...SESSION_ICONS, 'wifi-off']);
  const stage = buildStage();
  const { ui, session: side, showSession } = buildWindow(stage, { session: { project: 'local-auto', name: TITLE } });
  // Home is only built to find where the settings film expects the pointer.
  const home = buildHome(ui, { chip: 'Auto · Efficiency' });
  home.page.style.visibility = 'hidden';
  const S = buildSession(ui, { chip: 'Auto · Efficiency' });
  S.rename(TITLE);
  showSession(true);
  // The shell sits above the app and under the pointer.
  const bar = buildTaskbar(stage);
  const quick = buildQuickSettings(stage);
  const cursor = buildCursor(stage);
  side.dot.style.visibility = 'hidden';
  const sideSpin = spinner(side.spin, 0, 0);
  await imagesDecoded();

  const tl = S.tl;
  const thread = buildThread(tl);
  const { offRow, took, reply } = thread;
  tl.finish(DURATION);

  const sendBox = rect(home.send, WIN);
  const rest = [WIN.x + sendBox.x + 68, WIN.y + sendBox.y + 82];
  const plane = quick.tiles.airplane.box;
  const group = TRAY.group;
  // Empty space in the conversation, clear of the flyout.
  const app = [WIN.x + 1008, WIN.y + 497];
  const path = makePath([1215, 521]);
  // Aimed a little past the bottom of the screen, which stops the pointer,
  // so it slides the last few px along the edge.
  path.move([1391, DH + 20], CUE.toEdge[0], CUE.toEdge[1] - CUE.toEdge[0], 16);
  path.move([1391, EDGE], CUE.toEdge[1], 0);
  path.move([group.x + 38, DH - BAR + 22], CUE.toTray[0], CUE.toTray[1] - CUE.toTray[0], -3);
  path.click(CUE.tray);
  path.reach([plane.x + plane.w / 2 + 4, plane.y + plane.h / 2 + 3], CUE.toPlane[0], CUE.toPlane[1] - CUE.toPlane[0], -22);
  path.click(CUE.plane);
  // The hand settles a little while the radios go out.
  path.move([plane.x + plane.w / 2 - 2, plane.y + plane.h / 2 + 9], CUE.plane + .2, .36, 3);
  path.reach(app, CUE.toApp[0], CUE.toApp[1] - CUE.toApp[0], 14);
  path.click(CUE.dismiss);
  // Then off to the side to watch.
  path.move(rest, CUE.toRest[0], CUE.toRest[1], 10);
  path.check();

  // The taskbar comes up a beat after the pointer touches the edge.
  let touch = CUE.toEdge[1];
  for (let ms = Math.round(CUE.toEdge[0] * 1000); ms <= CUE.toEdge[1] * 1000; ms++) {
    if (path.pointer(ms / 1000)[1] >= EDGE) { touch = ms / 1000; break; }
  }
  const reveal = touch + .12;
  const upAt = t => {
    if (t < reveal) return 0;
    if (t < CUE.hide) return out(span(t, reveal, reveal + .22));
    return 1 - easeIn(span(t, CUE.hide, CUE.hide + .2));
  };
  // The flyout opens as the click comes up.
  const trayUp = CUE.tray + .09;

  const off = tl.where(offRow, DURATION);
  const end = tl.where(reply, DURATION);
  const shots = {
    wide,
    // The tray, the flyout and the bottom of the conversation in one frame.
    corner: corner(1.38),
    creep: corner(1.4),
    // The conversation from the offline note down to the reply.
    rows: endShot(tl, thread),
  };
  const camera = makeCamera([
    [0, shots.wide],
    // The camera follows the hand down a beat behind it, and settles as the
    // flyout opens, then barely creeps while the hand works.
    [PRE + .2, shots.wide],
    [PRE + 1.4, shots.corner],
    [CUE.dismiss, shots.creep, glide],
    // Then a slow drift onto the work, which never stopped, arriving at the
    // cut.
    [DURATION, shots.rows, glide],
  ]);

  const pose = t => {
    t = clamp(t, 0, DURATION);
    film(stage, camera(t));
    const p = pin(path.pointer(t));
    const down = path.down(t);

    // The shell: the taskbar, the flyout, and whatever is under the pointer.
    const up = upAt(t);
    const shown = t >= trayUp && t < CUE.dismiss;
    const overTray = up > .5 && p[0] >= group.x && p[0] < group.x + group.w && p[1] >= DH - BAR * up;
    poseTaskbar(bar, { up, hover: overTray, down, open: shown, airplane: t >= CUE.icon });
    let tile = null;
    if (shown) for (const q of Object.values(quick.tiles)) if (inside(p, q.box)) tile = q.id;
    poseQuickSettings(quick, {
      open: out(span(t, trayUp, trayUp + .28)),
      close: easeIn(span(t, CUE.dismiss, CUE.dismiss + .16)),
      on: {
        airplane: inOut(span(t, CUE.plane + .09, CUE.plane + .19)),
        wifi: 1 - inOut(span(t, CUE.wifi, CUE.wifi + .1)),
        bluetooth: 1 - inOut(span(t, CUE.bluetooth, CUE.bluetooth + .1)),
      },
      hover: tile,
      down,
    });

    // The composer has focus until the taskbar takes it.
    showText(S.composer, '', t < CUE.tray && caretOn(t, START), null);
    const working = t < tl.work.to;
    S.composer.running(working);
    side.spin.style.visibility = working ? 'inherit' : 'hidden';
    for (const node of took) node.style.visibility = t >= CUE.took ? 'inherit' : 'hidden';
    tl.pose(t);
    sideSpin(t);
    pointAt(cursor, p);
  };

  return {
    pose,
    duration: DURATION,
    info: {
      touch: r3(touch),
      reveal: r3(reveal),
      cue: Object.fromEntries(Object.entries(CUE).map(([k, v]) => [k, Array.isArray(v) ? v.map(r3) : r3(v)])),
      rest: rest.map(r3),
      plane: [plane.x, plane.y].map(r3),
      off: [off.x, off.y].map(r3),
      end: [end.x, end.y].map(r3),
      shots: Object.fromEntries(Object.entries(shots).map(([k, v]) => [k, [r3(v.x), r3(v.y), r3(v.s)]])),
    },
  };
}
