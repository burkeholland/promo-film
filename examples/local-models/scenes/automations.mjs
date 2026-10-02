// "...automations in GitHub Copilot. These are tasks that run on a schedule in
// the background. Local models work incredibly..."
// One take on from the session: its click on Automations lands at the cut, so
// the page is open on the first frame, with the migration still working in the
// sidebar. The pointer clicks Start automating on "GitHub Copilot" as the
// camera eases in to one framing that holds the dialog and the picker, and
// stays there. The New automation dialog gets a name, "PR babysitter", and a
// prompt pasted in whole on "run on a schedule", in the storefront-api
// project. Just before "background" the chip opens the picker with Auto on,
// and it holds so the levels can be seen. Auto goes off ahead of "Local", the
// list of models opens on "models", and on "incredibly" the pointer picks
// MAI-Code-1.1-Flash. The chip shows its name and the hand goes straight to
// Create and clicks it just before the cut.
import { clamp, lerp, out, span } from '../motion.mjs';
import { clock } from '../timeline.mjs';
import {
  AION, COPILOT, FG, H, HINT, HYDRA, ICON_INK, LOCAL, MODELS, MUTED, OPUS, OTHERS, W, WIN,
  h, icon, imagesDecoded, inside, label, loadAssets, mix, place, px, r3, rect,
} from '../kit.mjs';
import {
  MENU, MODEL_ROW, NAV, NAV_TOP, PROJECTS, autoRowAt, autoState, beamAt, buildCard, buildCursor, buildField, buildIBeam,
  buildList, buildMenu, buildStage, buildWindow, film, layoutPicker, listRowAt, menuRowAt, navRect, placeListHl,
  placeMenuHl, pointAt, popInOut, setAuto, showText,
} from '../app.mjs';
import { caretOn, makePath, typing } from '../input.mjs';
import { fit, inWin, keep, look, makeCamera, onDesk } from '../camera.mjs';
import { spinner } from '../session.mjs';

const T = clock('automations');
const DURATION = T.duration;
// The session's spinner runs on from the film before.
const BEFORE = clock('plan-handoff').duration;
// Onsets measured from the waveform.
const WORDS = T.words({
  github: 100.945, copilot: 101.37, these: 101.93, run: 102.905, schedule: 103.695, background: 104.465,
  local: 105.405, models: 105.81, incredibly: 106.59,
});

const PROJECT = 'storefront-api';
const TITLE = 'Express to Fastify migration';
const AUTOMATIONS = 3;
const NAME = 'PR babysitter';
const PROMPT = 'Check my issues and PRs.';
// Aion Flash runs on the machine, so its row says so.
const AION_LOCAL = { ...AION, suffix: '(Local)' };
const SECTIONS = [[COPILOT, [HYDRA, ...MODELS, AION_LOCAL]], [OTHERS, LOCAL]];
const AION_ROW = 1 + MODELS.length;

const CUE = {
  // The click on Automations came just before the cut; the hand eases off.
  drift: [.06, .34],
  // A long reach for Start automating, clicked between "GitHub" and
  // "Copilot".
  toStart: [WORDS.copilot - .95, .82],
  start: WORDS.copilot + .1,
  // The dialog opens 90 ms after the click, with the Name field focused.
  open: .09,
  name: [WORDS.these - .1, WORDS.run - .12],
  // Back to the mouse, into the prompt, and the prompt goes in whole, pasted.
  toPrompt: [WORDS.run - .02, .36],
  promptClick: WORDS.run + .4,
  paste: WORDS.run + .68,
  // Pasting leaves time to show the picker properly. The chip opens it just
  // before "background", with Auto on, and it holds like that while the hand
  // finds the switch. Auto goes off just ahead of "Local".
  toChip: [WORDS.background - .62, .42],
  chipClick: WORDS.background - .12,
  toToggle: [.3, .4],
  toggleClick: WORDS.local - .25,
  // A beat on the rows that take the levels' place, then down to the Model
  // row, so the list of models opens on "models". The hand waits there while
  // the list is read, and goes onto MAI-Code-1.1-Flash in time to pick it on
  // "incredibly".
  toModel: [.3, .34],
  toAion: .45,
  onAion: WORDS.incredibly + .05,
  dwell: .06,
  release: .08,
  // The chip shows the new name and the hand goes straight to Create, and
  // clicks it just before the cut.
  toCreate: [.1, .4],
  create: .52,
  // App behaviour: a sub menu opens 100 ms after its row is hovered; the
  // details card would appear 500 ms after the first model row is.
  subDelay: .1,
  cardDelay: .5,
};
// Auto is on when the picker opens, as the local film left it.
const auto = t => autoState(t, true, [[CUE.toggleClick, false]]);

// Primer's green button: rest, hover and pressed, and Create while disabled.
const GREEN = ['#1f883d', '#1c8139', '#197935'];
const DISABLED = ['#95d8a6', '#eef9f1'];

// ---------------------------------------------------------------- page
const CX = 823.5;
const IDEAS = [
  ['Issue triage', 'Daily', 'Review the latest GitHub issues and propose priorities and owners.'],
  ['Changelog draft', 'Weekly', 'Summarize key merged PRs this week into a release-note draft.'],
  ['Repo audit', 'Manual', 'Audit open PRs and identify blockers or risky changes.'],
  ['Telemetry review', 'Manual', 'Review a PR for user-facing changes and suggest required telemetry events and properties.'],
  ['Performance improvements', 'Weekly', 'Identify 10 performance improvements, then open a PR for the highest-impact, lowest-effort one.'],
  ['Accessibility audit', 'Daily', 'Review PRs merged yesterday and summarize any accessibility issues.'],
  ['Cost tips', 'Weekly', 'Get personalized tips to reduce token usage and cost.'],
];

const width = node => node.getBoundingClientRect().width;
// From window px to desktop px.
const d = (x, y) => [WIN.x + x, WIN.y + y];

// The Automations page with none set up yet (screenshot 05): the empty state,
// the idea cards under it and the top of the skills section, below the fold.
function buildPage(ui) {
  const page = h('div', 'layer', ui);
  label(page, 'Automations', 290.9, 25.4, { size: 14, weight: 600 });
  const add = place(h('div', 'btn primary', page, 'New automation'), 387.9, 21.8, 109.8, 28.1);
  Object.assign(add.style, { fontSize: px(12.25), lineHeight: px(28.1) });
  place(h('div', 'rule', page), 279, 57.15, W - 279, 1).style.background = '#e3e8ec';

  icon(page, 'calendar-check-2', CX - 12, 147.9, 24, MUTED);
  const center = (text, y, options) => {
    const node = label(page, text, 0, y, options);
    node.style.left = px(CX - width(node) / 2);
    return node;
  };
  center('Set up automations', 183.9, { size: 16, line: 24, weight: 600 });
  center('Use agents to handle recurring work on a cadence you choose or triggered by events. You can start from scratch or', 213.9, { color: MUTED });
  center('turn an existing agent skill into an automation.', 233.9, { color: MUTED });
  const start = h('div', 'btn primary', page, 'Start automating');
  Object.assign(start.style, { padding: '0 12px', height: px(32), fontSize: px(13), lineHeight: px(32) });
  place(start, CX - width(start) / 2, 269.9);

  const cols = [399.5, 686.17, 972.83], rows = [392.9, 489.9, 586.9];
  IDEAS.forEach(([title, badge, text], i) => {
    const card = place(h('div', 'idea', page), cols[i % 3], rows[Math.floor(i / 3)], 274.67, 85);
    label(card, title, 13, 13, { line: 19.5, weight: 600 });
    place(h('div', 'd', card, text), 13, 34.5);
    Object.assign(h('div', 'badge', card, badge).style, { top: px(13), right: px(12) });
  });

  label(page, 'Skills', 399.5, 719.9, { weight: 600 });
  const search = place(h('div', 'search', page), 1247.5 - 248, 725.7, 248, 28);
  icon(search, 'search', 8, 7, 14, MUTED);
  label(search, 'Search 6 skills…', 27, 4, { color: HINT });
  place(h('div', 'thumb', page), W - 7, 59, 5, 415);
  return { page, start };
}

// ---------------------------------------------------------------- dialog
// The New automation dialog over the dimmed window (screenshot 05). Its
// children are in dialog px.
function buildDialog(win) {
  const modal = h('div', 'layer', win);
  const backdrop = place(h('div', 'backdrop', modal), 0, 14, W, H - 14);
  const dialog = place(h('div', 'dialog', modal), 367.3, 105.45, 637.4, 542.1);
  const bold = { size: 13.75, weight: 600 };
  const small = { size: 12, line: 18, color: MUTED };
  label(dialog, 'New automation', 17.9, 12.5, bold);
  icon(dialog, 'x', 606.5, 15.4, 16, ICON_INK);
  place(h('div', 'rule', dialog), 0, 46.8, 637.4, 1);

  label(dialog, 'Name', 19.6, 67.8, bold);
  const input = place(h('div', 'input', dialog), 19, 93.75, 600, 34);
  const name = buildField(input, 'e.g., Daily code review', '', { x: 13.7, y: 7.05, size: 13.5, line: 20 });

  [['Trigger', 'Daily', 19.3, 19.5], ['Hours', '09:00', 222.6, 222.65], ['Minute', ':00', 426, 426.65]].forEach(([title, text, x, sx]) => {
    label(dialog, title, x, 142.2, bold);
    const select = place(h('div', 'select', dialog), sx, 170.3, 190.6, 32);
    label(select, text, 12.7, 4.6, { size: 14 });
    icon(select, 'oct-chevron-down', 164.5, 8, 16, MUTED);
  });

  label(dialog, 'Run in the cloud', 19.4, 220.7, bold);
  label(dialog, 'Run even when your computer is off, triggered by events or on a schedule.', 19.6, 243.1, small);
  const cloud = place(h('div', 'switch', dialog), 578.7, 229.8, 40, 19.6);
  place(h('i', null, cloud), 2, 2, 22.5, 15.6).style.borderRadius = px(7.8);

  label(dialog, 'Prompt', 19.4, 276.7, bold);
  // The project tray peeks out below the composer, so it goes first.
  const tray = place(h('div', 'tray', dialog), 19.5, 344.25, 599.5, 114.75);
  icon(tray, 'folder', 16, 88.75, 12, MUTED);
  const project = label(tray, 'storefront-api', 32, 85.75, small);
  icon(tray, 'oct-chevron-down', 32 + width(project) + 4, 88.75, 12, MUTED);

  const composer = place(h('div', 'composer idle', dialog), 19.5, 304.25, 599.5, 116.75);
  const prompt = buildField(composer, 'Describe what this automation should do. Type / for skills…', '', { x: 12.5, y: 8.5, size: 14, width: 570 });
  const bar = place(h('div', 'cbar', composer), 8, 78.75);
  icon(h('div', 'cbtn sq', bar), 'plus', 6.64, 6.64, 16, MUTED);
  h('div', 'cbtn', bar, 'Autopilot');
  const chip = h('div', 'cbtn', bar, 'Auto · Efficiency');
  const ring = place(h('div', 'ring', composer), 565.5 - 9, 92.95 - 9, 18, 18);
  icon(ring, 'eye-off', 3, 3, 12, '#828992');

  place(h('div', 'rule', dialog), 0, 477.4, 637.4, 1);
  label(dialog, 'Use Create and run from the menu to test your prompt right away.', 19.4, 501.4, small);
  // Primer medium buttons are 32 tall; the app's text sits 1.5 below centre.
  const cancel = place(h('div', 'btn secondary', dialog, 'Cancel'), 447, 494.6, 63.75, 32);
  Object.assign(cancel.style, { fontSize: px(12.5), lineHeight: px(35) });
  // Create is a split button: two buttons sharing a 1px border, the second a
  // 32px menu button. Disabled, the border is the fill colour, so no seam shows.
  const create = place(h('div', 'btn', dialog), 522.6, 494.6, 94.4, 32);
  label(create, 'Create', 13.1, 0, { size: 12.5, line: 35, color: 'inherit', weight: 600 });
  icon(create, 'oct-chevron-down', 70.2, 8, 16);
  const split = place(h('div', 'split', create), 62.4, 0);
  return { modal, backdrop, dialog, input, name, composer, prompt, chip, create, split };
}

// ---------------------------------------------------------------- pointer
// B holds the page's and the dialog's boxes in window px.
function makePointer(L, B) {
  const mid = b => b.y + b.h / 2;
  const P = {
    // Where the click on Automations left it.
    rest: d(100, 181),
    // On the left of Start automating, over what will be the gap between
    // the Hours and Minute selects, so the open dialog leaves it on nothing.
    start: d(B.dialog.x + 421.5, mid(B.start)),
    prompt: d(B.composer.x + 470, B.composer.y + 30),
    chip: d(L.chip.x + .44 * L.chip.w, L.chip.y + .54 * L.chip.h),
    toggle: d(L.menu.x + 243, L.menu.y + 19),
    model: d(L.menu.x + 150, L.modelTop + 14),
    aion: d(L.fly.x + 118, L.rowMid(AION_ROW) + 1),
    create: d(B.create.x + .42 * B.create.w, B.create.y + .55 * B.create.h),
  };
  if (!inside([P.start[0] - WIN.x, P.start[1] - WIN.y], B.start)) throw new Error('The pointer misses Start automating');
  const path = makePath(P.rest);
  const moves = {};
  moves.drift = path.move([P.rest[0] + 6, P.rest[1] + 4.5], CUE.drift[0], CUE.drift[1], 3);
  moves.start = path.reach(P.start, CUE.toStart[0], CUE.toStart[1], -40);
  path.click(CUE.start);
  // The hand relaxes a little after a click.
  moves.relax = path.move([P.start[0] + 2, P.start[1] + 3], CUE.start + .12, .35, 1);
  moves.prompt = path.move(P.prompt, CUE.toPrompt[0], CUE.toPrompt[1], 12);
  path.click(CUE.promptClick);
  moves.chip = path.reach(P.chip, CUE.toChip[0], CUE.toChip[1], -20);
  path.click(CUE.chipClick);
  moves.toggle = path.move(P.toggle, CUE.chipClick + CUE.toToggle[0], CUE.toToggle[1], -8);
  path.click(CUE.toggleClick);
  moves.model = path.move(P.model, CUE.toggleClick + CUE.toModel[0], CUE.toModel[1], 6);
  moves.aion = path.enter(P.aion, CUE.toAion, 20, CUE.onAion, p => listRowAt(L, p) === AION_ROW);
  const pick = path.click(moves.aion.t0 + moves.aion.dur + CUE.dwell);
  const close = pick + CUE.release;
  moves.create = path.move(P.create, close + CUE.toCreate[0], CUE.toCreate[1], -14);
  const create = path.click(close + CUE.create);
  return { path: path.check(), moves, pick, create };
}

// Plays the app's hover rules forward in 1 ms steps. The menu opens with Auto
// on, so its rows are Auto and the levels until the switch goes off; then the
// Model row opens the list after 100 ms and stays lit while the pointer heads
// into it (the safe triangle). Picking a model closes both popups; their
// highlights hold while they fade. Buttons ease in and out of their hover
// colour in 150 ms.
function simulate(L, B, path, pick, rows) {
  const n = Math.round(DURATION * 1000) + 1;
  const at = i => path.pointer(i / 1000);
  const first = (from, test) => {
    for (let i = Math.ceil(from * 1000); i < n; i++) if (test(at(i))) return i / 1000;
    return null;
  };
  const c = CUE.toggleClick;
  const openAt = CUE.start + CUE.open;
  const modelAt = first(c + .22, p => menuRowAt(L, p) === MODEL_ROW);
  if (modelAt === null) throw new Error('The pointer never reaches the Model row');
  const listAt = modelAt + CUE.subDelay;
  const inList = first(listAt, p => listRowAt(L, p) >= 0);
  if (inList === null) throw new Error('The pointer never reaches the model list');
  const cardAt = inList + CUE.cardDelay;
  const close = pick + CUE.release;
  if (close > cardAt - .03) throw new Error(`Aion is picked at ${close.toFixed(3)} s, after its card would show at ${cardAt.toFixed(3)} s (list opens ${listAt.toFixed(3)}, entered ${inList.toFixed(3)})`);

  const menuRow = new Int8Array(n).fill(-1);
  const listRow = new Int8Array(n).fill(-1);
  const chipHot = new Float32Array(n);
  const startHot = new Float32Array(n);
  const createHot = new Float32Array(n);
  const ease = (list, i, target, step) => {
    const was = i ? list[i - 1] : 0;
    list[i] = target > was ? Math.min(target, was + step) : Math.max(target, was - step);
  };
  const entries = [], menuEntries = [];
  for (let i = 0; i < n; i++) {
    const t = i / 1000;
    const p = at(i);
    const q = [p[0] - WIN.x, p[1] - WIN.y];
    const open = t >= CUE.chipClick && t < close;
    if (t >= close) {
      menuRow[i] = menuRow[i - 1];
      listRow[i] = listRow[i - 1];
    } else if (open) {
      menuRow[i] = auto(t).on ? autoRowAt(L, p) : t >= listAt ? MODEL_ROW : menuRowAt(L, p);
      if (menuRow[i] >= 0 && menuRow[i] !== menuRow[i - 1]) menuEntries.push([r3(t), menuRow[i]]);
      if (t >= listAt) {
        const row = listRowAt(L, p);
        listRow[i] = row;
        if (row >= 0 && row !== listRow[i - 1]) entries.push([r3(t), rows[row].model.name]);
      }
    }
    ease(chipHot, i, open || (t >= openAt && inside(q, L.chip)) ? 1 : 0, .01);
    ease(startHot, i, t < openAt && inside(q, B.start) ? 1 : 0, 1 / 150);
    ease(createHot, i, t >= openAt && !open && inside(q, B.create) ? 1 : 0, 1 / 150);
  }
  return { menuRow, listRow, chipHot, startHot, createHot, modelAt, listAt, inList, cardAt, close, entries, menuEntries };
}

// ---------------------------------------------------------------- camera
// A shot pushed in by k about the point f (desktop px), which stays put on
// screen.
const about = (shot, [fx, fy], k) => inWin({ x: fx + (shot.x - fx) / k, y: fy + (shot.y - fy) / k, s: shot.s * k });

function makeShots(L, B) {
  // Everything the scene uses once the dialog is up: the dialog, the menu at
  // its tallest (Auto on) and the model list, which flips up over the dialog.
  const x0 = Math.min(B.dialog.x, L.menu.x), x1 = Math.max(B.dialog.x + B.dialog.w, L.fly.x + L.fly.w);
  const y0 = Math.min(B.dialog.y, L.fly.y), y1 = Math.max(B.dialog.y + B.dialog.h, L.menu.y + MENU.auto);
  const frame = fit(onDesk({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 }), 60, 40);
  return {
    // The whole window, as the film before ends on it.
    wide: look(WIN.x + WIN.w / 2, WIN.y + WIN.h / 2, 1.05, keep),
    frame,
    // A 2% creep for the rest of the take, about the middle of the frame.
    frameIn: about(frame, [frame.x, frame.y], 1.02),
  };
}

// Colours mixed in hex, so a mix can be mixed again.
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
function blend(a, b, u) {
  const x = rgb(a), y = rgb(b);
  return `#${x.map((v, i) => Math.round(lerp(v, y[i], u)).toString(16).padStart(2, '0')).join('')}`;
}

export default async function automations() {
  await loadAssets(['x', 'eye-off', 'oct-chevron-down', 'folder']);
  const stage = buildStage();
  const projects = [...PROJECTS, ['folder', PROJECT, -1.92]];
  const { win, ui, navHover, navActive, session: side, showSession } = buildWindow(stage, {
    active: AUTOMATIONS, session: { project: PROJECT, name: TITLE }, projects,
  });
  // The migration is still listed, and working, but the page is Automations.
  showSession(true);
  navActive.style.top = px(NAV_TOP + 32 * AUTOMATIONS);
  side.dot.style.visibility = 'hidden';
  const sideSpin = spinner(side.spin, 0, 0);
  const { start } = buildPage(ui);
  const D = buildDialog(win);
  // The picker opens over the dialog.
  const menus = h('div', 'layer', win);
  const picker = buildMenu(menus, OPUS.name);
  const { menu, menuHl } = picker;
  const { fly, flyHl, rows } = buildList(menus, SECTIONS, OPUS);
  const { card } = buildCard(menus);
  const cursor = buildCursor(stage);
  const beam = buildIBeam(stage);
  await imagesDecoded();

  const B = {
    start: rect(start, WIN),
    dialog: rect(D.dialog, WIN),
    input: rect(D.input, WIN),
    composer: rect(D.composer, WIN),
    create: rect(D.create, WIN),
  };
  // The prompt's text area: the composer above its buttons.
  B.text = { x: B.composer.x + 5, y: B.composer.y + 5, w: B.composer.w - 10, h: 68 };
  const L = layoutPicker({ chip: D.chip, menu, fly, card, rows });
  const { path, moves, pick, create } = makePointer(L, B);
  const sim = simulate(L, B, path, pick, rows.rows);
  const shots = makeShots(L, B);
  const camera = makeCamera([
    [0, shots.wide],
    // Held on the page as it opens, then one push in as the hand goes for
    // Start automating, done once the dialog is up.
    [CUE.toStart[0] - .15, shots.wide],
    [CUE.promptClick - .3, shots.frame],
    // Then only a slow creep, through the picker and the rest at the end.
    [DURATION, shots.frameIn],
  ]);

  const openAt = CUE.start + CUE.open;
  const c = CUE.toggleClick;
  const name = typing(NAME, CUE.name[0], CUE.name[1], { seed: 5 });
  // The prompt is pasted, so it shows up all at once.
  const prompt = {
    keys: [[CUE.paste, PROMPT]],
    text: t => (t >= CUE.paste ? PROMPT : ''),
    lastKey: t => (t >= CUE.paste ? CUE.paste : -Infinity),
  };
  const firstKey = prompt.keys[0][0];
  const sample = (list, t) => list[clamp(Math.round(t * 1000), 0, list.length - 1)];
  const pose = t => {
    t = clamp(t, 0, DURATION);
    film(stage, camera(t));
    const p = path.pointer(t);
    const q = [p[0] - WIN.x, p[1] - WIN.y];
    sideSpin(t + BEFORE);

    // The sidebar lights the row under the pointer until the dialog's
    // backdrop covers it.
    const navRow = t < openAt ? NAV.findIndex((_, i) => inside(q, navRect(i))) : -1;
    navHover.style.visibility = navRow >= 0 && navRow !== AUTOMATIONS ? 'inherit' : 'hidden';
    if (navRow >= 0) navHover.style.top = px(navRect(navRow).y);
    const pressed = path.down(t);
    start.style.background = pressed && t < openAt ? GREEN[2] : mix(GREEN[0], GREEN[1], sample(sim.startHot, t));

    // The dialog fades in and settles from a touch smaller.
    D.modal.style.visibility = t >= openAt ? 'inherit' : 'hidden';
    const u = out(span(t, openAt, openAt + .18));
    D.backdrop.style.opacity = u;
    D.dialog.style.opacity = u;
    D.dialog.style.transform = u >= 1 ? 'none' : `scale(${lerp(.96, 1, u)})`;

    // The name has focus as the dialog opens; a click moves it to the
    // prompt, the picker takes it, and it comes back when a model is picked.
    const naming = t >= openAt && t < CUE.promptClick;
    D.input.classList.toggle('focus', naming);
    showText(D.name, name.text(t), naming && caretOn(t, Math.max(openAt, name.lastKey(t))));
    const back = t >= sim.close;
    const writing = (t >= CUE.promptClick && t < CUE.chipClick) || back;
    D.composer.classList.toggle('idle', !writing);
    const since = Math.max(back ? sim.close : CUE.promptClick, prompt.lastKey(t));
    showText(D.prompt, prompt.text(t), writing && caretOn(t, since));

    // Create turns on with the prompt's first key.
    const e = span(t, firstKey, firstKey + .15);
    const hot = sample(sim.createHot, t) * e;
    D.create.style.background = t >= create && pressed ? GREEN[2] : blend(blend(DISABLED[0], GREEN[0], e), GREEN[1], hot);
    D.create.style.color = blend(DISABLED[1], '#ffffff', e);
    D.split.style.opacity = e;
    D.create.style.boxShadow = `inset 0 0 0 1px rgba(31, 35, 40, ${r3(.15 * e)})`;

    // The chip: Auto, then the last model once Auto is off, then Aion.
    const state = auto(t);
    const text = back ? `${AION.name} · Medium` : state.on ? 'Auto · Efficiency' : `${OPUS.name} · Medium`;
    if (D.chip.textContent !== text) D.chip.textContent = text;
    const chipHot = sample(sim.chipHot, t);
    const chipDown = pressed && t >= CUE.chipClick && t < CUE.chipClick + .2;
    D.chip.style.background = chipDown ? '#e8ebee' : `rgba(242, 243, 244, ${chipHot})`;
    D.chip.style.color = mix(MUTED, FG, chipHot);

    // The menu opens with Auto on. The switch slides off, the levels give way
    // to the Model, Effort and Context rows, and the menu shrinks to fit.
    popInOut(menu, t, CUE.chipClick, sim.close, .2, .95, .1);
    popInOut(fly, t, sim.listAt, sim.close, .2, .95, .1);
    setAuto(picker, state);
    const menuRow = sample(sim.menuRow, t);
    menuHl.style.visibility = menuRow >= 0 ? 'inherit' : 'hidden';
    if (menuRow >= 0) placeMenuHl(menuHl, menuRow);
    const listRow = sample(sim.listRow, t);
    flyHl.style.visibility = listRow >= 0 ? 'inherit' : 'hidden';
    if (listRow >= 0) placeListHl(flyHl, L, listRow);

    // An I-beam over the text fields, once the dialog is up and no popup is.
    const picking = t >= CUE.chipClick && t < sim.close + .1;
    const overText = t >= openAt && !picking && (inside(q, B.input) || inside(q, B.text));
    cursor.style.visibility = overText ? 'hidden' : 'visible';
    beam.style.visibility = overText ? 'visible' : 'hidden';
    pointAt(cursor, p);
    beamAt(beam, p);
  };

  const box = b => [b.x, b.y, b.w, b.h].map(r3);
  // When the prompt shows a word in full.
  const typedAt = word => {
    const end = PROMPT.indexOf(word) + word.length;
    return r3(prompt.keys.find(([, s]) => s.length >= end)[0]);
  };
  const keys = typed => [r3(typed.keys[0][0]), r3(typed.keys.at(-1)[0]), typed.keys.length];
  return {
    pose,
    duration: DURATION,
    info: {
      cue: { start: r3(CUE.start), openAt: r3(openAt), promptClick: CUE.promptClick, chipClick: r3(CUE.chipClick), toggleClick: r3(c) },
      boxes: Object.fromEntries(Object.entries({ ...B, chip: L.chip, menu: L.menu, list: L.fly }).map(([k, b]) => [k, box(b)])),
      modelAt: r3(sim.modelAt),
      listAt: r3(sim.listAt),
      inList: r3(sim.inList),
      cardAt: r3(sim.cardAt),
      pick: r3(pick),
      create: r3(create),
      close: r3(sim.close),
      entries: sim.entries,
      menuEntries: sim.menuEntries,
      name: keys(name),
      prompt: keys(prompt),
      typedVsSaid: Object.fromEntries([['my', 'schedule'], ['PRs.', 'background']]
        .map(([word, k]) => [word, [typedAt(word), r3(WORDS[k])]])),
      moves: Object.fromEntries(Object.entries(moves).map(([k, m]) => [k, [r3(m.t0), r3(m.t0 + m.dur)]])),
      shots: Object.fromEntries(Object.entries(shots).map(([k, v]) => [k, [r3(v.x), r3(v.y), r3(v.s)]])),
    },
  };
}
