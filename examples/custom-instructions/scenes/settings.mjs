// "To add instructions, right-click a project and open Settings. Under
// Instructions, you can write the things you find yourself repeating ...
// I'm telling it to use pnpm and not npm, to start branch names with feat or
// fix and to run lint before committing. These instructions could even
// contain very long and complex guidelines ... And that's it. They're saved
// for this repo."
// The pointer right-clicks the project in the sidebar and picks Settings.
// The dialog opens on the project's page, which scrolls down to
// Instructions. The field takes focus and the three rules go in as they are
// said. A long set of guidelines is pasted under them and scrolled through.
// A click outside the field saves it, and the dialog closes.
import { clamp, out, span } from '../motion.mjs';
import { clock } from '../timeline.mjs';
import { WIN, imagesDecoded, inside, loadAssets, place, r3, rect } from '../kit.mjs';
import { PROJECTS_TOP, beamAt, buildCursor, buildHome, buildIBeam, buildStage, buildWindow, film, pointAt, popInOut } from '../app.mjs';
import { caretOn, makePath, typing } from '../input.mjs';
import { glide, look, makeCamera } from '../camera.mjs';
import {
  DIALOG, NAV_FILL, PROJECT_ICONS, PROJECT_MENU, buildProjectSettings, buildRowMenu, layoutRowMenu, placeRowHl, poseDialog,
  rowMenuAt, wheel,
} from '../project.mjs';
import { CLOSE_POINT, CLOSE_SHOT, GUIDELINES, PLACEHOLDER, PROJECT, RULES, SIDE_PROJECTS } from '../story.mjs';

const T = clock('settings');
const DURATION = T.duration;
// A button acts when the click comes up, 90 ms after it goes down.
const UP = .09;
const SETTINGS_ROW = PROJECT_MENU.filter(Boolean).findIndex(([, text]) => text === 'Settings');

const CUE = {
  // Over to the project and a right click on "right-click".
  toProject: [T.said('to add') + .25, .85],
  menu: T.said('right-click') - .08,
  // Down the menu to Settings, clicked just ahead of the word.
  toSettings: [T.said('right-click') + .32, .55],
  settings: T.said('open [settings]') - .1,
  // Into the page, which scrolls to Instructions as the word is said.
  toPage: [T.said('open [settings]') + .35, .6],
  scroll: [T.said('under instructions') - .05, 1],
  // Onto the field's example, along it while "the things you find yourself
  // repeating" is said, then a click to the right of it for focus.
  toField: [T.said('under instructions') + 1.01, .5],
  along: [T.said('the things'), 1.5],
  toRest: [T.said('or just general') - .1, .45],
  focus: T.said('just general') - .05,
  // The three rules, each typed while it is said.
  rules: [
    [T.said('I\'m telling') + .35, T.saidEnd('not npm') - .05],
    [T.said('to start branch') + .1, T.saidEnd('or fix') + .12],
    [T.said('run lint') - .2, T.saidEnd('committing') - .05],
  ],
  // Two new lines, and the guidelines are pasted on "very long".
  enter: [T.said('could even'), T.said('could even') + .2],
  paste: T.said('very long') - .06,
  // Up to the top of them, then down a heading at a time.
  flick: [T.said('complex guidelines') + .05, .9],
  named: [T.said('named') - .12, .5],
  structured: [T.said('structured') - .1, .6],
  written: [T.said('generally [written]') - .3, .6],
  // A click outside the field saves it; then the dialog is closed.
  toBlank: [T.said('and that\'s it') - .12, .38],
  blur: T.said('and that\'s it') + .3,
  toClose: [T.said('and that\'s it') + .62, .65],
  close: T.said('this repo') - .05,
};
CUE.open = CUE.settings + UP;
CUE.shut = CUE.close + UP;

export default async function settings() {
  await loadAssets(PROJECT_ICONS, ['assets/avatar.png']);
  const stage = buildStage();
  const { win, ui, pops, navHover } = buildWindow(stage, { projects: SIDE_PROJECTS });
  const home = buildHome(ui, { project: PROJECT, branch: 'main' });
  const menu = buildRowMenu(pops, PROJECT_MENU);
  const D = buildProjectSettings(win, { project: PROJECT, projects: SIDE_PROJECTS.slice(1).map(([, name]) => name), placeholder: PLACEHOLDER });
  const cursor = buildCursor(stage);
  const beam = buildIBeam(stage);
  await imagesDecoded();

  // Where things are, measured before anything moves.
  const M = D.measure();
  // The page scrolls until the Instructions heading is a third of the way
  // down the dialog.
  const SCROLL = M.heading.y - 144;
  if (SCROLL > M.max) throw new Error(`The page can only scroll ${M.max} px, not ${SCROLL}`);
  const field = { x: M.area.x, y: M.area.y - SCROLL, w: M.area.w, h: M.area.h };
  const heading = { x: M.heading.x, y: M.heading.y - SCROLL };
  const comp = rect(home.composer, WIN);
  const desk = (x, y) => [WIN.x + x, WIN.y + y];
  const inDialog = (x, y) => desk(DIALOG.x + x, DIALOG.y + y);
  const toDialog = ([x, y]) => [x - WIN.x - DIALOG.x, y - WIN.y - DIALOG.y];
  const index = SIDE_PROJECTS.findIndex(([, name]) => name === PROJECT);
  const projectRow = { x: 8, y: PROJECTS_TOP + 32 * index, w: 262, h: 32 };
  const onProject = [126, projectRow.y + 18];
  // The menu opens with its corner at the pointer.
  const L = layoutRowMenu(menu, onProject[0] + 1, onProject[1] + 1);

  const path = makePath(desk(comp.x + 150, comp.y + comp.h + 86));
  path.reach(desk(...onProject), ...CUE.toProject, 26);
  path.click(CUE.menu);
  path.move(L.rowAim(SETTINGS_ROW, 96), ...CUE.toSettings, -10);
  path.click(CUE.settings);
  path.move(inDialog(596, 372), ...CUE.toPage, 16);
  // Into the field, to the right of where the text will be.
  const rest = inDialog(field.x + 566, field.y + 62);
  path.move(inDialog(field.x + 34, field.y + 31), ...CUE.toField, -12);
  path.move(inDialog(field.x + 452, field.y + 32), ...CUE.along, 2);
  path.move(rest, ...CUE.toRest, 10);
  path.click(CUE.focus);
  path.move(inDialog(heading.x + 548, heading.y + 12), ...CUE.toBlank, 8);
  path.click(CUE.blur);
  path.reach(CLOSE_POINT, ...CUE.toClose, -18);
  path.click(CUE.close);
  path.check();
  if (!inside(toDialog(rest), field)) throw new Error('The pointer rests outside the Instructions field');

  const typed = RULES.map((text, i) => typing(`${i ? ' ' : ''}${text}`, ...CUE.rules[i], { seed: 41 + i }));
  const valueAt = t => typed.map(k => k.text(t)).join('') + (t >= CUE.enter[0] ? '\n' : '') + (t >= CUE.enter[1] ? '\n' : '') + (t >= CUE.paste ? GUIDELINES : '');
  const lastKey = t => Math.max(CUE.focus, ...typed.map(k => k.lastKey(t)), ...[...CUE.enter, CUE.paste].filter(k => k <= t));
  // The field's own scroll: at the end of the text after the paste, up to
  // the top, then down so each heading lands on the top line.
  const FULL = valueAt(DURATION);
  const lines = FULL.split('\n');
  const top = title => 20 * lines.indexOf(title);
  const end = D.areaMax(FULL);
  const steps = [[CUE.flick, end, 0], [CUE.named, 0, top('## Naming')], [CUE.structured, top('## Naming'), top('## Structure')], [CUE.written, top('## Structure'), Math.min(end, top('## Style'))]];
  const fieldScroll = t => {
    if (t < CUE.paste) return 0;
    let y = end;
    for (const [[start, dur], from, to] of steps) if (t >= start) y = from + (to - from) * wheel(span(t, start, start + dur));
    return y;
  };

  // On the sidebar and the menu, across to the dialog as it opens, then one
  // long creep in while the rules are written.
  const shots = {
    side: look(WIN.x + 640, WIN.y + 370, 1.2),
    dialog: look(WIN.x + DIALOG.x + DIALOG.w / 2, WIN.y + DIALOG.y + DIALOG.h / 2, 1.3),
    close: CLOSE_SHOT,
  };
  const camera = makeCamera([
    [0, shots.side],
    [CUE.open - .15, shots.side],
    [CUE.open + 1.15, shots.dialog, glide],
    [CUE.toField[0] + CUE.toField[1], shots.dialog],
    [T.saidEnd('committing') + .2, shots.close, glide],
  ]);

  const pose = t => {
    t = clamp(t, 0, DURATION);
    film(stage, camera(t));
    const p = path.pointer(t);
    const w = [p[0] - WIN.x, p[1] - WIN.y];
    const q = toDialog(p);
    const open = t >= CUE.open && t < CUE.shut + .1;
    const menuOpen = t >= CUE.menu && t < CUE.open;

    // The project's row lights under the pointer and stays lit while its
    // menu is open.
    const lit = !open && (inside(w, projectRow) || menuOpen);
    navHover.style.visibility = lit ? 'inherit' : 'hidden';
    place(navHover, projectRow.x, projectRow.y, projectRow.w, projectRow.h);
    popInOut(menu.menu, t, CUE.menu, CUE.open, .2, .95, .1);
    placeRowHl(L, menuOpen ? rowMenuAt(L, p) : -1);

    // Settings opens on the project's page and closes with a quick fade.
    poseDialog(D, open, t < CUE.shut ? out(span(t, CUE.open, CUE.open + .18)) : 1 - span(t, CUE.shut, CUE.shut + .1));
    D.pills.forEach(({ pill, box }, i) => {
      pill.style.background = i === D.selected ? NAV_FILL.selected : open && inside(q, box) ? NAV_FILL.hover : '';
    });
    D.scrollTo(SCROLL * wheel(span(t, CUE.scroll[0], CUE.scroll[0] + CUE.scroll[1])), M);
    const overClose = open && inside(q, { x: 876, y: 10, w: 32, h: 32 });
    D.close.style.background = overClose ? (path.down(t) ? '#dfe4e8' : '#e8ecef') : '';

    // The field: focused from the click in it until the click outside it.
    const focused = t >= CUE.focus && t < CUE.blur;
    D.setArea({ value: valueAt(t), focus: focused, caretOn: focused && caretOn(t, lastKey(t)), scroll: fieldScroll(t) });

    // Over the field the pointer is an I-beam.
    const overField = open && t >= CUE.scroll[0] + CUE.scroll[1] && inside(q, field);
    beam.style.visibility = overField ? 'visible' : 'hidden';
    cursor.style.visibility = overField ? 'hidden' : 'visible';
    beamAt(beam, p);
    pointAt(cursor, p);
  };

  return {
    pose,
    duration: DURATION,
    info: {
      cues: Object.fromEntries(Object.entries(CUE).map(([k, v]) => [k, [v].flat().map(r3)])),
      page: { scroll: r3(SCROLL), max: r3(M.max), field: Object.values(field).map(r3) },
      lines: lines.length, fieldEnd: end, menu: [L.box.x, L.box.y, L.w, L.h].map(r3),
    },
  };
}
