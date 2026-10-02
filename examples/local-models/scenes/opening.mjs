// The opening: the desktop icon says hello, the app opens, and the model
// picker shows the latest models as the voiceover names them. It runs from
// the start to the cut to camera after "Sol".
import { bezier, clamp, lerp, out, span, track } from '../motion.mjs';
import { clock } from '../timeline.mjs';
import { COMPARE, COPILOT, DW, DH, FG, ICON, MODELS, MUTED, W, WIN, imagesDecoded, inside, loadAssets, mix, px, r3 } from '../kit.mjs';
import {
  CARD, MODEL_ROW, buildCard, buildCursor, buildHome, buildIcon, buildList, buildMenu, buildStage, buildWindow,
  film, layoutPicker, listRowAt, menuRowAt, placeListHl, placeMenuHl, pointAt, popIn,
} from '../app.mjs';
import { makePath } from '../input.mjs';
import { fit, inWin, keep, makeCamera, onDesk, wide } from '../camera.mjs';

const T = clock('opening');
const DURATION = T.duration;
// The voice starts this far into the film, after the icon's hello.
const V = T.lead;
// Where each word starts in the recording, measured from its waveform
// (Whisper's own word times run up to 0.35 s early after a pause).
const WORDS = T.words({ one: 0.26, gitHub: 1.70, copilot: 2.00, latest: 5.28, opus: 7.78, astra: 8.82, fable: 9.56, sol: 10.30 });

const CUE = {
  // The pointer glides in during the icon's second hop.
  cursorIn: [V - .13, V + .23],
  // The double-click lands on "One".
  clicks: [V + .27, V + .39],
  // Windows open animation starts here, once the camera has mostly pulled
  // back, so it reads as a window opening and settles before "GitHub".
  winOpen: V + 1.22,
  toChip: [V + 3.42, V + 4.12],
  // Pointer down on the model chip opens the menu, on "latest".
  chipClick: V + 5.24,
  toModel: [V + 5.40, V + 5.66],
  // Moves down the model list, which is in the order they are said. Their
  // start times are solved so the hover card lands on Opus, and each later
  // row is entered on its word.
  toOpus: 0.5,
  toAstra: 0.36,
  toFable: 0.34,
  toSol: 0.28,
  // App behaviour: a sub menu opens 100 ms after its row is hovered, and the
  // model details card appears 500 ms after the first model row is hovered.
  subDelay: 0.1,
  cardDelay: 0.5,
};

// The icon says hello before the voice starts: it crouches, hops with a lean,
// lands in a crouch that springs a smaller hop the other way, and wobbles
// still. Times are in the film, heights in desktop pixels, leans in degrees.
const HOPS = [[.34, .72, 18], [.84, 1.08, 7]];
const stretch = track(
  [0, 1], [.22, 1], [.34, .9], [.38, 1.1, out], [.53, 1], [.69, 1.04], [.72, 1], [.77, .88, out], [.84, .9],
  [.87, 1.06, out], [.96, 1], [1.08, 1], [1.12, .93, out], [1.21, 1.025], [1.31, .995], [1.4, 1],
);
const lean = track([0, 0], [.3, 0], [.34, .8], [.5, -3], [.72, 0], [.84, 0], [.95, 2], [1.08, 0], [1.17, -.9], [1.27, .35], [1.36, 0]);

function makePointer(L) {
  const d = (x, y) => [WIN.x + x, WIN.y + y];
  const row = (i, dx, dy) => d(L.fly.x + dx, L.rowMid(i) + dy);
  const P = {
    start: [ICON.x + 200, ICON.y + 225],
    icon: [ICON.x + 7, ICON.y + 12],
    chip: d(L.chip.x + .45 * L.chip.w, L.chip.y + .55 * L.chip.h),
    model: d(L.menu.x + 150, L.modelTop + 15),
    opus: row(0, 112, 1), astra: row(1, 104, 2), fable: row(2, 118, -1), sol: row(3, 110, 1),
  };
  const path = makePath(P.start);
  path.move(P.icon, CUE.cursorIn[0], CUE.cursorIn[1] - CUE.cursorIn[0], 30);
  path.move(P.chip, CUE.toChip[0], CUE.toChip[1] - CUE.toChip[0], -12);
  path.move(P.model, CUE.toModel[0], CUE.toModel[1] - CUE.toModel[0], 8);
  // Bowing down and right keeps the path inside the menu's grace triangle.
  path.enter(P.opus, CUE.toOpus, 36, WORDS.opus - CUE.cardDelay, p => listRowAt(L, p) >= 0);
  path.enter(P.astra, CUE.toAstra, 4, WORDS.astra, p => listRowAt(L, p) === 1);
  path.enter(P.fable, CUE.toFable, -3, WORDS.fable, p => listRowAt(L, p) === 2);
  path.enter(P.sol, CUE.toSol, 3, WORDS.sol, p => listRowAt(L, p) === 3);
  return path.check();
}

// Plays the app's hover rules forward in 1 ms steps: the Model row opens the
// list after 100 ms, the list keeps the menu on Model while it is open, and
// the details card follows the last hovered model once it has appeared.
function simulate(L, pointer, rows) {
  const n = Math.round(DURATION * 1000) + 1;
  const menuRow = new Int8Array(n).fill(-1);
  const listRow = new Int8Array(n).fill(-1);
  const cardRow = new Int8Array(n).fill(-1);
  const chipHot = new Float32Array(n);
  let modelAt = null, listAt = Infinity, firstRowAt = null, lastRow = -1, hot = 0;
  const entries = [];
  for (let i = 0; i < n; i++) {
    const t = i / 1000;
    const p = pointer(t);
    const open = t >= CUE.chipClick;
    if (open && t >= listAt) {
      menuRow[i] = MODEL_ROW;
    } else if (open) {
      menuRow[i] = menuRowAt(L, p);
      if (menuRow[i] === MODEL_ROW && modelAt === null) {
        modelAt = t;
        listAt = t + CUE.subDelay;
      }
    }
    if (t >= listAt) {
      const row = listRowAt(L, p);
      listRow[i] = row;
      if (row >= 0 && row !== listRow[i - 1]) entries.push([r3(t), rows[row].model.name]);
      if (row >= 0) {
        lastRow = row;
        if (firstRowAt === null) firstRowAt = t;
      }
    }
    if (firstRowAt !== null && t >= firstRowAt + CUE.cardDelay) cardRow[i] = lastRow;
    const target = open || inside([p[0] - WIN.x, p[1] - WIN.y], L.chip) ? 1 : 0;
    hot = target > hot ? Math.min(target, hot + .01) : Math.max(target, hot - .01);
    chipHot[i] = hot;
  }
  if (modelAt === null || firstRowAt === null) throw new Error('The pointer never reaches the model list');
  return { menuRow, listRow, cardRow, chipHot, modelAt, listAt, firstRowAt, cardAt: firstRowAt + CUE.cardDelay, entries };
}

function makeShots(L) {
  const cards = L.rows.rows.map((_, i) => L.cardTop(i));
  const top = Math.min(L.fly.y, ...cards);
  const bottom = Math.max(L.menu.y + L.menu.h, L.fly.y + L.fly.h, ...cards.map(y => y + CARD.h));
  // The menu, the list and every details card, no closer than 1.6.
  const all = fit(onDesk({ x: L.menu.x, y: top, w: L.cardX + CARD.w - L.menu.x, h: bottom - top }), 40, 32);
  return {
    icon: keep({ x: ICON.x, y: ICON.y + 16, s: 2.5 }),
    wide,
    picker: inWin({ x: all.x, y: all.y, s: Math.min(all.s, 1.6) }),
  };
}

function hello(t) {
  let y = 0;
  for (const [t0, t1, height] of HOPS) {
    if (t >= t0 && t < t1) {
      const u = (t - t0) / (t1 - t0);
      y = -height * 4 * u * (1 - u);
    }
  }
  const sy = stretch(t);
  return `translateY(${px(y)}) rotate(${r3(lean(t))}deg) scale(${r3(1 / Math.sqrt(sy))}, ${r3(sy)})`;
}

export default async function opening() {
  await loadAssets();
  const stage = buildStage();
  const { dicon, tile } = buildIcon(stage);
  const { win, ui, pops } = buildWindow(stage);
  const home = buildHome(ui, { chip: `${MODELS[0].name} · Medium` });
  const cursor = buildCursor(stage);
  const { menu, menuHl } = buildMenu(pops, MODELS[0].name);
  const { fly, flyHl, rows } = buildList(pops, [[COPILOT, MODELS]], MODELS[0]);
  const { card, show } = buildCard(pops);
  await imagesDecoded();

  const L = layoutPicker({ chip: home.chip, menu, fly, card, rows });
  const path = makePointer(L);
  const sim = simulate(L, path.pointer, rows.rows);
  const shots = makeShots(L);
  const camera = makeCamera([
    [0, shots.icon],
    [V + .37, shots.icon],
    [V + 1.67, shots.wide],
    [V + 3.27, shots.wide],
    // One slow push from the whole window to the picker. It starts as the
    // hand heads for the chip and lands as the list opens, then holds while
    // the pointer reads down the models.
    [V + 7.17, shots.picker],
  ]);

  const opens = bezier(.1, .9, .2, 1);
  const sample = (list, t) => list[clamp(Math.round(t * 1000), 0, list.length - 1)];
  const iconCell = { x: ICON.x - 38, y: ICON.y - 28, w: 76, h: 88 };
  const pose = t => {
    t = clamp(t, 0, DURATION);
    film(stage, COMPARE ? shots.wide : camera(t));
    const p = path.pointer(t);

    tile.style.transform = hello(t);
    const selected = t >= CUE.clicks[0];
    const hover = inside(p, iconCell);
    dicon.style.background = selected ? 'rgba(204, 232, 255, .34)' : hover ? 'rgba(255, 255, 255, .16)' : 'transparent';
    dicon.style.borderColor = selected ? 'rgba(153, 209, 255, .62)' : hover ? 'rgba(255, 255, 255, .28)' : 'transparent';

    // The Windows open animation: a quick fade while it grows to full size.
    const open = COMPARE ? 1 : span(t, CUE.winOpen, CUE.winOpen + .3);
    win.style.visibility = COMPARE || t >= CUE.winOpen ? 'visible' : 'hidden';
    win.style.opacity = COMPARE ? 1 : span(t, CUE.winOpen, CUE.winOpen + .18);
    win.style.transform = open >= 1 ? 'none' : `scale(${lerp(.95, 1, opens(open))})`;

    const hot = sample(sim.chipHot, t);
    home.chip.style.background = `rgba(242, 243, 244, ${hot})`;
    home.chip.style.color = mix(MUTED, FG, hot);

    popIn(menu, t, CUE.chipClick, .2);
    popIn(fly, t, sim.listAt, .2);
    popIn(card, t, sim.cardAt, .15, .97);

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
      desktop: [DW, DH],
      chip: box(L.chip),
      menu: box(L.menu),
      list: box(L.fly),
      cardRight: r3(L.cardX + CARD.w),
      fitsWindow: L.cardX + CARD.w <= W - 5,
      modelAt: r3(sim.modelAt),
      listAt: r3(sim.listAt),
      cardAt: r3(sim.cardAt),
      entries: sim.entries,
      moves: path.moves.map(m => [r3(m.t0), r3(m.t0 + m.dur)]),
      shots: Object.fromEntries(Object.entries(shots).map(([k, v]) => [k, [r3(v.x), r3(v.y), r3(v.s)]])),
    },
  };
}
