// Title and end cards from data. A card is the dark board with blocks on it,
// top to bottom, each coming in at its own time; the camera creeps in the
// whole time. A scene that is only a card is a few lines:
//
//   import { card } from '../card.mjs';
//   import { COPILOT } from '../kit.mjs';
//   import { DIM, LIGHT_PURPLE } from '../graphics.mjs';
//   export default card('title', {
//     center: 418,                 // the card's middle (y), where the camera creeps to
//     blocks: [
//       { app: COPILOT, y: 233, at: .15 },
//       { words: ['Copilot can now use', 'your desktop apps.'], y: 318, at: .5, size: 88 },
//       { words: '[Computer] [Use] in the app.', y: 588, at: 2.1, size: 31, color: DIM, accent: LIGHT_PURPLE },
//     ],
//   });
//
// Blocks (every one takes `y`, the top of its first line or its middle for
// `app`, and `at`, when it starts to come in):
//   { app: 'text' }            the app's icon and a line beside it, rising
//                              a little as it fades in. icon (40), gap
//                              (14), size (27), weight (600), color, lift.
//   { words: 'text' | [...] }  lines of rising words (graphics.mjs words()),
//                              a word in [brackets] in `accent`. Each line
//                              follows the last without a gap. size,
//                              weight, color, accent, track, stretch (as
//                              words()), step (.07 s between words), dur
//                              (.6), lineGap, fast (seconds of motion blur
//                              from `at`; the last line's start + .5 if
//                              not set).
//   { setting: { name, about }, flip }   a settings row, drawn large,
//                              whose switch turns on at `flip`. w, h.
// The card also takes zoom (1.05, the camera's creep), glow (the board's light,
// centered on the card) and duration (seconds, only for a card the edit does
// not play yet). The title and end cards in SKILL/examples/computer-use are
// written with it.
// Anything else on a card (a chart, a screenshot) means writing the scene
// by hand: copy one that uses this and add to it.
import { span } from './motion.mjs';
import { clock } from './timeline.mjs';
import { DW, h, image, imagesDecoded, place, px, r3, rect } from './kit.mjs';
import { buildStage, film } from './app.mjs';
import { keep, linear, makeCamera, wide } from './camera.mjs';
import { DIM, INK, buildBoard, loadFonts, rise, type, words } from './graphics.mjs';

const ease = u => 1 - (1 - u) ** 3;
const about = (shot, [fx, fy], k) => keep({ x: fx + (shot.x - fx) / k, y: fy + (shot.y - fy) / k, s: shot.s * k });
const mix = (a, b, u) => a.map((v, i) => Math.round(v + (b[i] - v) * u));
const fadeUp = (node, t, at, lift, dur = .5) => {
  const u = ease(span(t, at, at + dur));
  node.style.opacity = u;
  node.style.transform = `translateY(${r3((1 - u) * lift)}px)`;
};

// The app's icon and a line of text beside it, centered as one.
function buildApp(parent, b) {
  const { app: text, y, icon = 40, gap = 14, size = 27, weight = 600, color = DIM, lift = 10 } = b;
  const node = h('div', 'layer', parent);
  const name = type(node, text, 0, 0, { size, weight, color, valign: 'middle' });
  const left = DW / 2 - (icon + gap + rect(name).w) / 2;
  image(node, null, 'assets/app-icon.png', left, y - 1 - icon / 2, icon, icon).style.position = 'absolute';
  place(name, left + icon + gap, y);
  return { node, box: name, pose: t => fadeUp(node, t, b.at, lift), fast: [] };
}

// Lines of rising words, each centered.
function buildWords(parent, b) {
  const { y, step = .07, dur = .6 } = b;
  const style = Object.fromEntries(['size', 'weight', 'color', 'accent', 'track', 'stretch'].filter(k => b[k] !== undefined).map(k => [k, b[k]]));
  const lineGap = b.lineGap ?? Math.round((b.size ?? 64) * 1.18);
  const lines = [b.words].flat().map((text, i) => {
    const line = words(parent, text, style);
    place(line.node, DW / 2 - rect(line.node).w / 2, y + i * lineGap);
    return line;
  });
  const starts = [];
  let at = b.at;
  for (const line of lines) { starts.push(at); at += step * line.items.length; }
  return {
    node: lines[0].node,
    pose: t => lines.forEach((line, i) => rise(line, t, starts[i], step, dur)),
    fast: [[b.at, b.fast === undefined ? starts.at(-1) + .5 : b.at + b.fast]],
    info: { lines: starts.map(r3) },
  };
}

// A settings row with a switch that turns on.
const OFF = [110, 118, 129], ON = [35, 134, 54], KNOB_OFF = [201, 209, 217];
function buildSetting(parent, b) {
  const { setting: { name, about: blurbText }, y, w = 820, h: height = 112, flip, lift = 16 } = b;
  const SWITCH = { w: 56, h: 30 };
  const row = place(h('div', 'layer', parent), DW / 2 - w / 2, y, w, height);
  row.style.right = row.style.bottom = 'auto';
  Object.assign(row.style, { borderRadius: px(14), background: 'rgba(240, 246, 252, .045)', boxShadow: '0 0 0 1px rgba(240, 246, 252, .12) inset' });
  type(row, name, 32, 24, { size: 24, weight: 620, color: INK });
  const blurb = type(row, blurbText, 32, 60, { size: 17, weight: 420, color: DIM, line: 1.35 });
  blurb.style.width = px(w - 32 - 32 - SWITCH.w - 40);
  blurb.style.whiteSpace = 'normal';
  const track = place(h('div', 'layer', row), w - 32 - SWITCH.w, (height - SWITCH.h) / 2, SWITCH.w, SWITCH.h);
  track.style.right = track.style.bottom = 'auto';
  track.style.borderRadius = px(SWITCH.h / 2);
  const knob = place(h('div', 'layer', track), 0, 0, SWITCH.h - 10, SWITCH.h - 10);
  knob.style.right = knob.style.bottom = 'auto';
  Object.assign(knob.style, { borderRadius: '50%', top: px(5) });
  const pose = t => {
    fadeUp(row, t, b.at, lift);
    const f = flip === undefined ? 0 : ease(span(t, flip, flip + .22));
    const [cr, cg, cb] = mix(OFF, ON, f);
    track.style.background = f > 0 ? `rgb(${cr}, ${cg}, ${cb})` : 'transparent';
    track.style.boxShadow = `0 0 0 ${r3(1.5 * (1 - f))}px rgb(${OFF.join(',')}) inset`;
    const [kr, kg, kb] = mix(KNOB_OFF, [255, 255, 255], f);
    knob.style.background = `rgb(${kr}, ${kg}, ${kb})`;
    knob.style.left = px(5 + f * (SWITCH.w - SWITCH.h));
  };
  return { node: row, pose, fast: flip === undefined ? [] : [[flip, flip + .3]], info: { blurb: Object.values(rect(blurb)).map(r3) } };
}

// A scene (the default export of film/scenes/<name>.mjs) that draws the card.
export function card(name, { blocks, center = 420, zoom = 1.05, glow = {}, duration }) {
  return async function build() {
    const DURATION = duration ?? clock(name).duration;
    await loadFonts();
    const stage = buildStage();
    const board = buildBoard(stage, { glow: { x: DW / 2, y: center, rx: 780, ry: 430, ...glow } });
    const layer = h('div', 'layer', stage);
    const built = blocks.map(b => {
      if (b.app !== undefined) return buildApp(layer, b);
      if (b.words !== undefined) return buildWords(layer, b);
      if (b.setting !== undefined) return buildSetting(layer, b);
      throw new Error(`A card block is { app }, { words } or { setting }, not ${JSON.stringify(b)}`);
    });
    await imagesDecoded();
    const camera = makeCamera([[0, wide], [DURATION, about(wide, [DW / 2, center], zoom), linear]]);
    return {
      pose: t => {
        film(stage, camera(t));
        board.grain(t);
        for (const block of built) block.pose(t);
      },
      duration: DURATION,
      fast: built.flatMap(block => block.fast),
      info: { blocks: built.map(block => ({ box: Object.values(rect(block.box ?? block.node)).map(r3), ...block.info })) },
    };
  };
}
