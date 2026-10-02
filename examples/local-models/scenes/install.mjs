// "...a local model available for install right from GitHub Copilot. Copilot
// will then" A new session with Auto on. The hand clicks into the prompt box
// and starts on a prompt, and on "available" Copilot's notification slides in
// on its own: it's installing Microsoft Aion Flash. The camera pushes into the
// corner while the download runs, the notification turns to "ready" on
// "GitHub Copilot", and on "Copilot will then" it slides away as the camera
// pulls back to find the prompt nearly typed. Routed cuts in on its last
// letters.
import { bezier, clamp, lerp, span, track } from '../motion.mjs';
import { clock } from '../timeline.mjs';
import { AION, DH, DW, WIN, imagesDecoded, inside, loadAssets, r3, rect } from '../kit.mjs';
import { beamAt, buildCursor, buildHome, buildIBeam, buildStage, buildToast, buildWindow, film, pointAt, showText } from '../app.mjs';
import { caretOn, makePath, typing } from '../input.mjs';
import { glide, keep, linear, look, makeCamera, wide } from '../camera.mjs';

const T = clock('install');
const DURATION = T.duration;
const WORDS = T.words({ local: 63.33, available: 63.9, install: 64.575, github: 65.76, copilot: 66.535, then: 67.395 });

// Routed's prompt on the same keys: routed starts DURATION in.
const PROMPT = 'Write unit tests for the date helpers';
const INSTALLING = {
  title: `Installing ${AION.name}`,
  body: 'Setting up a local model on this device.',
  status: 'Downloading',
};
const READY = {
  title: `${AION.name} is ready`,
  body: 'Copilot will now route suitable tasks to it.',
  status: 'Installed',
  value: '',
};

const CUE = {
  // The hand is on its way into the prompt box at the cut, clicks, and moves
  // off the text to where routed finds it, then types.
  toField: [-.3, .62],
  click: .45,
  toRest: [.68, .5],
  typing: [.85, DURATION + .3],
  // The notification arrives with "available" (edit.mjs plays its chime
  // then) and the camera goes in after it, landing as "install" ends.
  toast: WORDS.available - .06,
  push: [WORDS.available, WORDS.install + .6],
  // The download runs through "install" and finishes as "GitHub" starts.
  fill: [WORDS.available + .4, WORDS.github - .12],
  ready: WORDS.github - .03,
  // "Copilot will then": the camera pulls back and the notification times out
  // on the way.
  back: [WORDS.then - .07, DURATION - .1],
  leave: WORDS.then + .2,
};
// Windows' own curves: notifications decelerate in and accelerate out.
const ENTER = .5, EXIT = .3;
const enter = bezier(.1, .9, .2, 1);
const exit = bezier(.7, 0, 1, .5);
// Gathers itself, then goes, and lands softly.
const push = bezier(.5, 0, .15, 1);

// A download: a quick start, a stall around the middle, and a fast finish.
const [F0, F1] = CUE.fill;
const fill = track(
  [F0, 0],
  [F0 + .4, .44, bezier(.25, .5, .5, 1)],
  [F0 + .58, .5, linear],
  [F1, 1, bezier(.45, 0, .8, .9)],
);

// A shot pushed in by k about the point f (desktop px), which stays put on
// screen. Kept on the desktop, since these shots reach its corner.
const about = (shot, [fx, fy], k) => keep({ x: fx + (shot.x - fx) / k, y: fy + (shot.y - fy) / k, s: shot.s * k });

export default async function install() {
  await loadAssets();
  const stage = buildStage();
  const { ui, session: side, showSession } = buildWindow(stage, { session: { project: 'local-auto', name: 'New session' } });
  const home = buildHome(ui, { chip: 'Auto · Efficiency' });
  const cursor = buildCursor(stage);
  const note = buildToast(stage, cursor, { ...INSTALLING, progress: 0, value: '0%' });
  const beam = buildIBeam(stage);
  side.dot.style.visibility = 'hidden';
  showSession(false);
  await imagesDecoded();

  // How many lines each state's text takes; both should be one.
  const lines = {};
  for (const [key, text] of [['title', INSTALLING.title], ['body', INSTALLING.body], ['readyTitle', READY.title], ['readyBody', READY.body]]) {
    const node = key.toLowerCase().includes('title') ? note.title : note.body;
    node.textContent = text;
    lines[key] = Math.round(node.offsetHeight / 20);
  }
  note.title.textContent = INSTALLING.title;
  note.body.textContent = INSTALLING.body;
  const box = rect(note.toast);

  // The pointer starts right of the context bar, clear of the suggestions.
  const comp = rect(home.composer, WIN);
  const desk = (x, y) => [WIN.x + x, WIN.y + y];
  const field = { x: comp.x, y: comp.y, w: comp.w, h: 56 };
  const rest = desk(comp.x + 560, comp.y + comp.h + 66);
  const path = makePath(desk(comp.x + comp.w + 100, comp.y + 150));
  path.reach(desk(comp.x + 410, comp.y + 26), CUE.toField[0], CUE.toField[1], 14);
  path.click(CUE.click);
  path.move(rest, CUE.toRest[0], CUE.toRest[1], 10);
  path.check();
  const typed = typing(PROMPT, CUE.typing[0], CUE.typing[1], { seed: 23 });

  // Wide on the app, creeping toward the prompt box; then into the corner,
  // drifting on the title while it reads; then back out to the whole screen.
  const mid = desk(comp.x + comp.w / 2, comp.y + comp.h / 2);
  const shots = {
    wide,
    creep: about(wide, mid, 1.04),
    // The notification and most of the prompt box in one frame.
    corner: keep({ x: DW, y: DH, s: 1.5 }),
    // Routed's first frame, so the cut into it is invisible.
    send: look(mid[0] + 24, mid[1] + 6, 1.5),
  };
  shots.drift = about(shots.corner, [box.x + 140, box.y + 56], 1.02);
  const camera = makeCamera([
    [0, shots.wide],
    [CUE.push[0], shots.creep, linear],
    [CUE.push[1], shots.corner, push],
    [CUE.back[0], shots.drift, linear],
    // As the notification times out, a slow pan over to the prompt.
    [CUE.back[1], shots.send, glide],
  ]);

  const away = DW - box.x + 24;
  const show = (node, text) => { if (node.textContent !== text) node.textContent = text; };

  const pose = t => {
    t = clamp(t, 0, DURATION);
    film(stage, camera(t));
    const p = path.pointer(t);

    // The prompt box takes focus with the click, then the prompt goes in.
    const focused = t >= CUE.click;
    home.composer.classList.toggle('idle', !focused);
    const since = focused ? Math.max(CUE.click, typed.lastKey(t)) : Infinity;
    showText(home, typed.text(t), caretOn(t, since), home.send);

    // The notification: in, downloading, ready, and out.
    const gone = t < CUE.toast || t >= CUE.leave + EXIT;
    note.toast.style.visibility = gone ? 'hidden' : 'visible';
    if (!gone) {
      const leaving = span(t, CUE.leave, CUE.leave + EXIT);
      const dx = t < CUE.leave ? (1 - enter(span(t, CUE.toast, CUE.toast + ENTER))) * away : exit(leaving) * away;
      note.toast.style.transform = dx > .01 ? `translateX(${dx.toFixed(2)}px)` : 'none';
      note.toast.style.opacity = 1 - leaving * leaving;
      const ready = t >= CUE.ready;
      const f = ready ? 1 : fill(t);
      show(note.title, ready ? READY.title : INSTALLING.title);
      show(note.body, ready ? READY.body : INSTALLING.body);
      show(note.status, ready ? READY.status : INSTALLING.status);
      show(note.amount, ready ? READY.value : `${Math.floor(f * 100)}%`);
      note.bar.style.width = `${(f * 100).toFixed(3)}%`;
    }

    // An I-beam over the prompt's text, the arrow everywhere else.
    const overText = inside([p[0] - WIN.x, p[1] - WIN.y], field);
    cursor.style.visibility = overText ? 'hidden' : 'visible';
    beam.style.visibility = overText ? 'visible' : 'hidden';
    pointAt(cursor, p);
    beamAt(beam, p);
  };

  return {
    pose,
    duration: DURATION,
    // The notification's slide, the push, the slide out and the middle of the
    // pull back move far enough between frames to need the extra blur.
    fast: [
      [CUE.toast, CUE.toast + .25],
      [lerp(CUE.push[0], CUE.push[1], .2), lerp(CUE.push[0], CUE.push[1], .75)],
      [CUE.leave, CUE.leave + EXIT],
    ],
    info: {
      cue: Object.fromEntries(Object.entries(CUE).map(([k, v]) => [k, Array.isArray(v) ? v.map(r3) : r3(v)])),
      toast: [box.x, box.y, box.w, box.h].map(r3),
      lines,
      rest: rest.map(r3),
      keys: [r3(typed.keys[0][0]), r3(typed.keys.at(-1)[0]), typed.keys.length],
      typedAtEnd: typed.text(DURATION),
      shots: Object.fromEntries(Object.entries(shots).map(([k, v]) => [k, [r3(v.x), r3(v.y), r3(v.s)]])),
    },
  };
}
