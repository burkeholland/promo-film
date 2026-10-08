// The look of the motion graphics (the chart in graphic-67 and the title card
// in aion-title): GitHub's dark canvas, Mona Sans, a faint lift of light behind
// the subject, a vignette, and film grain so the dark gradients don't band.
// The grain changes every other frame, like film at 30 fps, and holds still
// across the moments that one frame's motion blur blends, so a frame where
// nothing moves still renders from a single picture.
import { DH, DW, NS, h, place, px } from './kit.mjs';
import { random } from './motion.mjs';

export const BOARD = '#0d1117';
export const INK = '#e6edf3';
export const DIM = '#8b949e';
export const FAINT = '#6e7681';
export const RULE = 'rgba(240, 246, 252, .08)';
export const GREEN = '#3fb950';
export const LIGHT_GREEN = '#7ee787';
export const PURPLE = '#a371f7';
export const LIGHT_PURPLE = '#d2a8ff';

const FPS = 60;
const TILE = 256;
const NOISE = `<svg xmlns="${NS}" width="${TILE}" height="${TILE}"><filter id="n" x="0" y="0" width="100%" height="100%">`
  + '<feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="2" seed="7" stitchTiles="stitch"/>'
  + `<feColorMatrix type="saturate" values="0"/></filter><rect width="${TILE}" height="${TILE}" filter="url(#n)"/></svg>`;

export async function loadFonts() {
  const faces = await document.fonts.load('700 24px "Mona Sans"');
  if (!faces.length) throw new Error('Mona Sans did not load');
  await document.fonts.ready;
}

// Hides the desktop, lights the canvas around `glow` (stage px) and lays the
// vignette and grain over the frame, outside the camera's move.
export function buildBoard(stage, { glow = { x: DW / 2, y: DH / 2, rx: 620, ry: 400 }, grain = .45, vignette = .55 } = {}) {
  document.body.classList.add('board');
  const lift = place(h('div', 'lift', stage), 0, 0, DW, DH);
  lift.style.background = `radial-gradient(${px(glow.rx)} ${px(glow.ry)} at ${px(glow.x)} ${px(glow.y)}, rgba(23, 29, 38, 1), rgba(23, 29, 38, 0))`;
  const shade = place(h('div', 'vignette', document.body), 0, 0, DW, DH);
  shade.style.background = `radial-gradient(ellipse 75% 80% at 50% 47%, rgba(1, 4, 9, 0) 52%, rgba(1, 4, 9, ${vignette}) 100%)`;
  const noise = place(h('div', 'grain', document.body), 0, 0, DW, DH);
  noise.style.backgroundImage = `url("data:image/svg+xml,${encodeURIComponent(NOISE)}")`;
  noise.style.backgroundSize = `${TILE}px ${TILE}px`;
  noise.style.opacity = grain;
  return {
    lift,
    grain: t => {
      const next = random(Math.floor(Math.round(t * FPS) / 2) * 7919 + 13);
      // Whole steps of 4 px are whole device pixels at 125%, so the grain stays sharp.
      noise.style.backgroundPosition = `${4 * Math.floor(next() * TILE / 4)}px ${4 * Math.floor(next() * TILE / 4)}px`;
    },
  };
}

// ---------------------------------------------------------------- SVG
export function svg(parent, w = DW, height = DH) {
  const node = document.createElementNS(NS, 'svg');
  node.setAttribute('class', 'gfx-svg');
  node.setAttribute('width', w);
  node.setAttribute('height', height);
  node.setAttribute('viewBox', `0 0 ${w} ${height}`);
  parent.appendChild(node);
  return node;
}
export function set(node, attrs) {
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, typeof value === 'number' ? Math.round(value * 1000) / 1000 : value);
  return node;
}
export const el = (parent, tag, attrs = {}) => {
  const node = set(document.createElementNS(NS, tag), attrs);
  parent.appendChild(node);
  return node;
};

// ---------------------------------------------------------------- type
const ALIGN = { left: 0, center: -50, right: -100 };
const VALIGN = { top: 0, middle: -50, bottom: -100 };
// Mona Sans text, anchored at (x, y) by its `align` and `valign` edges.
export function type(parent, text, x, y, { size = 16, weight = 400, color = INK, align = 'left', valign = 'top', track = 0, line = 1.2, stretch } = {}) {
  const node = h('div', 'gfx', parent, text);
  node.style.fontSize = px(size);
  node.style.lineHeight = px(size * line);
  node.style.fontWeight = weight;
  node.style.color = color;
  if (track) node.style.letterSpacing = `${track}em`;
  if (stretch) node.style.fontStretch = `${stretch}%`;
  node.anchor = `translate(${ALIGN[align]}%, ${VALIGN[valign]}%)`;
  node.style.transform = node.anchor;
  return place(node, x, y);
}
// Moves (and scales) a node placed by type() away from its anchor.
export function nudge(node, dx = 0, dy = 0, s = 1) {
  node.style.transform = `${node.anchor} translate(${px(dx)}, ${px(dy)})${s === 1 ? '' : ` scale(${Math.round(s * 1e4) / 1e4})`}`;
}
// Fades a node in from `start` over `dur`, drifting in from (dx, dy).
export function arrive(node, t, start, dur, ease, dx = 0, dy = 0) {
  const u = ease(Math.min(1, Math.max(0, (t - start) / dur)));
  node.style.opacity = u;
  node.style.visibility = u > 0 ? 'visible' : 'hidden';
  nudge(node, dx * (1 - u), dy * (1 - u));
  return u;
}

// ---------------------------------------------------------------- captions
// Words on screen for a film with no voice: a dark pill near the foot of the
// frame, fixed there while the camera moves. Each caption is
// { from, to, parts }: it fades up at `from` and away at `to`. A part is a
// string, or [text, at] for words that stay dim until `at`, so a line can
// build in step with what the app does.
export function buildCaptions(captions) {
  // Kept for captions.mjs, which writes them as the video's SRT when there is
  // no voice to transcribe.
  window.__captions ||= [];
  for (const { from, to, parts } of captions) {
    window.__captions.push({ from, to: Number.isFinite(to) ? to : null, text: parts.map(part => [part].flat()[0]).join('').replace(/\s+/g, ' ').trim() });
  }
  const built = captions.map(({ from, to, parts, left }) => {
    const node = h('div', 'cap', document.body);
    // left moves a caption's middle off the frame's middle (a CSS length).
    if (left) node.style.left = left;
    const spans = parts.map(part => {
      const [text, at = -Infinity] = [part].flat();
      return { span: h('span', null, node, text), at };
    });
    return { node, spans, from, to };
  });
  const ease = u => 1 - (1 - u) ** 3;
  return t => {
    for (const { node, spans, from, to } of built) {
      const u = Math.min(ease(Math.min(1, Math.max(0, (t - from) / .35))), 1 - Math.min(1, Math.max(0, (t - to) / .25)));
      node.style.visibility = u > 0 ? 'visible' : 'hidden';
      if (!(u > 0)) continue;
      node.style.opacity = u;
      node.style.transform = `translate(-50%, ${px((1 - ease(Math.min(1, Math.max(0, (t - from) / .35)))) * 10)})`;
      for (const { span, at } of spans) span.style.opacity = .32 + .68 * Math.min(1, Math.max(0, (t - at) / .3));
    }
  };
}

// ---------------------------------------------------------------- rising words
// A line of Mona Sans whose words rise out of the line under them, one after
// another. `text` is split at spaces; a word in [brackets] takes `accent`.
// Place the returned node with place(); pose it with rise().
export function words(parent, text, { size = 64, weight = 700, color = INK, accent = color, line = 1.2, gap = .26, track = -.02, stretch = 100 } = {}) {
  const node = h('div', 'gfx', parent);
  Object.assign(node.style, { display: 'flex', alignItems: 'baseline', columnGap: `${gap}em`, letterSpacing: `${track}em`, fontStretch: `${stretch}%`, fontSize: px(size), lineHeight: px(size * line), fontWeight: weight });
  const items = text.split(' ').map(word => {
    const lit = word.startsWith('[');
    const wrap = h('div', null, node);
    wrap.style.clipPath = 'inset(-50% -30% 0 -30%)';
    const inner = h('div', null, wrap, word.replace(/[[\]]/g, ''));
    inner.style.color = lit ? accent : color;
    return { wrap, inner };
  });
  return { node, items };
}
// Word k starts at start + k * step and takes `dur` to come up.
export function rise({ items }, t, start, step = .07, dur = .6, ease = u => 1 - (1 - u) ** 4) {
  items.forEach(({ wrap, inner }, k) => {
    const u = ease(Math.min(1, Math.max(0, (t - start - k * step) / dur)));
    wrap.style.visibility = u > 0 ? 'visible' : 'hidden';
    inner.style.transform = `translateY(${Math.round((1 - u) * 106000) / 1000}%)`;
  });
}
