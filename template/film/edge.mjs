// DRAWN: Microsoft Edge on Windows 11 (light), the plain layout everyone knows: one tab, the toolbar, the address bar.
// Nothing came from a screenshot. The page inside is the caller's: `view` is its box. Build once, then
// pose({ title, url, focus, selected, closing }) each frame. `url` is the address without its scheme; while the address bar has
// focus Edge shows the whole thing, https:// included, and clicking in it selects all of it. `closing` is the pointer on the
// close button, which turns red.
import { h, icon, mark, place } from './kit.mjs';

export const EDGE_ICONS = ['arrow-left', 'arrow-right', 'rotate-cw', 'lock', 'star', 'ellipsis', 'x', 'minus', 'square', 'plus'];
export const EDGE_TOP = 81;
const BAR = { x: 108, y: 5, rightGap: 52 };

const set = (node, text) => { if (node.textContent !== text) node.textContent = text; };

// `before` is the node the window goes in front of (the pointer, so it stays on top), appended when left out.
export function buildEdge(parent, { x, y, w, h: height, before = null }) {
  const node = place(h('div', 'edge'), x, y, w, height);
  parent.insertBefore(node, before);

  const tabs = place(h('div', 'tabs', node), 0, 0, w, 41);
  const tab = place(h('div', 'tab', tabs), 8, 6, 230, 35);
  mark(tab, 12, 9.5, 16, '#1f2328');
  const title = h('div', 't', tab);
  title.dataset.clip = '';
  icon(tab, 'x', 230 - 26, 10.5, 14, '#5f6368');
  icon(tabs, 'plus', 252, 13.5, 14, '#3b3b3b');
  icon(tabs, 'minus', w - 138 + 16, 13.5, 14, '#3b3b3b');
  icon(tabs, 'square', w - 92 + 17, 14.5, 12, '#3b3b3b');
  // The close button turns red under the pointer, like every Windows window's.
  const shut = place(h('div', 'cbtn', tabs), w - 46, 0, 46, 40);
  const shutX = icon(tabs, 'x', w - 46 + 16, 13.5, 14, '#3b3b3b');

  const tbar = place(h('div', 'tbar', node), 0, 41, w, 40);
  icon(tbar, 'arrow-left', 14, 12, 16, '#3b3b3b');
  icon(tbar, 'arrow-right', 46, 12, 16, '#b4b4b4');
  icon(tbar, 'rotate-cw', 78, 12, 16, '#3b3b3b');
  const barW = w - BAR.x - BAR.rightGap;
  const addr = place(h('div', 'addr', tbar), BAR.x, BAR.y, barW, 30);
  icon(addr, 'lock', 13, 8, 14, '#3b3b3b');
  const text = h('div', 'u', addr);
  const host = h('span', 'host', text);
  const path = h('span', 'path', text);
  icon(addr, 'star', barW - 28, 8, 14, '#3b3b3b');
  icon(tbar, 'ellipsis', w - 36, 12, 16, '#3b3b3b');

  const view = place(h('div', 'view', node), 0, EDGE_TOP, w, height - EDGE_TOP);

  const pose = ({ title: name = '', url = '', focus = null, selected = false, closing = false } = {}) => {
    shut.style.visibility = closing ? 'visible' : 'hidden';
    shutX.style.color = closing ? '#fff' : '#3b3b3b';
    const shown = focus === 'address' ? `https://${url}` : url;
    const from = shown.includes('//') ? shown.indexOf('//') + 2 : 0;
    const cut = shown.indexOf('/', from);
    set(host, cut < 0 ? shown : shown.slice(0, cut));
    set(path, cut < 0 ? '' : shown.slice(cut));
    set(title, name);
    addr.classList.toggle('focus', focus === 'address');
    text.classList.toggle('on', focus === 'address');
    text.classList.toggle('sel', selected);
  };
  // The address bar, in the window's own px.
  const bar = () => ({ x: BAR.x, y: 41 + BAR.y, w: barW, h: 30 });
  // The close button, in the window's own px.
  const close = () => ({ x: w - 46, y: 0, w: 46, h: 40 });
  return { node, view, pose, bar, close };
}
