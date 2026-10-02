// "...an intelligent model orchestration that plans, implements, and executes
// across a wide range of cloud models." The pointer is already on its way to
// the model chip at the cut and opens the picker on "intelligent". The list of
// cloud models opens on "model", and the pointer goes straight up it to
// HydraFusion and picks it on "plans", too quickly for a details card to show.
// The chip takes its name and a prompt is typed as the sentence finishes.
import { clamp } from '../motion.mjs';
import { clock } from '../timeline.mjs';
import { COPILOT, FG, HYDRA, MODELS, MUTED, OPUS, WIN, imagesDecoded, inside, loadAssets, mix, r3, rect } from '../kit.mjs';
import {
  MODEL_ROW, buildCard, buildCursor, buildHome, buildList, buildMenu, buildStage, buildWindow, film, layoutPicker,
  listRowAt, menuRowAt, placeListHl, placeMenuHl, pointAt, popInOut, showText,
} from '../app.mjs';
import { caretOn, makePath, typing } from '../input.mjs';
import { fit, inWin, linear, makeCamera, onDesk } from '../camera.mjs';

const T = clock('hydra-pick');
const DURATION = T.duration;
// Onsets measured from the waveform ("model" runs on from "intelligent", so
// it keeps Whisper's time).
const WORDS = T.words({ intelligent: 8.42, model: 8.88, plans: 10.365, executes: 11.95 });

const SECTIONS = [[COPILOT, [HYDRA, ...MODELS]]];
const HYDRA_ROW = 0;
const PROMPT = 'Add rate limiting to the API';

const CUE = {
  // On its way to the chip at the cut; clicks it on "intelligent".
  toChip: [-.3, .3],
  chipClick: WORDS.intelligent - .03,
  toModel: .28,
  // One move up the list, onto HydraFusion's row on "plans", and a short
  // dwell before the click. A menu item acts when the button comes up.
  toHydra: .42,
  dwell: .06,
  release: .08,
  // The prompt, with one slip in "limiting".
  typing: [3.0, 5.75],
  typo: 13,
  // App behaviour: a sub menu opens 100 ms after its row is hovered; the
  // details card would appear 500 ms after the first model row is.
  subDelay: .1,
  cardDelay: .5,
};

function makePointer(L, composer) {
  const d = (x, y) => [WIN.x + x, WIN.y + y];
  const P = {
    // In the gap between the repository bar and the suggestions.
    start: d(composer.x + 470, composer.y + composer.h + 52),
    chip: d(L.chip.x + .44 * L.chip.w, L.chip.y + .54 * L.chip.h),
    model: d(L.menu.x + 150, L.modelTop + 14),
    hydra: d(L.fly.x + 122, L.rowMid(HYDRA_ROW) + 1),
  };
  const path = makePath(P.start);
  const moves = {};
  moves.chip = path.reach(P.chip, CUE.toChip[0], CUE.toChip[1] - CUE.toChip[0], -18);
  path.click(CUE.chipClick);
  moves.model = path.move(P.model, CUE.chipClick + .16, CUE.toModel, 10);
  moves.hydra = path.enter(P.hydra, CUE.toHydra, 4, WORDS.plans - .04, p => listRowAt(L, p) === HYDRA_ROW);
  const pick = path.click(moves.hydra.t0 + moves.hydra.dur + CUE.dwell);
  return { path: path.check(), moves, pick };
}

// Plays the app's hover rules forward in 1 ms steps. The Model row opens the
// list after 100 ms and stays lit while the pointer heads into it (the safe
// triangle). Picking a model closes both popups; their highlights hold while
// they fade.
function simulate(L, path, pick, rows) {
  const n = Math.round(DURATION * 1000) + 1;
  const at = i => path.pointer(i / 1000);
  const first = (from, test) => {
    for (let i = Math.ceil(from * 1000); i < n; i++) if (test(at(i))) return i / 1000;
    return null;
  };
  const modelAt = first(CUE.chipClick, p => menuRowAt(L, p) === MODEL_ROW);
  if (modelAt === null) throw new Error('The pointer never reaches the Model row');
  const listAt = modelAt + CUE.subDelay;
  const inList = first(listAt, p => listRowAt(L, p) >= 0);
  if (inList === null) throw new Error('The pointer never reaches the model list');
  const cardAt = inList + CUE.cardDelay;
  const close = pick + CUE.release;
  if (close > cardAt - .03) throw new Error(`HydraFusion is picked at ${close.toFixed(3)} s, after its card would show at ${cardAt.toFixed(3)} s (list opens ${listAt.toFixed(3)}, entered ${inList.toFixed(3)}, picked ${pick.toFixed(3)}, entry point ${at(Math.round(inList * 1000)).map(Math.round)})`);

  const menuRow = new Int8Array(n).fill(-1);
  const listRow = new Int8Array(n).fill(-1);
  const chipHot = new Float32Array(n);
  const entries = [];
  let hot = 0;
  for (let i = 0; i < n; i++) {
    const t = i / 1000;
    const p = at(i);
    const open = t >= CUE.chipClick && t < close;
    if (t >= close) {
      menuRow[i] = menuRow[i - 1];
      listRow[i] = listRow[i - 1];
    } else if (open) {
      menuRow[i] = t >= listAt ? MODEL_ROW : menuRowAt(L, p);
      if (t >= listAt) {
        const row = listRowAt(L, p);
        listRow[i] = row;
        if (row >= 0 && row !== listRow[i - 1]) entries.push([r3(t), rows[row].model.name]);
      }
    }
    const target = open || inside([p[0] - WIN.x, p[1] - WIN.y], L.chip) ? 1 : 0;
    hot = target > hot ? Math.min(target, hot + .01) : Math.max(target, hot - .01);
    chipHot[i] = hot;
  }
  return { menuRow, listRow, chipHot, modelAt, listAt, inList, cardAt, close, entries };
}

// A shot pushed in by k about the point f (desktop px), which stays put on
// screen.
const about = (shot, [fx, fy], k) => inWin({ x: fx + (shot.x - fx) / k, y: fy + (shot.y - fy) / k, s: shot.s * k });

function makeShots(L, composer) {
  // Everything the take uses: the composer the prompt is typed into, the menu
  // under its chip and the list, which flips up beside the menu.
  const x0 = Math.min(composer.x, L.menu.x), x1 = Math.max(composer.x + composer.w, L.fly.x + L.fly.w);
  const y0 = Math.min(composer.y, L.fly.y), y1 = Math.max(composer.y + composer.h, L.menu.y + L.menu.h);
  const fitted = fit(onDesk({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 }), 56, 44);
  const all = inWin({ x: fitted.x, y: fitted.y, s: Math.min(fitted.s, 1.5) });
  return {
    all,
    // A slow creep in for the whole take, about the start of the prompt, so
    // the words stay put as they appear.
    allIn: about(all, [WIN.x + composer.x + 24, WIN.y + composer.y + 20], 1.04),
  };
}

export default async function hydraPick() {
  await loadAssets();
  const stage = buildStage();
  const { ui, pops } = buildWindow(stage);
  const home = buildHome(ui, { chip: `${OPUS.name} · Medium` });
  const cursor = buildCursor(stage);
  const { menu, menuHl } = buildMenu(pops, OPUS.name);
  const { fly, flyHl, rows } = buildList(pops, SECTIONS, OPUS);
  const { card } = buildCard(pops);
  await imagesDecoded();

  const L = layoutPicker({ chip: home.chip, menu, fly, card, rows });
  const composer = rect(home.composer, WIN);
  const { path, moves, pick } = makePointer(L, composer);
  const sim = simulate(L, path, pick, rows.rows);
  const shots = makeShots(L, composer);
  const typed = typing(PROMPT, CUE.typing[0], CUE.typing[1], { seed: 11, typos: [CUE.typo] });
  // One framing and a steady creep, already moving at the cut.
  const camera = makeCamera([
    [0, shots.all],
    [DURATION, shots.allIn, linear],
  ]);

  const chipBefore = home.chip.textContent;
  const chipAfter = `${HYDRA.name} · Medium`;
  const sample = (list, t) => list[clamp(Math.round(t * 1000), 0, list.length - 1)];
  const pose = t => {
    t = clamp(t, 0, DURATION);
    film(stage, camera(t));
    const p = path.pointer(t);

    const text = t >= sim.close ? chipAfter : chipBefore;
    if (home.chip.textContent !== text) home.chip.textContent = text;
    const hot = sample(sim.chipHot, t);
    const pressed = path.down(t) && t < pick;
    home.chip.style.background = pressed ? '#e8ebee' : `rgba(242, 243, 244, ${hot})`;
    home.chip.style.color = mix(MUTED, FG, hot);

    popInOut(menu, t, CUE.chipClick, sim.close, .2, .95, .1);
    popInOut(fly, t, sim.listAt, sim.close, .2, .95, .1);

    const menuRow = sample(sim.menuRow, t);
    menuHl.style.visibility = menuRow >= 0 ? 'inherit' : 'hidden';
    if (menuRow >= 0) placeMenuHl(menuHl, menuRow);
    const listRow = sample(sim.listRow, t);
    flyHl.style.visibility = listRow >= 0 ? 'inherit' : 'hidden';
    if (listRow >= 0) placeListHl(flyHl, L, listRow);

    // Focus goes back to the prompt when the menu closes.
    const focused = t >= sim.close;
    const since = Math.max(sim.close, typed.lastKey(t));
    showText(home, typed.text(t), focused && caretOn(t, since), home.send);
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
      modelAt: r3(sim.modelAt),
      listAt: r3(sim.listAt),
      inList: r3(sim.inList),
      cardAt: r3(sim.cardAt),
      pick: r3(pick),
      close: r3(sim.close),
      entries: sim.entries,
      keys: [r3(typed.keys[0][0]), r3(typed.keys.at(-1)[0]), typed.keys.length],
      moves: Object.fromEntries(Object.entries(moves).map(([k, m]) => [k, [r3(m.t0), r3(m.t0 + m.dur)]])),
      shots: Object.fromEntries(Object.entries(shots).map(([k, v]) => [k, [r3(v.x), r3(v.y), r3(v.s)]])),
    },
  };
}
