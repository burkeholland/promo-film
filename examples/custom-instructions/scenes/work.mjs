// "Now I start a new session and ask for a new feature. The instructions are
// automatically sent to Copilot with my prompt. And that's just the start. In
// Customize, you can add MCP servers, skills, plugins, and a lot more."
// Opens where the settings film closed: the home page, the pointer where the
// dialog's close button was. A prompt goes in and is sent. Copilot does the
// work the way the instructions say: a feat/ branch, pnpm, lint before it is
// done. Then the pointer opens Customize, and the Add menu names what else
// can be added.
import { clamp, span } from '../motion.mjs';
import { clock } from '../timeline.mjs';
import { DH, DW, H, W, WIN, imagesDecoded, inside, loadAssets, place, px, r3, rect } from '../kit.mjs';
import { NAV, NAV_TOP, buildCursor, buildHome, buildIBeam, buildStage, buildWindow, beamAt, film, navRect, pointAt, popInOut, showText } from '../app.mjs';
import { caretOn, makePath, typing } from '../input.mjs';
import { glide, keep, look, makeCamera } from '../camera.mjs';
import { COL, SESSION_ICONS, buildSession, spinner } from '../session.mjs';
import { ADD_MENU, PROJECT_ICONS, buildCustomize, buildRowMenu, layoutRowMenu, paintAdd, placeRowHl, rowMenuAt, wheel } from '../project.mjs';
import { BRANCH, CLOSE_POINT, CLOSE_SHOT, PROJECT, PROMPT, REPLY, SESSION_TITLE, SIDE_PROJECTS } from '../story.mjs';

const T = clock('work');
const DURATION = T.duration;
const UP = .09;
const CUSTOMIZE = NAV.findIndex(([, text]) => text === 'Customize');
const row = text => ADD_MENU.findIndex(([, name]) => name.startsWith(text));

const CUE = {
  // Into the prompt box, and the ask is typed while it is said.
  toField: [T.said('now I start') + .06, .42],
  focus: T.said('now [I] start') - .02,
  typing: [T.said('now [I] start') + .1, T.said('new [feature]') - .46],
  toSend: [T.said('new [feature]') - .4, .28],
  send: T.said('new [feature]') - .06,
  // Over to Customize in the sidebar, clicked as it is named.
  toCustomize: [T.said('in customize') - .68, .6],
  customize: T.said('in [customize]') - .32,
  // Up to Add, whose menu opens ahead of "add".
  toAdd: [T.said('in [customize]') + .1, .7],
  add: T.said('can [add] MCP') - .13,
  // Down the menu: each row lights as it is named.
  toMcp: [T.said('can [add] MCP') + .02, .2],
  toSkill: [T.said('skills') - .4, .3],
  toPlugin: [T.said('plugins') - .38, .28],
  // The menu closes and the page scrolls: there is a lot more.
  toPage: [T.said('and a lot more') - .34, .32],
  more: T.said('and a lot more'),
  scroll: [T.said('and a lot more') + .12, 1.25],
};
// The app opens the session a moment after the click, and the work follows.
const OPEN = CUE.send + .12;
const WORK = {
  thought: OPEN + .55,
  branch: OPEN + 1.05,
  create: OPEN + 1.7,
  edit: OPEN + 2.25,
  lint: OPEN + 2.85,
  took: OPEN + 3.6,
  reply: [OPEN + 3.75, OPEN + 4.75],
  idle: OPEN + 4.85,
};
CUE.page = CUE.customize + UP;
CUE.menu = CUE.add + UP;

export default async function work() {
  await loadAssets([...SESSION_ICONS, ...PROJECT_ICONS]);
  const stage = buildStage();
  const { ui, pops, navHover, navActive, session: side, showSession } = buildWindow(stage, { session: { project: PROJECT, name: 'New session' }, projects: SIDE_PROJECTS });
  const home = buildHome(ui, { project: PROJECT, branch: 'main' });
  const S = buildSession(ui, { branch: `${PROJECT}/${BRANCH}` });
  const C = buildCustomize(ui);
  const menu = buildRowMenu(pops, ADD_MENU, 160);
  const cursor = buildCursor(stage);
  const beam = buildIBeam(stage);
  const sideSpin = spinner(side.spin, 0, 0);
  await imagesDecoded();

  // The session: a feat/ branch, the change, and lint through pnpm.
  const tl = S.tl;
  const at = (item, t) => { item.at = t; return item; };
  at(tl.row({ icon: 'circle-check', text: 'Copilot session started' }), OPEN);
  at(tl.bubble(PROMPT), OPEN);
  at(tl.row({ icon: 'circle-dashed', text: 'Thought for 1s' }), WORK.thought);
  const branch = at(tl.row({ icon: 'terminal', text: 'Create a branch', code: `git switch -c ${BRANCH}` }), WORK.branch);
  at(tl.row({ icon: 'file-plus', text: 'Create src/components/WishlistButton.tsx', diff: [48, 0] }), WORK.create);
  at(tl.row({ icon: 'file-pen', text: 'Edit src/pages/ProductPage.tsx', diff: [7, 1] }), WORK.edit);
  const lint = at(tl.row({ icon: 'terminal', text: 'Run lint', code: 'pnpm lint', took: '2s' }), WORK.lint);
  // The run time stays hidden until the run finishes.
  const took = [...lint.line.querySelectorAll('.dot, .d')];
  const reply = tl.stream(tl.md(REPLY), WORK.reply[0], WORK.reply[1], 5);
  tl.work.from = OPEN;
  tl.work.to = WORK.idle;
  tl.finish(DURATION);

  // Where things are, measured before anything moves.
  const M = C.measure();
  C.page.style.visibility = 'hidden';
  const comp = rect(home.composer, WIN);
  const sendBox = rect(home.send, WIN);
  const editor = { x: comp.x + 1, y: comp.y + 1, w: comp.w - 2, h: 50 };
  const desk = (x, y) => [WIN.x + x, WIN.y + y];
  const nav = navRect(CUSTOMIZE);
  // The Add menu hangs from the button's right edge, 4 px under it.
  const L = layoutRowMenu(menu, M.add.x + M.add.w - menu.w, M.add.y + M.add.h + 4, `${px(menu.w - M.add.w / 2)} 0`);
  const SCROLL = Math.min(M.max, 430);

  const path = makePath(CLOSE_POINT);
  path.move(desk(comp.x + 330, comp.y + 30), ...CUE.toField, -14);
  path.click(CUE.focus);
  path.move(desk(sendBox.x + 13, sendBox.y + 12.5), ...CUE.toSend, -10);
  path.click(CUE.send);
  path.move(desk(sendBox.x + 52, sendBox.y - 96), CUE.send + .4, .55, 10);
  path.reach(desk(nav.x + 118, nav.y + 17), ...CUE.toCustomize, 30);
  path.click(CUE.customize);
  path.reach(desk(M.add.x + .46 * M.add.w, M.add.y + .58 * M.add.h), ...CUE.toAdd, -40);
  path.click(CUE.add);
  path.move(L.rowAim(row('MCP'), menu.w - 30), ...CUE.toMcp, 3);
  path.move(L.rowAim(row('Skill'), menu.w - 34), ...CUE.toSkill, -4);
  path.move(L.rowAim(row('Plugin'), menu.w - 28), ...CUE.toPlugin, 4);
  path.move(desk(M.add.x - 140, M.add.y + 260), ...CUE.toPage, -12);
  path.check();
  const typed = typing(PROMPT, ...CUE.typing, { seed: 17 });

  // The prompt box, then the thread with the header just out of frame above
  // it, then back to the whole window as the pointer goes for the sidebar,
  // and in on the Add menu.
  const shots = {
    home: CLOSE_SHOT,
    thread: look(WIN.x + COL.x + COL.w / 2, WIN.y + 52 + DH / 2 / 1.5, 1.5),
    window: look(WIN.x + W / 2, WIN.y + H / 2, DW / W, keep),
    // The header's right end, the Add menu and the top of the list.
    add: look(WIN.x + M.add.x - 300, WIN.y + 230, 1.45),
  };
  const last = tl.where(reply, DURATION);
  if (last.y + last.h + 20 > 52 + DH / 1.5) throw new Error('The reply ends below the thread shot');
  const camera = makeCamera([
    [0, shots.home],
    [OPEN + .1, shots.home],
    [OPEN + 1.3, shots.thread, glide],
    [CUE.customize - .95, shots.thread],
    [CUE.customize + .25, shots.window, glide],
    // One slow push toward Add while its menu is read.
    [CUE.customize + .7, shots.window],
    [CUE.more, shots.add, glide],
  ]);

  const pose = t => {
    t = clamp(t, 0, DURATION);
    film(stage, camera(t));
    const p = path.pointer(t);
    const w = [p[0] - WIN.x, p[1] - WIN.y];
    const opened = t >= OPEN;
    const onCustomize = t >= CUE.page;
    home.page.style.visibility = opened ? 'hidden' : 'inherit';
    S.page.style.visibility = opened && !onCustomize ? 'inherit' : 'hidden';
    C.page.style.visibility = onCustomize ? 'inherit' : 'hidden';
    // The session is listed under its project from the moment it opens; on
    // Customize the highlight is on Customize's row.
    showSession(opened, !onCustomize);
    if (onCustomize) navActive.style.top = px(NAV_TOP + 32 * CUSTOMIZE);
    const overNav = !onCustomize && inside(w, nav);
    navHover.style.visibility = overNav ? 'inherit' : 'hidden';
    place(navHover, nav.x, nav.y, nav.w, nav.h);

    // The prompt goes in and the hand sends it.
    const since = Math.max(CUE.focus, typed.lastKey(t));
    showText(home, typed.text(t), t >= CUE.focus && caretOn(t, since), home.send);
    if (inside(w, sendBox)) home.send.style.background = path.down(t) ? '#424a53' : '#32383f';

    // The session.
    const working = opened && t < WORK.idle;
    showText(S.composer, '', caretOn(t, OPEN), null);
    S.composer.running(working);
    side.spin.style.visibility = working ? 'inherit' : 'hidden';
    side.dot.style.visibility = working ? 'hidden' : 'inherit';
    for (const node of took) node.style.visibility = t >= WORK.took ? 'inherit' : 'hidden';
    const name = t >= WORK.thought ? SESSION_TITLE : 'New session';
    S.rename(name);
    if (side.name.textContent !== name) side.name.textContent = name;
    tl.pose(t);
    sideSpin(t);

    // Customize: the Add menu, then the list scrolls.
    const menuOpen = t >= CUE.menu && t < CUE.more;
    const overAdd = onCustomize && inside(w, M.add);
    paintAdd(C.add, { over: overAdd, down: overAdd && path.down(t), open: menuOpen });
    popInOut(menu.menu, t, CUE.menu, CUE.more, .2, .95, .1);
    placeRowHl(L, menuOpen ? rowMenuAt(L, p) : -1);
    C.scrollTo(SCROLL * wheel(span(t, CUE.scroll[0], CUE.scroll[0] + CUE.scroll[1])), M);

    // Over the prompt box the pointer is an I-beam.
    const overEditor = !opened && inside(w, editor);
    beam.style.visibility = overEditor ? 'visible' : 'hidden';
    cursor.style.visibility = overEditor ? 'hidden' : 'visible';
    beamAt(beam, p);
    pointAt(cursor, p);
  };

  return {
    pose,
    duration: DURATION,
    info: {
      cues: Object.fromEntries(Object.entries(CUE).map(([k, v]) => [k, [v].flat().map(r3)])),
      open: r3(OPEN), idle: r3(WORK.idle), branch: r3(tl.where(branch, DURATION).y), reply: [last.y, last.h].map(r3),
      customize: { max: r3(M.max), scroll: SCROLL, add: Object.values(M.add).map(r3), menu: [L.box.x, L.box.y, L.w, L.h].map(r3) },
    },
  };
}
