// "This is why we're pleased to announce that soon, Copilot will intelligently
// route to and leverage local models on capable devices. First, you'll no
// longer have to configure local models ... automatically be discovered and
// will appear in the model picker." One slow push into the app while the
// pointer opens the model picker and switches Auto on on "route", so its
// levels show. On "First" Auto goes off again and the model list opens on the
// local models; the pointer reads the Ollama and Foundry Local rows as they
// are named, and a model that was just pulled slides into the list on
// "automatically" and is hovered on "discovered". The scene ends with the list
// open on it. Past the push, the camera only creeps.
import { clamp, out, smooth, span } from '../motion.mjs';
import { clock } from '../timeline.mjs';
import { COPILOT, DH, DW, FG, HYDRA, LOCAL, MODELS, MUTED, OPUS, OTHERS, W, WIN, h, imagesDecoded, inside, loadAssets, mix, place, px, r3, rect } from '../kit.mjs';
import {
  CARD, LEVELS, LIST, MENU_ROWS, MODEL_ROW, autoRowAt, autoState, buildCard, buildCursor, buildHome, buildList, buildMenu, buildStage,
  buildWindow, film, layoutPicker, listRowAt, menuRowAt, placeListHl, placeMenuHl, pointAt, popIn, popInOut, setAuto,
} from '../app.mjs';
import { makePath } from '../input.mjs';
import { inWin, makeCamera, wide } from '../camera.mjs';

const T = clock('local');
const DURATION = T.duration;
const WORDS = T.words({
  route: 37.915, off: 42.345, local: 44.35, installed: 48.395, foundry: 50.75, added: 53.485, discovered: 54.26,
});

// HydraFusion is on, so it heads the list; the local models follow under
// "Other providers", as in the app. The last one is pulled while the picker is
// open, so it joins the list on "automatically".
const ADDED_MODEL = { name: 'gpt-oss-20b', suffix: '(Foundry Local)', logo: 'foundry-local', context: '128K', reasoning: '3 levels', input: '0', cached: '0', output: '0' };
const CLOUD = [HYDRA, ...MODELS];
const SECTIONS = [[COPILOT, CLOUD], [OTHERS, [...LOCAL, ADDED_MODEL]]];
const GEMMA = CLOUD.length, QWEN = GEMMA + 1, PHI = GEMMA + 2, ADDED = GEMMA + 3;

const CUE = {
  // The push in that opens the scene.
  push: 8.2,
  // The pointer has been resting below the composer; it reaches for the chip
  // on "soon" and switches Auto on on "route".
  toChip: [2.0, 2.75],
  chipClick: 2.95,
  toToggle: .46,
  autoOn: WORDS.route - .03,
  // It reads the levels Auto brings, then switches Auto off on "First".
  toBalance: [4.95, 5.5],
  back: [7.75, 8.15],
  autoOff: WORDS.off - .03,
  toModel: .36,
  // Each move is solved so the pointer gets onto its row on a word: gemma on
  // "local models", qwen on "installed", phi-4-mini on "Foundry" and the new
  // model on "discovered". While the voiceover talks, the hand drifts a little.
  toGemma: .74,
  gemmaDrift: [12.0, 12.6],
  toQwen: .34,
  qwenDrift: [15.9, 16.45],
  toPhi: .34,
  add: WORDS.added - .2,
  toAdded: .4,
  addedDrift: [22.0, 22.6],
  // App behaviour: a sub menu opens 100 ms after its row is hovered and closes
  // 100 ms after another row of the menu is; the details card appears 500 ms
  // after the first model row is hovered and follows a row the pointer stays
  // on for 80 ms, not one it only crosses.
  subDelay: .1,
  closeDelay: .1,
  cardDelay: .5,
  settle: .08,
  // How far the pointer may travel in that time, in px, and still count as
  // resting on the row.
  intent: 10,
};
const auto = t => autoState(t, false, [[CUE.autoOn, true], [CUE.autoOff, false]]);

function makePointer(L, composer) {
  const d = (x, y) => [WIN.x + x, WIN.y + y];
  const inMenu = (x, y) => d(L.menu.x + x, L.menu.y + y);
  const row = (i, dx, dy) => d(L.fly.x + dx, L.rowMid(i) + dy);
  const P = {
    // In the empty space between the repository bar and the suggestions.
    rest: d(composer.x + 588, composer.y + composer.h + 50),
    chip: d(L.chip.x + .42 * L.chip.w, L.chip.y + .56 * L.chip.h),
    // The switch is 30 x 16 at (230, 10) in the menu.
    toggle: inMenu(243, MENU_ROWS[0].top + 15),
    balance: inMenu(92, LEVELS[1].top + 15),
    model: inMenu(158, MENU_ROWS[MODEL_ROW].top + 14),
    gemma: row(GEMMA, 118, 1),
    qwen: row(QWEN, 131, 2),
    phi: row(PHI, 106, 0),
    added: row(ADDED, 124, 1),
  };
  const by = ([x, y], dx, dy) => [x + dx, y + dy];
  const during = ([a, b]) => [a, b - a];
  const path = makePath(P.rest);
  const moves = {};
  moves.chip = path.reach(P.chip, ...during(CUE.toChip), -26);
  path.click(CUE.chipClick);
  moves.toggle = path.move(P.toggle, CUE.chipClick + .2, CUE.toToggle, -8);
  path.click(CUE.autoOn);
  // Down across Efficiency to Balance, and back.
  moves.balance = path.move(P.balance, ...during(CUE.toBalance), 10);
  moves.back = path.move(P.toggle, ...during(CUE.back), 8);
  path.click(CUE.autoOff);
  moves.model = path.move(P.model, CUE.autoOff + .2, CUE.toModel, 10);
  // Into the list the way a hand keeps a sub menu open: right first, then up.
  moves.gemma = path.enter(P.gemma, CUE.toGemma, 12, WORDS.local, p => listRowAt(L, p) === GEMMA);
  moves.gemmaDrift = path.move(by(P.gemma, 16, -2), ...during(CUE.gemmaDrift), 2);
  moves.qwen = path.enter(P.qwen, CUE.toQwen, 4, WORDS.installed, p => listRowAt(L, p) === QWEN);
  moves.qwenDrift = path.move(by(P.qwen, -13, 1), ...during(CUE.qwenDrift), -2);
  moves.phi = path.enter(P.phi, CUE.toPhi, -3, WORDS.foundry, p => listRowAt(L, p) === PHI);
  moves.added = path.enter(P.added, CUE.toAdded, 3, WORDS.discovered, p => listRowAt(L, p) === ADDED);
  moves.addedDrift = path.move(by(P.added, 11, -1), ...during(CUE.addedDrift), 2);
  return { path: path.check(), moves };
}

// Plays the app's hover rules forward in 1 ms steps. With Auto on, the menu's
// rows are the Auto row and the levels. With it off, the Model row opens the
// list after 100 ms; like the app's safe triangle, crossing other rows on the
// way into the list keeps it open, and once the pointer has been in the list
// and comes back onto the Auto row, that row lights and the list and its card
// close 100 ms later.
function simulate(L, path, rows) {
  const n = Math.round(DURATION * 1000) + 1;
  const at = i => path.pointer(i / 1000);
  const first = (from, test) => {
    for (let i = Math.ceil(from * 1000); i < n; i++) if (test(at(i), i / 1000)) return i / 1000;
    return null;
  };
  // The new model's row can't be hovered before it is in the list.
  const rowAt = (p, t) => {
    const row = listRowAt(L, p);
    return row === ADDED && t < CUE.add + .1 ? -1 : row;
  };
  const modelAt = first(CUE.autoOff + .22, p => menuRowAt(L, p) === MODEL_ROW);
  if (modelAt === null) throw new Error('The pointer never reaches the Model row');
  const listAt = modelAt + CUE.subDelay;
  const inList = first(listAt, (p, t) => rowAt(p, t) >= 0);
  if (inList === null) throw new Error('The pointer never reaches the model list');
  // The list stays open to the end unless the pointer comes back to Auto.
  const autoAt = first(inList, p => menuRowAt(L, p) === 0) ?? Infinity;
  const listEnd = autoAt + CUE.closeDelay;
  const cardAt = inList + CUE.cardDelay;

  const menuRow = new Int8Array(n).fill(-1);
  const listRow = new Int8Array(n).fill(-1);
  const cardRow = new Int8Array(n).fill(-1);
  const chipHot = new Float32Array(n);
  let hot = 0, since = 0, settled = -1;
  const entries = [], menuEntries = [], cards = [];
  for (let i = 0; i < n; i++) {
    const t = i / 1000;
    const p = at(i);
    const open = t >= CUE.chipClick;
    if (open) {
      menuRow[i] = auto(t).on ? autoRowAt(L, p) : t >= listAt && t < autoAt ? MODEL_ROW : menuRowAt(L, p);
      if (menuRow[i] >= 0 && menuRow[i] !== menuRow[i - 1]) menuEntries.push([r3(t), menuRow[i]]);
    }
    if (t >= listAt && t < listEnd) {
      const row = rowAt(p, t);
      listRow[i] = row;
      if (row !== listRow[i - 1]) {
        since = t;
        if (row >= 0) entries.push([r3(t), rows[row].model.name]);
      }
      // Hover intent: the card only takes a row the pointer has slowed down
      // on, so a hand sweeping across rows on its way out leaves it alone.
      const ago = at(Math.max(0, i - CUE.settle * 1000));
      if (row >= 0 && t - since >= CUE.settle && Math.hypot(p[0] - ago[0], p[1] - ago[1]) < CUE.intent) settled = row;
    }
    // The card keeps its model while it fades out with the list.
    if (t >= cardAt) {
      cardRow[i] = settled;
      if (settled !== cardRow[i - 1]) cards.push([r3(t), rows[settled].model.name]);
    }
    const target = open || inside([p[0] - WIN.x, p[1] - WIN.y], L.chip) ? 1 : 0;
    hot = target > hot ? Math.min(target, hot + .01) : Math.max(target, hot - .01);
    chipHot[i] = hot;
  }
  if (cardRow[Math.round(cardAt * 1000)] < 0) throw new Error('The details card opens before the pointer settles on a row');
  return { menuRow, listRow, cardRow, chipHot, modelAt, listAt, inList, cardAt, autoAt, listEnd, entries, menuEntries, cards };
}

// A shot pushed in by k about the point f (desktop px), which stays put on
// screen.
const about = (shot, [fx, fy], k) => inWin({ x: fx + (shot.x - fx) / k, y: fy + (shot.y - fy) / k, s: shot.s * k });

function makeShots(composer) {
  // The push ends on everything the scene uses: from just left of the
  // composer to the window's right edge, so the details card has room, and
  // down to just above the footnote under the composer.
  const left = composer.x - 22, bottom = 678;
  const s = DW / (W - left);
  const browse = inWin({ x: WIN.x + (left + W) / 2, y: WIN.y + bottom - DH / 2 / s, s });
  // While the pointer reads the list, a 2% creep that keeps both the
  // composer's edge and the card in the frame.
  const browseIn = about(browse, [WIN.x + left + (W - left) * 2 / 3, WIN.y + 450], 1.02);
  return { wide, browse, browseIn };
}

export default async function local() {
  await loadAssets();
  const stage = buildStage();
  const { ui, pops } = buildWindow(stage);
  const home = buildHome(ui, { chip: `${OPUS.name} · Medium` });
  const cursor = buildCursor(stage);
  const picker = buildMenu(pops, OPUS.name);
  const { menu, menuHl } = picker;
  const { fly, flyHl, rows } = buildList(pops, SECTIONS, OPUS);
  // The new model's logo and name, then the list's foot that it pushes down:
  // the divider, "More models" and its chevron.
  const [addLogo, addName, ...foot] = [...fly.children].slice(-5);
  // A tint that marks the new row as it arrives, under the text.
  const tint = h('div', 'hl');
  fly.insertBefore(tint, flyHl.nextSibling);
  place(tint, 4, rows.rows[ADDED].top, LIST.w - 8, LIST.pitch);
  const { card, show } = buildCard(pops);
  await imagesDecoded();

  const composer = rect(home.composer, WIN);
  const L = layoutPicker({ chip: home.chip, menu, fly, card, rows });
  const { path, moves } = makePointer(L, composer);
  const sim = simulate(L, path, rows.rows);
  const shots = makeShots(composer);
  const camera = makeCamera([
    [0, shots.wide],
    [CUE.push, shots.browse],
    [DURATION, shots.browseIn],
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
    popInOut(fly, t, sim.listAt, sim.listEnd, .2, .95, .1);
    popInOut(card, t, sim.cardAt, sim.listEnd, .15, .97, .1);

    // The list makes room for the new model, whose row drops into place and
    // glows for a moment.
    const lift = LIST.pitch * (1 - out(span(t, CUE.add, CUE.add + .32)));
    fly.style.height = px(rows.h - lift);
    for (const node of foot) node.style.transform = lift > 0 ? `translateY(${px(-lift)})` : '';
    const arrive = out(span(t, CUE.add + .08, CUE.add + .36));
    for (const node of [addLogo, addName]) {
      node.style.opacity = arrive;
      node.style.transform = arrive < 1 ? `translateY(${px(-6 * (1 - arrive))})` : '';
    }
    const glow = Math.min(out(span(t, CUE.add + .08, CUE.add + .3)), 1 - smooth(span(t, CUE.add + .6, CUE.add + 1.6)));
    tint.style.visibility = glow > 0 ? 'inherit' : 'hidden';
    tint.style.background = `rgba(0, 110, 219, ${r3(.09 * glow)})`;

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
      chip: box(L.chip),
      menu: box(L.menu),
      list: box(L.fly),
      cardRight: r3(L.cardX + CARD.w),
      cues: { chipClick: CUE.chipClick, autoOn: r3(CUE.autoOn), autoOff: r3(CUE.autoOff), add: r3(CUE.add), },
      modelAt: r3(sim.modelAt),
      listAt: r3(sim.listAt),
      inList: r3(sim.inList),
      cardAt: r3(sim.cardAt),
      entries: sim.entries,
      menuEntries: sim.menuEntries,
      cards: sim.cards,
      moves: Object.fromEntries(Object.entries(moves).map(([k, m]) => [k, [r3(m.t0), r3(m.t0 + m.dur)]])),
      shots: Object.fromEntries(Object.entries(shots).map(([k, v]) => [k, [r3(v.x), r3(v.y), r3(v.s)]])),
    },
  };
}
