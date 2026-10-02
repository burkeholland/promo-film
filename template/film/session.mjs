// A session: the page the app shows once a prompt is sent. The header names
// the session and its branch, the timeline lists what Copilot does as it
// works, and the composer stays at the bottom. Measured from screenshots 03
// and 08 (assets/screens), in window px of our 1372 x 739 window.
import { clamp, random, span } from './motion.mjs';
import { FG, H, MUTED, NS, W, h, icon, label, logo, place, px } from './kit.mjs';
import { buildField } from './app.mjs';

export const DETAIL = '#818b98';
const TL_ICON = '#434e5b';
export const SESSION_ICONS = [
  'circle-check', 'circle-dashed', 'terminal', 'braces', 'eye-off', 'play', 'chevron-down', 'git-commit-horizontal',
  'git-merge', 'panel-right', 'file', 'file-code', 'file-pen', 'file-plus', 'folder-search', 'cpu', 'cloud-off', 'list-todo',
  'chevron-right', 'fold-vertical', 'search', 'file-text',
];
export const SESSION_PLACEHOLDER = 'Ask anything. Use / for commands, @ files, & sessions, # issues...';

const MAIN = 279;
// The conversation column: about 723 wide (a bubble's 80% cap measures
// 578.5), centered in the main area less the scroll bar's gutter.
export const COL = { x: 462, w: 723 };
const VIEW_TOP = 56;
const FIRST = 69.3;
export const COMPOSER = { x: 438.7, y: H - 7.7 - 96, w: 771, h: 96 };
const ROW = 28;
const NEST = 22;
// Space between neighbours, by kind: [above][below].
const GAP = {
  row: { row: 0, bubble: 10, md: 11 },
  bubble: { row: 37, bubble: 37, md: 37 },
  md: { row: 12, bubble: 37, md: 10 },
};
// The working spinner: a braille glyph, four dots that walk around a 2 x 3
// cell, about 100 ms a step.
const SPIN = [[0, 1, 3, 4], [0, 3, 4, 5], [2, 3, 4, 5], [1, 2, 4, 5], [0, 1, 2, 5], [0, 1, 2, 3]];

// ---------------------------------------------------------------- pieces
// A spinner centered on (x, y). Returns set(t).
export function spinner(parent, x, y, color = TL_ICON) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', 12);
  svg.setAttribute('height', 14);
  svg.classList.add('ic');
  svg.innerHTML = [0, 1, 2, 3, 4, 5].map(i => `<circle cx="${4 + 4.2 * Math.floor(i / 3)}" cy="${3.2 + 3.8 * (i % 3)}" r=".9" fill="${color}"/>`).join('');
  parent.appendChild(svg);
  place(svg, x - 6.1, y - 6.6);
  const dots = [...svg.children];
  let shown = -1;
  return t => {
    const f = ((Math.floor(t / .1) % SPIN.length) + SPIN.length) % SPIN.length;
    if (f === shown) return;
    dots.forEach((dot, i) => { dot.style.visibility = SPIN[f].includes(i) ? 'inherit' : 'hidden'; });
    shown = f;
  };
}

// The black terminal icon on the header's terminal button.
function terminalApp(parent, x, y) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', 16);
  svg.setAttribute('height', 16);
  svg.classList.add('ic');
  svg.innerHTML = '<rect x="1" y="1.5" width="14" height="13" rx="3" fill="#1f2328"/><path d="M4.4 5.4L6.9 7.9L4.4 10.4M8.4 10.6H11.6" fill="none" stroke="#fff" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>';
  parent.appendChild(svg);
  return place(svg, x, y);
}

function buildHeader(page, { title, branch }) {
  const head = place(h('div', 'shead', page), MAIN + 13, 26.2);
  const name = h('span', 't', head, title);
  h('span', 'hs', head, '·');
  h('span', 'br', head, branch);
  // Buttons are 28 tall; children sit inside a 1 px border.
  const button = (x, w, divide) => {
    const b = place(h('div', 'hbtn', page), x, 23, w, 28);
    if (divide) place(h('i', null, b), divide - 1, 0, 1, 26);
    return b;
  };
  const chevron = (b, x) => icon(b, 'chevron-down', x - 1, 6, 14, MUTED);
  const play = button(971.7, 56, 28);
  icon(play, 'play', 5, 5, 16, FG);
  chevron(play, 35);
  const term = button(1032.2, 56, 28);
  terminalApp(term, 5, 5);
  chevron(term, 35);
  const commit = button(1093.2, 98);
  icon(commit, 'git-commit-horizontal', 7, 5, 16, FG);
  label(commit, 'Commit (2)', 26.7, 3, { size: 12.5 });
  const merge = button(1195.7, 136, 108);
  icon(merge, 'git-merge', 7, 5, 16, FG);
  label(merge, 'Agent merge', 27.3, 3, { size: 12.5 });
  chevron(merge, 115);
  icon(page, 'panel-right', W - 30, 29, 16, '#4e5965');
  return { head, name };
}

function buildComposer(page, { chip, placeholder, prompt, mode }) {
  const box = place(h('div', 'composer', page), COMPOSER.x, COMPOSER.y, COMPOSER.w, COMPOSER.h);
  const field = buildField(box, placeholder, prompt);
  const bar = place(h('div', 'cbar', box), 8, 58);
  icon(h('div', 'cbtn sq', bar), 'plus', 6.64, 6.64, 16, MUTED);
  h('div', 'cbtn', bar, mode);
  const chipNode = h('div', 'cbtn', bar, chip);
  // Right side items keep the home composer's distances from the right edge.
  const right = COMPOSER.w - 766;
  const eye = place(h('div', 'eyebtn', box), right + 662.3, 60.64, 24, 24);
  icon(eye, 'eye-off', 3, 3, 16, '#6e7781');
  icon(box, 'mic', right + 698.84, 64.64, 16, MUTED);
  const send = place(h('div', 'send', box), right + 730.1, 60);
  const arrow = icon(send, 'arrow-up', 4, 4, 16, '#fff');
  const stop = place(h('i', 'stopsq', send), 7.5, 7.5, 9, 9);
  // Running: the send button turns into a stop button.
  const running = on => {
    send.classList.toggle('stop', on);
    arrow.style.visibility = on ? 'hidden' : 'inherit';
    stop.style.visibility = on ? 'inherit' : 'hidden';
  };
  running(false);
  return { box, chip: chipNode, send, running, ...field };
}

// ---------------------------------------------------------------- markdown
// A little markdown, enough for a reply: paragraphs, `### ` headings, `1. `
// and `- ` list items, **bold** and `code`. Every word is its own span, so a
// reply can stream in without its lines ever moving.
function markdown(parent, source) {
  const tokens = [];
  const words = (into, text) => {
    for (const word of text.match(/\s*\S+\s*/g) || []) tokens.push(h('span', null, into, word));
  };
  const inline = (into, text) => {
    for (const part of text.split(/(\*\*[^*]+\*\*|`[^`]+`)/)) {
      if (!part) continue;
      if (part.startsWith('**')) words(h('b', null, into), part.slice(2, -2));
      else if (part.startsWith('`')) tokens.push(h('code', null, into, part.slice(1, -1)));
      else words(into, part);
    }
  };
  for (const line of source.split('\n')) {
    let m;
    if ((m = line.match(/^### (.*)/))) inline(h('div', 'mh', parent), m[1]);
    else if ((m = line.match(/^(\d+\.|-) (.*)/))) {
      const li = h('div', 'li', parent);
      tokens.push(h('span', 'n', li, m[1] === '-' ? '•' : m[1]));
      inline(li, m[2]);
    } else if (line.trim()) inline(h('div', 'mp', parent), line);
  }
  return tokens;
}

// Reveal times for n tokens between t0 and t1, in bursts of one to five, the
// way a model's reply arrives.
function bursts(n, t0, t1, seed) {
  const rnd = random(seed);
  const weights = [];
  for (let i = 0; i < n;) {
    const size = 1 + Math.floor(rnd() * 5);
    for (let j = 0; j < size && i < n; j++, i++) weights.push(j ? 0 : .5 + rnd() * 1.5);
  }
  weights[0] = 0;
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  let sum = 0;
  return weights.map(w => t0 + (t1 - t0) * (sum += w) / total);
}

// ---------------------------------------------------------------- timeline
// What Copilot did, top to bottom. Items are laid out as they're added; each
// shows from its `at` time. The view sticks to the bottom as items arrive,
// scrolling there smoothly.
function makeTimeline(page, bottom) {
  const view = place(h('div', 'tlview', page), MAIN, VIEW_TOP, W - MAIN, bottom - VIEW_TOP);
  const content = place(h('div', 'tlcontent', view), 0, 0, W - MAIN);
  const fadeH = 30;
  place(h('div', 'tlfade', view), 0, bottom - VIEW_TOP - fadeH, W - MAIN, fadeH);
  const viewH = bottom - VIEW_TOP;
  const x0 = COL.x - MAIN;
  const items = [];
  const groups = [];
  let open = null;

  const add = (item, node) => {
    const prev = items.at(-1);
    item.node = node;
    item.y = prev ? prev.y + prev.h + GAP[prev.kind][item.kind] : FIRST - VIEW_TOP;
    node.style.top = px(item.y);
    item.h = item.h ?? node.offsetHeight;
    item.at = Infinity;
    node.style.visibility = 'hidden';
    items.push(item);
    if (open && item.nest) open.rows.push(item);
    else open = null;
    return item;
  };

  // A row: an icon (or a logo, or nothing) and its text. Text parts after
  // the title: `detail` after a middle dot, `code` in a monospace font,
  // `effort` (a model's reasoning effort) and `took` (how long a command
  // ran, after a middle dot), all lighter. `diff` is [added, removed]
  // lines, in green and red (screenshot 04).
  const row = ({ icon: name, logo: brand, color = TL_ICON, text, detail, code, effort, took, diff, nest = 0 }) => {
    const x = x0 + nest * NEST;
    const node = place(h('div', 'trow', content), x, 0, COL.w - nest * NEST, ROW);
    if (name) icon(node, name, 0, 6, 16, color);
    if (brand) {
      // The Microsoft logo's squares fill 13/16 of its box.
      const size = brand === 'microsoft' ? 16 * 16 / 13 : 16;
      logo(node, brand, 8 - size / 2, 14 - size / 2, size);
    }
    const line = label(node, '', 22, 4, { color: MUTED });
    line.classList.add('tt');
    line.style.maxWidth = px(COL.w - nest * NEST - 22);
    h('span', null, line, text);
    if (detail) {
      h('span', 'dot', line, '·');
      h('span', 'd', line, detail);
    }
    if (code) h('span', 'code', line, code);
    if (effort) h('span', 'effort', line, effort);
    if (took) {
      h('span', 'dot', line, '·');
      h('span', 'd', line, took);
    }
    if (diff) {
      if (diff[0]) h('span', 'add', line, `+${diff[0]}`);
      if (diff[1]) h('span', 'del', line, `-${diff[1]}`);
    }
    return add({ kind: 'row', nest, line }, node);
  };
  const model = (m, provider, opts = {}) => row({ logo: m.logo, text: `Model ${opts.will ? 'will change' : 'changed'} to ${m.name} · ${provider}`, effort: 'Medium', ...opts });
  // A sub agent: later rows with `nest: 1` hang under it, joined by a line.
  const agent = opts => {
    const item = row(opts);
    const line = place(h('div', 'nestline', content), x0 + 7.5, item.y + ROW, 1, 0);
    open = { parent: item, rows: [], line };
    groups.push(open);
    return item;
  };
  const bubble = text => {
    const wrap = place(h('div', 'bwrap', content), x0, 0, COL.w);
    h('div', 'bubble', wrap, text);
    return add({ kind: 'bubble' }, wrap);
  };
  const md = (source, { nest = 0 } = {}) => {
    const node = place(h('div', 'md', content), x0 + nest * NEST, 0, COL.w - nest * NEST);
    const tokens = markdown(node, source);
    const item = add({ kind: 'md', nest, tokens, times: tokens.map(() => Infinity), shown: 0 }, node);
    // Measured on screen, then scaled back to window px.
    const box = node.getBoundingClientRect();
    const k = node.offsetHeight / box.height;
    item.bottoms = tokens.map(s => (s.getBoundingClientRect().bottom - box.top) * k);
    for (const s of tokens) s.style.visibility = 'hidden';
    node.style.visibility = 'inherit';
    return item;
  };
  // Streams a reply in between t0 and t1.
  const stream = (item, t0, t1, seed = 3) => {
    item.at = t0;
    item.times = bursts(item.tokens.length, t0, t1, seed);
    return item;
  };

  // The working row: a spinner and the time so far, under the last item
  // while Copilot works. `elapsed(t)` is the seconds to show.
  const workNode = place(h('div', 'trow', content), x0, 0, COL.w, ROW);
  const workSpin = spinner(workNode, 8, 13.9);
  const workText = label(workNode, '', 22, 4, { color: MUTED });
  const work = { from: Infinity, to: Infinity, elapsed: t => t - work.from };
  const clockText = s => {
    s = Math.max(0, Math.floor(s));
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
    return `${Math.floor(s / 3600)}h ${Math.floor(s / 60) % 60}m`;
  };

  const lastShown = t => {
    let last = null;
    for (const item of items) {
      if (t < item.at) break;
      last = item;
    }
    return last;
  };
  const bottomOf = (item, t) => {
    if (item.kind !== 'md') return item.h;
    const n = shownTokens(item, t);
    return n ? item.bottoms[n - 1] : 0;
  };
  const shownTokens = (item, t) => {
    let n = 0;
    while (n < item.times.length && item.times[n] <= t) n++;
    return n;
  };
  // Where the content ends at t, the working row included.
  const end = t => {
    const last = lastShown(t);
    if (!last) return FIRST - VIEW_TOP;
    let y = last.y + bottomOf(last, t);
    if (t >= work.from && t < work.to) y += GAP[last.kind].row + ROW;
    return y;
  };

  let scroll = null;
  // Call once every item has its time: works out the scrolling. `endAt` can
  // stand in for where the content ends, to scroll along a smoother line.
  const finish = (duration, { pad = 34, tau = .085, endAt = end } = {}) => {
    const n = Math.round(duration * 1000) + 1;
    scroll = new Float32Array(n);
    let s = Math.max(0, endAt(0) + pad - viewH);
    const k = 1 - Math.exp(-.001 / tau);
    for (let i = 0; i < n; i++) {
      const target = Math.max(0, endAt(i / 1000) + pad - viewH);
      s += (target - s) * k;
      scroll[i] = s;
    }
  };

  const pose = t => {
    for (const item of items) {
      const shown = t >= item.at;
      item.node.style.visibility = shown ? 'inherit' : 'hidden';
      if (!shown) continue;
      item.node.style.opacity = item.kind === 'md' ? 1 : span(t, item.at, item.at + .12);
      if (item.kind === 'md') {
        const n = shownTokens(item, t);
        if (n !== item.shown) {
          item.tokens.forEach((s, i) => { s.style.visibility = i < n ? 'inherit' : 'hidden'; });
          item.shown = n;
        }
      }
    }
    for (const g of groups) {
      const seen = g.rows.filter(r => t >= r.at);
      g.line.style.visibility = seen.length ? 'inherit' : 'hidden';
      if (seen.length) g.line.style.height = px(seen.at(-1).y + 22 - (g.parent.y + ROW));
    }
    const working = t >= work.from && t < work.to;
    workNode.style.visibility = working ? 'inherit' : 'hidden';
    if (working) {
      const last = lastShown(t);
      workNode.style.top = px(last ? last.y + bottomOf(last, t) + GAP[last.kind].row : FIRST - VIEW_TOP);
      workSpin(t);
      const text = clockText(work.elapsed(t));
      if (workText.textContent !== text) workText.textContent = text;
    }
    const s = scroll ? scroll[clamp(Math.round(t * 1000), 0, scroll.length - 1)] : 0;
    content.style.transform = `translateY(${px(-s)})`;
  };

  // Where an item is on screen at t, in window px.
  const where = (item, t) => {
    const s = scroll ? scroll[clamp(Math.round(t * 1000), 0, scroll.length - 1)] : 0;
    return { x: MAIN + (item.nest || 0) * NEST + x0, y: VIEW_TOP + item.y - s, w: COL.w, h: item.h };
  };

  return { view, content, items, row, model, agent, bubble, md, stream, work, finish, pose, where, end };
}

// ---------------------------------------------------------------- page
export function buildSession(ui, { title = 'New session', branch = 'local-auto/master', chip = 'Auto · Efficiency', mode = 'Interactive', placeholder = SESSION_PLACEHOLDER, prompt = '' } = {}) {
  const page = h('div', 'layer', ui);
  const header = buildHeader(page, { title, branch });
  const composer = buildComposer(page, { chip, placeholder, prompt, mode });
  const tl = makeTimeline(page, COMPOSER.y - 6);
  // The composer is drawn above the timeline's fade.
  page.appendChild(composer.box);
  const rename = text => { if (header.name.textContent !== text) header.name.textContent = text; };
  return { page, header, composer, tl, rename };
}
