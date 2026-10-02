// "You can also plan with large frontier models, such as Astra, and then hand
// off to a local model to implement while you sleep. And users love..."
// Cuts in on the new session page with a big job typed in Autopilot, Auto on,
// and the camera creeping in. Enter opens the session. On "large frontier
// models" Auto plans with GPT-6 Astra, and the plan streams in through "such
// as Astra". On "hand off" it switches to MAI-Code-1.1-Flash to build it while
// the camera pushes down to the working row above the composer. "While you
// sleep" is a time-lapse: the work races by and the working clock runs up to
// 6h 41m. Back at normal speed, all the tests pass and the local model starts
// a review as the camera pulls back to the whole app, and on "users love" the
// hand reaches for Automations and clicks it just before the cut.
import { bezier, clamp, inOut, lerp, span } from '../motion.mjs';
import { clock } from '../timeline.mjs';
import { AION, ASTRA, DH, DW, WIN, imagesDecoded, inside, loadAssets, px, r3, rect } from '../kit.mjs';
import { NAV, PROJECTS, buildCursor, buildHome, buildStage, buildWindow, film, navRect, pointAt, showText } from '../app.mjs';
import { caretOn, makePath } from '../input.mjs';
import { glide, inWin, keep, look, makeCamera } from '../camera.mjs';
import { COMPOSER, SESSION_ICONS, buildSession, spinner } from '../session.mjs';

const T = clock('plan-handoff');
const DURATION = T.duration;
// Onsets measured from the waveform. "off", "sleep" and "users" run on from
// the words before them, so those keep Whisper's times.
const WORDS = T.words({
  plan: 90.865, large: 91.33, frontier: 91.87, models: 92.12, astra: 93.275, hand: 94.49, off: 94.7,
  local: 95.33, implement: 95.91, while: 96.45, sleep: 97.02, and: 98.265, users: 98.88, love: 99.465,
});

const PROJECT = 'storefront-api';
const PROMPT = 'Migrate the API from Express to Fastify. Plan it first, then implement it until every test passes.';
const TITLE = 'Express to Fastify migration';
const PLAN = [
  '### Plan: Express to Fastify',
  '1. Swap `express` for `fastify` and its CORS and helmet plugins',
  '2. Port the 38 handlers in `src/routes/` to Fastify plugins',
  '3. Replace the error middleware with `setErrorHandler`',
  '4. Turn the Joi validators into JSON schemas',
  '5. Move the tests to `app.inject()` and run them until all 214 pass',
].join('\n');
// The local model's first steps, at a working pace, from the model line.
const BUILD = [
  [.27, { icon: 'file-code', text: 'View src/server.ts' }],
  [.52, { icon: 'search', text: 'Searched src/routes/**/*.ts' }],
  [.84, { icon: 'file-pen', text: 'Edit package.json', diff: [3, 2] }],
  [1.13, { icon: 'file-pen', text: 'Edit src/server.ts', diff: [41, 37] }],
  [1.4, { icon: 'terminal', text: 'Run the Fastify install', code: 'npm install fastify @fastify/cors @fastify/helmet' }],
];
// The night's work, as the app shows a long session: short notes between
// collapsed groups of tool calls (screenshot 04).
const NIGHT = [
  ['Fastify boots. Now the routes, one file at a time:'],
  ['Edit src/routes/orders.ts and 6 other tool calls', [112, 97]],
  ['Orders pass. Customers next:'],
  ['Edit src/routes/customers.ts and 4 other tool calls', [64, 58]],
  ['Edit src/routes/products.ts and 8 other tool calls', [141, 120]],
  ['Two tests fail on the old error middleware. Moving it to `setErrorHandler`:'],
  ['Create src/plugins/errors.ts and 3 other tool calls', [52, 38]],
  ['Run npm test and 2 other tool calls', null],
  ['171 of 214 pass. The rest need JSON schemas:'],
  ['Create src/schemas/orders.ts and 11 other tool calls', [318]],
  ['Edit src/routes/carts.ts and 5 other tool calls', [88, 79]],
  ['209 of 214. Checking the last five:'],
  ['Edit src/routes/checkout.ts and 2 other tool calls', [19, 11]],
];
const MORNING = 'All 214 tests pass. Now a review pass: reading every handler against the OpenAPI spec.';
// Then it reads, at an uneven pace, while the hand goes to Automations.
const READS = [
  [0, 'file', 'docs/openapi.yaml'], [.31, 'file-code', 'src/routes/orders.ts'], [.55, 'file-code', 'src/routes/customers.ts'],
  [.94, 'file-code', 'src/routes/products.ts'], [1.22, 'file-code', 'src/routes/inventory.ts'], [1.61, 'file-code', 'src/routes/carts.ts'],
  [1.86, 'file-code', 'src/routes/checkout.ts'], [2.25, 'file-code', 'src/routes/payments.ts'], [2.5, 'file-code', 'src/routes/shipping.ts'],
  [2.82, 'file-code', 'src/routes/returns.ts'],
];
// How long the work has run when the night is over: 6h 41m.
const NIGHT_LONG = 6 * 3600 + 41 * 60 + 17;

const CUE = {
  // The job is typed when the cut lands, and Enter goes in a beat later.
  open: .5,
  // Auto picks Astra to plan on "frontier"; it thinks, then the plan streams
  // in through "such as Astra", and the session gets its name.
  astra: WORDS.frontier - .06,
  thought: WORDS.models + .05,
  plan: [WORDS.models + .3, WORDS.hand - .12],
  title: WORDS.models + .4,
  // The hand off lands on "off", and the local model gets to work.
  aion: WORDS.off + .02,
  // The time-lapse runs from "while" until the pause after "sleep".
  night: [WORDS.while - .06, WORDS.sleep + .88],
  morning: [WORDS.sleep + .84, WORDS.and + .55],
  reads: WORDS.and + .7,
};

// The shot whose frame has its top left corner at window (left, top).
const frame = (left, top, s) => look(WIN.x + left + DW / 2 / s, WIN.y + top + DH / 2 / s, s);
// A shot pushed in by k about the point f (desktop px), which stays put.
const about = (shot, [fx, fy], k) => inWin({ x: fx + (shot.x - fx) / k, y: fy + (shot.y - fy) / k, s: shot.s * k });
// Starts at speed and comes to rest, for a move the cut lands in.
const settle = u => 1 - (1 - u) ** 2;
const push = bezier(.5, .05, .25, 1);

// The night's items arrive densest where the clock runs fastest, so the
// view scrolls evenly up to speed and back down. `share(u)` is how much of
// the content is in by u of the way through.
const BASE = 3;
const share = u => (BASE * u + inOut(u)) / (BASE + 1);
function when(part) {
  let lo = 0, hi = 1;
  for (let k = 0; k < 40; k++) {
    const mid = (lo + hi) / 2;
    if (share(mid) < part) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

export default async function planHandoff() {
  await loadAssets(SESSION_ICONS);
  const stage = buildStage();
  const projects = [...PROJECTS, ['folder', PROJECT, -1.92]];
  const { ui, navHover, session: side, showSession } = buildWindow(stage, { session: { project: PROJECT, name: 'New session' }, projects });
  const home = buildHome(ui, { chip: 'Auto · Efficiency', project: PROJECT, branch: 'main', mode: 'Autopilot' });
  const S = buildSession(ui, { chip: 'Auto · Efficiency', branch: `${PROJECT}/main`, mode: 'Autopilot' });
  const cursor = buildCursor(stage);
  side.dot.style.visibility = 'hidden';
  const sideSpin = spinner(side.spin, 0, 0);
  await imagesDecoded();

  const tl = S.tl;
  const at = (item, t) => { item.at = t; return item; };
  const pop = (item, t) => tl.stream(item, t, t + .05);
  at(tl.row({ icon: 'circle-check', text: 'Copilot session started' }), CUE.open);
  const bubble = at(tl.bubble(PROMPT), CUE.open);
  const astraRow = at(tl.model(ASTRA, 'GitHub Copilot'), CUE.astra);
  at(tl.row({ icon: 'circle-dashed', text: 'Thought for 2s' }), CUE.thought);
  const plan = tl.stream(tl.md(PLAN), CUE.plan[0], CUE.plan[1], 11);
  const aionRow = at(tl.model(AION, 'Local'), CUE.aion);
  const build = BUILD.map(([dt, row]) => at(tl.row(row), CUE.aion + dt));
  const night = NIGHT.map(([text, diff]) => diff === undefined ? tl.md(text) : tl.row({ icon: 'chevron-right', text, diff }));
  const morning = tl.md(MORNING);
  const reads = READS.map(([dt, name, path]) => at(tl.row({ icon: name, text: `View ${path}` }), CUE.reads + dt));

  // Each of the night's items comes in when the content's end, moving at the
  // pace `share` sets, gets to its middle. The morning's note is the last of
  // them: its first line lands on its cue and the rest of it streams on.
  const [n0, n1] = CUE.night;
  const y0 = night[0].y, y1 = morning.y + morning.bottoms[0];
  const middle = item => (item === morning ? morning.y + morning.bottoms[0] / 2 : item.y + item.h / 2);
  const part = item => (middle(item) - y0) / (y1 - y0);
  const nEnd = n0 + (CUE.morning[0] - n0) / when(part(morning));
  for (const item of night) {
    const t = lerp(n0, nEnd, when(part(item)));
    if (item.kind === 'md') pop(item, t); else at(item, t);
  }
  tl.stream(morning, CUE.morning[0], CUE.morning[1], 5);

  // The clock runs on film time until the night, then speeds up through the
  // hours and comes back down to normal at 6h 41m.
  tl.work.from = CUE.open;
  const e0 = n0 - CUE.open;
  tl.work.elapsed = t => {
    if (t < n0) return t - CUE.open;
    if (t >= n1) return NIGHT_LONG + t - n1;
    return Math.exp(lerp(Math.log(e0), Math.log(NIGHT_LONG), inOut(span(t, n0, n1))));
  };
  // Through the night the view scrolls with the even flow of the work, not
  // item by item, so a tall item doesn't jerk it.
  const off0 = tl.end(n0 - .001) - y0, off1 = tl.end(nEnd) - y1;
  const flow = t => {
    if (t < n0 || t >= nEnd) return tl.end(t);
    const p = share(span(t, n0, nEnd));
    return lerp(y0, y1, p) + lerp(off0, off1, p);
  };
  tl.finish(DURATION, { tau: .12, endAt: flow });

  // The hand rests to the right of the composer: out of the shots of the
  // main area and the work, and in the whole window at the end. Once the
  // camera has settled on the whole app, it reaches for Automations in the
  // sidebar and clicks it just before the cut, where the next film picks up.
  const rest = [WIN.x + 1300, WIN.y + 668];
  const path = makePath(rest);
  const moves = { nav: path.reach([WIN.x + 100, WIN.y + 181], DURATION - .98, .85, -30) };
  path.click(DURATION - .06);
  path.check();

  const mainArea = DW / (WIN.w - 279);
  const desk = (x, y) => [WIN.x + x, WIN.y + y];
  const shots = {
    // The main area edge to edge, from just under the title bar, with the
    // sidebar out of frame.
    main: frame(279, 14, mainArea),
    // A slow creep toward the conversation.
    creep: null,
    // The bottom of the conversation and the whole composer, the working
    // row's clock just above it.
    work: look(WIN.x + COMPOSER.x + COMPOSER.w / 2, WIN.y + WIN.h - DH / 2 / 1.6, 1.6),
    // The whole window on the desktop, with even margins of wallpaper.
    wide: look(WIN.x + WIN.w / 2, WIN.y + WIN.h / 2, 1.05, keep),
  };
  // It pushes the header out of the top of the frame, and the hand out past
  // the right edge, rather than leaving either cut in half.
  shots.creep = about(shots.main, desk(810, 340), 1.164);
  const camera = makeCamera([
    [0, shots.main],
    [CUE.aion - .3, shots.creep, settle],
    // On "hand off" the camera pushes down to the work and stays there
    // through the night.
    [CUE.aion - .22, shots.creep],
    [CUE.aion + 1.05, shots.work, push],
    [CUE.morning[0] + .1, shots.work],
    // Then it pulls back, slowly, to the whole app, and holds there for
    // the reach to Automations.
    [WORDS.users - .1, shots.wide, glide],
  ]);

  const pose = t => {
    t = clamp(t, 0, DURATION);
    film(stage, camera(t));
    const opened = t >= CUE.open;
    home.page.style.visibility = opened ? 'hidden' : 'inherit';
    S.page.style.visibility = opened ? 'inherit' : 'hidden';
    showSession(opened);
    showText(home, PROMPT, !opened && caretOn(t, -.3), home.send);
    // The session: the composer keeps focus, empty, while Copilot works.
    showText(S.composer, '', caretOn(t, CUE.open), null);
    S.composer.running(true);
    const name = t >= CUE.title ? TITLE : 'New session';
    S.rename(name);
    if (side.name.textContent !== name) side.name.textContent = name;
    tl.pose(t);
    sideSpin(t);
    const p = path.pointer(t);
    const q = [p[0] - WIN.x, p[1] - WIN.y];
    const navRow = NAV.findIndex((_, i) => inside(q, navRect(i)));
    navHover.style.visibility = navRow >= 0 ? 'inherit' : 'hidden';
    if (navRow >= 0) navHover.style.top = px(navRect(navRow).y);
    pointAt(cursor, p);
  };

  // How fast the content scrolls on screen, at its fastest.
  let peak = [0, 0];
  for (let f = 1; f <= Math.round(DURATION * 60); f++) {
    const t = f / 60;
    const d = Math.abs(tl.where(bubble, t).y - tl.where(bubble, t - 1 / 60).y) * camera(t).s * 1.25;
    if (d > peak[0]) peak = [d, t];
  }
  const clockAt = t => {
    const s = Math.floor(tl.work.elapsed(t));
    return s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${Math.floor(s / 3600)}h ${Math.floor(s / 60) % 60}m`;
  };
  const bubbleBox = rect(bubble.node.firstChild, WIN);
  const y = (item, t = item.at) => r3(tl.where(item, t).y);
  return {
    pose,
    duration: DURATION,
    info: {
      cue: Object.fromEntries(Object.entries(CUE).map(([k, v]) => [k, Array.isArray(v) ? v.map(r3) : r3(v)])),
      bubble: [bubbleBox.x, bubbleBox.y, bubbleBox.w, bubbleBox.h].map(r3),
      rows: { astra: y(astraRow), plan: [y(plan, CUE.plan[1]), r3(plan.h)], aion: y(aionRow), build: y(build.at(-1)) },
      night: night.map(item => r3(item.at)),
      peak: peak.map(r3),
      flow: [r3(y1 - y0), r3(off0), r3(off1), r3((y1 - y0) / (nEnd - n0) / 60 * shots.work.s * 1.25)],
      clock: [n0 - .01, n0 + .6, (n0 + n1) / 2, n1 - .6, n1, DURATION].map(t => `${r3(t)} ${clockAt(t)}`),
      reads: [r3(reads[0].at), r3(reads.at(-1).at)],
      moves: Object.fromEntries(Object.entries(moves).map(([k, m]) => [k, [r3(m.t0), r3(m.t0 + m.dur)]])),
      shots: Object.fromEntries(Object.entries(shots).map(([k, v]) => [k, [r3(v.x), r3(v.y), r3(v.s)]])),
    },
  };
}
