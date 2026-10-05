// A standalone clip, outside the edit: the local model at work, start to end.
// The pointer opens the model picker and switches Auto on, so the chip reads
// "Auto · Efficiency". Then a prompt goes in, Copilot routes it to
// MAI Code 1.1 Flash on the device, works through it and replies. Timed for
// the eye, not a voiceover.
import { bezier, clamp } from '../motion.mjs';
import { AION, DH, DW, OPUS, WIN, imagesDecoded, inside, loadAssets, r3, rect } from '../kit.mjs';
import {
  MENU, autoRowAt, autoState, buildCard, buildCursor, buildHome, buildList, buildMenu, buildStage, buildWindow, film,
  layoutPicker, menuRowAt, placeMenuHl, pointAt, popInOut, setAuto, showText,
} from '../app.mjs';
import { caretOn, makePath, typing } from '../input.mjs';
import { glide, inWin, look, makeCamera } from '../camera.mjs';
import { COL, SESSION_ICONS, buildSession, spinner } from '../session.mjs';

const PROMPT = 'Write unit tests for the date helpers';
const TITLE = 'Unit tests for date helpers';
const REPLY = 'Added 14 tests to `src/utils/date.test.ts` for `formatDate`, `parseDate` and `addDays`, including leap years and month ends. All 14 pass.';

const CUE = {
  // A reach for the chip, the menu opens, and Auto goes on.
  toChip: [.55, 1.3],
  chip: 1.45,
  toToggle: [1.65, .45],
  autoOn: 2.25,
  // A look down the levels Auto brings: Efficiency is the one checked.
  toLevel: [2.6, .45],
  // Into the prompt box, which closes the menu and takes focus.
  toField: [3.45, .55],
  focus: 4.12,
  typing: [4.4, 7.1],
  toSend: [7.2, .5],
  send: 7.85,
};
// The app opens the session a moment after the click, and the work follows.
const OPEN = CUE.send + .12;
const WORK = {
  model: OPEN + .7,
  thought: OPEN + 1.3,
  searched: OPEN + 1.9,
  view: OPEN + 2.3,
  config: OPEN + 2.75,
  create: OPEN + 4.0,
  run: OPEN + 5.0,
  took: OPEN + 6.9,
  reply: [OPEN + 7.2, OPEN + 8.9],
  idle: OPEN + 9.05,
};
const DURATION = r3(OPEN + 11.6);

const lift = bezier(.33, 0, .2, 1);
const settle = u => 1 - (1 - u) ** 2;
// A shot pushed in by k about the point f (desktop px), which stays put on
// screen.
const about = (shot, [fx, fy], k) => inWin({ x: fx + (shot.x - fx) / k, y: fy + (shot.y - fy) / k, s: shot.s * k });

export default async function clipLocal() {
  await loadAssets(SESSION_ICONS);
  const stage = buildStage();
  const { ui, pops, session: side, showSession } = buildWindow(stage, { session: { project: 'local-auto', name: 'New session' } });
  const home = buildHome(ui, { chip: `${OPUS.name} · Medium` });
  const S = buildSession(ui, { chip: 'Auto · Efficiency' });
  const cursor = buildCursor(stage);
  const picker = buildMenu(pops, OPUS.name);
  const { menu, menuHl } = picker;
  // The list and its card are only built so the picker lays out as in the
  // app; they never open here.
  const { fly, rows } = buildList(pops, [], OPUS);
  const { card } = buildCard(pops);
  fly.style.visibility = card.style.visibility = 'hidden';
  side.dot.style.visibility = 'hidden';
  const sideSpin = spinner(side.spin, 0, 0);
  await imagesDecoded();

  const tl = S.tl;
  const at = (item, t) => { item.at = t; return item; };
  at(tl.row({ icon: 'circle-check', text: 'Copilot session started' }), OPEN);
  const bubble = at(tl.bubble(PROMPT), OPEN);
  const modelRow = at(tl.model(AION, 'Local'), WORK.model);
  at(tl.row({ icon: 'circle-dashed', text: 'Thought for 1s' }), WORK.thought);
  at(tl.row({ icon: 'search', text: 'Searched src/**/date*' }), WORK.searched);
  at(tl.row({ icon: 'file-code', text: 'View src/utils/date.ts' }), WORK.view);
  at(tl.row({ icon: 'braces', color: '#bf8700', text: 'View package.json' }), WORK.config);
  at(tl.row({ icon: 'file-plus', text: 'Create src/utils/date.test.ts', diff: [86, 0] }), WORK.create);
  const run = at(tl.row({ icon: 'terminal', text: 'Run the date tests', code: 'npx vitest run src/utils/date.test.ts', took: '2s' }), WORK.run);
  // The run time stays hidden until the run finishes.
  const took = [...run.line.querySelectorAll('.dot, .d')];
  const reply = tl.stream(tl.md(REPLY), WORK.reply[0], WORK.reply[1], 5);
  tl.work.from = OPEN;
  tl.work.to = WORK.idle;
  tl.finish(DURATION);

  const comp = rect(home.composer, WIN);
  const sendBox = rect(home.send, WIN);
  const L = layoutPicker({ chip: home.chip, menu, fly, card, rows });
  const desk = (x, y) => [WIN.x + x, WIN.y + y];
  const inMenu = (x, y) => desk(L.menu.x + x, L.menu.y + y);

  const path = makePath(desk(comp.x + 560, comp.y + comp.h + 66));
  path.reach(desk(L.chip.x + .42 * L.chip.w, L.chip.y + .56 * L.chip.h), CUE.toChip[0], CUE.toChip[1] - CUE.toChip[0], -22);
  path.click(CUE.chip);
  path.move(inMenu(243, 4 + 15), ...CUE.toToggle, -8);
  path.click(CUE.autoOn);
  path.move(inMenu(96, 69 + 15), ...CUE.toLevel, 10);
  path.move(desk(comp.x + 330, comp.y + 30), ...CUE.toField, -12);
  path.click(CUE.focus);
  path.move(desk(sendBox.x + 13, sendBox.y + 12.5), ...CUE.toSend, -14);
  path.click(CUE.send);
  path.move(desk(sendBox.x + 65, sendBox.y + 76), CUE.send + .45, .6, 10);
  path.check();
  const typed = typing(PROMPT, ...CUE.typing, { seed: 23 });
  const auto = t => autoState(t, false, [[CUE.autoOn, true]]);

  // Home: the composer and the open menu, then the composer alone.
  const top = comp.y - 24, bottom = L.menu.y + MENU.auto + 28;
  const left = comp.x - 40, right = comp.x + comp.w + 40;
  const pickS = Math.min(DW / (right - left), DH / (bottom - top));
  const pick = look(WIN.x + (left + right) / 2, WIN.y + (top + bottom) / 2, pickS);
  const mid = desk(comp.x + comp.w / 2, comp.y + comp.h / 2);
  const prompt = look(mid[0] + 24, mid[1] + 6, 1.5);
  // The session: the conversation column, the header just out of frame
  // above it, then a slow push toward the reply as it ends.
  const first = tl.where(bubble, DURATION), last = tl.where(reply, DURATION);
  const cx = WIN.x + COL.x + COL.w / 2;
  const thread = look(cx, WIN.y + 52 + DH / 2 / 1.6, 1.6);
  if (last.y + last.h + 24 > 52 + DH / 1.6) throw new Error('The reply ends below the thread shot');
  const ending = about(thread, [cx, WIN.y + last.y + last.h / 2], 1.05);
  const endS = ending.s;
  const shots = {
    wide: about(pick, [pick.x, pick.y], .8),
    pick,
    pickIn: about(pick, desk(L.menu.x + 140, L.menu.y + 60), 1.03),
    prompt,
    sendIn: about(prompt, desk(sendBox.x + 12, sendBox.y + 12), 1.035),
    thread,
    ending,
  };
  const camera = makeCamera([
    [0, shots.wide],
    [1.5, shots.pick, lift],
    [3.5, shots.pickIn, glide],
    [4.6, shots.prompt, lift],
    [CUE.send, shots.sendIn, settle],
    [WORK.model + .05, shots.thread, lift],
    [WORK.model + .6, shots.thread],
    [WORK.reply[1] + .3, shots.ending, glide],
    [DURATION, about(shots.ending, [cx, WIN.y + last.y + last.h / 2], 1.015), glide],
  ]);

  const menuOpen = t => t >= CUE.chip && t < CUE.focus + .1;
  const pose = t => {
    t = clamp(t, 0, DURATION);
    film(stage, camera(t));
    const p = path.pointer(t);
    const opened = t >= OPEN;
    home.page.style.visibility = opened ? 'hidden' : 'inherit';
    S.page.style.visibility = opened ? 'inherit' : 'hidden';
    pops.style.visibility = opened ? 'hidden' : 'inherit';
    showSession(opened);

    // The picker.
    const state = auto(t);
    const text = state.on ? 'Auto · Efficiency' : `${OPUS.name} · Medium`;
    if (home.chip.textContent !== text) home.chip.textContent = text;
    const overChip = inside([p[0] - WIN.x, p[1] - WIN.y], L.chip);
    const pressed = path.down(t) && Math.abs(path.lastClick(t) - CUE.chip) < 1e-6;
    home.chip.style.background = pressed ? '#e8ebee' : overChip || menuOpen(t) ? '#f2f3f4' : '';
    popInOut(menu, t, CUE.chip, CUE.focus, .2, .95, .1);
    setAuto(picker, state);
    const row = menuOpen(t) ? (state.on ? autoRowAt(L, p) : menuRowAt(L, p)) : -1;
    menuHl.style.visibility = row >= 0 ? 'inherit' : 'hidden';
    if (row >= 0) placeMenuHl(menuHl, row);

    // The prompt goes in and the hand sends it.
    const since = Math.max(CUE.focus, typed.lastKey(t));
    showText(home, typed.text(t), t >= CUE.focus && caretOn(t, since), home.send);
    if (inside([p[0] - WIN.x, p[1] - WIN.y], sendBox)) home.send.style.background = path.down(t) ? '#424a53' : '#32383f';

    // The session.
    const working = t < WORK.idle;
    showText(S.composer, '', caretOn(t, OPEN), null);
    S.composer.running(working);
    side.spin.style.visibility = working ? 'inherit' : 'hidden';
    for (const node of took) node.style.visibility = t >= WORK.took ? 'inherit' : 'hidden';
    const name = t >= WORK.thought ? TITLE : 'New session';
    S.rename(name);
    if (side.name.textContent !== name) side.name.textContent = name;
    tl.pose(t);
    sideSpin(t);
    pointAt(cursor, p);
  };

  return {
    pose,
    duration: DURATION,
    info: {
      open: r3(OPEN),
      menu: [L.menu.x, L.menu.y].map(r3),
      model: [tl.where(modelRow, DURATION).y, first.y, last.y + last.h].map(r3),
      endS: r3(endS),
      keys: [r3(typed.keys[0][0]), r3(typed.keys.at(-1)[0])],
    },
  };
}
