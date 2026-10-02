// The Windows 11 shell around the app, in the light theme at 125%: the
// taskbar (set to hide itself, as on Burke's desktop, so it only slides up
// when the pointer touches the bottom of the screen) and the Quick Settings
// flyout that opens from its network, volume and battery icons. Sizes are
// Windows' own, in effective pixels, which are this film's CSS px. Glyphs
// come from the system's Segoe Fluent Icons font.
import { DH, DW, NS, h, image, mix, place, px } from './kit.mjs';

export const BAR = 48;
export const ACCENT = '#005fb8';
export const GLYPH = {
  wifi: '\uE701', bluetooth: '\uE702', airplane: '\uE709', brightness: '\uE706', volume: '\uE995',
  settings: '\uE713', edit: '\uE70F', right: '\uE76C', up: '\uE70E', search: '\uE721', bell: '\uEA8F',
  access: '\uE776', saver: '\uE8BE', night: '\uF08C',
};

const glyph = (parent, char, x, y, size = 16) => {
  const g = place(h('div', 'wg', parent, char), x, y, size, size);
  if (size !== 16) Object.assign(g.style, { fontSize: px(size), lineHeight: px(size) });
  return g;
};
const svg = (parent, markup, x, y, w, height) => {
  const node = document.createElementNS(NS, 'svg');
  node.setAttribute('width', w);
  node.setAttribute('height', height);
  node.setAttribute('viewBox', `0 0 ${w} ${height}`);
  node.classList.add('ic');
  node.innerHTML = markup;
  parent.appendChild(node);
  place(node, x, y);
  return node;
};
// A horizontal battery, filled to `level`, as in the tray and the flyout.
const battery = (parent, x, y, level = .87) => svg(parent, `
  <rect x="1.5" y="4.5" width="11.5" height="7" rx="1.6" fill="none" stroke="#1a1a1a"/>
  <rect x="3" y="6" width="${(8.5 * level).toFixed(2)}" height="4" rx=".6" fill="#1a1a1a"/>
  <path d="M14.6 6.6v2.8" stroke="#1a1a1a" stroke-width="1.2" stroke-linecap="round"/>`, x, y, 16, 16);

// ---------------------------------------------------------------- taskbar
// Pinned apps sit in the middle; the tray on the right has the hidden icons
// chevron, the Quick Settings group (network, volume, battery) and the clock.
export const TRAY = {
  chevron: { x: 1304, y: 4, w: 24, h: 40 },
  group: { x: 1332, y: 4, w: 80, h: 40 },
  clock: { x: 1416, y: 4, w: 108, h: 40 },
};

export function buildTaskbar(stage, { time = '12:18 PM', date = '9/30/2026' } = {}) {
  const bar = place(h('div', 'taskbar', stage), 0, DH, DW, BAR);
  const pitch = 44, apps = 5;
  const x0 = DW / 2 - (apps * pitch - 4) / 2;
  const button = i => place(h('div', 'tbtn', bar), x0 + i * pitch, 4, 40, 40);
  // Start: the four panes share one gradient, light at the top left.
  svg(button(0), `<defs><linearGradient id="winlogo" x1="0" y1="0" x2="20" y2="20" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#52c7ff"/><stop offset="1" stop-color="#0067c0"/></linearGradient></defs>
    <g fill="url(#winlogo)"><rect width="9.4" height="9.4" rx=".8"/><rect x="10.6" width="9.4" height="9.4" rx=".8"/>
    <rect y="10.6" width="9.4" height="9.4" rx=".8"/><rect x="10.6" y="10.6" width="9.4" height="9.4" rx=".8"/></g>`, 10, 10, 20, 20);
  glyph(button(1), GLYPH.search, 10, 10, 20);
  svg(button(2), `<path d="M2.5 6a2 2 0 0 1 2-2h4.6a2 2 0 0 1 1.4.6L12 6h7.5a2 2 0 0 1 2 2v9.5a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2z" fill="#e3a21a"/>
    <path d="M2.5 9.6A1.6 1.6 0 0 1 4.1 8h15.8a1.6 1.6 0 0 1 1.6 1.6v7.9a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2z" fill="#ffc83d"/>
    <path d="M2.5 9.6A1.6 1.6 0 0 1 4.1 8h15.8a1.6 1.6 0 0 1 1.6 1.6v.6H2.5z" fill="#ffd96a"/>`, 8, 8, 24, 24);
  svg(button(3), `<rect x="2" y="3" width="20" height="18" rx="3.2" fill="#2b2b2b"/>
    <rect x="2.5" y="3.5" width="19" height="17" rx="2.7" fill="none" stroke="#6b6b6b"/>
    <path d="M6.6 9.2l3.4 2.8-3.4 2.8" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M11.6 15h5.2" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>`, 8, 8, 24, 24);
  // The app is open and focused: a lighter backplate and the accent pill.
  const app = button(4);
  app.classList.add('active');
  image(app, 'logo', 'assets/app-icon.png', 8, 8, 24, 24);
  place(h('div', 'pill', app), 12, 37, 16, 3);
  // Terminal is running in the background: a short grey pill.
  place(h('div', 'pill idle', bar.children[3]), 17, 37, 6, 3);

  const chevron = place(h('div', 'tbtn', bar), TRAY.chevron.x, 4, TRAY.chevron.w, 40);
  glyph(chevron, GLYPH.up, 6, 14, 12);
  const group = place(h('div', 'tbtn', bar), TRAY.group.x, 4, TRAY.group.w, 40);
  const net = glyph(group, GLYPH.wifi, 8, 12);
  glyph(group, GLYPH.volume, 32, 12);
  battery(group, 56, 12);
  const clock = place(h('div', 'tbtn', bar), TRAY.clock.x, 4, TRAY.clock.w, 40);
  const stamp = place(h('div', 'clock', clock), 0, 4, 68);
  stamp.append(time, h('br'), date);
  glyph(clock, GLYPH.bell, 76, 12);
  return { bar, group, net, clock };
}

// How far the taskbar is up (0 hidden, 1 shown), and the tray's states: the
// pointer over the Quick Settings group, the button held on it, the flyout
// open (which keeps the group lit) and the network icon.
export function poseTaskbar(T, { up, hover = false, down = false, open = false, airplane = false }) {
  T.bar.style.transform = up > 0 ? `translateY(${px(-BAR * up)})` : 'none';
  T.bar.style.visibility = up > 0 ? 'inherit' : 'hidden';
  T.group.classList.toggle('hover', (hover || open) && !(hover && down));
  T.group.classList.toggle('press', hover && down);
  const char = airplane ? GLYPH.airplane : GLYPH.wifi;
  if (T.net.textContent !== char) T.net.textContent = char;
}

// ---------------------------------------------------------------- Quick Settings
// The flyout above the tray: two rows of toggle tiles with their names under
// them, the brightness and volume sliders, and a footer with the battery and
// the buttons to edit the tiles or open Settings. It hangs 12 px in from the
// right edge and 12 px above the taskbar.
export const QS = { w: 360, main: 296, foot: 48 };
QS.x = DW - 12 - QS.w;
QS.y = DH - BAR - 12 - QS.main - QS.foot;
const TILE = { w: 96, h: 48, pitch: 84, gap: 12, pad: 24 };
const TILES = [
  { id: 'wifi', glyph: GLYPH.wifi, name: 'Wi-Fi', split: true },
  { id: 'bluetooth', glyph: GLYPH.bluetooth, name: 'Bluetooth', split: true },
  { id: 'airplane', glyph: GLYPH.airplane, name: 'Airplane mode' },
  { id: 'saver', glyph: GLYPH.saver, name: 'Energy saver' },
  { id: 'night', glyph: GLYPH.night, name: 'Night light' },
  { id: 'access', glyph: GLYPH.access, name: 'Accessibility', split: true },
];

// A slider: its glyph on the left, then the track with the thumb at `level`.
function slider(parent, char, y, right, level) {
  glyph(parent, char, TILE.pad + 2, y - 8);
  const x0 = TILE.pad + 40, x1 = QS.w - right;
  const track = place(h('div', 'qtrack', parent), x0, y - 2, x1 - x0, 4);
  place(h('i', null, track), 0, 0, (x1 - x0) * level, 4);
  place(h('div', 'qthumb', parent), x0 + (x1 - x0) * level - 10, y - 10, 20, 20);
}

export function buildQuickSettings(stage, { ssid = 'Octocat-5G', on = ['wifi', 'bluetooth'] } = {}) {
  const panel = place(h('div', 'qs', stage), QS.x, QS.y, QS.w, QS.main + QS.foot);
  const tiles = {};
  TILES.forEach((tile, i) => {
    const x = TILE.pad + (i % 3) * (TILE.w + TILE.gap), y = TILE.pad + Math.floor(i / 3) * TILE.pitch;
    const node = place(h('div', 'qtile', panel), x, y, TILE.w, TILE.h);
    const accent = h('div', 'qacc', node);
    // A split tile toggles on its left two thirds; the chevron on the right
    // opens the tile's own page.
    const parts = [glyph(node, tile.glyph, (tile.split ? 64 : TILE.w) / 2 - 8, 16)];
    if (tile.split) {
      place(h('div', 'qseam', node), 64, 0, 1, TILE.h);
      parts.push(glyph(node, GLYPH.right, 74, 18, 12));
    }
    const name = place(h('div', 'qlabel', panel, tile.id === 'wifi' ? ssid : tile.name), x - 6, y + TILE.h + 6, TILE.w + 12);
    tiles[tile.id] = {
      ...tile, node, accent, parts, name,
      box: { x: QS.x + x, y: QS.y + y, w: TILE.w, h: TILE.h },
      start: on.includes(tile.id) ? 1 : 0,
    };
  });
  slider(panel, GLYPH.brightness, 212, TILE.pad, .62);
  slider(panel, GLYPH.volume, 260, TILE.pad + 40, .38);
  glyph(panel, GLYPH.right, QS.w - TILE.pad - 22, 254, 12);
  const foot = place(h('div', 'qfoot', panel), 0, QS.main, QS.w, QS.foot);
  battery(foot, TILE.pad - 2, 16);
  place(h('div', 'qpct', foot, '87%'), TILE.pad + 20, 15);
  glyph(foot, GLYPH.edit, QS.w - TILE.pad - 62, 16);
  glyph(foot, GLYPH.settings, QS.w - TILE.pad - 18, 16);
  return { panel, tiles, ssid };
}

// The flyout at `open` (0 shut, 1 open) as it slides up and fades in, or at
// `close` as it drops away. `on` gives each tile's fill (0 off, 1 on, between
// while it fades), `hover` the tile under the pointer and `down` whether the
// button is held on it.
export function poseQuickSettings(Q, { open, close = 0, on = {}, hover = null, down = false }) {
  const shown = open > 0 && close < 1;
  Q.panel.style.visibility = shown ? 'inherit' : 'hidden';
  if (!shown) return;
  const rise = close > 0 ? 18 * close : 36 * (1 - open);
  Q.panel.style.transform = rise > 1e-3 ? `translateY(${px(rise)})` : 'none';
  Q.panel.style.opacity = close > 0 ? 1 - close : Math.min(1, open * 2.2);
  for (const tile of Object.values(Q.tiles)) {
    const u = on[tile.id] ?? tile.start;
    const over = hover === tile.id, held = over && down;
    tile.node.classList.toggle('hover', over && !held);
    tile.node.classList.toggle('press', held);
    tile.accent.style.opacity = u * (held ? .8 : over ? .9 : 1);
    const ink = held && u < .5 ? 'rgba(0, 0, 0, .62)' : u >= 1 ? '#fff' : u <= 0 ? '#1b1b1b' : mix('#1b1b1b', '#ffffff', u);
    for (const part of tile.parts) part.style.color = ink;
    tile.node.classList.toggle('lit', u >= .5);
  }
  const wifi = Q.tiles.wifi;
  const name = (on.wifi ?? wifi.start) >= .5 ? Q.ssid : 'Wi-Fi';
  if (wifi.name.textContent !== name) wifi.name.textContent = name;
}
