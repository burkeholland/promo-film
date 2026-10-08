// The one story the allow, fill and submit films tell between them: Copilot
// reads the receipts, gets the go-ahead to use Edge, fills in the expense
// report, asks before it submits, and submits. Times here are story time:
// seconds from the start of `allow`. Each film builds the same thread and
// the same Edge, shifted by where it starts in the story, so what is on
// screen carries across the cuts.
//
// DRAWN: the whole task. The trip, the report's title and number, the dates,
// the three receipts and their amounts ($612.40, $48.20, $86.75 = $747.35),
// Copilot's replies, its question before submitting and the approval card's
// words are all made up.
import { span } from './motion.mjs';
import { clock } from './timeline.mjs';
import { WIN, h } from './kit.mjs';
import { HOST, buildEdge, drawReceipt } from './browser.mjs';
import { PROMPT } from './scenes/ask.mjs';

export const FILMS = ['allow', 'fill', 'submit'];
// Where each film starts in the story.
export const START = {};
{
  let t = 0;
  for (const name of FILMS) { START[name] = t; t += clock(name).duration; }
}
export const TITLE = 'Seattle expense report';
export const REPORT = 'EXP-2041';
export const TRIP = 'Seattle trip';
export const DATES = ['09/22/2026', '09/25/2026'];
export const LINES = [
  { cat: 'Hotel', amt: '612.40', file: 'hotel-receipt.jpg' },
  { cat: 'Taxi', amt: '48.20', file: 'taxi-receipt.jpg' },
  { cat: 'Meals', amt: '86.75', file: 'dinner-receipt.jpg' },
];
export const URL = `${HOST}/reports`;
const PLAN = 'I’ll read the three receipts first, then fill in a new report in Contoso Expenses.';
const READY = 'The report is filled in: 3 expenses, $747.35, each with its receipt attached. Want me to submit it?';
export const QUESTION = 'Submit the Seattle trip report for approval?';
export const CHOICES = ['Submit it', 'Not yet'];
const DONE = `Done. **${TRIP}** is submitted for approval as **${REPORT}**: 3 expenses, $747.35.`;
export const APPROVAL = {
  title: 'Allow Copilot to control Microsoft Edge?',
  body: 'Copilot will be able to see the Edge window, and click and type in it.',
  choices: ['Allow for this session', 'Always allow Microsoft Edge', 'Don’t allow'],
};

// ---------------------------------------------------------------- beats
const A = START.allow;
const F = START.fill;
const S = START.submit;
export const BEAT = {
  rename: A + .3,
  plan: [A + .35, A + 1.2],
  folder: A + 1.4,
  images: A + 1.9,
  apps: A + 2.6,
  // The approval card: up, the pointer's click, closed.
  approve: [A + 3.0, A + 4.75],
  start: A + 5.3,
  // Edge opens.
  edge: F + .45,
  address: F + 1.25,
  url: [F + 1.75, F + 2.7],
  enter: F + 3.0,
  reports: [F + 3.1, F + 3.6],
  look: F + 4.1,
  newReport: F + 5.0,
  form: [F + 5.15, F + 5.5],
  title: F + 5.9,
  titled: [F + 6.25, F + 6.9],
  start1: F + 7.4,
  end1: F + 7.95,
  // Each expense line: when it starts and how long each of its 4 steps takes.
  lines: [[F + 8.6, .85], [F + 12.1, .7], [F + 15.0, .6]],
  check: F + 17.6,
  ready: [F + 18.4, S + .7],
  // The question card: up, then the click that answers it.
  ask: S + 1.0,
  answer: S + 2.9,
  submit: S + 3.6,
  sent: [S + 3.8, S + 4.2],
  checked: S + 4.6,
  done: [S + 5.0, S + 6.0],
  idle: S + 6.1,
};
// A computer use row's steps on one expense line: add a line, pick the
// category, type the amount, attach the receipt.
const lineSteps = ([from, step]) => [0, 1, 2, 3].map(k => from + k * step);

// The machine types evenly and fast: no rhythm of a hand.
const typed = (text, t, [t0, t1]) => text.slice(0, Math.round(text.length * span(t, t0, t1)));

// ---------------------------------------------------------------- thread
// Builds the thread into a session's timeline (`tl`), in the film's time.
// `thumb(tile)` draws the screenshot Copilot took of Edge.
export function buildThread(tl, film, { thumb, thumbSize }) {
  const o = START[film];
  const at = (item, t) => { item.at = t - o; return item; };
  const cu = (tool, took, t, arg = 'app: MSEdge') => at(tl.row({ icon: 'mouse-pointer-click', text: `Computer Use · ${tool}`, arg, took }), t);

  at(tl.row({ icon: 'circle-check', text: 'Copilot session started' }), -10);
  at(tl.bubble(PROMPT), -10);
  tl.stream(tl.md(PLAN), BEAT.plan[0] - o, BEAT.plan[1] - o, 5);
  at(tl.row({ icon: 'folder-open', text: 'View Downloads\\seattle-receipts' }), BEAT.folder);
  at(tl.row({ icon: 'images', text: 'View 3 images' }), BEAT.images);
  at(tl.media([[96, 96], [96, 96], [96, 96]], drawReceipt), BEAT.images + .1);
  cu('List Apps', '7 lines', BEAT.apps, null);
  cu('Start App', '3 lines', BEAT.start);
  cu('Click', '41 lines', BEAT.address);
  cu('Type Text', '41 lines', BEAT.url[0]);
  cu('Press Key', '188 lines', BEAT.enter);
  cu('Get Window State', '1 image', BEAT.look);
  at(tl.media([thumbSize], thumb), BEAT.look + .1);
  cu('Click', '214 lines', BEAT.newReport);
  cu('Click', '226 lines', BEAT.title);
  cu('Type Text', '226 lines', BEAT.titled[0]);
  cu('Set Value', '229 lines', BEAT.start1);
  cu('Set Value', '232 lines', BEAT.end1);
  BEAT.lines.forEach((line, i) => {
    const [add, cat, amt, rcpt] = lineSteps(line);
    cu('Click', `${248 + 18 * i} lines`, add);
    cu('Set Value', `${251 + 18 * i} lines`, cat);
    cu('Type Text', `${252 + 18 * i} lines`, amt);
    cu('Click', `${256 + 18 * i} lines`, rcpt);
  });
  cu('Get Window State', '306 lines', BEAT.check);
  tl.stream(tl.md(READY), BEAT.ready[0] - o, BEAT.ready[1] - o, 7);
  const asked = at(tl.ask(QUESTION), BEAT.ask);
  at(tl.answer(CHOICES[0]), BEAT.answer + .15);
  cu('Click', '74 lines', BEAT.submit);
  cu('Get Window State', '68 lines', BEAT.checked);
  tl.stream(tl.md(DONE), BEAT.done[0] - o, BEAT.done[1] - o, 9);

  // Copilot's clock runs from the send, and the working row hides while a
  // card waits on the person.
  tl.work.from = -10;
  tl.work.elapsed = t => t + o + 1.2;
  tl.work.on = t => {
    const u = t + o;
    if (u >= BEAT.approve[0] && u < BEAT.approve[1] + .2) return false;
    if (u >= BEAT.ask && u < BEAT.answer + .15) return false;
    return u < BEAT.idle;
  };
  return { asked: t => asked.answered(t + o >= BEAT.answer) };
}

// ---------------------------------------------------------------- edge
// What Edge shows at story time u.
export function edgeAt(u) {
  const state = { page: 'ntp', url: '', focus: null, down: null, caret: true, progress: null, lines: [] };
  if (u >= BEAT.address) state.focus = 'address';
  if (u >= BEAT.url[0]) state.url = typed(URL, u, BEAT.url);
  if (u >= BEAT.reports[0]) {
    state.progress = span(u, ...BEAT.reports);
    if (state.progress >= 1) state.progress = null;
  }
  if (u >= BEAT.reports[0] + .25) Object.assign(state, { page: 'reports', focus: null, url: URL });
  if (u >= BEAT.newReport && u < BEAT.newReport + .15) state.down = 'new';
  if (u >= BEAT.newReport) state.focus = 'new';
  if (u >= BEAT.form[0] && u < BEAT.form[1]) state.progress = span(u, ...BEAT.form);
  if (u >= BEAT.form[0] + .2) Object.assign(state, { page: 'form', focus: null, url: `${HOST}/reports/new` });
  if (state.page !== 'form') return state;

  if (u >= BEAT.title) state.focus = 'title';
  state.title = typed(TRIP, u, BEAT.titled);
  if (u >= BEAT.start1) Object.assign(state, { focus: 'start', start: DATES[0] });
  if (u >= BEAT.end1) Object.assign(state, { focus: 'end', end: DATES[1] });
  BEAT.lines.forEach((line, i) => {
    const [add, cat, amt, rcpt] = lineSteps(line);
    if (u < add) return;
    if (u < add + .15) state.down = 'add';
    if (u >= add + .2) {
      state.lines.push({ cat: '', amt: '', file: null });
      state.focus = `cat${i}`;
    }
    const l = state.lines[i];
    if (!l) { state.focus = 'add'; return; }
    if (u >= cat) l.cat = LINES[i].cat;
    if (u >= amt) {
      state.focus = `amt${i}`;
      l.amt = typed(LINES[i].amt, u, [amt + .05, amt + .35]);
    }
    if (u >= rcpt) {
      state.focus = `rcpt${i}`;
      if (u < rcpt + .15) state.down = `rcpt${i}`;
    }
    if (u >= rcpt + .35) l.file = LINES[i].file;
  });
  if (u >= BEAT.check) state.focus = null;
  if (u >= BEAT.submit) state.focus = 'submit';
  if (u >= BEAT.submit && u < BEAT.submit + .15) state.down = 'submit';
  if (u >= BEAT.sent[0] && u < BEAT.sent[1]) state.progress = span(u, ...BEAT.sent);
  if (u >= BEAT.sent[1] - .1) Object.assign(state, { submitted: REPORT, focus: null });
  return state;
}

// ---------------------------------------------------------------- layout
// Icons the thread rows use beyond the session's own.
export const EXTRA_ICONS = ['mouse-pointer-click', 'images', 'folder-open', 'circle-check', 'shield-check'];
// While Copilot works in Edge, its window slides left and Edge takes the right.
// DRAWN: the side-by-side layout. Where the app really puts the window it
// controls was not in any screenshot.
export const WIN_X_FILL = -262;
// Where the pointer rests after it allows Edge (allow's info.target). It stays
// there, on the same spot of Copilot's window, while Copilot works.
export const PARK = [678.7, 597.8];
export const EDGE = { x: 940, y: WIN.y, w: 550, h: WIN.h };
// The screenshot Get Window State returns, drawn as a small Edge. DRAWN: how
// the thread shows a tool's picture is a guess from the app's source.
export const THUMB = [Math.round(EDGE.w * 230 / EDGE.h), 230];
export function drawThumb(tile) {
  const k = THUMB[1] / EDGE.h;
  const inner = h('div', 'inner', tile);
  inner.style.transform = `scale(${k})`;
  const small = buildEdge(inner, { x: 0, y: 0, w: EDGE.w, h: EDGE.h });
  Object.assign(small.node.style, { boxShadow: 'none', borderRadius: '0' });
  small.pose(edgeAt(BEAT.look));
}