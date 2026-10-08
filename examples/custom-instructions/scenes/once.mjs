// "Write down your conventions once and Copilot reads them at the start of
// every session. No more explaining how you want Copilot to work every
// time." A diagram on the dark board: the three rules are written into an
// Instructions note on the left, three sessions arrive on the right, and a
// line runs from the note to each one as it starts. Then each session gets
// its ask, which is short, because the rules are already there.
import { bezier, clamp, out, span } from '../motion.mjs';
import { clock } from '../timeline.mjs';
import { DH, DW, h, icon, imagesDecoded, loadAssets, place, px, r3 } from '../kit.mjs';
import { buildStage, film } from '../app.mjs';
import { typing } from '../input.mjs';
import { keep, linear, makeCamera, wide } from '../camera.mjs';
import { DIM, FAINT, GREEN, INK, LIGHT_PURPLE, PURPLE, arrive, buildBoard, el, loadFonts, svg, type } from '../graphics.mjs';
import { ASKS, PROJECT, RULES } from '../story.mjs';

// DRAWN: the diagram of one Instructions note feeding three sessions. It is a picture of the idea, not a screen in the app.
const T = clock('once');
const DURATION = T.duration;
const WRITE = T.said('write down');
const READS = T.said('reads them') - .1;
const START = T.said('at the [start]') - .1;
const NO = T.said('no more');
const CUE = {
  head: WRITE - .03,
  // The three rules go in while "write down your conventions once" is said.
  lines: [[WRITE + .15, WRITE + .8], [WRITE + .92, WRITE + 1.8], [WRITE + 1.92, WRITE + 2.5]],
  // The sessions arrive on "reads", and a line reaches each from "start".
  cards: [0, .14, .28].map(d => READS + d),
  wires: [0, .22, .44].map(d => START + d),
  wire: .6,
  // Each session's ask is typed from "No more explaining".
  asks: [[NO + .1, NO + .85], [NO + 1.05, NO + 1.7], [NO + 1.9, NO + 2.5]],
};

const NOTE = { x: 128, y: 312, w: 610, h: 340 };
const CARD = { x: 908, w: 500, h: 100, tops: [312, 432, 552] };
const SURFACE = { background: 'rgba(240, 246, 252, .045)', boxShadow: '0 0 0 1px rgba(240, 246, 252, .12) inset' };
const rise = bezier(.2, .7, .2, 1);

function panel(parent, x, y, w, height, radius = 16) {
  const node = place(h('div', 'layer', parent), x, y, w, height);
  node.style.right = node.style.bottom = 'auto';
  Object.assign(node.style, { borderRadius: px(radius), ...SURFACE });
  return node;
}
// A line of text that is typed in, with a block caret after it.
function typedLine(parent, x, y, { size, color, mono = false }) {
  const node = type(parent, '', x, y, { size, color, weight: mono ? 450 : 450, line: 1.4 });
  if (mono) node.style.fontFamily = '"Mona Sans Mono", Consolas, monospace';
  const text = h('span', null, node);
  const caret = h('span', null, node);
  Object.assign(caret.style, { display: 'inline-block', width: px(size * .5), height: px(size * 1.05), marginLeft: px(2), verticalAlign: px(-size * .18), background: LIGHT_PURPLE, borderRadius: px(2) });
  return { node, text, caret };
}

export default async function once() {
  await loadAssets(['check', 'file-text']);
  await loadFonts();
  const stage = buildStage();
  const board = buildBoard(stage, { glow: { x: DW / 2, y: 450, rx: 820, ry: 440 } });
  const layer = h('div', 'layer', stage);

  const head = type(layer, 'Written once. Read by every session.', DW / 2, 196, { size: 56, weight: 680, align: 'center', valign: 'middle', track: -.022 });

  // The note: the Instructions field, drawn large.
  const note = panel(layer, NOTE.x, NOTE.y, NOTE.w, NOTE.h);
  icon(note, 'file-text', 30, 27, 24, DIM);
  type(note, 'Instructions', 66, 24, { size: 23, weight: 620 });
  const where = type(note, PROJECT, NOTE.w - 30, 28, { size: 17, weight: 500, color: FAINT, align: 'right' });
  where.style.fontFamily = '"Mona Sans Mono", Consolas, monospace';
  const rule = place(h('div', 'layer', note), 0, 78, NOTE.w, 1);
  rule.style.right = rule.style.bottom = 'auto';
  rule.style.background = 'rgba(240, 246, 252, .08)';
  const lines = RULES.map((text, i) => ({ ...typedLine(note, 30, 116 + 58 * i, { size: 21, color: INK, mono: true }), typed: typing(text, ...CUE.lines[i], { seed: 11 + i }) }));

  // The sessions, each with a ring that turns into a check when the
  // instructions reach it.
  const wires = svg(layer);
  const cards = CARD.tops.map((top, i) => {
    const node = panel(layer, CARD.x, top, CARD.w, CARD.h, 14);
    const lit = place(h('div', 'layer', node), 0, 0, CARD.w, CARD.h);
    Object.assign(lit.style, { right: 'auto', bottom: 'auto', borderRadius: px(14), boxShadow: `0 0 0 1.5px ${PURPLE} inset`, opacity: 0 });
    const ring = place(h('div', 'layer', node), 22, 26, 32, 32);
    Object.assign(ring.style, { right: 'auto', bottom: 'auto', borderRadius: '50%', boxShadow: '0 0 0 2px rgba(240, 246, 252, .22) inset' });
    const done = place(h('div', 'layer', node), 22, 26, 32, 32);
    Object.assign(done.style, { right: 'auto', bottom: 'auto', borderRadius: '50%', background: GREEN });
    icon(done, 'check', 8, 8, 20, '#0d1117').style.strokeWidth = 3;
    type(node, 'New session', 82, 19, { size: 21, weight: 620 });
    const ask = { ...typedLine(node, 82, 53, { size: 18, color: DIM }), typed: typing(ASKS[i], ...CUE.asks[i], { seed: 31 + i }) };
    const y = top + CARD.h / 2, x0 = NOTE.x + NOTE.w, y0 = NOTE.y + NOTE.h / 2, bend = (CARD.x - x0) / 2;
    const d = `M${x0} ${y0}C${x0 + bend} ${y0} ${CARD.x - bend} ${y} ${CARD.x} ${y}`;
    const base = el(wires, 'path', { d, fill: 'none', stroke: 'rgba(240, 246, 252, .1)', 'stroke-width': 2 });
    const wire = el(wires, 'path', { d, fill: 'none', stroke: PURPLE, 'stroke-width': 2.5, 'stroke-linecap': 'round' });
    const length = wire.getTotalLength();
    wire.setAttribute('stroke-dasharray', `${r3(length)} ${r3(length)}`);
    const dot = el(wires, 'circle', { r: 5, fill: LIGHT_PURPLE });
    // Where the line's head is, sampled once so pose measures nothing.
    const points = Array.from({ length: 61 }, (_, k) => { const p = wire.getPointAtLength(length * k / 60); return [p.x, p.y]; });
    return { node, lit, ring, done, ask, base, wire, dot, length, points };
  });
  await imagesDecoded();

  const about = (shot, [fx, fy], k) => keep({ x: fx + (shot.x - fx) / k, y: fy + (shot.y - fy) / k, s: shot.s * k });
  const camera = makeCamera([[0, wide], [DURATION, about(wide, [DW / 2, 440], 1.04), linear]]);
  const show = ({ text, caret, typed }, t, hold = .5) => {
    const now = typed.text(t);
    if (text.textContent !== now) text.textContent = now;
    caret.style.visibility = t >= typed.start && t < typed.end + hold ? 'visible' : 'hidden';
  };

  const pose = t => {
    t = clamp(t, 0, DURATION);
    film(stage, camera(t));
    board.grain(t);
    arrive(head, t, CUE.head, .55, rise, 0, 14);
    const n = rise(span(t, 0, .45));
    note.style.opacity = n;
    note.style.transform = `translateY(${px((1 - n) * 14)})`;
    lines.forEach((line, i) => show(line, t, i === lines.length - 1 ? .6 : .1));

    cards.forEach((card, i) => {
      const a = rise(span(t, CUE.cards[i], CUE.cards[i] + .5));
      card.node.style.opacity = a;
      card.node.style.transform = `translateX(${px((1 - a) * 26)})`;
      card.base.style.opacity = a;
      // The line runs out to the session, and the session lights as it lands.
      const u = out(span(t, CUE.wires[i], CUE.wires[i] + CUE.wire));
      card.wire.style.visibility = u > 0 ? 'visible' : 'hidden';
      card.wire.setAttribute('stroke-dashoffset', r3(card.length * (1 - u)));
      const [x, y] = card.points[Math.round(u * 60)];
      card.dot.setAttribute('cx', r3(x));
      card.dot.setAttribute('cy', r3(y));
      card.dot.style.opacity = u > 0 && u < 1 ? 1 : 0;
      const landed = CUE.wires[i] + CUE.wire - .08;
      const k = out(span(t, landed, landed + .3));
      card.done.style.opacity = k;
      card.done.style.transform = `scale(${r3(.6 + .4 * k)})`;
      card.ring.style.opacity = 1 - k;
      card.lit.style.opacity = r3(k * (1 - .6 * span(t, landed + .5, landed + 1.3)));
      show(card.ask, t, .35);
    });
  };

  return {
    pose,
    duration: DURATION,
    fast: [[CUE.cards[0], CUE.cards[2] + .4]],
    info: { write: r3(WRITE), reads: r3(READS), start: r3(START), no: r3(NO), duration: r3(DURATION), frame: [DW, DH] },
  };
}
