// The GitHub Copilot app and the desktop around it, rebuilt as HTML. Every
// number is in CSS px, measured from the reference screenshot of the app
// (work/home-window.png) and the screen recording of the model picker.
import { clamp, lerp, out, span } from './motion.mjs';
import {
  AUTOPILOT, COMPARE, DEFAULT_CHIP, DEFAULT_MODEL, DW, DH, FG, H, HINT, ICON, ICON_INK, INTERACTIVE, MODES, MUTED, NS, USER, W, WIN,
  h, icon, image, label, logo, mark, panelIcon, place, px, rect, value,
} from './kit.mjs';

export const NAV = [['plus', 'New'], ['git-pull-request', 'Pull requests'], ['circle-dot', 'Issues'], ['calendar-check-2', 'Automations'], ['blocks', 'Customize'], ['ellipsis', 'More']];
export const NAV_TOP = 68.5;
// The reference screenshot had a seventh nav row (an internal feature, left
// out here), so everything below the nav moves up by the rows that are gone.
const NAV_LIFT = 32 * (7 - NAV.length);
// The last two rows sit about 2 px further left in the reference screenshot.
// The sidebar's projects. Use sample names for a video that must not show real ones.
export const PROJECTS = [['message-circle', 'Chats'], ['folder-open', 'handoff-bench'], ['folder', 'local-auto'], ['folder', 'markdoc', -1.92], ['folder', 'fledglingv3', -1.92]];
export const PROJECTS_TOP = 336.5 - NAV_LIFT;
const SUGGESTIONS = [
  ['file-text', 'Summarize this project for someone', 'new to the team.'],
  ['shield-check', 'Scan for security vulnerabilities and', 'fix them.'],
  ['zap', 'Find performance bottlenecks and', 'optimize them.'],
];
export const MENU_ROWS = [
  { label: 'Auto', top: 4, toggle: true },
  { label: 'Model', top: 41 },
  { label: 'Effort', top: 69, value: 'Medium' },
  { label: 'Context window', top: 97, context: true },
];
export const MODEL_ROW = 1;
// With Auto on, the rows under the divider give way to what Auto optimizes
// for, and Efficiency is checked. Hit tests number these rows from LEVEL_ROW.
export const LEVELS = [
  { label: 'Efficiency', top: 69 },
  { label: 'Balance', top: 97 },
  { label: 'Intelligence', top: 125 },
];
export const CHOSEN = 0;
export const LEVEL_ROW = 10;
export const MENU = { w: 272, h: 129, auto: 157 };
export const LIST = { w: 288, first: 68.7, pitch: 28 };
export const CARD = { w: 240, h: 192, gap: 4 };
export const PLACEHOLDER = INTERACTIVE.home;

// ---------------------------------------------------------------- desktop
export function buildStage() {
  const stage = place(h('div', null, document.body), 0, 0, DW, DH);
  stage.id = 'stage';
  h('div', null, stage).id = 'wallpaper';
  return stage;
}

export function buildIcon(stage) {
  const dicon = place(h('div', 'dicon', stage), ICON.x - 38, ICON.y - 28, 76, 88);
  const tile = h('div', 'tile', dicon);
  h('div', 'label', dicon, 'GitHub Copilot');
  return { dicon, tile };
}

export function buildCursor(stage) {
  const cursor = document.createElementNS(NS, 'svg');
  cursor.id = 'cursor';
  cursor.setAttribute('viewBox', '0 0 14 21');
  cursor.setAttribute('width', 14);
  cursor.setAttribute('height', 21);
  cursor.innerHTML = '<path d="M.5 .5V16.8L4.4 13.1L7 19L9.6 17.9L7.1 12.1H12.1Z" fill="#fff" stroke="#000" stroke-width="1" stroke-linejoin="round"/>';
  stage.appendChild(cursor);
  if (COMPARE) cursor.style.display = 'none';
  return cursor;
}
// The pointer's tip sits half a pixel inside the arrow's outline.
export const pointAt = (cursor, p) => { cursor.style.transform = `translate(${px(p[0] - .5)}, ${px(p[1] - .5)})`; };

// Over text the pointer is an I-beam, black with a white edge like Windows'
// own. Its hot spot is its middle.
export const IBEAM = [4.5, 9];
export function buildIBeam(stage) {
  const beam = document.createElementNS(NS, 'svg');
  beam.id = 'ibeam';
  beam.setAttribute('viewBox', '0 0 9 18');
  beam.setAttribute('width', 9);
  beam.setAttribute('height', 18);
  const d = 'M1 1.2C2.6 1.2 3.9 1.6 4.5 2.6C5.1 1.6 6.4 1.2 8 1.2M4.5 2.6V15.4M1 16.8C2.6 16.8 3.9 16.4 4.5 15.4C5.1 16.4 6.4 16.8 8 16.8';
  beam.innerHTML = `<g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="${d}" stroke="#fff" stroke-width="3"/><path d="${d}" stroke="#000" stroke-width="1.1"/></g>`;
  Object.assign(beam.style, { overflow: 'visible', filter: 'drop-shadow(.5px 1px 1px rgba(0, 0, 0, .3))' });
  stage.appendChild(beam);
  if (COMPARE) beam.style.display = 'none';
  return beam;
}
export const beamAt = (beam, p) => { beam.style.transform = `translate(${px(p[0] - IBEAM[0])}, ${px(p[1] - IBEAM[1])})`; };

// ---------------------------------------------------------------- window
// The window with its title bar and sidebar. `ui` holds the page, `pops` the
// menus above it. With a `session` ({ project, name }), the sidebar can list
// that session under its project (see buildSidebar). `projects` replaces the
// sidebar's project list.
export function buildWindow(stage, { active = 0, session, projects = PROJECTS } = {}) {
  const win = place(h('div', null, stage), WIN.x, WIN.y, W, H);
  win.id = 'win';
  buildTitlebar(win);
  place(h('div', 'sidebar', win), 0, 14, 279, H - 14);
  const ui = h('div', 'layer', win);
  const side = buildSidebar(ui, active, session, projects);
  const pops = h('div', 'layer', win);
  return { win, ui, pops, ...side };
}

function buildTitlebar(win) {
  const bar = place(h('div', 'titlebar', win), 0, 0, W, 14);
  mark(bar, 2.95, 2.35, 8.1, '#24292f');
  place(h('div', 'tb-title', bar, 'GitHub Copilot'), 12.4, 0.6);
  const caps = document.createElementNS(NS, 'svg');
  caps.setAttribute('width', 70);
  caps.setAttribute('height', 14);
  caps.classList.add('ic');
  const r = 2.9, y = 6.7, a = 70 - 57.9, b = 70 - 34.8, c = 70 - 11.5;
  caps.innerHTML = `<g fill="none" stroke="#404345" stroke-width=".64">
    <path d="M${a - r} ${y}H${a + r}"/>
    <rect x="${b - r}" y="${y - r}" width="${2 * r}" height="${2 * r}" rx="1"/>
    <path d="M${c - r} ${y - r}L${c + r} ${y + r}M${c + r} ${y - r}L${c - r} ${y + r}"/></g>`;
  bar.appendChild(caps);
  place(caps, W - 70, 0);
}

function navRow(parent, name, text, top, dx = 0) {
  return [icon(parent, name, 17.24 + dx, top + 7.36, 16, ICON_INK), label(parent, text, 41.28 + dx, top + 6.3)];
}

// A session listed under its project: a dot where the project's icon is, or
// while Copilot works on it, a spinner (drawn by the scene into `spin`).
function sessionRow(parent, text, top) {
  const row = place(h('div', 'layer', parent), 0, top, 279, 32);
  const dot = place(h('div', 'sdot', row), 25.24 - 3.5, 16 - 3.5, 7, 7);
  const spin = place(h('div', 'layer', row), 25.24, 16);
  const name = label(row, text, 41.28, 6.3);
  return { row, dot, spin, name };
}

// The sidebar. `active` is the highlighted nav row; the hover highlight is a
// second, lighter one that scenes move under the pointer. A session's row
// stays hidden until `showSession(true)`: then its project opens, the rows
// below move down to make room, and the session takes the highlight.
// `showSession(true, false)` lists the session but leaves the highlight on
// the page the app is on, for a session that works while the person is
// somewhere else.
function buildSidebar(ui, active, session, projects) {
  panelIcon(ui, 17.92, 28.8, ICON_INK);
  icon(ui, 'search', 188.08, 27.86, 16, ICON_INK);
  icon(ui, 'chevron-left', 216.94, 27.86, 16, ICON_INK);
  icon(ui, 'chevron-right', 244.18, 27.86, 16, '#7a8492');
  const navHover = place(h('div', 'navhl hover', ui), 8, NAV_TOP, 262, 32);
  navHover.style.visibility = 'hidden';
  const navActive = place(h('div', 'navhl', ui), 8, NAV_TOP + 32 * active, 262, 32);
  NAV.forEach(([name, text], i) => navRow(ui, name, text, NAV_TOP + 32 * i));
  label(ui, 'Projects', 16, 316.68 - NAV_LIFT, { size: 12, line: 16, color: MUTED });
  icon(ui, 'filter-list', 216.3, 314.24 - NAV_LIFT, 16, ICON_INK);
  icon(ui, 'plus', 243.86, 314.64 - NAV_LIFT, 16, ICON_INK);
  let side = null, below = [], closed = null, opened = null;
  projects.forEach(([name, text, dx], i) => {
    const top = PROJECTS_TOP + 32 * i;
    const nodes = navRow(ui, name, text, top, dx);
    if (side) below.push(...nodes);
    if (session && text === session.project) {
      closed = nodes[0];
      opened = icon(ui, 'folder-open', 17.24 + (dx || 0), top + 7.36, 16, ICON_INK);
      side = sessionRow(ui, session.name, top + 32);
    }
  });
  image(ui, 'avatar', 'assets/avatar.png', 10.86, H - 32.28, 20, 20);
  label(ui, USER, 39.5, H - 31.8);
  icon(ui, 'message-circle-heart', 215.96, H - 29.64, 16, ICON_INK);
  const gear = icon(ui, 'settings', 244.18, H - 29.64, 16, ICON_INK);
  const homeTop = NAV_TOP + 32 * active;
  const showSession = (on, selected = on) => {
    if (!side) return;
    side.row.style.visibility = on ? 'inherit' : 'hidden';
    closed.style.visibility = on ? 'hidden' : 'inherit';
    opened.style.visibility = on ? 'inherit' : 'hidden';
    for (const node of below) node.style.transform = on ? 'translateY(32px)' : '';
    navActive.style.top = px(on && selected ? side.row.offsetTop : homeTop);
  };
  showSession(false);
  return { navHover, navActive, gear, session: side, showSession };
}
// Where a sidebar nav row is, in window px.
export const navRect = i => ({ x: 8, y: NAV_TOP + 32 * i, w: 262, h: 32 });

// ---------------------------------------------------------------- home
// The new session page: the big mark, the composer and three suggestions.
// `page` is a layer of its own so a scene can swap it for another page.
export function buildHome(ui, { chip: chipText = DEFAULT_CHIP, prompt = '', project = 'local-auto', branch = 'master', mode = INTERACTIVE.label } = {}) {
  const page = h('div', 'layer', ui);
  // (cx, cy) is the composer's top left corner, centered in the content area.
  const cx = W / 2 - 243.5, cy = H / 2 - 61;
  mark(page, cx + 351.51, cy - 110.34, 63.7, '#57616c', true);

  // The repository bar peeks out below the composer, so it is drawn first.
  const ctx = place(h('div', 'ctxbar', page), cx, cy + 40, 766, 93.2);
  const small = { size: 12, line: 16, color: MUTED };
  icon(ctx, 'folder', 16.64, 66.64, 16, MUTED);
  // The worktree and branch items follow the project's name.
  const name = label(ctx, 'local-auto', 38.3, 66.5, small);
  const base = name.offsetWidth;
  name.textContent = project;
  const dx = name.offsetWidth - base;
  icon(ctx, 'split', 111.76 + dx, 68.43, 12, MUTED).style.transform = 'rotate(90deg)';
  label(ctx, 'New worktree', 130.28 + dx, 66.5, small);
  icon(ctx, 'git-branch', 223.44 + dx, 68.43, 12, MUTED);
  label(ctx, branch, 239.3 + dx, 66.6, small);

  // Children of the composer box sit inside its 1px border.
  const composer = place(h('div', 'composer', page), cx, cy, 766, 96);
  const field = buildField(composer, PLACEHOLDER, prompt);
  const bar = place(h('div', 'cbar', composer), 8, 58);
  icon(h('div', 'cbtn sq', bar), 'plus', 6.64, 6.64, 16, MUTED);
  const modeChip = h('div', 'cbtn', bar, mode);
  const chip = h('div', 'cbtn', bar, chipText);
  icon(composer, 'mic', 698.84, 64.64, 16, MUTED);
  const send = place(h('div', 'send', composer), 730.1, 60);
  icon(send, 'arrow-up', 4, 4, 16, '#fff');

  const cw = 742 / 3;
  const cards = SUGGESTIONS.map(([name, first, second], i) => {
    const card = place(h('div', 'suggest', page), cx + i * (cw + 12), cy + 181.2, cw, 101.2);
    icon(card, name, 16.3, 16.28, 16, '#48535f');
    const text = label(card, '', 16.3, 44);
    text.style.whiteSpace = 'nowrap';
    text.append(first, h('br'), second);
    return card;
  });

  const note = label(page, 'GitHub Copilot uses AI. Check for mistakes.', 279.64, H - 49.7, { size: 12, line: 18, color: MUTED });
  note.style.width = px(W - 279);
  note.style.textAlign = 'center';
  return { page, chip, mode: modeChip, composer, send, cards, ...field };
}

// A prompt field: the placeholder, the typed text and its caret.
export function buildField(parent, placeholder, prompt = '', { x = 12.64, y = 9.56, size = 14, line = 20, width } = {}) {
  const hint = label(parent, placeholder, x, y, { size, line, color: HINT });
  const typed = label(parent, '', x, y, { size, line });
  if (width) {
    for (const node of [hint, typed]) Object.assign(node.style, { width: px(width), whiteSpace: 'pre-wrap' });
  }
  const text = h('span', null, typed);
  const caret = h('span', 'caret', typed);
  caret.style.height = px(line - 2);
  caret.style.visibility = 'hidden';
  const field = { hint, typed, text, caret };
  showText(field, prompt, false);
  return field;
}
// Shows typed text in a field, with the caret after it when focused.
export function showText(field, text, caret, send) {
  if (field.text.textContent !== text) field.text.textContent = text;
  field.hint.style.visibility = text ? 'hidden' : 'inherit';
  field.caret.style.visibility = caret ? 'inherit' : 'hidden';
  // The send button is #25292e at half opacity until there's a prompt to send.
  if (send) send.style.background = text.trim() ? '#25292e' : '';
}

// ---------------------------------------------------------------- model picker
// The menu that opens from the model chip. `model` is the one the app is on
// (a model from kit.mjs): its name and context window fill two of the rows.
// With Auto on, the rows under the divider (`below`) give way to the levels
// and the menu grows to fit them.
export function buildMenu(pops, model = DEFAULT_MODEL) {
  if (typeof model === 'string') throw new Error(`buildMenu takes a model from kit.mjs, not the name "${model}"`);
  const menu = place(h('div', 'pop', pops), 0, 0, MENU.w, MENU.h);
  menu.style.overflow = 'hidden';
  const menuHl = h('div', 'hl', menu);
  const below = h('div', 'layer', menu);
  const levels = h('div', 'layer', menu);
  levels.style.visibility = 'hidden';
  label(levels, 'Optimized for', 12, 47, { size: 12, line: 16, color: MUTED, weight: 600 });
  LEVELS.forEach((row, i) => {
    if (i === CHOSEN) icon(levels, 'check', 12, row.top + 7, 14, MUTED);
    label(levels, row.label, 34, row.top + 4);
  });
  let toggle = null;
  for (const row of MENU_ROWS) {
    if (row.toggle) {
      label(menu, row.label, 12, row.top + 4);
      toggle = place(h('div', 'toggle', menu), 230, row.top + 6);
      h('i', null, toggle);
      continue;
    }
    label(below, row.label, 12, row.top + 4);
    const isModel = MENU_ROWS.indexOf(row) === MODEL_ROW;
    // "400K · 1.1M" on a model's card is its window, then the largest it can be.
    const text = isModel ? model.name : row.context ? (model.context || '').split(' · ')[0] : row.value;
    const node = value(below, text, 238, row.top + 4, MENU.w, { color: MUTED });
    // Like the app, a long model name ends in an ellipsis.
    if (isModel) Object.assign(node.style, { maxWidth: px(176), overflow: 'hidden', textOverflow: 'ellipsis' });
    icon(below, 'chevron-right', 246, row.top + 7, 14, MUTED);
  }
  place(h('div', 'sep', menu), 12, 36, 248, 1);
  return { menu, menuHl, below, levels, toggle };
}
// The Auto switch at u (0 off, 1 on): the knob slides and the track fills.
export function setToggle(toggle, u) {
  toggle.style.background = u <= 0 ? '' : `rgba(0, 110, 219, ${u})`;
  toggle.style.borderColor = u <= 0 ? '' : `rgba(0, 110, 219, ${Math.max(u, .35)})`;
  const knob = toggle.firstChild;
  knob.style.transform = `translateX(${px(14 * out(u))})`;
  knob.style.boxShadow = u > .5 ? 'none' : '';
}
// Auto's state at t, from `start` (on or off) and the clicks that switch it,
// [[time, on], ...]. The switch slides in 200 ms; the rows swap and the menu
// resizes 40 ms after the click, over 180 ms.
export function autoState(t, start, switches) {
  let knob = start ? 1 : 0, swap = knob;
  for (const [c, on] of switches) {
    if (t < c) break;
    const k = span(t, c, c + .2), s = out(span(t, c + .04, c + .22));
    knob = on ? k : 1 - k;
    swap = on ? s : 1 - s;
  }
  return { knob, swap, on: swap >= .5 };
}
// Shows a state from autoState in a menu from buildMenu. The two sets of rows
// dip through nothing as they swap.
export function setAuto({ menu, below, levels, toggle }, { knob, swap }) {
  setToggle(toggle, knob);
  menu.style.height = px(lerp(MENU.h, MENU.auto, swap));
  below.style.opacity = clamp(1 - 2 * swap);
  levels.style.opacity = clamp(2 * swap - 1);
  below.style.visibility = swap < .5 ? 'inherit' : 'hidden';
  levels.style.visibility = swap > .5 ? 'inherit' : 'hidden';
}

// Where the rows of a model list go. Each section is [title, models]; the
// first title sits above the first row and later ones take a 29.4 px gap.
export function listRows(sections) {
  const rows = [], heads = [];
  let top = LIST.first;
  sections.forEach(([title, models], s) => {
    if (s) top += 29.4;
    heads.push({ title, top: top - 21.9 });
    for (const model of models) {
      rows.push({ model, top });
      top += LIST.pitch;
    }
  });
  return { rows, heads, end: top, h: top + 41.3 };
}

// The model list that flies out of the Model row. `checked` is the model the
// app is on.
export function buildList(pops, sections, checked = DEFAULT_MODEL) {
  const rows = listRows(sections);
  const fly = place(h('div', 'pop', pops), 0, 0, LIST.w, rows.h);
  const flyHl = h('div', 'hl', fly);
  label(fly, 'Search models', 12, 8.2, { color: HINT });
  place(h('div', 'sep', fly), 0, 35, LIST.w, 1);
  for (const head of rows.heads) label(fly, head.title, 12, head.top, { size: 12, line: 16, color: MUTED, weight: 600 });
  for (const { model, top } of rows.rows) {
    if (model === checked) icon(fly, 'check', 12, top + 7, 14, FG);
    logo(fly, model.logo, 34, top + 7);
    const name = label(fly, model.name, 56, top + 3.6);
    // A local model shows its provider after its name.
    if (model.suffix) h('span', null, name, ` ${model.suffix}`).style.color = MUTED;
  }
  place(h('div', 'sep', fly), 12, rows.end + 4, 264, 1);
  label(fly, 'More models', 34, rows.end + 12.6);
  icon(fly, 'chevron-right', 262, rows.end + 16, 14, MUTED);
  return { fly, flyHl, rows };
}

// The details card next to the hovered model.
export function buildCard(pops) {
  const card = place(h('div', 'pop card', pops), 0, 0, CARD.w, CARD.h);
  const cardTitle = label(card, '', 12, 8, { size: 12, line: 18, weight: 600 });
  const cardValues = {};
  const pair = (key, text, y) => {
    const row = place(h('div', 'row', card), 12, y, 216);
    h('span', 'k', row, text);
    cardValues[key] = h('span', null, row);
  };
  place(h('div', 'sep', card), 12, 34, 216, 1);
  pair('context', 'Context', 43);
  pair('reasoning', 'Reasoning', 65);
  place(h('div', 'sep', card), 12, 91, 216, 1);
  label(card, 'AI credits per 1M tokens', 12, 100, { size: 12, line: 18, color: MUTED });
  pair('input', 'Input', 122);
  pair('cached', 'Cached input', 144);
  pair('output', 'Output', 166);
  let shown = null;
  const show = model => {
    if (model === shown) return;
    cardTitle.textContent = model.name;
    for (const [key, node] of Object.entries(cardValues)) node.textContent = model[key] ?? '';
    shown = model;
  };
  return { card, show };
}

// Where the picker's popups land, in window px. Like the app (Base UI menus),
// the menu opens below the chip (above it when there's no room) and the model
// list opens to the right of the Model row, flipping up when it would run off
// the window.
export function layoutPicker({ chip: chipNode, menu: menuNode, fly, card, rows }) {
  const chip = rect(chipNode, WIN);
  const below = chip.y + chip.h + 8;
  const menu = { x: chip.x, y: below + MENU.h <= H - 5 ? below : chip.y - 8 - MENU.h, w: MENU.w, h: MENU.h };
  const modelTop = menu.y + MENU_ROWS[MODEL_ROW].top;
  // Flipped up, a long list still stays 5 px below the title bar.
  const lh = rows.h;
  const list = { x: menu.x + menu.w, y: modelTop + lh <= H - 5 ? modelTop : Math.max(19, modelTop + 28 - lh), w: LIST.w, h: lh };
  const rowMid = i => list.y + rows.rows[i].top + LIST.pitch / 2;
  const cardX = list.x + list.w + CARD.gap;
  const cardTop = i => clamp(rowMid(i) - CARD.h / 2, 5, H - CARD.h - 5);
  place(menuNode, menu.x, menu.y);
  place(fly, list.x, list.y);
  menuNode.style.transformOrigin = menu.y > chip.y ? `${px(chip.w / 2)} 0` : `${px(chip.w / 2)} 100%`;
  fly.style.transformOrigin = `0 ${px(modelTop + 14 - list.y)}`;
  if (card) card.style.transformOrigin = `0 ${px(CARD.h / 2)}`;
  return { chip, menu, modelTop, fly: list, rows, rowMid, cardX, cardTop };
}

// Hit tests, with the pointer in desktop coordinates.
export function menuRowAt(L, [x, y], rowsShown = MENU_ROWS.length) {
  x -= WIN.x + L.menu.x;
  y -= WIN.y + L.menu.y;
  if (x < 4 || x >= L.menu.w - 4) return -1;
  return MENU_ROWS.slice(0, rowsShown).findIndex(row => y >= row.top && y < row.top + 28);
}
// With Auto on: the Auto row (0), a level (LEVEL_ROW + its index), or -1.
export function autoRowAt(L, [x, y]) {
  x -= WIN.x + L.menu.x;
  y -= WIN.y + L.menu.y;
  if (x < 4 || x >= L.menu.w - 4) return -1;
  if (y >= MENU_ROWS[0].top && y < MENU_ROWS[0].top + 28) return 0;
  const i = LEVELS.findIndex(row => y >= row.top && y < row.top + 28);
  return i < 0 ? -1 : LEVEL_ROW + i;
}
export function listRowAt(L, [x, y]) {
  x -= WIN.x + L.fly.x;
  y -= WIN.y + L.fly.y;
  if (x < 4 || x >= LIST.w - 4) return -1;
  return L.rows.rows.findIndex(row => y >= row.top && y < row.top + LIST.pitch);
}
export const placeMenuHl = (hl, row) => place(hl, 4, row >= LEVEL_ROW ? LEVELS[row - LEVEL_ROW].top : MENU_ROWS[row].top, 264, 28);
export const placeListHl = (hl, L, row) => place(hl, 4, L.rows.rows[row].top, LIST.w - 8, LIST.pitch);

// ---------------------------------------------------------------- mode menu
// The menu that opens from the mode chip: a "Mode" heading and one row per
// mode, each a title over a line about it, with a check on the one in use.
// Sizes are from the app's source (primer/menu/menu.tsx): 4 px of padding, a
// 26 px heading and 48 px rows whose text starts 34 px in.
export const MODE_MENU = { pad: 4, head: 26, row: 48 };
export function buildModeMenu(pops, chosen = INTERACTIVE, modes = MODES) {
  const height = 2 * MODE_MENU.pad + MODE_MENU.head + MODE_MENU.row * modes.length;
  const menu = place(h('div', 'pop', pops), 0, 0, 400, height);
  const hl = h('div', 'hl', menu);
  label(menu, 'Mode', 12, MODE_MENU.pad + 6, { size: 12, line: 16, color: MUTED, weight: 500 });
  const rows = modes.map((mode, i) => {
    const top = MODE_MENU.pad + MODE_MENU.head + MODE_MENU.row * i;
    if (mode === chosen) icon(menu, 'check', 12, top + 7, 14, MUTED);
    const title = label(menu, mode.label, 34, top + 4);
    const about = label(menu, mode.about, 34, top + 24, { size: 12, line: 20, color: MUTED });
    return { mode, top, w: Math.max(title.offsetWidth, about.offsetWidth) };
  });
  // The menu is as wide as its longest line.
  const w = Math.ceil(34 + Math.max(...rows.map(row => row.w)) + 8 + MODE_MENU.pad);
  menu.style.width = px(w);
  return { menu, hl, rows, w, h: height };
}
// Where the mode menu lands, in window px: below its chip, 8 px away, like
// the model picker's. rowAim(i) is a place on row i that covers none of its
// words: on its title's line, past the title, so the arrow ends above the
// line about the mode.
export function layoutModeMenu(chipNode, built) {
  const chip = rect(chipNode, WIN);
  const box = { x: chip.x, y: chip.y + chip.h + 8, w: built.w, h: built.h };
  place(built.menu, box.x, box.y);
  built.menu.style.transformOrigin = `${px(chip.w / 2)} 0`;
  return { chip, menu: box, rows: built.rows, rowAim: i => [box.x + 178, box.y + built.rows[i].top + 6] };
}
// Which mode row the pointer is on (desktop p), or -1.
export function modeRowAt(M, [x, y]) {
  x -= WIN.x + M.menu.x;
  y -= WIN.y + M.menu.y;
  if (x < MODE_MENU.pad || x >= M.menu.w - MODE_MENU.pad) return -1;
  return M.rows.findIndex(row => y >= row.top && y < row.top + MODE_MENU.row);
}
export const placeModeHl = (hl, M, row) => place(hl, MODE_MENU.pad, M.rows[row].top, M.menu.w - 2 * MODE_MENU.pad, MODE_MENU.row);

// A composer in a mode: the chip's name, the placeholder, and for Autopilot
// the green edge the app gives the box. `place` is 'home' or 'session'.
export function showMode(composer, mode, where = 'home') {
  if (composer.mode.textContent !== mode.label) composer.mode.textContent = mode.label;
  if (composer.hint.textContent !== mode[where]) composer.hint.textContent = mode[where];
  (composer.composer || composer.box).style.borderColor = mode.color || '';
}
// The send button's color: Autopilot's is green. `ready` is a prompt to send;
// without one the button is at half strength.
export function paintSend(send, mode, { ready = false, over = false, down = false } = {}) {
  if (mode === AUTOPILOT) send.style.background = !ready ? '#95c0a0' : down ? '#256e37' : over ? '#37a151' : AUTOPILOT.color;
  else send.style.background = !ready ? '' : down ? '#424a53' : over ? '#32383f' : '#25292e';
}

// ---------------------------------------------------------------- toast
// A Windows 11 notification in the corner of the desktop, over the window.
// The text flows, so a long body wraps like the real one. A note with no
// `progress` is a plain one: a title and a body, no bar and no line under it.
export function buildToast(stage, before, note) {
  if (note.progress === undefined) return plainToast(stage, before, note);
  const toast = h('div', 'toast');
  stage.insertBefore(toast, before);
  image(toast, 'logo', 'assets/app-icon.png', 16, 15, 16, 16);
  label(toast, 'GitHub Copilot', 40, 14, { size: 12, line: 18, color: '#1b1b1b' });
  place(h('div', 'glyph', toast, '\uE712'), 296, 14);
  place(h('div', 'glyph', toast, '\uE8BB'), 332, 14);
  const title = h('div', 'title', toast, note.title);
  const body = h('div', 'body', toast, note.body);
  const bar = h('i', null, h('div', 'bar', toast));
  bar.style.width = `${note.progress * 100}%`;
  const foot = h('div', 'foot', toast);
  const status = h('span', null, foot, note.status);
  const amount = h('span', null, foot, note.value);
  return { toast, title, body, bar, status, amount };
}
// The app's own notifications (desktopNotification.ts in its source): the
// session's name as the title, and "Agent finished: " and the start of the
// reply as the body. Windows shows at most three lines of body.
function plainToast(stage, before, note) {
  const toast = h('div', 'toast', null);
  stage.insertBefore(toast, before);
  image(toast, 'logo', 'assets/app-icon.png', 16, 15, 16, 16);
  label(toast, 'GitHub Copilot', 40, 14, { size: 12, line: 18, color: '#1b1b1b' });
  place(h('div', 'glyph', toast, '\uE712'), 296, 14);
  place(h('div', 'glyph', toast, '\uE8BB'), 332, 14);
  const title = h('div', 'title', toast, note.title);
  const body = h('div', 'body clamp', toast, note.body);
  body.dataset.clip = '';
  return { toast, title, body };
}

// ---------------------------------------------------------------- motion
// Shows a popup from `start`, growing from `from` while it fades in.
export function popIn(node, t, start, dur, from = .95) {
  const shown = t >= start;
  node.style.visibility = shown ? 'visible' : 'hidden';
  if (!shown) return;
  const u = out(span(t, start, start + dur));
  node.style.opacity = u;
  node.style.transform = u >= 1 ? 'none' : `scale(${lerp(from, 1, u)})`;
}
// Shows a popup between `start` and `end`; it closes with a quick fade.
export function popInOut(node, t, start, end, dur = .2, from = .95, close = .1) {
  if (t < end) return popIn(node, t, start, dur, from);
  const u = span(t, end, end + close);
  node.style.visibility = u < 1 ? 'visible' : 'hidden';
  node.style.opacity = 1 - u;
  node.style.transform = 'none';
}
// The camera move for a stage: translate so `cam` lands mid-frame, then scale.
// Chrome snaps text baselines to whole pixels when the page is only moved and
// scaled, so a slow push judders up and down a pixel at a time. A turn too small
// to see (under 2 px across the frame) makes it place text at quarter pixels in
// both directions. 0.02 degrees is not always enough.
export const film = (stage, cam) => {
  stage.style.transform = `translate(${px(DW / 2 - cam.x * cam.s)}, ${px(DH / 2 - cam.y * cam.s)}) scale(${cam.s}) rotate(0.05deg)`;
};
