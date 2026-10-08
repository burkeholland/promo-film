// More of the GitHub Copilot app, for a video about custom instructions: the
// menu a project opens on a right click, the Settings dialog on a project's
// page with its Instructions field, and the Customize page with its Add
// menu. Text, order and sizes follow the app's source
// (SidebarRepositoryGroupContextMenu.tsx, ProjectSettingsView.tsx,
// ProjectInstructionsField.tsx, ExtensionsView.tsx, extensionsFeatured.ts);
// the dialog's frame and nav are the ones measured for the kit's Settings
// example. No screenshots of these three were at hand.
// DRAWN: the project menu, the project's Settings page and the Customize page are rebuilt from the app's source, not measured from screenshots. Spacing may be a few px off the real app.
import { bezier, clamp } from './motion.mjs';
import {
  FG, H, HINT, ICON_INK, MUTED, NS, USER, W, WIN, h, icon, image, images, label, mix, place, px, r3, rect,
} from './kit.mjs';

export const PROJECT_ICONS = [
  'git-branch-plus', 'globe', 'eye-off', 'palette', 'hard-drive', 'trash-2', 'users-round', 'swatch-book', 'accessibility',
  'mouse-pointer-click', 'cpu', 'flask-conical', 'x', 'plug', 'file-code', 'layout-grid', 'chevron-down', 'refresh-cw',
];
const DANGER = '#d1242f';
// The MCP mark is the app's own glyph, not a Lucide icon (lib/icons.tsx).
const MCP_PATHS = [
  'M15.688 2.343a2.588 2.588 0 00-3.61 0l-9.626 9.44a.863.863 0 01-1.203 0 .823.823 0 010-1.18l9.626-9.44a4.313 4.313 0 016.016 0 4.116 4.116 0 011.204 3.54 4.3 4.3 0 013.609 1.18l.05.05a4.115 4.115 0 010 5.9l-8.706 8.537a.274.274 0 000 .393l1.788 1.754a.823.823 0 010 1.18.863.863 0 01-1.203 0l-1.788-1.753a1.92 1.92 0 010-2.754l8.706-8.538a2.47 2.47 0 000-3.54l-.05-.049a2.588 2.588 0 00-3.607-.003l-7.172 7.034-.002.002-.098.097a.863.863 0 01-1.204 0 .823.823 0 010-1.18l7.273-7.133a2.47 2.47 0 00-.003-3.537z',
  'M14.485 4.703a.823.823 0 000-1.18.863.863 0 00-1.204 0l-7.119 6.982a4.115 4.115 0 000 5.9 4.314 4.314 0 006.016 0l7.12-6.982a.823.823 0 000-1.18.863.863 0 00-1.204 0l-7.119 6.982a2.588 2.588 0 01-3.61 0 2.47 2.47 0 010-3.54l7.12-6.982z',
];
function mcpIcon(parent, x, y, size, color) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.classList.add('ic');
  svg.innerHTML = MCP_PATHS.map(d => `<path d="${d}" fill="${color}" fill-rule="evenodd"/>`).join('');
  parent.appendChild(svg);
  return place(svg, x, y);
}
// An icon in the flow of its parent instead of at a place in it.
function inline(parent, name, size, color) {
  const node = name === 'mcp' ? mcpIcon(parent, 0, 0, size, color) : icon(parent, name, 0, 0, size, color);
  Object.assign(node.style, { position: 'static', flex: 'none' });
  return node;
}
function picture(parent, cls, src) {
  const node = h('img', cls, parent);
  node.src = src;
  images.push(node);
  return node;
}

// ---------------------------------------------------------------- menus
// A menu of icon rows: 4 px of padding, 28 px rows, a 9 px gap with a rule
// for a separator (primer/context-menu/context-menu.tsx). An item is
// [icon, text, 'danger'?] or null for a separator.
export const PROJECT_MENU = [
  ['plus', 'New session'], ['git-branch-plus', 'Create from…'], ['folder-open', 'Show in Explorer'], ['globe', 'Open on GitHub'],
  ['settings', 'Settings'], ['eye-off', 'Hide'], null, ['palette', 'Customize…'], null,
  ['hard-drive', 'Manage sessions'], ['trash-2', 'Remove repository', 'danger'],
];
// The Customize page's Add menu (ExtensionsAddMenu.tsx). Connectors are
// behind a flag in the app and are left out here.
export const ADD_MENU = [['mcp', 'MCP Server…'], ['plug', 'Plugin…'], ['file-code', 'Skill…'], ['layout-grid', 'Canvas from URL…']];
export function buildRowMenu(pops, items, minWidth = 220) {
  const menu = place(h('div', 'pop', pops), 0, 0);
  const hl = h('div', 'hl', menu);
  const rows = [];
  let y = 4, widest = 0;
  for (const item of items) {
    if (!item) {
      place(h('div', 'sep', menu), 4, y + 4, 0, 1).dataset.rule = '';
      y += 9;
      continue;
    }
    const [name, text, variant] = item;
    const color = variant === 'danger' ? DANGER : MUTED;
    if (name === 'mcp') mcpIcon(menu, 12, y + 7, 14, color); else icon(menu, name, 12, y + 7, 14, color);
    const node = label(menu, text, 34, y + 4, { color: variant === 'danger' ? DANGER : FG });
    widest = Math.max(widest, node.offsetWidth);
    rows.push({ top: y, text });
    y += 28;
  }
  const w = Math.max(minWidth, Math.ceil(34 + widest + 12));
  const height = y + 4;
  place(menu, 0, 0, w, height);
  for (const rule of menu.querySelectorAll('[data-rule]')) rule.style.width = px(w - 8);
  return { menu, hl, rows, w, h: height };
}
// Puts a menu's corner at a point in window px, and says where things are.
export function layoutRowMenu(built, x, y, origin = '0 0') {
  place(built.menu, x, y);
  built.menu.style.transformOrigin = origin;
  const box = { x, y, w: built.w, h: built.h };
  return { ...built, box, rowAim: (i, dx = built.w - 46) => [WIN.x + x + dx, WIN.y + y + built.rows[i].top + 15] };
}
// Which row the pointer is on (desktop p), or -1.
export function rowMenuAt(M, [px0, py0]) {
  const x = px0 - WIN.x - M.box.x, y = py0 - WIN.y - M.box.y;
  if (x < 4 || x >= M.w - 4) return -1;
  return M.rows.findIndex(row => y >= row.top && y < row.top + 28);
}
export function placeRowHl(M, row) {
  M.hl.style.visibility = row >= 0 ? 'inherit' : 'hidden';
  if (row >= 0) place(M.hl, 4, M.rows[row].top, M.w - 8, 28);
}

// ---------------------------------------------------------------- switch
// Primer's small switch (the kit's Settings example measured it): the track
// is a gradient four times its width that slides from grey to blue while
// the thumb moves 12 px.
const SW_ON = ['#0969da', '#0860ca'];
const SW_OFF = ['#e6eaef', '#dce2e8'];
export function setSwitch({ track, thumb }, wipe, slide = wipe, hot = 0) {
  const on = mix(SW_ON[0], SW_ON[1], hot), off = mix(SW_OFF[0], SW_OFF[1], hot);
  track.style.background = `linear-gradient(to right, ${on} 35%, ${off} 65%) ${r3(100 - 100 * wipe)}% 0 / 160px 100% no-repeat`;
  track.style.boxShadow = `inset 0 0 0 1px rgba(214, 221, 228, ${r3(1 - wipe)})`;
  thumb.style.borderColor = mix('#c3cad2', '#ffffff', wipe);
  thumb.style.transform = slide ? `translateX(${px(12 * slide)})` : 'none';
}
function buildSwitch(parent, on) {
  const track = h('div', 'sw', parent);
  const sw = { track, thumb: h('i', null, track) };
  setSwitch(sw, on ? 1 : 0);
  return sw;
}

// ---------------------------------------------------------------- settings
// The Settings dialog over the dimmed window, 661 tall to fit this window.
// Its children are in dialog px: the nav on the left, a page from x 260 to
// 900 that scrolls under the title.
export const DIALOG = { x: 226, y: 46, w: 920, h: 661 };
export const PANE = { x: 260, w: 640, top: 52 };
export const CLOSE = { x: 876, y: 10, w: 32, h: 32 };
const SMALL = { size: 12, line: 18 };
export const NAV_FILL = { hover: '#f3f5f6', down: '#e9ecef', selected: '#f0f2f3' };
const TRACK = { x: 911, y: 52, h: 597 };
// The dialog's sections. Agency, a staff section, is left out.
const NAV_ROWS = [
  ['settings', 'General', 104.6], ['users-round', 'Accounts', 136.6], ['git-branch', 'Sessions', 168.6],
  ['swatch-book', 'Themes', 200.6], ['accessibility', 'Accessibility', 232.6], ['mic', 'Voice dictation', 264.6],
  ['mouse-pointer-click', 'Computer Use', 296.6], ['blocks', 'Customize', 344.6], ['cpu', 'Model providers', 376.6],
  ['flask-conical', 'Experimental', 424.6],
];
const NAV_PROJECTS_TOP = 499;
// Four rows of 20 px text, 8 px of padding and a 1 px border on each side.
export const AREA = { h: 98, line: 20, pad: 8, view: 96 };

const section = (parent, title, text) => {
  const node = h('section', null, parent);
  const row = h('div', 'prow', node);
  const words = h('div', null, row);
  h('h2', null, words, title);
  const about = text ? h('p', null, words) : null;
  if (about) about.append(...[text].flat());
  return { node, row, words };
};
const code = text => h('code', 'pcode', null, text);
const button = (parent, text, lead) => {
  const node = h('div', 'pbtn', parent);
  if (lead) inline(node, lead, 14, ICON_INK);
  h('span', null, node, text);
  return node;
};

// `project` is the page that is open; `projects` are the names in the nav;
// `placeholder` is the Instructions field's hint. Returns the nodes a scene
// poses, and the page's own measurements (call measure() once it is built
// and the fonts are in).
export function buildProjectSettings(win, { project, projects, placeholder, branch = 'main' }) {
  const modal = h('div', 'layer', win);
  const backdrop = place(h('div', 'backdrop', modal), 0, 14, W, H - 14);
  const dialog = place(h('div', 'dialog', modal), DIALOG.x, DIALOG.y, DIALOG.w, DIALOG.h);
  dialog.style.overflow = 'hidden';
  dialog.dataset.clip = '';
  const rule = place(h('div', null, dialog), 239, 0, 1, DIALOG.h);
  Object.assign(rule.style, { position: 'absolute', background: '#f4f6f8' });

  // Who is signed in, the settings search and the sections.
  image(dialog, 'avatar', 'assets/avatar.png', 20, 20, 28, 28);
  label(dialog, USER, 58, 15, { ...SMALL, weight: 600 });
  // DRAWN: the account's handle under the name.
  label(dialog, `@${USER.toLowerCase().replace(/\s+/g, '')}`, 58, 33, { ...SMALL, color: MUTED });
  const search = place(h('div', 'sfield', dialog), 12, 64, 216, 28);
  icon(search, 'search', 11, 6.5, 16, MUTED);
  label(search, 'Search settings…', 34, 5.5, { ...SMALL, color: HINT });
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
  preview.style.left = px((53.2 - preview.getBoundingClientRect().width) / 2);
  label(dialog, 'Projects', 20, 472.6, { ...SMALL, color: MUTED });
  projects.forEach((text, i) => {
    const top = NAV_PROJECTS_TOP + 32 * i;
    row(top, text);
    icon(dialog, 'folder', 22, top + 8, 16, ICON_INK);
  });
  const selected = pills.findIndex(p => p.text === project && p.box.y >= NAV_PROJECTS_TOP);
  pills[selected].pill.style.background = NAV_FILL.selected;

  // The page scrolls inside this pane, under the title and the close button.
  const pane = place(h('div', null, dialog), 240, PANE.top, DIALOG.w - 240, DIALOG.h - PANE.top);
  Object.assign(pane.style, { position: 'absolute', overflow: 'hidden' });
  pane.dataset.clip = '';
  const page = place(h('div', 'ppage', pane), PANE.x - 240, 12, PANE.w);

  const sidebar = section(page, 'Show in sidebar', 'Show this project and its sessions in the sidebar.');
  buildSwitch(sidebar.row, true);

  // DRAWN: the state of the other settings on the project's page: which switches are on, an empty MCP server list, "main" as the default branch. The page also stops a few sections short of the real one.
  // Repository customizations, for a trusted repository with no MCP config.
  const custom = section(page, 'Repository customizations', 'Folder trust for repository plugins, hooks, and MCP servers.');
  const servers = h('div', 'prow', custom.node);
  servers.style.marginTop = '20px';
  const serverWords = h('div', null, servers);
  h('h3', null, serverWords, 'MCP servers');
  h('p', null, serverWords, 'Servers defined by this repository in .mcp.json or .github/mcp.json. Refresh reloads project MCP servers, not plugins.').style.marginTop = '0';
  button(servers, 'Refresh', 'refresh-cw');
  const empty = h('div', 'pempty', custom.node);
  inline(empty, 'mcp', 24, MUTED);
  h('b', null, empty, 'No project MCP servers');
  h('span', null, empty, 'Add servers to .mcp.json or .github/mcp.json, then refresh.');
  const include = h('div', 'pcap', custom.node);
  include.style.marginTop = '12px';
  include.append('Add a ', code('.worktreeinclude'), ' file to the repo root to auto-copy gitignored files into new worktrees.');

  const sandbox = section(page, 'Sandbox', 'Configure the local sandbox for sessions in this project.');
  const sandboxed = h('div', 'prow', sandbox.node);
  sandboxed.style.marginTop = '20px';
  const sandboxWords = h('div', null, sandboxed);
  h('h3', null, sandboxWords, 'Sandbox new sessions');
  h('p', null, sandboxWords, 'Request sandboxing by default when a new local session starts.').style.marginTop = '0';
  buildSwitch(sandboxed, false);

  const scripts = section(page, 'Scripts', 'Commands that run during workspace lifecycle events.');
  button(scripts.row, 'Add script', 'plus');
  const env = h('div', 'pfold', scripts.node);
  inline(env, 'chevron-right', 14, MUTED);
  h('span', null, env, 'Environment variables available to all scripts and terminals');

  const browser = section(page, 'Browser auto-open', 'Open a browser tab when Run output exposes a local URL.');
  buildSwitch(browser.row, true);

  // Instructions: the field the video is about.
  const instructions = section(page, 'Instructions', 'Per-repository instructions added to every session, alongside global ones.');
  const area = h('div', 'ptext', instructions.node);
  area.dataset.clip = '';
  const inner = h('div', 'in', area);
  const hint = h('span', 'hint', inner, placeholder);
  const text = h('span', null, inner);
  const caret = h('span', 'caret', inner);
  Object.assign(caret.style, { height: '15px', verticalAlign: '-3px' });
  const bar = h('div', 'thumb', area);
  Object.assign(bar.style, { right: '2px', width: '6px' });

  const base = section(page, 'Default branch', 'New sessions will branch off from this branch by default.');
  h('div', 'pinput', base.node, branch);
  const prefix = section(page, 'Branch prefix override', 'Use a custom branch prefix for this project.');
  buildSwitch(prefix.row, false);
  // The page goes on below this (worktrees, remote control, automation
  // defaults); what follows is enough for the part that scrolls into view.
  section(page, 'Worktree sparse-checkout', 'Limit which directories are checked out in new session worktrees to speed up creation and save disk space.');
  section(page, 'Remote control', 'Remote control for sessions running in a remote environment.');
  const auto = section(page, 'Automations', 'Configure project-level automation defaults.');
  const issues = h('div', 'prow', auto.node);
  issues.style.marginTop = '20px';
  const issueWords = h('div', null, issues);
  h('h3', null, issueWords, 'Auto-start issue sessions');
  h('p', null, issueWords, 'Start a session with issue context automatically.').style.marginTop = '0';
  buildSwitch(issues, false);

  label(dialog, project, 261, 16, { size: 14, weight: 600 });
  const close = place(h('div', 'gsq', dialog), CLOSE.x, CLOSE.y, CLOSE.w, CLOSE.h);
  icon(dialog, 'x', 884.1, 18.05, 16, ICON_INK);
  const thumb = place(h('div', 'thumb', dialog), TRACK.x, TRACK.y, 6, 0);

  // The page's own numbers, in dialog px. Call once, before any pose.
  const measure = () => {
    const d = rect(dialog);
    const inDialog = node => { const r = rect(node); return { x: r.x - d.x, y: r.y - d.y, w: r.w, h: r.h }; };
    const total = page.offsetHeight + 24;
    const seen = DIALOG.h - PANE.top;
    thumb.style.height = px(TRACK.h * Math.min(1, seen / total));
    return { total, seen, max: Math.max(0, total - seen), heading: inDialog(instructions.words), area: inDialog(area), page: inDialog(page) };
  };
  // Scrolls the page by y px; the thumb follows.
  const scrollTo = (y, M) => {
    page.style.transform = y ? `translateY(${px(-y)})` : 'none';
    thumb.style.transform = `translateY(${px(M.max ? (TRACK.h - TRACK.h * Math.min(1, M.seen / M.total)) * y / M.max : 0)})`;
  };
  // The Instructions field: its text, whether it has focus, where the caret
  // blinks, and how far its own text is scrolled.
  const lineCount = value => value.split('\n').length;
  const areaMax = value => Math.max(0, lineCount(value) * AREA.line + 2 * AREA.pad - AREA.view);
  const setArea = ({ value, focus, caretOn, scroll = 0 }) => {
    if (text.textContent !== value) text.textContent = value;
    hint.style.display = value ? 'none' : '';
    area.classList.toggle('focus', !!focus);
    caret.style.visibility = caretOn ? 'inherit' : 'hidden';
    const max = areaMax(value);
    const y = clamp(scroll, 0, max);
    inner.style.transform = y ? `translateY(${px(-y)})` : 'none';
    bar.style.visibility = max > 0 ? 'inherit' : 'hidden';
    if (max > 0) {
      const size = Math.max(20, (AREA.view - 4) * AREA.view / (max + AREA.view));
      bar.style.height = px(size);
      bar.style.top = px(2 + (AREA.view - 4 - size) * y / max);
    }
  };
  setArea({ value: '', focus: false, caretOn: false });
  return { modal, backdrop, dialog, pills, selected, page, close, area, measure, scrollTo, setArea, areaMax };
}
// Settings fades in and settles from a touch smaller, as the app's dialogs
// do, and leaves with a quick fade. u runs 0 to 1.
export function poseDialog(D, shown, u) {
  D.modal.style.visibility = shown ? 'inherit' : 'hidden';
  D.backdrop.style.opacity = u;
  D.dialog.style.opacity = u;
  D.dialog.style.transform = u >= 1 ? 'none' : `scale(${r3(.96 + .04 * u)})`;
}
// A wheel scroll: quick off the mark and a long settle, like the app's smooth
// scrolling.
export const wheel = bezier(.2, .7, .2, 1);

// ---------------------------------------------------------------- Customize
// The Customize page on its Featured tab (ExtensionsView.tsx,
// ExtensionsCategoryHeader.tsx, FeaturedEditorialSections.tsx). The names,
// descriptions and pictures are the app's own (extensionsFeatured.ts and
// public/featured-assets, copied into assets/customize).
// DRAWN: on the Customize page, each card's trailing button (a plain plus) and the hero cards' "Add" footers are simplified from the app's source.
const TABS = [['Featured'], ['MCP', 1], ['Plugins'], ['Skills'], ['Extensions'], ['Canvas'], ['Installed', 1]];
const A = 'assets/customize/';
const HERO = [
  { name: 'Azure DevOps', text: 'Plan and manage Azure DevOps work in a visual, interactive workspace.', icon: 'azure-devops-icon.svg' },
  { name: 'Impeccable Design', text: 'Design, critique, and polish product interfaces with expert guidance.', cover: 'impeccable-featured-card.png' },
  { name: 'Microsoft Foundry', text: 'Build, test, and deploy hosted agents with Microsoft Foundry.', cover: 'foundry-featured-card.svg' },
];
const COMPACT = [
  { name: 'Figma', text: 'Inspect and implement Figma designs faster.', icon: 'figma.png' },
  { name: 'Playwright', text: 'Test and automate web apps in browsers.', icon: 'playwright-icon.png', full: 1 },
  { name: 'Web Design Guidelines', text: 'Review UI for usability and accessible design.', icon: 'web-design-guidelines-icon.png', full: 1 },
  { name: 'Grill Me by Matt Pocock', text: 'Pressure-test your product plan.', icon: 'grill-me-icon.png', full: 1 },
  { name: 'Security Best Practices', text: 'Build secure, accessible, reliable software.', icon: 'github.png', full: 1 },
];
const ROWS = [
  { name: 'WorkIQ', text: 'Find answers across Microsoft 365 emails, meetings, documents, and Teams messages.', icon: 'microsoft-light.svg' },
  { name: 'Jira', text: 'Review Jira work items from active sprints in a live dashboard.', icon: 'jira-icon.svg' },
  { name: 'Sentry', text: 'Triage live Sentry issues and hand them off to Copilot for tracking or a fix.', icon: 'sentry.png' },
  { name: 'Azure', text: 'Plan, deploy, troubleshoot, and manage Azure resources with skills and MCP tools.', icon: 'azure-icon.svg' },
  { name: 'Azure DevOps', text: 'Manage Azure DevOps repositories, work items, and pipelines from Copilot.', icon: 'azure-devops-icon.svg' },
  { name: 'Power BI', text: 'Bring end-to-end Power BI semantic model authoring to your AI agents.', icon: 'power-bi.svg' },
];
export function buildCustomize(ui) {
  const page = h('div', 'cz', ui);
  const scroller = h('div', 'czscroll', page);
  scroller.dataset.clip = '';
  const body = h('div', 'czbody', scroller);
  const head = (title, text) => {
    const group = h('section', null, body);
    const node = h('div', 'czh', group);
    h('h2', null, node, title);
    h('p', null, node, text);
    return group;
  };
  const picks = h('div', 'czgrid3', head('Editor’s picks', 'Standout ways to customize Copilot.'));
  for (const item of HERO) {
    const card = h('div', 'czcard', picks);
    picture(h('div', 'czhero', card), item.cover ? 'cover' : 'ico', A + (item.cover || item.icon));
    const words = h('div', 'b', card);
    h('div', 'n', words, item.name);
    h('div', 'd', words, item.text);
    const add = h('div', 'czghost', h('div', 'f', card));
    inline(add, 'plus', 16, ICON_INK);
    h('span', null, add, 'Add');
  }
  const build = h('div', 'czgrid2', head('Plan, build, and ship', 'Tools for planning work, testing experiences, and shipping with confidence.'));
  for (const item of COMPACT) {
    const card = h('div', 'czcompact', build);
    picture(h('div', 'tile', card), item.full ? 'full' : 'fit', A + item.icon);
    const words = h('div', 'w', card);
    h('div', 'n', words, item.name);
    h('div', 'd', words, item.text);
    inline(card, 'plus', 16, ICON_INK);
  }
  const list = h('div', 'czlist', head('Connect your work', 'Bring the tools and context you use every day into Copilot.'));
  for (const item of ROWS) {
    const line = h('div', 'czrow', list);
    picture(h('div', 'tile', line), 'fit', A + item.icon);
    const words = h('div', 'w', line);
    h('div', 'n', words, item.name);
    h('div', 'd', words, item.text);
    inline(line, 'plus', 16, ICON_INK);
  }

  // The header stays put above the list: categories, search and Add.
  const header = h('div', 'czhead', page);
  const strip = h('div', 'cztabs', header);
  const tabs = TABS.map(([text, group], i) => h('div', `cztab${i ? '' : ' on'}${group ? ' grp' : ''}`, strip, text));
  const search = h('div', 'czsearch', header, 'Search featured extensions…');
  icon(search, 'search', 8, 6, 16, MUTED);
  const add = h('div', 'czadd', header);
  inline(add, 'plus', 16, '#fff');
  h('span', null, add, 'Add');
  inline(add, 'chevron-down', 14, '#fff');
  const thumb = h('div', 'thumb', page);
  Object.assign(thumb.style, { right: '3px', width: '6px' });

  // In window px. Call once, before any pose.
  const measure = () => {
    const total = body.offsetHeight, seen = scroller.offsetHeight;
    const size = (seen - 8) * Math.min(1, seen / total);
    thumb.style.height = px(size);
    return { total, seen, max: Math.max(0, total - seen), size, add: rect(add, WIN), tabs: tabs.map(node => rect(node, WIN)), scroller: rect(scroller, WIN) };
  };
  const scrollTo = (y, M) => {
    body.style.transform = y ? `translateY(${px(-y)})` : 'none';
    thumb.style.top = px(44 + 4 + (M.seen - 8 - M.size) * (M.max ? y / M.max : 0));
  };
  return { page, add, tabs, measure, scrollTo };
}
// The Add button, green like every primary button: darker under the pointer
// and while its menu is open.
export const paintAdd = (node, { over = false, down = false, open = false } = {}) => {
  node.style.background = down ? '#197935' : over || open ? '#1c8139' : '';
};
