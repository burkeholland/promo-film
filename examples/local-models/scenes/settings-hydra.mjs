// "Project HydraFusion is available today in GitHub Copilot. You can look
// for it under Experimental Settings. And capable devices..." Cuts in on the
// offline session, finished, framed as the offline film left it. The camera
// pulls back as the hand goes down to the gear and Settings opens on
// General. On "HydraFusion" it clicks Experimental, whose filter has focus,
// and "hydra" goes in, leaving HydraFusion alone under Agents. Its switch
// goes on with "GitHub Copilot". As the words say where to look, the hand
// points out Experimental in the nav while the camera keeps creeping in on
// the dialog.
import { bezier, clamp, inOut, lerp, out, span } from '../motion.mjs';
import { clock } from '../timeline.mjs';
import {
  AION, DH, DW, FG, H, HINT, ICON_INK, MUTED, W, WIN,
  h, icon, image, imagesDecoded, inside, label, loadAssets, mark, mix, place, px, r3, rect,
} from '../kit.mjs';
import {
  beamAt, buildCursor, buildField, buildHome, buildIBeam, buildStage, buildWindow, film, pointAt, showText,
} from '../app.mjs';
import { caretOn, makePath, typing } from '../input.mjs';
import { glide, inWin, keep, look, makeCamera, wide } from '../camera.mjs';
import { COMPOSER, SESSION_ICONS, buildSession, spinner } from '../session.mjs';
import { TITLE, buildThread, endShot } from './offline.mjs';

const T = clock('settings-hydra');
const DURATION = T.duration;
// The session carries on from the offline film, in that film's time.
const OFF = clock('offline').duration;
// Measured onsets; "experimental" and "settings" keep Whisper's times.
const WORDS = T.words({
  project: 129.36, hydrafusion: 130.135, available: 130.53, today: 131.17, github: 131.91, copilot: 132.35,
  look: 133.07, experimental: 134.02, settings: 134.78, capable: 135.855, devices: 136.61,
});
// For comparing the dialog with screenshot 10: the camera holds the whole
// desktop and the pointer is hidden.
const FLAT = false;

const QUERY = 'hydra';
const HYDRA_NAME = 'HydraFusion';

const CUE = {
  // The hand is on its way down to the gear at the cut, and clicks it just
  // after "Project". Settings opens on the release, on General.
  toGear: [.05, .62],
  gear: .74,
  relax: [.86, .18],
  // Up the nav to Experimental, clicked on "HydraFusion". The page opens
  // with its filter focused, and "hydra" goes in.
  toNav: [1.06, .45],
  nav: 1.58,
  type: [1.82, 2.3],
  // Over to HydraFusion's switch, which goes on with "GitHub Copilot".
  toSwitch: [2.48, .68],
  flip: 3.26,
  // The hand points out Experimental as "experimental" is said, and runs
  // along the word.
  toLabel: [4.3, .7],
  drift: [5.2, .7],
};
// A button acts when the click comes up, 90 ms after it goes down.
const UP = .09;
CUE.open = CUE.gear + UP;
CUE.page = CUE.nav + UP;
CUE.on = CUE.flip + UP;

// The Experimental page's 26 experiments in the app's group order, each with
// its state. HydraFusion is off until the hand turns it on.
const GROUPS = [
  ['Canvas', [
    ['Beautiful Mermaid', 'Render supported Mermaid diagrams with the Beautiful Mermaid renderer, with legacy Mermaid fallback for unsupported syntax.', 1],
  ]],
  ['Inbox', [
    ['Board view', 'Add a board layout to My Work that groups the current view\'s issues and pull requests into Backlog, Active, Needs attention, and Done columns derived from their state and linked session activity.', 1],
  ]],
  ['Sessions', [
    ['Sidebar hover preview', 'Temporarily reveal the collapsed sidebar as a floating overlay after hovering over its toggle.', 1],
    ['Fix pull requests with instructions', 'Add a chevron to pull request fix buttons with a "Fix with instructions" option that prefills the composer instead of running immediately.', 0],
    ['Editable file tabs', 'Open local code files in file tabs with an editable editor instead of the read-only line viewer.', 1],
    ['Unified sessions', 'Present project-backed and standalone work as sessions with one shared creation flow.', 1],
    ['Cloud sessions', 'Run sessions in a cloud sandbox.', 0],
    ['Assisted approvals', 'Enable Assisted mode, which approves requests an LLM safety check deems safe and prompts otherwise. When you turn off this experiment, existing Assisted sessions change to Ask every time (Off). Agent Merge sessions change to Approve all.', 1],
    ['Tool permissions in the composer', 'Set Tool permissions from the composer\'s mode picker instead of the /permissions slash command. Selecting a mode also becomes the default for new sessions.', 1],
    ['Queued message controls', 'Manage queued timeline items: edit messages, discard items, and choose which message runs next. Available for local sessions only while in development.', 1],
  ]],
  ['Remote', [
    ['WSL hosts (Preview)', 'Connect to and create sessions inside WSL.', 0],
  ]],
  ['Agents', [
    ['Tool search v2', 'Defer eligible tools until Copilot needs them, reducing the context used by tool definitions while keeping app workflow tools immediately available.', 1],
    [HYDRA_NAME, 'Let Copilot choose a model or combine work from multiple models for your task. Try HydraFusion instead of choosing a single model yourself. Research preview: experimental behavior may change.', 0],
    ['Rubber-duck agent', 'Enable the rubber-duck subagent for constructive feedback on code and designs (Claude and GPT models only). Adds the /rubber-duck slash command to the composer. Restart the app after toggling.', 1],
    ['Computer Use', 'Register the bundled Computer Use plugin so sessions can control local desktop apps.', 1],
    ['Background agents and shell tasks', 'Show and manage background agents and shell tasks from one Background pill in Sessions. Group work as Running, Idle, or Completed; inspect shell details; stop or cancel active work; and clear completed work.', 1],
  ]],
  ['System', [
    ['Use bundled git', 'Use the git binary shipped with the app instead of the system-installed one. Falls back to your system git when off.', 1],
    ['WebSocket terminal transport', 'Carry the embedded terminal\'s PTY traffic over the app\'s WebSocket instead of Tauri IPC. Restart the app after toggling.', 0],
    ['Companion device integration', 'Connect supported companion devices to navigate sessions, use voice input, and control integrations.', 0],
  ]],
  ['Issues', [
    ['Issue and pull request editing', 'Turn on editing actions for issues and pull requests: edit titles and descriptions, edit, delete, and hide comments, and show an edited indicator. Every action applies to both issues and pull requests, in the detail and workspace views.', 1],
    ['Closing issue references', 'Show the pull requests that close an issue and the issues that a pull request closes.', 1],
    ['Pull request hover cards', 'Show a preview card with the repository, opened date, title, state, author, and branches when hovering a pull request link in a conversation.', 0],
  ]],
  ['Other', [
    ['Unlimited PR checks', 'Fetch and show every status check on a pull request instead of capping at the first 100.', 1],
    ['Impeccable design skill', 'Adds /impeccable, a frontend design and UI-craft skill by Paul Bakaus (impeccable.style), bundled under Apache-2.0. Its optional automation scripts need Node 18+ on your PATH; without Node the agent falls back to the design guidance alone.', 0],
    ['Full view for details', 'Open pull requests and issues in a full-width view instead of the side panel.', 0],
    ['Rich composer', 'Use the Lexical-based rich-text editor for prompts, PR and issue comments, and issue creation.', 1],
  ]],
];
const COUNT = GROUPS.reduce((n, [, rows]) => n + rows.length, 0);
// The app's filter: a row shows if its name, description or group has the
// query in it.
const matches = (q, group, [name, text]) => !q || [group, name, text].some(s => s.toLowerCase().includes(q));

// The dialog's nav, in dialog px: rows of 32 from General, with gaps before
// Customize and Experimental. Agency, a staff section, is left out.
const NAV_ROWS = [
  ['settings', 'General', 104.6], ['users-round', 'Accounts', 136.6], ['git-branch', 'Sessions', 168.6],
  ['swatch-book', 'Themes', 200.6], ['accessibility', 'Accessibility', 232.6], ['mic', 'Voice dictation', 264.6],
  ['mouse-pointer-click', 'Computer Use', 296.6], ['blocks', 'Customize', 344.6], ['cpu', 'Model providers', 376.6],
  ['flask-conical', 'Experimental', 424.6],
];
const EXPERIMENTAL = NAV_ROWS.length - 1;
// The projects under it, as in the sidebar. The two on GitHub show their
// owner's avatar.
const NAV_PROJECTS = [['handoff-bench', 499], ['local-auto', 531], ['markdoc', 563, 1], ['fledglingv3', 595, 1]];

// ---------------------------------------------------------------- switch
// Primer's small switch. Its track is a gradient four times its width that
// slides from grey to blue in 125 ms while the thumb moves 12 px in 150 ms.
// On, the thumb's edge goes white and the track loses its ring. Hover
// darkens both colours.
const SW_ON = ['#0969da', '#0860ca'];
const SW_OFF = ['#e6eaef', '#dce2e8'];
const wipeEase = bezier(.26, .75, .38, .45);
const slideEase = bezier(.4, 0, .2, 1);
function setSwitch({ track, thumb }, wipe, slide, hot = 0) {
  const on = mix(SW_ON[0], SW_ON[1], hot), off = mix(SW_OFF[0], SW_OFF[1], hot);
  track.style.background = `linear-gradient(to right, ${on} 35%, ${off} 65%) ${r3(100 - 100 * wipe)}% 0 / 160px 100% no-repeat`;
  track.style.boxShadow = `inset 0 0 0 1px rgba(214, 221, 228, ${r3(1 - wipe)})`;
  thumb.style.borderColor = mix('#c3cad2', '#ffffff', wipe);
  thumb.style.transform = slide ? `translateX(${px(12 * slide)})` : 'none';
}
function buildSwitch(parent, on) {
  const track = h('div', 'sw', parent);
  const sw = { track, thumb: h('i', null, track) };
  setSwitch(sw, on, on);
  return sw;
}

// ---------------------------------------------------------------- dialog
// Settings over the dimmed window (screenshots 07 and 10), 661 tall to fit
// this window where the app's is 761. Its children are in dialog px: the nav
// on the left, a page on the right from x 260 to 900.
const DIALOG = { x: 226, y: 46, w: 920, h: 661 };
const PANE = { x: 260, w: 640, right: 900 };
const SMALL = { size: 12, line: 18 };
// Nav rows: hover, pressed and selected fills.
const NAV_FILL = { hover: '#f3f5f6', down: '#e9ecef', selected: '#f0f2f3' };
// The scroll track runs from under the title to the bottom edge.
const TRACK = { x: 911, y: 52, h: 597 };
const width = node => node.getBoundingClientRect().width;
// A plain box in its parent's px.
function block(parent, x, y, w, height, background) {
  const node = place(h('div', null, parent), x, y, w, height);
  node.style.position = 'absolute';
  if (background) node.style.background = background;
  return node;
}

function buildSettings(win, queries) {
  const modal = h('div', 'layer', win);
  const backdrop = place(h('div', 'backdrop', modal), 0, 14, W, H - 14);
  const dialog = place(h('div', 'dialog', modal), DIALOG.x, DIALOG.y, DIALOG.w, DIALOG.h);
  dialog.style.overflow = 'hidden';
  block(dialog, 239, 0, 1, DIALOG.h, '#f4f6f8');

  // Who's signed in, the settings search and the sections.
  image(dialog, 'avatar', 'assets/avatar.png', 20, 20, 28, 28);
  label(dialog, 'Burke Holland', 58, 15, { ...SMALL, weight: 600 });
  label(dialog, '@burkeholland', 58, 33, { ...SMALL, color: MUTED });
  const search = place(h('div', 'sfield', dialog), 12, 64, 216, 28);
  icon(search, 'search', 11, 6.5, 16, MUTED);
  label(search, 'Search settings…', 34, 5.5, { ...SMALL, color: HINT });
  // Each row has a fill under it for hover, press and selection.
  const pills = [];
  const row = (top, text) => {
    const pill = place(h('div', 'snav', dialog), 12, top, 216, 32);
    pills.push({ pill, box: { x: 12, y: top, w: 216, h: 32 }, text });
    label(dialog, text, 46, top + 6);
  };
  for (const [name, text, top] of NAV_ROWS) {
    row(top, text);
    icon(dialog, name, 22, top + 8, 16, ICON_INK);
  }
  const badge = place(h('div', 'pbadge', dialog), 167.3, 302.8, 53.2, 20.8);
  h('i', null, badge);
  const preview = label(badge, 'Preview', 0, 0, { size: 12, line: 20.8, color: MUTED, weight: 600 });
  preview.style.left = px((53.2 - width(preview)) / 2);
  label(dialog, 'Projects', 20, 472.6, { ...SMALL, color: MUTED });
  for (const [text, top, avatar] of NAV_PROJECTS) {
    row(top, text);
    if (avatar) image(dialog, 'avatar', 'assets/avatar.png', 22, top + 8, 16, 16).style.borderRadius = px(3);
    else icon(dialog, 'folder', 22, top + 8, 16, ICON_INK);
  }

  // The pages share the close button.
  const page = title => {
    const node = h('div', 'layer', dialog);
    label(node, title, 261, 16, { size: 14, weight: 600 });
    return node;
  };
  const general = page('General');
  buildGeneral(general);
  const experimental = page('Experimental');
  const filtered = buildExperimental(experimental, queries);
  icon(dialog, 'x', 884.1, 18.05, 16, ICON_INK);
  return { modal, backdrop, dialog, search, pills, general, experimental, ...filtered };
}

// A scroll thumb for a page whose content ends at `bottom`. `on` says if the
// content overflows, which is when the app shows it.
function scrollThumb(page, bottom) {
  const node = place(h('div', 'thumb', page), TRACK.x, TRACK.y, 6, 0);
  const content = bottom + 24 - TRACK.y;
  const seen = DIALOG.h - TRACK.y;
  node.style.height = px(TRACK.h * Math.min(1, seen / content));
  const on = content > seen;
  node.style.visibility = on ? 'inherit' : 'hidden';
  return { node, on };
}

// ---------------------------------------------------------------- General
// The top of General, as the app has it: the version card, updates, where
// repositories are stored, the theme and startup. More settings follow below
// the fold, which the scroll thumb accounts for.
const GENERAL_BOTTOM = 1580;
const SWATCHES = ['#cf222e', '#4d2d00', '#116329', '#1b7c83', '#0969da', '#8250df'];
function button(parent, text, right, top) {
  const node = h('div', 'sbtn', parent, text);
  node.style.right = px(right);
  node.style.top = px(top);
  return node;
}
function setting(page, top, title, text, on) {
  label(page, title, PANE.x, top);
  label(page, text, PANE.x, top + 20, { color: MUTED });
  if (on == null) return;
  const { track } = buildSwitch(page, on);
  Object.assign(track.style, { position: 'absolute', margin: '0' });
  place(track, 860.3, top + 12.3);
}
function buildGeneral(page) {
  const version = place(h('div', 'vcard', page), PANE.x, 64, PANE.w, 74);
  mark(place(h('div', 'vicon', version), 13, 13, 48, 48), 8, 8, 32, FG);
  label(version, 'GitHub v1.0.90', 69, 16, { weight: 600 });
  label(version, 'Up to date. Last checked on Sep 30, 2026, at 11:52 AM.', 69, 38, { color: MUTED });
  button(version, 'Check for updates', 13, 23);
  setting(page, 174, 'Automatically check for updates', 'Check for new versions in the background. When off, you can still check manually at any time.', 1);
  setting(page, 252, 'Storage location', 'Where repositories are stored.');
  button(page, 'Change location…', 20, 259);
  place(h('div', 'sbox', page), PANE.x, 302, PANE.w, 44);
  icon(page, 'folder', 272, 316, 16, ICON_INK);
  label(page, 'C:\\Users\\burke\\GitHub Copilot', 296, 314, { size: 12 }).classList.add('mono');
  icon(page, 'copy', 844, 316, 16, ICON_INK);
  icon(page, 'external-link', 872, 316, 16, ICON_INK);
  setting(page, 382, 'Current theme', 'Customize the app\'s color palette.');
  // The theme card: a small picture of the app in Light, its colours and
  // the button that changes it.
  const theme = place(h('div', 'vcard', page), PANE.x, 432, PANE.w, 84);
  const mini = block(theme, 12, 12, 100, 60, '#ffffff');
  Object.assign(mini.style, { overflow: 'hidden', borderRadius: '4px', boxShadow: 'inset 0 0 0 1px #d8dee4' });
  block(mini, 0, 0, 27, 60, '#f6f8fa').style.boxShadow = 'inset -1px 0 0 #e6eaee';
  for (let i = 0; i < 5; i++) block(mini, 5, 9 + 7 * i, i ? 15 : 12, 3, i === 1 ? '#d1d9e0' : '#e1e6eb').style.borderRadius = '1.5px';
  block(mini, 35, 9, 38, 4, '#d1d9e0').style.borderRadius = '2px';
  for (const [y, w] of [[19, 55], [26, 47], [33, 52]]) block(mini, 35, y, w, 3, '#e6eaee').style.borderRadius = '1.5px';
  const box = block(mini, 35, 44, 57, 10, '#ffffff');
  Object.assign(box.style, { borderRadius: '3px', boxShadow: 'inset 0 0 0 1px #d1d9e0' });
  block(box, 49, 3, 4, 4, '#0969da').style.borderRadius = '50%';
  label(theme, 'Light', 128, 20, { weight: 600 });
  SWATCHES.forEach((color, i) => { block(theme, 128 + 14 * i, 47, 10, 10, color).style.borderRadius = '50%'; });
  button(theme, 'Change theme', 12, 28);
  setting(page, 552, 'Start on system start', 'Automatically launch GitHub Copilot when you log in to your computer.', 0);
  setting(page, 630, 'Show in system tray', 'Show the GitHub Copilot icon in the system tray.', 1);
  scrollThumb(page, GENERAL_BOTTOM);
}

// ---------------------------------------------------------------- Experimental
// The page in screenshot 10: a note, the filter, which has focus when the
// page opens, and the experiments in groups. There's a list for each result
// the filter gives while "hydra" is typed; pose shows the one for the text.
const LIST_TOP = 184.67;
function buildExperimental(page, queries) {
  label(page, 'Early-access features that may change or be removed. Help shape the product by trying them out and sharing', PANE.x, 65.8, { color: MUTED });
  label(page, 'feedback.', PANE.x, 85.6, { color: MUTED });
  const filter = place(h('div', 'sfield focus', page), PANE.x, 128.67, PANE.w, 28);
  icon(filter, 'search', 7.3, 7.2, 14, MUTED);
  const field = buildField(filter, `Filter ${COUNT} experiments…`, '', { x: 24.1, y: 4, size: 13, line: 20 });
  const clear = icon(filter, 'x', 617.9, 7.1, 14, MUTED);
  const lists = [], byQuery = new Map();
  for (const query of queries) {
    const q = query.trim().toLowerCase();
    const shown = GROUPS.map(([group, rows]) => [group, rows.filter(row => matches(q, group, row))]).filter(([, rows]) => rows.length);
    const names = shown.flatMap(([, rows]) => rows.map(([name]) => name));
    let list = lists.find(other => other.names.join('|') === names.join('|'));
    if (!list) {
      const layer = h('div', 'layer', page);
      const node = place(h('div', 'xlist', layer), PANE.x, LIST_TOP, PANE.w);
      const hydra = [];
      for (const [group, rows] of shown) {
        const section = h('div', 'xgroup', node);
        h('h2', null, section, group);
        const body = h('div', 'xrows', section);
        for (const [name, text, on] of rows) {
          const row = h('div', 'xrow', body);
          h('p', null, h('div', 'tx', row, name), text);
          const sw = buildSwitch(row, on);
          if (name === HYDRA_NAME) hydra.push(sw);
        }
      }
      const bottom = LIST_TOP + node.offsetHeight;
      list = { layer, names, queries: [], hydra, bottom, thumb: scrollThumb(layer, bottom).on };
      lists.push(list);
    }
    list.queries.push(query);
    byQuery.set(query, list);
  }
  return { filter, field, clear, lists, byQuery };
}

// ---------------------------------------------------------------- pointer
// The gear's square in window px, and the composer's text area, where the
// pointer is an I-beam until Settings opens.
const GEAR = { x: 238.18, y: H - 35.64, w: 28, h: 28 };
const EDITOR = { x: COMPOSER.x + 1, y: COMPOSER.y + 1, w: COMPOSER.w - 2, h: 50 };
// Dialog px to desktop px, and back.
const desk = ([x, y]) => [WIN.x + DIALOG.x + x, WIN.y + DIALOG.y + y];
const toDialog = ([x, y]) => [x - WIN.x - DIALOG.x, y - WIN.y - DIALOG.y];

// `rest` is where the offline film left the pointer; `sw` is HydraFusion's
// switch once "hydra" is in, in dialog px.
function makePointer(D, sw, rest) {
  const nav = D.pills[EXPERIMENTAL].box;
  const P = {
    rest,
    gear: [WIN.x + GEAR.x + 14.6, WIN.y + GEAR.y + 14.9],
    nav: desk([80, nav.y + nav.h / 2 + .5]),
    // On the switch's thumb, a little left of and below its middle.
    sw: desk([sw.x + .42 * sw.w, sw.y + .575 * sw.h]),
    // Along the word Experimental in the nav.
    word: desk([88, nav.y + 17.5]),
    along: desk([110, nav.y + 18.5]),
  };
  if (!inside([P.gear[0] - WIN.x, P.gear[1] - WIN.y], GEAR)) throw new Error('The pointer misses the gear');
  if (!inside(toDialog(P.nav), nav)) throw new Error('The pointer misses Experimental');
  if (!inside(toDialog(P.sw), sw)) throw new Error('The pointer misses the switch');
  const path = makePath(rest);
  const moves = {};
  moves.gear = path.reach(P.gear, CUE.toGear[0], CUE.toGear[1], 70);
  path.click(CUE.gear);
  // The hand relaxes a little after a click.
  moves.relax = path.move([P.gear[0] + 2, P.gear[1] + 3], CUE.relax[0], CUE.relax[1], 1);
  moves.nav = path.reach(P.nav, CUE.toNav[0], CUE.toNav[1], 14);
  path.click(CUE.nav);
  moves.sw = path.reach(P.sw, CUE.toSwitch[0], CUE.toSwitch[1], -30);
  path.click(CUE.flip);
  moves.settle = path.move([P.sw[0] + 2, P.sw[1] + 3], CUE.flip + .2, .3, 1);
  moves.word = path.reach(P.word, CUE.toLabel[0], CUE.toLabel[1], 30);
  moves.along = path.move(P.along, CUE.drift[0], CUE.drift[1], 2);
  return { path: path.check(), P, moves };
}

// Plays the hover rules forward in 1 ms steps. The gear's square eases in
// and out in 150 ms and the nav rows in 60 ms; the switch darkens under the
// pointer in 120 ms. Over a text field the pointer is an I-beam: the
// composer before Settings opens, then the search, then the filter. B holds
// the dialog's boxes in dialog px.
function simulate(path, D, B, typed) {
  const n = Math.round(DURATION * 1000) + 1;
  const gearHot = new Float32Array(n);
  const pillHot = D.pills.map(() => new Float32Array(n));
  const switchHot = new Float32Array(n);
  const beam = new Uint8Array(n);
  const ease = (list, i, target, step) => {
    const was = i ? list[i - 1] : 0;
    list[i] = target > was ? Math.min(target, was + step) : Math.max(target, was - step);
  };
  const entries = [], crossings = [];
  let over = -1;
  for (let i = 0; i < n; i++) {
    const t = i / 1000;
    const p = path.pointer(t);
    const w = [p[0] - WIN.x, p[1] - WIN.y];
    const q = toDialog(p);
    const open = t >= CUE.open;
    ease(gearHot, i, !open && inside(w, GEAR) ? 1 : 0, 1 / 150);
    const pill = open ? D.pills.findIndex(({ box }) => inside(q, box)) : -1;
    if (pill !== over) {
      if (pill >= 0) entries.push([r3(t), D.pills[pill].text]);
      over = pill;
    }
    pillHot.forEach((list, k) => ease(list, i, k === pill ? 1 : 0, 1 / 60));
    const sw = t >= CUE.page ? D.byQuery.get(typed.text(t)).sw : null;
    ease(switchHot, i, sw && inside(q, sw) ? 1 : 0, 1 / 120);
    beam[i] = open ? inside(q, t < CUE.page ? B.search : B.filter) : inside(w, EDITOR);
    if (i && beam[i] !== beam[i - 1]) crossings.push([r3(t), beam[i] ? 'I-beam' : 'arrow']);
  }
  return { gearHot, pillHot, switchHot, beam, entries, crossings };
}

// ---------------------------------------------------------------- camera
// A shot pushed in by k about the point f (desktop px), which stays put on
// screen.
const about = (shot, [fx, fy], k, limit = inWin) => limit({ x: fx + (shot.x - fx) / k, y: fy + (shot.y - fy) / k, s: shot.s * k });
// Gets going gently and takes its time arriving.
const push = bezier(.5, .05, .25, 1);

function makeShots(P, B) {
  const whole = look(DW / 2, DH / 2, 1.05, keep);
  const dialog = look(...desk([DIALOG.w / 2, DIALOG.h / 2]), 1.22);
  return {
    whole,
    // The whole dialog, then one long creep toward the filter and
    // HydraFusion's row, with the nav still in frame.
    dialog,
    dialogIn: about(dialog, desk([DIALOG.w / 2, B.filter.y]), 1.18),
  };
}

// ---------------------------------------------------------------- film
const sample = (list, t) => list[clamp(Math.round(t * 1000), 0, list.length - 1)];

export default async function settingsHydra() {
  await loadAssets([
    ...SESSION_ICONS, 'wifi-off', 'users-round', 'swatch-book', 'accessibility', 'mouse-pointer-click', 'cpu',
    'flask-conical', 'x', 'copy', 'external-link',
  ], ['assets/avatar.png']);
  const stage = buildStage();
  const { win, ui, gear, session: side, showSession } = buildWindow(stage, { session: { project: 'local-auto', name: TITLE } });
  // Home is only built to find where the offline film left the pointer.
  const home = buildHome(ui, { chip: 'Auto · Efficiency' });
  home.page.style.visibility = 'hidden';
  const S = buildSession(ui, { chip: 'Auto · Efficiency' });
  S.rename(TITLE);
  showSession(true);
  side.dot.style.visibility = 'hidden';
  const sideSpin = spinner(side.spin, 0, 0);
  // The gear's square, which lights under the pointer.
  const square = place(h('div', 'gsq', ui), GEAR.x, GEAR.y, GEAR.w, GEAR.h);
  ui.insertBefore(square, gear);
  const typed = typing(QUERY, CUE.type[0], CUE.type[1], { seed: 3 });
  const D = buildSettings(win, ['', ...typed.keys.map(([, text]) => text)]);
  const cursor = buildCursor(stage);
  const beam = buildIBeam(stage);
  await imagesDecoded();

  // The session as the offline film left it: finished, with Copilot idle.
  const tl = S.tl;
  const thread = buildThread(tl);
  tl.finish(OFF + DURATION);

  // Where things are in dialog px, measured before anything moves.
  const inDialog = node => {
    const r = rect(node, WIN);
    return { x: r.x - DIALOG.x, y: r.y - DIALOG.y, w: r.w, h: r.h };
  };
  for (const list of D.lists) {
    if (!list.hydra.length) continue;
    list.sw = inDialog(list.hydra[0].track);
    list.row = inDialog(list.hydra[0].track.parentNode);
  }
  // From "hy" on, HydraFusion is the only match.
  for (const [, text] of typed.keys.slice(1)) {
    const { names } = D.byQuery.get(text);
    if (names.join('|') !== HYDRA_NAME) throw new Error(`"${text}" leaves ${names.join(', ')}`);
  }
  const hydra = D.byQuery.get(QUERY);
  const B = { search: inDialog(D.search), filter: inDialog(D.filter), sw: hydra.sw, row: hydra.row };
  const sendBox = rect(home.send, WIN);
  const { path, P, moves } = makePointer(D, B.sw, [WIN.x + sendBox.x + 68, WIN.y + sendBox.y + 82]);
  const sim = simulate(path, D, B, typed);
  const shots = { start: endShot(tl, thread), ...makeShots(P, B) };
  const camera = makeCamera([
    // From where the offline film left off, back out as the hand goes down
    // to the gear, so Settings opens in the whole frame.
    [0, shots.start],
    [.9, shots.whole, inOut],
    // Into the dialog, then one long, slow creep toward the filter and
    // HydraFusion through to the cut.
    [2.1, shots.dialog, push],
    [DURATION + .5, shots.dialogIn, glide],
  ]);

  const pose = t => {
    t = clamp(t, 0, DURATION);
    film(stage, FLAT ? wide : camera(t));
    const o = OFF + t;
    const p = path.pointer(t);
    const q = toDialog(p);
    const down = path.down(t);

    // Copilot finished in the offline film.
    tl.pose(o);
    S.composer.running(false);
    side.spin.style.visibility = 'hidden';
    sideSpin(o);
    // The composer lost focus to the click that closed Quick Settings.
    showText(S.composer, '', false, null);

    // The gear's square lights under the pointer and darkens while pressed.
    const pressed = down && t < CUE.open;
    square.style.background = pressed ? '#dfe4e8' : '#e8ecef';
    square.style.opacity = pressed ? 1 : sample(sim.gearHot, t);

    // Settings fades in and settles from a touch smaller, on General.
    const opened = t >= CUE.open, onPage = t >= CUE.page;
    D.modal.style.visibility = opened ? 'inherit' : 'hidden';
    const u = out(span(t, CUE.open, CUE.open + .18));
    D.backdrop.style.opacity = u;
    D.dialog.style.opacity = u;
    D.dialog.style.transform = u >= 1 ? 'none' : `scale(${lerp(.96, 1, u)})`;
    D.general.style.visibility = onPage ? 'hidden' : 'inherit';
    D.experimental.style.visibility = onPage ? 'inherit' : 'hidden';

    // The nav row under the pointer lights and darkens while pressed.
    // Experimental is selected once its click comes up.
    const selected = onPage ? EXPERIMENTAL : 0;
    D.pills.forEach(({ pill, box }, i) => {
      const press = opened && down && inside(q, box);
      pill.style.background = i === selected ? NAV_FILL.selected : press ? NAV_FILL.down : NAV_FILL.hover;
      pill.style.opacity = i === selected || press ? 1 : sample(sim.pillHot[i], t);
    });

    // The filter has focus as the page opens, and only the experiments that
    // match its text show. Clicking the switch takes the focus.
    const text = typed.text(t);
    const list = D.byQuery.get(text);
    for (const other of D.lists) other.layer.style.visibility = other === list ? 'inherit' : 'hidden';
    const focused = onPage && t < CUE.flip;
    D.filter.classList.toggle('focus', focused);
    showText(D.field, text, focused && caretOn(t, Math.max(CUE.page, typed.lastKey(t))), null);
    D.clear.style.visibility = text ? 'inherit' : 'hidden';
    // HydraFusion goes on as the click comes up.
    const wipe = wipeEase(span(t, CUE.on, CUE.on + .125)), slide = slideEase(span(t, CUE.on, CUE.on + .15));
    for (const sw of list.hydra) setSwitch(sw, wipe, slide, sample(sim.switchHot, t));

    // An I-beam over the text fields.
    const overText = !FLAT && sample(sim.beam, t) === 1;
    cursor.style.visibility = FLAT || overText ? 'hidden' : 'visible';
    beam.style.visibility = overText ? 'visible' : 'hidden';
    pointAt(cursor, p);
    beamAt(beam, p);
  };

  const box = b => [b.x, b.y, b.w, b.h].map(r3);
  return {
    pose,
    duration: DURATION,
    info: {
      off: r3(OFF),
      cue: Object.fromEntries(Object.entries(CUE).map(([k, v]) => [k, Array.isArray(v) ? v.map(r3) : r3(v)])),
      said: Object.fromEntries(Object.entries(WORDS).map(([k, v]) => [k, r3(v)])),
      typed: typed.keys.map(([k, s]) => [r3(k), s]),
      points: Object.fromEntries(Object.entries(P).map(([k, v]) => [k, v.map(r3)])),
      moves: Object.fromEntries(Object.entries(moves).map(([k, m]) => [k, [r3(m.t0), r3(m.t0 + m.dur)]])),
      entries: sim.entries,
      crossings: sim.crossings,
      lists: D.lists.map(l => [l.queries.join('|'), l.names.length, r3(l.bottom), l.thumb]),
      boxes: Object.fromEntries(Object.entries(B).map(([k, b]) => [k, box(b)])),
      shots: Object.fromEntries(Object.entries(shots).map(([k, v]) => [k, [r3(v.x), r3(v.y), r3(v.s)]])),
    },
  };
}
