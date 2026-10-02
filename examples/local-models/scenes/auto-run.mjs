// "...able to work on very long-running tasks and costing you exactly zero AI
// credits to use. You can also go completely"
// The PR babysitter automation is running on MAI Code 1.1 Flash. On "very
// long-running tasks" its work races by and the working clock runs up to
// 7h 48m. On "costing" the hand clicks the session's name, the session info
// pops up, and the camera pushes in so "Session spend: 0 AI credits" is
// readable by "zero". On "zero" the 0 pops and confetti bursts out of it and
// flutters down, and the shot holds there through "You can also go
// completely" to the cut. The popover is measured from
// assets/session-info.png.
import { bezier, clamp, inOut, lerp, random, span } from '../motion.mjs';
import { clock } from '../timeline.mjs';
import { AION, DH, DW, FG, MUTED, WIN, h, icon, imagesDecoded, inside, label, loadAssets, place, px, r3, rect } from '../kit.mjs';
import { PROJECTS, buildCursor, buildStage, buildWindow, film, pointAt, popIn } from '../app.mjs';
import { makePath } from '../input.mjs';
import { fit, glide, inWin, look, makeCamera, onDesk } from '../camera.mjs';
import { SESSION_ICONS, buildSession, spinner } from '../session.mjs';

const T = clock('auto-run');
const DURATION = T.duration;
// Onsets measured from the waveform. "long" and "tasks" run on from the
// words before them, so those keep Whisper's times.
const WORDS = T.words({
  able: 107.76, very: 108.66, long: 108.82, tasks: 109.30, and: 109.855, costing: 110.06,
  exactly: 110.925, zero: 111.69, ai: 112.91, credits: 113.605, use: 114.805,
});

const PROJECT = 'storefront-api';
const NAME = 'PR babysitter';
const PROMPT = 'Check my issues and PRs.';
// Where the run is when the cut lands: a few minutes in.
const BEFORE = [
  { icon: 'circle-check', text: 'Copilot session started' },
  { bubble: PROMPT },
  { model: true },
  { icon: 'list-todo', text: 'Listed 14 open issues and 6 open pull requests' },
  { md: 'Three issues are new since yesterday. Starting with those:' },
  { icon: 'chevron-right', text: 'Read issue #482 and 3 other tool calls' },
];
const NOW = [
  [.3, { md: '#482 duplicates #455. Labeled it and linked the two.' }],
  [.72, { icon: 'chevron-right', text: 'Review PR #311 and 5 other tool calls' }],
];
// The hours of work, as the app shows a long session (screenshot 04).
const LATER = [
  { md: 'PR #311 breaks the total on an empty cart. Left a comment with a failing test.' },
  { icon: 'chevron-right', text: 'Run npm test and 2 other tool calls' },
  { md: 'Waiting for CI on #318.' },
  { icon: 'chevron-right', text: 'Read issue #491 and 3 other tool calls' },
  { md: '#491 needs steps to reproduce. Asked the author for them.' },
  { icon: 'chevron-right', text: 'Review PR #322 and 7 other tool calls' },
  { md: 'CI is green on #318 and every comment is resolved. Approved it.' },
  { icon: 'chevron-right', text: 'Read issue #497 and 2 other tool calls' },
  { md: 'Labeled #497 `good first issue`. Checking again in 10 minutes.' },
];
const AFTER = [[.5, { icon: 'chevron-right', text: 'Review PR #325 and 2 other tool calls' }]];
// How long it has run when the cut lands, and when the time-lapse is over.
const START = 2 * 60 + 41;
const LONG = 7 * 3600 + 48 * 60 + 12;

const CUE = {
  // The time-lapse runs from "very" until just after "tasks".
  lapse: [WORDS.very - .08, WORDS.tasks + .42],
  // The hand goes to the session's name and clicks it on "costing".
  toTitle: [WORDS.costing - .78, .74],
  click: WORDS.costing + .08,
  // Then it drifts down over the spend while the camera pushes in.
  toSpend: [WORDS.costing + .5, .62],
  // The confetti goes off as "zero" is said.
  burst: WORDS.zero + .02,
};
const POP = { dx: -4.5, top: 59.5, w: 448, h: 295 };

// Paper confetti out of a point: each piece is thrown up and out, the air
// stops it within a few tenths of a second, and then it flutters down,
// swaying and turning over, until it fades. Lengths are window px.
const PAPER = ['#1f883d', '#0969da', '#8250df', '#bf3989', '#d4a72c', '#cf222e', '#fb8f44'];
const AIR = 3.4;
const FALL = 430;
function buildConfetti(layer, [x0, y0], count, seed) {
  const rnd = random(seed);
  const pieces = Array.from({ length: count }, (_, i) => {
    const node = h('i', 'confetti', layer);
    const round = rnd() < .18;
    const w = round ? 4.2 : 3.2 + 2.6 * rnd();
    Object.assign(node.style, {
      position: 'absolute', left: px(-w / 2), top: px(round ? -w / 2 : -w * .8), width: px(w), height: px(round ? w : w * 1.6),
      borderRadius: round ? '50%' : '.6px', background: PAPER[i % PAPER.length], visibility: 'hidden', willChange: 'transform, opacity',
    });
    // A fan that opens upward, a little wider than a half circle.
    const angle = -Math.PI / 2 + (rnd() * 2 - 1) * 1.75;
    const speed = 260 + 620 * rnd() ** 1.4;
    return {
      node,
      start: .1 * rnd() ** 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 120,
      life: 2.3 + 1.3 * rnd(),
      sway: [3 + 7 * rnd(), 2.2 + 2.6 * rnd(), rnd() * 6.283],
      spin: [(rnd() * 2 - 1) * 7, rnd() * 6.283],
      flip: [4 + 7 * rnd(), rnd() * 6.283],
      fall: .75 + .5 * rnd(),
    };
  });
  return (t, burst) => {
    for (const piece of pieces) {
      const age = t - burst - piece.start;
      if (age < 0 || age >= piece.life) { piece.node.style.visibility = 'hidden'; continue; }
      // Thrown with drag: the throw dies away as 1 - e^(-kt), and the fall
      // settles at a steady flutter.
      const k = AIR;
      const coast = (1 - Math.exp(-k * age)) / k;
      const [amp, rate, phase] = piece.sway;
      const x = x0 + piece.vx * coast + amp * Math.min(1, age / .6) * Math.sin(rate * age + phase);
      const y = y0 + piece.vy * coast + FALL * piece.fall * (age - coast) / k;
      const turn = piece.spin[0] * age + piece.spin[1];
      const face = Math.cos(piece.flip[0] * age + piece.flip[1]);
      const grow = Math.min(1, age / .05);
      piece.node.style.visibility = 'visible';
      piece.node.style.opacity = r3(1 - span(age, piece.life - .55, piece.life));
      piece.node.style.transform = `translate(${px(x)}, ${px(y)}) rotate(${r3(turn)}rad) scale(${r3(grow)}, ${r3(grow * (.25 + .75 * Math.abs(face)))})`;
    }
  };
}

// A shot pushed in by k about the point f (desktop px), which stays put.
const about = (shot, [fx, fy], k) => inWin({ x: fx + (shot.x - fx) / k, y: fy + (shot.y - fy) / k, s: shot.s * k });
const frame = (left, top, s) => look(WIN.x + left + DW / 2 / s, WIN.y + top + DH / 2 / s, s);
const push = bezier(.5, .05, .25, 1);

// The night's items arrive densest where the clock runs fastest, so the
// view scrolls evenly up to speed and back down (as in plan-handoff).
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

// The session info popover: three rows of facts, a divider, what the session
// has used, a divider, and two actions. Positions in popover px, measured
// from the screenshot at 2.25x. `y` values are the middles of text lines.
function buildInfo(pops, x, y) {
  const pop = place(h('div', 'pop sinfo', pops), x, y, POP.w, POP.h);
  pop.style.transformOrigin = '24px 0';
  const line = (text, lx, cy, opts = {}) => label(pop, text, lx, cy - 10, { size: 13.5, ...opts });
  const mono = (text, lx, cy) => {
    const node = line(text, lx, cy);
    node.classList.add('mono');
    return node;
  };
  const rule = top => place(h('div', 'srule', pop), 12.4, top, 423.6, 1);
  line('Session name', 12.4, 21.8, { color: MUTED });
  line(NAME, 128.4, 21.8);
  line('Session ID', 12.4, 53.8, { color: MUTED });
  mono('3f9a1c72-5d0e-4b8a-9e61-27c4d8b0f513', 128.4, 53.8);
  line('Path', 12.4, 85.8, { color: MUTED });
  mono('…\\worktrees\\storefront-api-3f9a1c72', 128.4, 85.8);
  rule(104.5);
  line('Tokens', 16, 120, { color: MUTED });
  const amount = (cy, arrow, main, aside) => {
    icon(pop, arrow, 130.6, cy - 7.65, 15.3, MUTED);
    const node = line(main, 148.4, cy);
    h('span', 'aside', node, ` (${aside})`);
  };
  amount(120, 'arrow-up', '18.4M', '17.9M cached');
  amount(141.8, 'arrow-down', '212.6K', '148.3K reasoning');
  line('Context', 16, 170.3, { color: MUTED });
  line('42%', 132, 170.3);
  const size = line('128K', 0, 170.3, { color: MUTED });
  size.style.left = px(432 - size.offsetWidth);
  // The context bar: used (by kind), free, then reserved.
  const bar = place(h('div', 'sbar', pop), 132, 182.7, 300, 6);
  const parts = [['#0969da', 7.4], ['#8250df', 14.1], ['#bf3989', .8], ['#1a7f37', 19.7], ['#eaeef2', 16.2], ['#59636e', 41.8]];
  let at = 0;
  for (const [color, pct] of parts) {
    const w = 300 * pct / 100;
    const seg = place(h('i', null, bar), at, 0, Math.max(1, w - 2), 6);
    seg.style.background = color;
    at += w;
  }
  line('Session spend', 16, 211.6, { color: MUTED });
  // The zero is its own box, so it can pop when the confetti goes off.
  const spend = line('', 132, 211.6);
  const zero = h('span', null, spend, '0');
  zero.style.display = 'inline-block';
  spend.append(' AI credits');
  rule(230.5);
  icon(pop, 'pencil', 11.1, 250.7 - 7.75, 15.5, FG);
  line('Rename session', 34.2, 250.7);
  icon(pop, 'trash-2', 11.4, 278.7 - 7.5, 15, '#d1242f');
  line('Delete session', 34.2, 278.7, { color: '#d1242f' });
  return { pop, spend, zero };
}

export default async function autoRun() {
  await loadAssets([...SESSION_ICONS, 'pencil', 'trash-2', 'arrow-down', 'arrow-up']);
  const stage = buildStage();
  const projects = [...PROJECTS, ['folder', PROJECT, -1.92]];
  const { win, ui, pops, showSession, session: side } = buildWindow(stage, { session: { project: PROJECT, name: NAME }, projects });
  const S = buildSession(ui, { title: NAME, chip: `${AION.name} · Medium`, branch: `${PROJECT}/main`, mode: 'Autopilot' });
  const cursor = buildCursor(stage);
  side.dot.style.visibility = 'hidden';
  const sideSpin = spinner(side.spin, 0, 0);
  // A hover behind the session's name, which is a button.
  const nameBox = rect(S.header.name, WIN);
  const hover = place(h('div', 'hl', S.page), nameBox.x - 6, nameBox.y - 3, nameBox.w + 12, nameBox.h + 6);
  hover.style.borderRadius = '6px';
  S.page.insertBefore(hover, S.header.head);
  const info = buildInfo(pops, nameBox.x + POP.dx, POP.top);
  // The confetti flies over everything in the window, from the middle of
  // the zero.
  const zeroBox = rect(info.zero, WIN);
  const confetti = buildConfetti(h('div', 'layer', win), [zeroBox.x + zeroBox.w / 2, zeroBox.y + zeroBox.h / 2], 110, 41);
  await imagesDecoded();

  const tl = S.tl;
  const at = (item, t) => { item.at = t; return item; };
  const pop = (item, t) => tl.stream(item, t, t + .05);
  const make = spec => spec.bubble ? tl.bubble(spec.bubble) : spec.model ? tl.model(AION, 'Local') : spec.md ? tl.md(spec.md) : tl.row(spec);
  const show = (item, t) => (item.kind === 'md' ? pop(item, t) : at(item, t));
  const first = BEFORE.map(spec => show(make(spec), -1));
  NOW.forEach(([t, spec]) => show(make(spec), t));
  const later = LATER.map(make);
  const after = AFTER.map(([dt, spec]) => [dt, make(spec)]);

  // Each of the later items comes in when the content's end, moving at the
  // pace `share` sets, gets to its middle; the last lands as the lapse ends.
  const [n0, n1] = CUE.lapse;
  const last = later.at(-1);
  const y0 = later[0].y, y1 = last.y + last.h;
  const part = item => (item.y + item.h / 2 - y0) / (y1 - y0);
  const nEnd = n0 + (n1 - n0) / when(part(last));
  for (const item of later) show(item, lerp(n0, nEnd, when(part(item))));
  for (const [dt, item] of after) show(item, n1 + dt);

  tl.work.from = -START;
  const e0 = START + n0;
  tl.work.elapsed = t => {
    if (t < n0) return START + t;
    if (t >= n1) return LONG + t - n1;
    return Math.exp(lerp(Math.log(e0), Math.log(LONG), inOut(span(t, n0, n1))));
  };
  const off0 = tl.end(n0 - .001) - y0, off1 = tl.end(nEnd) - y1;
  const flow = t => {
    if (t < n0 || t >= nEnd) return tl.end(t);
    const p = share(span(t, n0, nEnd));
    return lerp(y0, y1, p) + lerp(off0, off1, p);
  };
  tl.finish(DURATION, { tau: .12, endAt: flow });

  // The hand rests over the empty right of the conversation, goes to the
  // session's name, and then drifts down to just past "0 AI credits".
  const P = {
    rest: [WIN.x + 1236, WIN.y + 452],
    title: [WIN.x + nameBox.x + nameBox.w * .55, WIN.y + nameBox.y + nameBox.h * .6],
    spend: [WIN.x + nameBox.x + POP.dx + 228, WIN.y + POP.top + 219],
  };
  const path = makePath(P.rest);
  const moves = {
    title: path.reach(P.title, CUE.toTitle[0], CUE.toTitle[1], -24),
    spend: path.move(P.spend, CUE.toSpend[0], CUE.toSpend[1], 10),
  };
  path.click(CUE.click);
  path.check();
  const opens = CUE.click + .06;

  const popBox = { x: nameBox.x + POP.dx, y: POP.top, w: POP.w, h: POP.h };
  const shots = {
    // The main area edge to edge, from just under the title bar.
    main: frame(279, 14, DW / (WIN.w - 279)),
    drift: null,
    // The popover, with the session's name above it.
    info: fit(onDesk({ x: popBox.x, y: nameBox.y - 4, w: popBox.w, h: popBox.y + popBox.h - nameBox.y + 4 }), 220, 66),
    read: null,
  };
  // A drift too slow to notice as a move, about a point that keeps the
  // session's name (and its hover) and the panel button on the right whole.
  shots.drift = about(shots.main, [WIN.x + 490, WIN.y + 37], 1.012);
  // Then a creep toward the spend while it's said.
  shots.read = about(shots.info, [WIN.x + popBox.x + 170, WIN.y + POP.top + 212], 1.07);
  const camera = makeCamera([
    [0, shots.main],
    [CUE.click, shots.drift, glide],
    [WORDS.zero - .22, shots.info, push],
    [DURATION, shots.read, glide],
  ]);

  const pose = t => {
    t = clamp(t, 0, DURATION);
    film(stage, camera(t));
    showSession(true);
    S.composer.running(true);
    tl.pose(t);
    sideSpin(t);
    const p = path.pointer(t);
    const q = [p[0] - WIN.x, p[1] - WIN.y];
    const over = inside(q, { x: nameBox.x - 6, y: nameBox.y - 3, w: nameBox.w + 12, h: nameBox.h + 6 });
    hover.style.visibility = over || (t >= CUE.click && t < CUE.click + .25) ? 'inherit' : 'hidden';
    hover.style.background = t >= CUE.click && t < CUE.click + .12 ? '#e8ebee' : '#f2f3f4';
    popIn(info.pop, t, opens, .18, .96);
    // The zero swells and settles as the confetti leaves it.
    const swell = Math.sin(Math.PI * span(t, CUE.burst - .04, CUE.burst + .34)) * (1 - .35 * span(t, CUE.burst, CUE.burst + .34));
    info.zero.style.transform = swell > 0 ? `scale(${r3(1 + .45 * swell)})` : 'none';
    confetti(t, CUE.burst);
    pointAt(cursor, p);
  };

  const clockAt = t => {
    const s = Math.floor(tl.work.elapsed(t));
    return s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${Math.floor(s / 3600)}h ${Math.floor(s / 60) % 60}m`;
  };
  let peak = [0, 0];
  for (let f = 1; f <= Math.round(DURATION * 60); f++) {
    const t = f / 60;
    const d = Math.abs(tl.where(first[0], t).y - tl.where(first[0], t - 1 / 60).y) * camera(t).s * 1.25;
    if (d > peak[0]) peak = [d, t];
  }
  return {
    pose,
    duration: DURATION,
    // The throw is fast enough to need the finer motion blur.
    fast: [[CUE.burst, CUE.burst + .5]],
    info: {
      zero: [zeroBox.x, zeroBox.y, zeroBox.w, zeroBox.h].map(r3),
      words: Object.fromEntries(Object.entries(WORDS).map(([k, v]) => [k, r3(v)])),
      cue: Object.fromEntries(Object.entries(CUE).map(([k, v]) => [k, Array.isArray(v) ? v.map(r3) : r3(v)])),
      name: [nameBox.x, nameBox.y, nameBox.w, nameBox.h].map(r3),
      later: later.map(item => r3(item.at)),
      peak: peak.map(r3),
      clock: [0, n0, (n0 + n1) / 2, n1, DURATION].map(t => `${r3(t)} ${clockAt(t)}`),
      moves: Object.fromEntries(Object.entries(moves).map(([k, m]) => [k, [r3(m.t0), r3(m.t0 + m.dur)]])),
      shots: Object.fromEntries(Object.entries(shots).map(([k, v]) => [k, [r3(v.x), r3(v.y), r3(v.s)]])),
    },
  };
}
