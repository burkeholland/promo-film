// "Capable devices will also be able to install Microsoft Aion Flash 1.0," A
// title card on the chart's dark board. The Microsoft logo pops in square by
// square as the cut lands and the line under the name fills in word by word,
// "capable devices" as they are said. Then each word of the name rises out of
// the line under it as it is said. "Flash" comes up quicker than the others,
// and a sheen of light runs across the name in the pause after "1.0". The
// camera creeps in the whole time.
import { bezier, lerp, out, outBack, span } from '../motion.mjs';
import { clock } from '../timeline.mjs';
import { DW, h, place, px, r3, rect } from '../kit.mjs';
import { buildStage, film } from '../app.mjs';
import { keep, linear, makeCamera, wide } from '../camera.mjs';
import { DIM, INK, buildBoard, loadFonts } from '../graphics.mjs';

const T = clock('aion-title');
const DURATION = T.duration;
// Onsets measured from the waveform. The name is Burke's "MAI Code 1.1 Flash"
// from his first take, laid into this one at 60.15 s (work/voicepatch.py).
const WORDS = T.words({ capable: 57.245, devices: 57.85, mai: 60.032, code: 60.602, one: 60.842, flash: 61.702 });

// The lockup sits a little above the middle of the frame, where the eye
// expects the middle to be.
const CENTER = { x: DW / 2, y: 420 };
const NAME_W = 1060;
const LINE_SIZE = 31;
// Logo bottom to the name's cap height, and the name's baseline to the second
// line's cap height.
const GAPS = [50, 36];
// The Microsoft logo, close to the official mark's proportions (squares of
// 6.178 with a .644 gap), sized to whole device pixels at 125%.
const SQUARE = 24;
const GAP = 2.4;
const LOGO = 2 * SQUARE + GAP;
const SQUARES = [['#f1511b', 0, 0], ['#80cc28', 1, 0], ['#00adef', 0, 1], ['#fbbc09', 1, 1]];
// [text, cue, weight, color, lit color]. The name comes up a little dim, part
// by part as it is said, and the light that runs across it in the pause after
// "Flash" leaves it lit. The name is written with spaces.
const NAME = [['MAI', 'mai', 720, '#c3cbd4', '#eef3f8'], ['Code', 'code', 720, '#c3cbd4', '#eef3f8'], ['1.1', 'one', 720, '#c3cbd4', '#eef3f8'], ['Flash', 'flash', 720, '#c3cbd4', '#eef3f8']];
const LINE = [
  ['A', 'a', 400, DIM], ['local', 'local', 600, INK], ['model', 'model', 600, INK], ['for', 'for', 400, DIM],
  ['capable', 'capable', 400, DIM], ['devices', 'devices', 400, DIM],
];
const PEAK = '#ffffff';
const ANGLE = 104;
const BAND = 130;

const CUE = {
  logo: -.03,
  ...Object.fromEntries(Object.entries(WORDS).map(([key, at]) => [key, at - .06])),
  // The words before "capable" are not said; they follow the logo in.
  a: .12, local: .2, model: .28, for: .36,
  sheen: [WORDS.flash + .1, WORDS.flash + .58],
};
// How long each word takes to rise. "Flash" is quicker.
const RISE = { name: .6, flash: .34, line: .5 };

// A shot pushed in by k about the point f, which stays put on screen.
const about = (shot, [fx, fy], k) => keep({ x: fx + (shot.x - fx) / k, y: fy + (shot.y - fy) / k, s: shot.s * k });
const hex = color => [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
const mix = (a, b, u) => `rgb(${hex(a).map((v, i) => Math.round(lerp(v, hex(b)[i], u))).join(', ')})`;

// A row of words, each of which rises out of the line under it.
function row(parent, words, { size, line, gap, track = 0, stretch = 100 }) {
  const node = h('div', 'gfx', parent);
  Object.assign(node.style, { display: 'flex', alignItems: 'baseline', columnGap: `${gap}em`, letterSpacing: `${track}em`, fontStretch: `${stretch}%` });
  const resize = next => Object.assign(node.style, { fontSize: px(next), lineHeight: px(next * line) });
  resize(size);
  const items = words.map(([text, key, weight, color, lit = color]) => {
    const wrap = h('div', null, node);
    wrap.style.clipPath = 'inset(-50% -30% 0 -30%)';
    const inner = h('div', null, wrap, text);
    Object.assign(inner.style, { fontWeight: weight, color });
    return { key, wrap, inner, color, lit };
  });
  return { node, items, resize };
}

export default async function aionTitle() {
  await loadFonts();
  const stage = buildStage();
  const board = buildBoard(stage, { glow: { x: CENTER.x, y: CENTER.y, rx: 760, ry: 420 } });
  const card = h('div', 'layer', stage);

  // ------------------------------------------------------------ type
  const name = row(card, NAME, { size: 100, line: 1.2, gap: .25, track: -.022, stretch: 104 });
  name.resize(100 * NAME_W / rect(name.node).w);
  const nameSize = parseFloat(name.node.style.fontSize);
  // The name is painted with a gradient so the sheen can run across it. The
  // padding keeps every glyph inside the box the gradient fills.
  for (const { inner } of name.items) Object.assign(inner.style, { padding: '0 .14em', margin: '0 -.14em', color: 'transparent', backgroundClip: 'text', webkitBackgroundClip: 'text', backgroundRepeat: 'no-repeat' });
  const line = row(card, LINE, { size: LINE_SIZE, line: 1.3, gap: .27 });

  const probe = document.createElement('canvas').getContext('2d');
  const metrics = (weight, size, lineHeight) => {
    probe.font = `${weight} ${size}px "Mona Sans"`;
    const m = probe.measureText('HIMF');
    // Where the baseline falls in a line box of this height.
    return { cap: m.actualBoundingBoxAscent, baseline: (lineHeight - m.fontBoundingBoxAscent - m.fontBoundingBoxDescent) / 2 + m.fontBoundingBoxAscent };
  };
  const nameM = metrics(720, nameSize, nameSize * 1.2);
  const lineM = metrics(600, LINE_SIZE, LINE_SIZE * 1.3);
  const inkH = LOGO + GAPS[0] + nameM.cap + GAPS[1] + lineM.cap;
  const logoTop = CENTER.y - inkH / 2;
  const nameBase = logoTop + LOGO + GAPS[0] + nameM.cap;
  const lineBase = nameBase + GAPS[1] + lineM.cap;
  const nameW = rect(name.node).w;
  const lineW = rect(line.node).w;
  place(name.node, CENTER.x - nameW / 2, nameBase - nameM.baseline);
  place(line.node, CENTER.x - lineW / 2, lineBase - lineM.baseline);

  // The sheen's gradient is laid out across the whole name, and each word
  // shows its own stretch of it, so the band runs on unbroken from word to word.
  const boxes = name.items.map(({ inner }) => rect(inner));
  const origin = boxes[0].x;
  const SPAN = { w: boxes.at(-1).x + boxes.at(-1).w - origin, h: boxes[0].h };
  const radians = ANGLE * Math.PI / 180;
  const gradientLength = SPAN.w * Math.abs(Math.sin(radians)) + SPAN.h * Math.abs(Math.cos(radians));
  name.items.forEach((item, k) => {
    item.inner.style.backgroundSize = `${px(SPAN.w)} ${px(SPAN.h)}`;
    item.inner.style.backgroundPosition = `${px(origin - boxes[k].x)} 0`;
  });
  const sheen = x => {
    // Distance along the gradient of the point x across the name, at mid height.
    const at = (x - SPAN.w / 2) * Math.sin(radians) + gradientLength / 2;
    // Lit behind the band, as it was ahead of it.
    for (const { inner, color, lit } of name.items) {
      inner.style.backgroundImage = `linear-gradient(${ANGLE}deg, ${lit} ${px(at - BAND)}, ${mix(lit, PEAK, .55)} ${px(at - BAND * .38)}, `
        + `${PEAK} ${px(at)}, ${mix(color, PEAK, .55)} ${px(at + BAND * .38)}, ${color} ${px(at + BAND)})`;
    }
  };

  // ------------------------------------------------------------ logo
  const logo = place(h('div', null, card), CENTER.x - LOGO / 2, logoTop, LOGO, LOGO);
  logo.style.position = 'absolute';
  const squares = SQUARES.map(([color, i, j], k) => {
    const node = place(h('div', null, logo), i * (SQUARE + GAP), j * (SQUARE + GAP), SQUARE, SQUARE);
    Object.assign(node.style, { position: 'absolute', background: color, boxShadow: `0 0 22px ${color}38` });
    // Each square starts a little way in toward the middle of the logo.
    const toward = [i, j].map(n => (LOGO / 2 - (n * (SQUARE + GAP) + SQUARE / 2)) * .6);
    return { node, toward, start: CUE.logo + k * .055 };
  });

  // ------------------------------------------------------------ motion
  const camera = makeCamera([[0, wide], [DURATION, about(wide, [CENTER.x, CENTER.y], 1.065), linear]]);
  const riseOf = key => (key === 'flash' ? RISE.flash : NAME.some(([, k]) => k === key) ? RISE.name : RISE.line);
  const words = [...name.items, ...line.items];
  const sweep = bezier(.33, 0, .3, 1);

  const pose = t => {
    film(stage, camera(t));
    board.grain(t);
    for (const { node, toward, start } of squares) {
      const u = outBack(span(t, start, start + .42), 1.9);
      node.style.visibility = u > 0 ? 'visible' : 'hidden';
      node.style.transform = `translate(${px(toward[0] * (1 - u))}, ${px(toward[1] * (1 - u))}) scale(${r3(u)})`;
    }
    for (const { key, wrap, inner } of words) {
      const u = out(span(t, CUE[key], CUE[key] + riseOf(key)));
      wrap.style.visibility = u > 0 ? 'visible' : 'hidden';
      inner.style.transform = `translateY(${r3((1 - u) * 106)}%)`;
    }
    sheen(lerp(-2 * BAND, SPAN.w + 2 * BAND, sweep(span(t, CUE.sheen[0], CUE.sheen[1]))));
  };

  return {
    pose,
    duration: DURATION,
    // The first moments of each rise and the logo's pop move fast enough to
    // need the finer motion blur.
    fast: [[CUE.logo, CUE.logo + .45], ...words.map(({ key }) => [CUE[key], CUE[key] + .25])],
    info: {
      cue: Object.fromEntries(Object.entries(CUE).map(([k, v]) => [k, Array.isArray(v) ? v.map(r3) : r3(v)])),
      nameSize: r3(nameSize),
      name: Object.values(rect(name.node)).map(r3),
      line: Object.values(rect(line.node)).map(r3),
      logo: [CENTER.x - LOGO / 2, logoTop, LOGO, LOGO].map(r3),
      baselines: [nameBase, lineBase].map(r3),
    },
  };
}
