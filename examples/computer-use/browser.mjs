// Microsoft Edge on Windows 11 (light), with a made-up expense site in it,
// Contoso Expenses. DRAWN: neither came from a screenshot. Edge is the plain
// layout everyone knows (one tab, the toolbar, the address bar) and the site
// is in Fluent's colors so it reads as a Microsoft-world web app.
//
// Build once, then `pose(state)` each frame. The state says what is on the
// page, what has focus and what is pressed:
//   { page: 'ntp' | 'reports' | 'form', url, progress (0..1 or null),
//     focus: id, down: id, caret: bool, title, start, end,
//     lines: [{ cat, amt, file }], submitted }
// ids: address, new, title, start, end, add, cat0, amt0, rcpt0, ..., submit.
import { h, icon, label, place, px } from './kit.mjs';

export const EDGE_ICONS = ['arrow-left', 'arrow-right', 'rotate-cw', 'lock', 'star', 'ellipsis', 'x', 'minus', 'square', 'plus', 'search', 'receipt', 'calendar', 'paperclip', 'file-image', 'check-check', 'chevron-right'];
export const HOST = 'expenses.contoso.com';
export const SITE = 'Contoso Expenses';
const TOP = 81;

const set = (node, text) => { if (node.textContent !== text) node.textContent = text; };
const show = (node, on) => { node.style.visibility = on ? 'inherit' : 'hidden'; };
const money = n => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function buildEdge(parent, { x, y, w, h: height }) {
  const node = place(h('div', 'edge', parent), x, y, w, height);
  // Tab strip and caption buttons.
  const tabs = place(h('div', 'tabs', node), 0, 0, w, 41);
  const tab = place(h('div', 'tab', tabs), 8, 6, 230, 35);
  const fav = place(h('div', 'fav', tab), 12, 9.5);
  const ntpFav = icon(tab, 'search', 12, 9.5, 16, '#5f6368');
  const tabText = h('div', 't', tab);
  icon(tab, 'x', 230 - 26, 10.5, 14, '#5f6368');
  icon(tabs, 'plus', 252, 13.5, 14, '#3b3b3b');
  icon(tabs, 'minus', w - 138 + 16, 13.5, 14, '#3b3b3b');
  icon(tabs, 'square', w - 92 + 17, 14.5, 12, '#3b3b3b');
  icon(tabs, 'x', w - 46 + 16, 13.5, 14, '#3b3b3b');
  set(fav, 'C');
  // Toolbar and address bar.
  const tbar = place(h('div', 'tbar', node), 0, 41, w, 40);
  icon(tbar, 'arrow-left', 14, 12, 16, '#3b3b3b');
  icon(tbar, 'arrow-right', 46, 12, 16, '#b4b4b4');
  icon(tbar, 'rotate-cw', 78, 12, 16, '#3b3b3b');
  const addr = place(h('div', 'addr', tbar), 108, 5, w - 108 - 52, 30);
  const lock = icon(addr, 'lock', 13, 8, 14, '#3b3b3b');
  const find = icon(addr, 'search', 13, 8, 14, '#707070');
  const url = h('div', 'u', addr);
  const host = h('span', 'host', url);
  const path = h('span', 'path', url);
  const hint = place(h('div', 'u', addr, 'Search or enter web address'), 34, 5);
  hint.style.color = '#707070';
  icon(addr, 'star', w - 108 - 52 - 28, 8, 14, '#3b3b3b');
  icon(tbar, 'ellipsis', w - 36, 12, 16, '#3b3b3b');
  const bar = place(h('div', 'bar', node), 0, TOP, 0, 2);
  const view = place(h('div', 'view', node), 0, TOP, w, height - TOP);
  const vw = w, vh = height - TOP;

  // The new tab page: a search box and nothing else.
  const ntp = h('div', 'ntp', view);
  const sb = place(h('div', 'sb', ntp), vw / 2 - 200, vh * .3, 400, 44);
  icon(sb, 'search', 16, 14, 16, '#707070');
  label(sb, 'Search the web', 42, 12, { color: '#707070' });

  const site = buildSite(view, vw);
  const caret = place(h('div', 'caret', node), 0, 0, 1, 16);

  const pose = state => {
    const { page = 'ntp', progress = null, focus = null, down = null, caret: blink = false } = state;
    const typed = state.url ?? (page === 'ntp' ? '' : `${HOST}/${page === 'form' ? 'reports/new' : 'reports'}`);
    const cut = typed.indexOf('/');
    set(host, cut < 0 ? typed : typed.slice(0, cut));
    set(path, cut < 0 ? '' : typed.slice(cut));
    show(hint, !typed && focus !== 'address');
    show(lock, page !== 'ntp' && focus !== 'address');
    show(find, page === 'ntp' || focus === 'address');
    addr.classList.toggle('focus', focus === 'address');
    show(fav, page !== 'ntp');
    show(ntpFav, page === 'ntp');
    set(tabText, page === 'ntp' ? 'New tab' : SITE);
    bar.style.width = px(progress == null ? 0 : w * progress);
    show(bar, progress != null);
    show(ntp, page === 'ntp');
    site.pose(page, state);
    // The text caret, in whatever has focus and takes typing.
    let at = null;
    if (focus === 'address') at = [108 + 34 + url.offsetWidth, 41 + 5 + 7, 16];
    else if (site.caretAt(focus)) {
      const [cx, cy, ch] = site.caretAt(focus);
      at = [cx, TOP + cy, ch];
    }
    show(caret, Boolean(at && blink));
    if (at) place(caret, at[0], at[1], 1, at[2]);
    site.press(focus, down);
  };
  // A box in the window, for the scene: an element by its id.
  const box = id => {
    if (id === 'address') return { x: 108, y: 46, w: addr.offsetWidth, h: 30 };
    const b = site.box(id);
    return b && { ...b, y: b.y + TOP };
  };
  return { node, view, pose, box };
}

// ---------------------------------------------------------------- the site
export const REPORTS = [
  ['Chicago offsite', 'Aug 11 - 13', '$1,204.18'],
  ['Client dinner, Austin', 'Jul 30', '$212.40'],
  ['Team training', 'Jun 4 - 5', '$389.00'],
];
const COL_X = { cat: 24, amt: 230, rcpt: 352 };
const LINE_Y = 330;
const LINE_H = 46;

function buildSite(view, w) {
  const root = h('div', 'cx', view);
  const top = place(h('div', 'top', root), 0, 0, w, 48);
  icon(top, 'receipt', 16, 14, 20, '#fff');
  h('div', 'brand', top, SITE);
  place(h('div', 'me', top, 'ML'), w - 16 - 28, 10);
  const nodes = {};
  const btn = (parent, id, text, x, y, { primary, glyph, right } = {}) => {
    const b = place(h('div', `btn${primary ? ' primary' : ''}`, parent), x, y);
    if (glyph) icon(b, glyph, 0, 0, 16, primary ? '#fff' : '#424242');
    b.append(text);
    if (right != null) { b.style.left = 'auto'; b.style.right = px(right); }
    nodes[id] = b;
    return b;
  };
  const input = (parent, id, x, y, width, placeholder, { select, glyph } = {}) => {
    const box = place(h('div', `inp${select ? ' sel' : ''}`, parent), x, y, width, 32);
    const v = h('div', 'v', box);
    const ph = h('div', 'ph', box, placeholder);
    if (glyph) icon(box, glyph, width - 28, 8, 16, '#616161');
    nodes[id] = box;
    return { box, v, ph };
  };

  // My reports.
  const reports = h('div', 'layer', root);
  place(h('div', 'h1', reports, 'My reports'), 24, 66);
  btn(reports, 'new', 'New report', 0, 64, { primary: true, glyph: 'plus', right: 24 });
  [['Report', 24], ['Dates', 210], ['Amount', 330], ['Status', 432]].forEach(([t, x]) => place(h('div', 'th', reports, t), x, 122));
  place(h('div', 'rule', reports), 24, 144, w - 48);
  REPORTS.forEach(([name, dates, amount], i) => {
    const y = 156 + i * 44;
    place(h('div', 'td', reports, name), 24, y);
    place(h('div', 'td', reports, dates), 210, y).style.color = '#616161';
    place(h('div', 'td', reports, amount), 330, y);
    place(h('div', 'pill ok', reports, 'Approved'), 432, y);
    place(h('div', 'rule', reports), 24, y + 32, w - 48);
  });

  // New report.
  const form = h('div', 'layer', root);
  const crumb = place(h('div', 'crumb', form), 24, 62);
  crumb.append('My reports');
  icon(crumb, 'chevron-right', 0, 0, 12, '#616161').style.position = 'relative';
  crumb.lastChild.style.margin = '0 4px';
  crumb.lastChild.style.verticalAlign = '-2px';
  crumb.lastChild.style.display = 'inline-block';
  crumb.append('New report');
  place(h('div', 'h1', form, 'New report'), 24, 80);
  place(h('div', 'lbl', form, 'Title'), 24, 124);
  const title = input(form, 'title', 24, 142, w - 48, 'Give the report a name');
  place(h('div', 'lbl', form, 'Start date'), 24, 188);
  const start = input(form, 'start', 24, 206, 170, 'mm/dd/yyyy', { glyph: 'calendar' });
  place(h('div', 'lbl', form, 'End date'), 210, 188);
  const end = input(form, 'end', 210, 206, 170, 'mm/dd/yyyy', { glyph: 'calendar' });
  const sub = place(h('div', 'h1', form, 'Expenses'), 24, 258);
  sub.style.fontSize = '16px';
  btn(form, 'add', 'Add expense', 0, 256, { glyph: 'plus', right: 24 });
  [['Category', COL_X.cat], ['Amount', COL_X.amt], ['Receipt', COL_X.rcpt]].forEach(([t, x]) => place(h('div', 'th', form, t), x, 302));
  place(h('div', 'rule', form), 24, 322, w - 48);
  const none = place(h('div', 'td', form, 'No expenses yet.'), 24, LINE_Y + 6);
  none.style.color = '#707070';
  const lines = [0, 1, 2].map(i => {
    const y = LINE_Y + i * LINE_H;
    const row = h('div', 'layer', form);
    const cat = input(row, `cat${i}`, COL_X.cat, y, 192, 'Select', { select: true });
    const amt = input(row, `amt${i}`, COL_X.amt, y, 108, '0.00');
    const attach = btn(row, `rcpt${i}`, 'Attach', COL_X.rcpt, y, { glyph: 'paperclip' });
    const file = place(h('div', 'file', row), COL_X.rcpt, y + 4);
    icon(file, 'file-image', 6, 4, 16, '#616161');
    const name = h('span', null, file);
    return { row, cat, amt, attach, file, name };
  });
  const rule = place(h('div', 'rule', form), 24, 0, w - 48);
  const total = h('div', 'total', form);
  const footer = h('div', 'layer', form);
  btn(footer, 'submit', 'Submit', 0, 0, { primary: true, right: 24 });
  btn(footer, 'draft', 'Save draft', 0, 0, { right: 24 + 86 });
  const banner = place(h('div', 'banner', form), 24, 0, w - 48, 40);
  icon(banner, 'check-check', 12, 12, 16, '#0e700e');
  const bannerText = h('div', 't', banner);

  const values = { title, start, end };
  lines.forEach((l, i) => { values[`cat${i}`] = l.cat; values[`amt${i}`] = l.amt; });
  const fill = (field, text) => {
    set(field.v, text || '');
    show(field.ph, !text);
  };

  const pose = (page, state) => {
    show(root, page !== 'ntp');
    show(reports, page === 'reports');
    show(form, page === 'form');
    if (page !== 'form') return;
    fill(title, state.title);
    fill(start, state.start);
    fill(end, state.end);
    const shown = state.lines || [];
    show(none, !shown.length);
    let sum = 0;
    lines.forEach((l, i) => {
      const line = shown[i];
      show(l.row, Boolean(line));
      if (!line) return;
      fill(l.cat, line.cat);
      fill(l.amt, line.amt);
      show(l.attach, !line.file);
      show(l.file, Boolean(line.file));
      set(l.name, line.file || '');
      sum += Number(line.amt) || 0;
    });
    const after = LINE_Y + Math.max(1, shown.length) * LINE_H;
    place(rule, 24, after);
    set(total, `Total  ${money(sum)}`);
    total.style.left = 'auto';
    total.style.right = px(24);
    total.style.top = px(after + 10);
    footer.style.top = px(after + 50);
    show(footer, !state.submitted);
    show(banner, Boolean(state.submitted));
    banner.style.top = px(after + 46);
    set(bannerText, state.submitted ? `Submitted for approval  ·  ${state.submitted}` : '');
  };
  // Focus rings and the pressed look.
  const press = (focus, down) => {
    for (const [id, node] of Object.entries(nodes)) {
      node.classList.toggle('focus', id === focus);
      node.classList.toggle('down', id === down);
    }
  };
  const box = id => {
    const node = nodes[id];
    if (!node) return null;
    let x = node.offsetLeft, y = node.offsetTop;
    if (id === 'submit' || id === 'draft') y += footer.offsetTop;
    return { x, y, w: node.offsetWidth, h: node.offsetHeight };
  };
  const caretAt = id => {
    const field = values[id];
    if (!field || id.startsWith('cat')) return null;
    const b = box(id);
    return [b.x + 10 + field.v.offsetWidth + 1, b.y + 8, 16];
  };
  return { pose, press, box, caretAt };
}

// ---------------------------------------------------------------- receipts
// A photo of a paper receipt, drawn: a slip on a dark table, a bold line for
// the shop's name, then lines of text and a bold total. `i` picks one of
// three shapes. DRAWN: the receipt pictures.
export function drawReceipt(tile, i) {
  const w = tile.offsetWidth, ht = tile.offsetHeight;
  const root = h('div', 'rcpt', tile);
  const shapes = [[.2, .08, .6, .9, -3], [.24, .14, .52, .74, 2], [.18, .1, .64, .82, -1]];
  const [px0, py0, pw, ph, turn] = shapes[i % 3];
  const paper = place(h('div', 'paper', root), w * px0, ht * py0, w * pw, ht * ph);
  paper.style.transform = `rotate(${turn}deg)`;
  const lw = w * pw;
  const lines = [[.5, .22, true, true], [.12, .7], [.12, .55], [.12, .62], [.12, .4], [.12, .66], [.5, .3, true]];
  lines.slice(0, 5 + (i % 3)).forEach(([x, len, bold, center], j) => {
    const ln = place(h('div', `ln${bold ? ' b' : ''}`, paper), center ? lw * (.5 - len / 2) : lw * x, 7 + j * 7, lw * len);
    if (j === 4 + (i % 3)) { ln.style.left = px(lw * .45); ln.style.width = px(lw * .43); ln.className = 'ln b'; }
  });
}
