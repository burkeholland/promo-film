// "...will be able to use intelligent local model routing very soon,
// including Microsoft Aion Flash 1.0." Cuts in close on a new session with
// Auto on. The hand opens the picker on "intelligent", so Auto's levels show,
// and rests on Efficiency on "routing". On "very soon" it turns Auto off, goes
// to the Model row, and the list opens with MAI Code 1.1 Flash among
// Copilot's models, marked Local. The hand gets onto its row on "Microsoft",
// its details card comes up for "Aion Flash 1.0", and the camera pushes in on
// the row and the card through to the cut.
import { clamp } from '../motion.mjs';
import { clock } from '../timeline.mjs';
import { AION, COPILOT, DH, DW, FG, HYDRA, LOCAL, MODELS, MUTED, OPUS, OTHERS, W, WIN, imagesDecoded, inside, loadAssets, mix, px, r3, rect } from '../kit.mjs';
import {
  CARD, LEVELS, MENU_ROWS, MODEL_ROW, autoRowAt, autoState, buildCard, buildCursor, buildHome, buildList, buildMenu, buildStage,
  buildWindow, film, layoutPicker, listRowAt, menuRowAt, placeListHl, placeMenuHl, pointAt, popIn, popInOut, setAuto,
} from '../app.mjs';
import { makePath } from '../input.mjs';
import { glide, inWin, makeCamera } from '../camera.mjs';

const T = clock('aion-end');
const DURATION = T.duration;
// Onsets measured from the waveform.
const WORDS = T.words({
  intelligent: 138.22, local: 139.015, routing: 139.86, very: 140.435, soon: 140.78, including: 141.305,
  microsoft: 142.46, aion: 143.155, flash: 143.62, one: 144.045,
});

// Aion Flash runs on the machine, so its row says so, as in the automations
// film.
const AION_LOCAL = { ...AION, suffix: '(Local)' };
const SECTIONS = [[COPILOT, [HYDRA, ...MODELS, AION_LOCAL]], [OTHERS, LOCAL]];
const AION_ROW = 1 + MODELS.length;

const CUE = {
  // The hand reaches for the chip and opens the picker on "intelligent".
  toChip: [.4, .78],
  chipClick: WORDS.intelligent + .02,
  // Down onto Efficiency for "routing", with a little drift.
  toLevel: [1.68, .5],
  levelDrift: [2.5, .45],
  // Back to the switch, and Auto goes off on "very".
  toToggle: [3.08, .36],
  autoOff: WORDS.very + .05,
  // Down to the Model row, and the list opens.
  toModel: .34,
  // Into the list, onto MAI Code 1.1 Flash on "Microsoft".
  toAion: .62,
  aionDrift: [6.3, .7],
  // The push in on the row and its card.
  push: WORDS.microsoft - .1,
  // App behaviour, as in the local film: a sub menu opens 100 ms after its
  // row is hovered; the details card appears 500 ms after the first model
  // row is, on a row the pointer has stayed on for 80 ms.
  subDelay: .1,
  cardDelay: .5,
  settle: .08,
  intent: 10,
};
const auto = t => autoState(t, true, [[CUE.autoOff, false]]);

function makePointer(L, composer) {
  const d = (x, y) => [WIN.x + x, WIN.y + y];
  const inMenu = (x, y) => d(L.menu.x + x, L.menu.y + y);
  const P = {
    rest: d(composer.x + 588, composer.y + composer.h + 50),
    chip: d(L.chip.x + .42 * L.chip.w, L.chip.y + .56 * L.chip.h),
    // The switch is 30 x 16 at (230, 10) in the menu.
    toggle: inMenu(243, MENU_ROWS[0].top + 15),
    efficiency: inMenu(96, LEVELS[0].top + 14),
    model: inMenu(158, MENU_ROWS[MODEL_ROW].top + 14),
    aion: d(L.fly.x + 128, L.rowMid(AION_ROW) + 1),
  };
  const by = ([x, y], dx, dy) => [x + dx, y + dy];
  const during = ([a, b]) => [a, b];
  const path = makePath(P.rest);
  const moves = {};
  moves.chip = path.reach(P.chip, ...during(CUE.toChip), -26);
  path.click(CUE.chipClick);
  moves.level = path.move(P.efficiency, ...during(CUE.toLevel), 8);
  moves.levelDrift = path.move(by(P.efficiency, 14, 2), ...during(CUE.levelDrift), 2);
  moves.toggle = path.move(P.toggle, ...during(CUE.toToggle), -8);
  path.click(CUE.autoOff);
  moves.model = path.move(P.model, CUE.autoOff + .2, CUE.toModel, 10);
  // Into the list the way a hand keeps a sub menu open: right first, then
  // along to the row.
  moves.aion = path.enter(P.aion, CUE.toAion, 10, WORDS.microsoft, p => listRowAt(L, p) === AION_ROW);
  moves.aionDrift = path.move(by(P.aion, 12, -1), ...during(CUE.aionDrift), 2);
  return { path: path.check(), P, moves };
}

// Plays the app's hover rules forward in 1 ms steps, as in the local film.
function simulate(L, path, rows) {
  const n = Math.round(DURATION * 1000) + 1;
  const at = i => path.pointer(i / 1000);
  const first = (from, test) => {
    for (let i = Math.ceil(from * 1000); i < n; i++) if (test(at(i))) return i / 1000;
    return null;
  };
  const modelAt = first(CUE.autoOff + .22, p => menuRowAt(L, p) === MODEL_ROW);
  if (modelAt === null) throw new Error('The pointer never reaches the Model row');
  const listAt = modelAt + CUE.subDelay;
  const inList = first(listAt, p => listRowAt(L, p) >= 0);
  if (inList === null) throw new Error('The pointer never reaches the model list');
  const cardAt = inList + CUE.cardDelay;

  const menuRow = new Int8Array(n).fill(-1);
  const listRow = new Int8Array(n).fill(-1);
  const cardRow = new Int8Array(n).fill(-1);
  const chipHot = new Float32Array(n);
  let hot = 0, since = 0, settled = -1, shown = null;
  const entries = [], menuEntries = [], cards = [];
  for (let i = 0; i < n; i++) {
    const t = i / 1000;
    const p = at(i);
    const open = t >= CUE.chipClick;
    if (open) {
      menuRow[i] = auto(t).on ? autoRowAt(L, p) : t >= listAt ? MODEL_ROW : menuRowAt(L, p);
      if (menuRow[i] >= 0 && menuRow[i] !== menuRow[i - 1]) menuEntries.push([r3(t), menuRow[i]]);
    }
    if (t >= listAt) {
      const row = listRowAt(L, p);
      listRow[i] = row;
      if (row !== listRow[i - 1]) {
        since = t;
        if (row >= 0) entries.push([r3(t), rows[row].model.name]);
      }
      const ago = at(Math.max(0, i - CUE.settle * 1000));
      if (row >= 0 && t - since >= CUE.settle && Math.hypot(p[0] - ago[0], p[1] - ago[1]) < CUE.intent) settled = row;
    }
    // The card comes up once its delay is over and the hand has settled.
    if (t >= cardAt && settled >= 0) {
      if (shown === null) shown = t;
      cardRow[i] = settled;
      if (settled !== cardRow[i - 1]) cards.push([r3(t), rows[settled].model.name]);
    }
    const target = open || inside([p[0] - WIN.x, p[1] - WIN.y], L.chip) ? 1 : 0;
    hot = target > hot ? Math.min(target, hot + .01) : Math.max(target, hot - .01);
    chipHot[i] = hot;
  }
  if (shown === null) throw new Error('The details card never comes up');
  return { menuRow, listRow, cardRow, chipHot, modelAt, listAt, inList, cardAt: shown, entries, menuEntries, cards };
}

// A shot pushed in by k about the point f (desktop px), which stays put on
// screen.
const about = (shot, [fx, fy], k) => inWin({ x: fx + (shot.x - fx) / k, y: fy + (shot.y - fy) / k, s: shot.s * k });

function makeShots(composer, L) {
  // The local film's framing: from just left of the composer to the
  // window's right edge, so the details card has room.
  const left = composer.x - 22, bottom = 678;
  const s = DW / (W - left);
  const browse = inWin({ x: WIN.x + (left + W) / 2, y: WIN.y + bottom - DH / 2 / s, s });
  // A creep while the menu works, then a push in about Aion's row and its
  // card.
  const row = [WIN.x + L.fly.x + L.fly.w * .6, L.rowMid(AION_ROW) + WIN.y];
  const card = [WIN.x + L.cardX + CARD.w / 2, WIN.y + L.cardTop(AION_ROW) + 120];
  const focus = [(row[0] + card[0]) / 2, (row[1] + card[1]) / 2];
  return {
    browse,
    browseIn: about(browse, [WIN.x + left + (W - left) * 2 / 3, WIN.y + 450], 1.02),
    // Centred on the list-to-card span (clamped to the window) so the card's
    // right edge stays in frame.
    close: inWin({ x: WIN.x + (L.fly.x + L.cardX + CARD.w) / 2, y: focus[1], s: browse.s * 1.16 }),
  };
}


export default async function aionEnd() {
  await loadAssets();
  const stage = buildStage();
  const { ui, pops } = buildWindow(stage);
  const home = buildHome(ui, { chip: `${OPUS.name} · Medium` });
  const cursor = buildCursor(stage);
  const picker = buildMenu(pops, OPUS.name);
  const { menu, menuHl } = picker;
  const { fly, flyHl, rows } = buildList(pops, SECTIONS, OPUS);
  const { card, show } = buildCard(pops);
  await imagesDecoded();

  const composer = rect(home.composer, WIN);
  const L = layoutPicker({ chip: home.chip, menu, fly, card, rows });
  const { path, P, moves } = makePointer(L, composer);
  const sim = simulate(L, path, rows.rows);
  const shots = makeShots(composer, L);
  const push = t => t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
  const camera = makeCamera([
    [0, shots.browse],
    [CUE.push, shots.browseIn, glide],
    [DURATION + .3, shots.close, push],
  ]);

  const chipText = home.chip.textContent;
  const sample = (list, t) => list[clamp(Math.round(t * 1000), 0, list.length - 1)];
  const pose = t => {
    t = clamp(t, 0, DURATION);
    film(stage, camera(t));
    const p = path.pointer(t);
    const state = auto(t);

    // With Auto on, the chip names the level instead of a model.
    const text = state.on ? 'Auto · Efficiency' : chipText;
    if (home.chip.textContent !== text) home.chip.textContent = text;
    const hot = sample(sim.chipHot, t);
    const pressed = path.down(t) && t < CUE.chipClick + .2;
    home.chip.style.background = pressed ? '#e8ebee' : `rgba(242, 243, 244, ${hot})`;
    home.chip.style.color = mix(MUTED, FG, hot);

    popIn(menu, t, CUE.chipClick, .2);
    setAuto(picker, state);
    popInOut(fly, t, sim.listAt, Infinity, .2, .95, .1);
    popInOut(card, t, sim.cardAt, Infinity, .15, .97, .1);

    const menuRow = sample(sim.menuRow, t);
    menuHl.style.visibility = menuRow >= 0 ? 'inherit' : 'hidden';
    if (menuRow >= 0) placeMenuHl(menuHl, menuRow);
    const listRow = sample(sim.listRow, t);
    flyHl.style.visibility = listRow >= 0 ? 'inherit' : 'hidden';
    if (listRow >= 0) placeListHl(flyHl, L, listRow);
    const cardRow = sample(sim.cardRow, t);
    if (cardRow >= 0) {
      show(rows.rows[cardRow].model);
      card.style.left = px(L.cardX);
      card.style.top = px(L.cardTop(cardRow));
    }
    pointAt(cursor, p);
  };

  const box = b => [b.x, b.y, b.w, b.h].map(r3);
  return {
    pose,
    duration: DURATION,
    info: {
      said: Object.fromEntries(Object.entries(WORDS).map(([k, v]) => [k, r3(v)])),
      chip: box(L.chip),
      menu: box(L.menu),
      list: box(L.fly),
      cardRight: r3(L.cardX + CARD.w),
      modelAt: r3(sim.modelAt),
      listAt: r3(sim.listAt),
      inList: r3(sim.inList),
      cardAt: r3(sim.cardAt),
      entries: sim.entries,
      menuEntries: sim.menuEntries,
      cards: sim.cards,
      points: Object.fromEntries(Object.entries(P).map(([k, v]) => [k, v.map(r3)])),
      moves: Object.fromEntries(Object.entries(moves).map(([k, m]) => [k, [r3(m.t0), r3(m.t0 + m.dur)]])),
      shots: Object.fromEntries(Object.entries(shots).map(([k, v]) => [k, [r3(v.x), r3(v.y), r3(v.s)]])),
    },
  };
}
