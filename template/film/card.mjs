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
//   { automation: { name, about, trigger, icon, tone, result } }   an
//                              automation as a card: icon, name, trigger,
//                              what it does, and a footer that shows it
//                              running (the app's dotted spinner) until
//                              `done`, then what it did. It lands at `at`.
//                              x (its middle), y (its top), w (428), h (252),
//                              tone ('blue', 'green' or 'purple'). slide:
//                              [{ at, dx, dur }] moves it dx px sideways
//                              from `at`, to make room for the next card.
// Any block takes move: { at, dy, dur } to slide to dy px further down (up if
// negative) from `at`, for a title that makes room for what comes next.
// The card also takes zoom (1.05, the camera's creep), glow (the board's light,
// centered on the card) and duration (seconds, only for a card the edit does
// not play yet). The title and end cards in SKILL/examples/computer-use are
// written with it.
// Anything else on a card (a chart, a screenshot) means writing the scene
// by hand: copy one that uses this and add to it.
import { inOut, out, outBack, span } from './motion.mjs';
import { clock } from './timeline.mjs';
import { DW, h, icon, image, imagesDecoded, loadAssets, place, px, r3, rect } from './kit.mjs';
import { buildStage, film } from './app.mjs';
import { keep, linear, makeCamera, wide } from './camera.mjs';
import { spinner } from './session.mjs';
import { DIM, GREEN, INK, LIGHT_GREEN, LIGHT_PURPLE, buildBoard, loadFonts, rise, type, words } from './graphics.mjs';

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

// An automation as a card on the dark board: its name and trigger, what it
// does, and a footer that shows it running and then what it did.
const BLUE = '#58a6ff';
const TONES = {
  blue: { tint: '56, 139, 253', ink: '#79c0ff' },
  green: { tint: '63, 185, 80', ink: LIGHT_GREEN },
  purple: { tint: '163, 113, 247', ink: LIGHT_PURPLE },
};
function buildAutomation(parent, b) {
  const { automation: a, x = DW / 2, y, w = 428, h: height = 252, at, done, lift = 26, slide = [] } = b;
  if (at === undefined || done === undefined) throw new Error(`An automation card needs at and done: ${a.name}`);
  const tone = TONES[a.tone ?? 'blue'];
  const PAD = 28, FOOT = 62, RADIUS = 16, mid = height - FOOT / 2;
  const box = (into, left, top, width = w, tall = height) => {
    const node = place(h('div', 'layer', into), left, top, width, tall);
    node.style.right = node.style.bottom = 'auto';
    return node;
  };
  const node = box(parent, x - w / 2, y);
  Object.assign(node.style, { borderRadius: px(RADIUS), background: 'rgba(240, 246, 252, .045)' });
  Object.assign(box(node, 0, height - FOOT, w, FOOT).style, { borderRadius: `0 0 ${px(RADIUS)} ${px(RADIUS)}`, background: 'rgba(240, 246, 252, .035)', boxShadow: 'inset 0 1px 0 rgba(240, 246, 252, .08)' });
  const tile = box(node, PAD, PAD, 48, 48);
  Object.assign(tile.style, { borderRadius: px(12), background: `rgba(${tone.tint}, .16)`, boxShadow: `inset 0 0 0 1px rgba(${tone.tint}, .4)` });
  icon(tile, a.icon, 12, 12, 24, tone.ink);
  type(node, a.name, 88, PAD - 2, { size: 24, weight: 620 });
  const badge = h('div', 'gfx', node, a.trigger);
  Object.assign(badge.style, { fontSize: px(14), lineHeight: px(17), fontWeight: 560, color: DIM, padding: '3px 10px', borderRadius: '999px', boxShadow: 'inset 0 0 0 1px rgba(240, 246, 252, .16)' });
  place(badge, 88, 62);
  const blurb = type(node, a.about, PAD, 106, { size: 18, weight: 420, color: DIM, line: 1.4 });
  blurb.style.width = px(w - 2 * PAD);
  blurb.style.whiteSpace = 'normal';
  const where = type(node, a.where ?? 'Cloud', w - PAD, mid, { size: 16, weight: 500, color: DIM, align: 'right', valign: 'middle' });
  icon(node, 'cloud', w - PAD - rect(where).w - 26, mid - 9, 18, DIM);

  // Running: the app's dotted spinner, drawn larger, and the word.
  const running = box(node, 0, 0);
  const tick = spinner(running, PAD + 9, mid, BLUE);
  running.lastElementChild.style.transform = 'scale(1.7)';
  type(running, 'Running', PAD + 30, mid, { size: 17, weight: 560, color: BLUE, valign: 'middle' });
  // Done: a check, and what the automation did.
  const finished = box(node, 0, 0);
  const check = icon(finished, 'circle-check', PAD, mid - 10, 20, GREEN);
  type(finished, a.result, PAD + 30, mid, { size: 17, weight: 560, color: LIGHT_GREEN, valign: 'middle' });
  // The card's edge, which flashes green for a moment when the job is done.
  const edge = box(node, 0, 0);
  edge.style.borderRadius = px(RADIUS);

  const pose = t => {
    const land = out(span(t, at, at + .5));
    node.style.visibility = land > 0 ? 'visible' : 'hidden';
    node.style.opacity = land;
    // Each slide makes room for a card that is about to land beside this one.
    const shift = slide.reduce((sum, s) => sum + s.dx * inOut(span(t, s.at, s.at + (s.dur ?? .55))), 0);
    node.style.transform = `translate(${r3(shift)}px, ${r3((1 - land) * lift)}px)`;
    tick(t - at);
    const gone = span(t, done, done + .18);
    running.style.visibility = gone < 1 ? 'inherit' : 'hidden';
    running.style.opacity = 1 - gone;
    running.style.transform = `translateY(${r3(-6 * gone)}px)`;
    const came = ease(span(t, done + .08, done + .38));
    finished.style.visibility = came > 0 ? 'inherit' : 'hidden';
    finished.style.opacity = came;
    finished.style.transform = `translateY(${r3((1 - came) * 8)}px)`;
    check.style.transform = `scale(${r3(.55 + .45 * outBack(span(t, done + .1, done + .55)))})`;
    const glow = t < done ? 0 : (1 - span(t, done + .05, done + 1.1)) ** 2;
    edge.style.boxShadow = `inset 0 0 0 1px rgba(240, 246, 252, .12)${glow > 0 ? `, inset 0 0 0 1.5px rgba(63, 185, 80, ${r3(.7 * glow)}), 0 0 30px rgba(63, 185, 80, ${r3(.22 * glow)})` : ''}`;
  };
  return { node, pose, fast: [], info: { name: a.name } };
}

// A scene (the default export of film/scenes/<name>.mjs) that draws the card.
export function card(name, { blocks, center = 420, zoom = 1.05, glow = {}, duration }) {
  return async function build() {
    const DURATION = duration ?? clock(name).duration;
    await loadFonts();
    const icons = blocks.flatMap(b => (b.automation ? [b.automation.icon, 'cloud', 'circle-check'] : []));
    if (icons.length) await loadAssets(icons);
    const stage = buildStage();
    const board = buildBoard(stage, { glow: { x: DW / 2, y: center, rx: 780, ry: 430, ...glow } });
    const layer = h('div', 'layer', stage);
    const buildBlock = (parent, b) => {
      if (b.app !== undefined) return buildApp(parent, b);
      if (b.words !== undefined) return buildWords(parent, b);
      if (b.setting !== undefined) return buildSetting(parent, b);
      if (b.automation !== undefined) return buildAutomation(parent, b);
      throw new Error(`A card block is { app }, { words }, { setting } or { automation }, not ${JSON.stringify(b)}`);
    };
    const built = blocks.map(b => {
      if (!b.move) return buildBlock(layer, b);
      // A block that moves is built inside a layer of its own, which slides.
      const { at, dy, dur = .75 } = b.move;
      const group = h('div', 'layer', layer);
      const block = buildBlock(group, b);
      return { ...block, pose: t => { block.pose(t); group.style.transform = `translateY(${r3(dy * inOut(span(t, at, at + dur)))}px)`; } };
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
