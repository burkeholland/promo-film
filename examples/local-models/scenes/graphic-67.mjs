// "...giving you frontier-level performance while significantly reducing
// cost, up to 67%." Figure 2 of the HydraFusion blog post (TerminalBench 2.1
// in the GitHub Copilot CLI) redrawn on GitHub's dark canvas, from the same
// data. The chart draws itself in on "giving you" and Opus 5, the frontier
// model, lands on "frontier". On "-level" HydraFusion buds out from behind it,
// and on "performance" it rises above Opus's line. It winds up on
// "significantly" and slides left to its own cost on "reducing cost", leaving
// a ring where it started, while the camera pulls back to show the whole
// chart. "67% lower cost" rises over the gap on "67%".
import { bezier, clamp, inOut, lerp, out, outBack, span, spring, track } from '../motion.mjs';
import { clock } from '../timeline.mjs';
import { DW, DH, h, place, px, r3, rect } from '../kit.mjs';
import { buildStage, film } from '../app.mjs';
import { glide, keep, makeCamera } from '../camera.mjs';
import { DIM, FAINT, GREEN, INK, LIGHT_GREEN, LIGHT_PURPLE, PURPLE, RULE, arrive, buildBoard, el, loadFonts, set, svg, type } from '../graphics.mjs';

const T = clock('graphic-67');
const DURATION = T.duration;
// Onsets measured from the waveform. "this" is "giving" and "opus" is
// "frontier" in this take.
const WORDS = T.words({
  this: 14.69, opus: 15.2, level: 15.7, performance: 16.275, while: 16.95, significantly: 17.4,
  reducing: 18.26, cost: 18.84, to: 19.5, sixtySeven: 19.72, but: 21.225,
});

// The plot, in stage px: cost per task runs $0 to $1 across, the resolution
// rate 50% to 100% up. The blog's chart stops at 90%; the extra room on top
// holds the callout.
const P = { l: 250, r: 1290, t: 150, b: 700 };
const X = cost => P.l + cost * (P.r - P.l);
const Y = rate => P.b - (rate - 50) * (P.b - P.t) / 50;
// Read off the blog's chart: [mean cost per task in USD, resolution rate in %].
const OTHERS = [
  { name: 'Sonnet 5', at: [.55, 76.0], side: 1 },
  { name: 'GPT-5.6-Sol', at: [.30, 73.3], side: 1 },
  { name: 'GPT-5.6-Terra', at: [.25, 72.5], side: -1 },
  { name: 'GPT-5.6-Luna', at: [.03, 56.1], side: 1 },
];
const OPUS = { name: 'Opus 5', at: [.90, 80.0] };
const HYDRA = { name: 'HydraFusion', at: [.30, 84.9] };
const [OX, OY] = [X(OPUS.at[0]), Y(OPUS.at[1])];
const [HX, HY] = [X(HYDRA.at[0]), Y(HYDRA.at[1])];

const CUE = {
  // The lower gridlines are already drawing at the cut.
  grid: -.32,
  labels: .05,
  others: .3,
  opus: WORDS.opus - .1,
  cross: WORDS.opus + .05,
  bud: WORDS.level - .07,
  rise: [WORDS.level + .02, WORDS.performance + .42],
  name: WORDS.performance - .08,
  windUp: [WORDS.significantly + .1, WORDS.significantly + .42],
  slide: [WORDS.significantly + .42, WORDS.cost + .37],
  settle: WORDS.cost + .67,
  callout: WORDS.sixtySeven - .14,
  note: WORDS.sixtySeven + .45,
};

// A shot pushed in by k about the point f, which stays put on screen.
const about = (shot, [fx, fy], k) => keep({ x: fx + (shot.x - fx) / k, y: fy + (shot.y - fy) / k, s: shot.s * k });

export default async function graphic67() {
  await loadFonts();
  const stage = buildStage();
  const board = buildBoard(stage, { glow: { x: 800, y: 390, rx: 760, ry: 440 } });
  const chart = place(h('div', 'layer', stage), 0, 0, DW, DH);
  const art = svg(chart);
  const defs = el(art, 'defs');
  for (const [id, color, alpha] of [['glow-green', GREEN, .5], ['glow-purple', PURPLE, .4]]) {
    const gradient = el(defs, 'radialGradient', { id });
    el(gradient, 'stop', { offset: 0, 'stop-color': color, 'stop-opacity': alpha });
    el(gradient, 'stop', { offset: .45, 'stop-color': color, 'stop-opacity': alpha * .35 });
    el(gradient, 'stop', { offset: 1, 'stop-color': color, 'stop-opacity': 0 });
  }
  // The gridlines part around the callout as it comes in.
  const soft = el(defs, 'filter', { id: 'soft', x: '-30%', y: '-80%', width: '160%', height: '260%' });
  el(soft, 'feGaussianBlur', { stdDeviation: 7 });
  const knock = el(defs, 'mask', { id: 'knock', maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: DW, height: DH });
  el(knock, 'rect', { x: 0, y: 0, width: DW, height: DH, fill: '#fff' });
  const hole = el(knock, 'rect', { fill: '#000', filter: 'url(#soft)', opacity: 0 });

  // ------------------------------------------------------------ axes
  const grid = el(art, 'g', { mask: 'url(#knock)' });
  const rows = [50, 60, 70, 80, 90, 100].map(rate => el(grid, 'line', {
    x1: P.l, x2: P.l, y1: Y(rate), y2: Y(rate), stroke: rate === 50 ? 'rgba(240, 246, 252, .22)' : RULE, 'stroke-width': 1,
  }));
  const cols = [.2, .4, .6, .8, 1].map(cost => el(grid, 'line', {
    x1: X(cost), x2: X(cost), y1: P.b, y2: P.b, stroke: 'rgba(240, 246, 252, .07)', 'stroke-width': 1, 'stroke-dasharray': '3 5',
  }));
  const yLabels = [50, 60, 70, 80, 90, 100].map(rate => type(chart, `${rate}%`, P.l - 16, Y(rate), { size: 14.5, color: DIM, align: 'right', valign: 'middle' }));
  const xLabels = [0, .2, .4, .6, .8, 1].map(cost => type(chart, `$${cost.toFixed(2)}`, X(cost), P.b + 15, { size: 14.5, color: DIM, align: 'center' }));
  const yTitle = type(chart, 'Resolution rate (pass@1)', 200, P.t - 22, { size: 13, weight: 500, color: DIM, valign: 'bottom' });
  const xTitle = type(chart, 'Mean cost per task (USD)', (P.l + P.r) / 2, P.b + 46, { size: 13, weight: 500, color: DIM, align: 'center' });
  const eyebrow = type(chart, 'PROJECT HYDRAFUSION', 200, 40, { size: 12, weight: 700, color: GREEN, track: .16, stretch: 112 });
  const title = type(chart, 'TerminalBench 2.1', 200, 60, { size: 26, weight: 700, color: INK, stretch: 104 });
  const where = h('span', null, title, '  GitHub Copilot CLI');
  where.style.fontWeight = 400;
  where.style.color = DIM;
  where.style.whiteSpace = 'pre';
  const note = type(chart, 'Source: Project HydraFusion, The GitHub Blog', 200, 806, { size: 12, color: FAINT });

  // ------------------------------------------------------------ points
  const others = OTHERS.map(model => {
    const [x, y] = [X(model.at[0]), Y(model.at[1])];
    return {
      dot: el(art, 'circle', { cx: x, cy: y, r: 0, fill: '#6e7681' }),
      name: type(chart, model.name, x + model.side * 12, y, { size: 14, weight: 500, color: DIM, align: model.side > 0 ? 'left' : 'right', valign: 'middle' }),
    };
  });
  const cross = el(art, 'g', { stroke: PURPLE, 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-dasharray': '0 7', opacity: .8 });
  const crossH = el(cross, 'line', { x1: OX - 14, y1: OY, x2: OX - 14, y2: OY });
  const crossV = el(cross, 'line', { x1: OX, y1: OY + 14, x2: OX, y2: OY + 14 });
  // HydraFusion's trail and the ring it leaves sit under it, and it sits under
  // Opus, so it buds out from behind Opus's dot.
  const trail = el(art, 'line', { x1: OX - 13, y1: HY, x2: OX - 13, y2: HY, stroke: GREEN, 'stroke-width': 1.75, 'stroke-dasharray': '6 6' });
  const ghost = el(art, 'circle', { cx: OX, cy: HY, r: 9, fill: 'none', stroke: GREEN, 'stroke-width': 1.5, 'stroke-dasharray': '3.1 3', opacity: 0 });
  const ripple = el(art, 'circle', { cx: HX, cy: HY, r: 10, fill: 'none', stroke: GREEN, opacity: 0 });
  const hydraGlow = el(art, 'circle', { r: 0, fill: 'url(#glow-green)' });
  const hydraHalo = el(art, 'circle', { r: 0, fill: GREEN, 'fill-opacity': .22 });
  const hydraDot = el(art, 'circle', { r: 0, fill: GREEN });
  const opusGlow = el(art, 'circle', { cx: OX, cy: OY, r: 0, fill: 'url(#glow-purple)' });
  const opusHalo = el(art, 'circle', { cx: OX, cy: OY, r: 0, fill: PURPLE, 'fill-opacity': .25 });
  const opusDot = el(art, 'circle', { cx: OX, cy: OY, r: 0, fill: PURPLE });
  const opusName = type(chart, OPUS.name, OX + 17, OY, { size: 16.5, weight: 600, color: LIGHT_PURPLE, valign: 'middle' });
  const hydraName = type(chart, HYDRA.name, OX, OY, { size: 18, weight: 650, color: LIGHT_GREEN, align: 'center', valign: 'bottom' });

  // ------------------------------------------------------------ callout
  // "67%" and "lower cost" share a baseline, and each rises out of a line just
  // under it.
  const callout = h('div', 'gfx', chart);
  Object.assign(callout.style, { display: 'flex', alignItems: 'baseline', gap: '14px' });
  const part = (text, size, weight, color, stretch, tracking) => {
    const wrap = h('div', null, callout);
    wrap.style.clipPath = 'inset(-60% -20% 0 -20%)';
    const inner = h('div', null, wrap, text);
    Object.assign(inner.style, { fontSize: px(size), lineHeight: px(size * 1.05), fontWeight: weight, color, fontStretch: `${stretch}%`, letterSpacing: `${tracking}em` });
    return inner;
  };
  const big = part('67%', 92, 800, '#56d364', 112, -.02);
  big.style.textShadow = '0 0 28px rgba(63, 185, 80, .35)';
  const small = part('lower cost', 32, 600, INK, 100, -.005);
  callout.anchor = 'translate(-50%, -100%)';
  callout.style.transform = callout.anchor;
  place(callout, (HX + OX) / 2, HY - 14);
  const box = rect(callout);
  set(hole, { x: box.x - 18, y: box.y - 4, width: box.w + 36, height: box.h + 2, rx: 12 });

  // ------------------------------------------------------------ motion
  const hydraX = track(
    [CUE.windUp[0], OX],
    // A small wind-up the other way, then off it goes, a touch past its cost
    // and back.
    [CUE.windUp[1], OX + 7, inOut],
    [CUE.slide[1], HX - 6, bezier(.6, 0, .15, 1)],
    [CUE.settle, HX, inOut],
  );
  const hydraY = track(
    [CUE.rise[0], OY],
    [CUE.rise[1], HY - 4, bezier(.35, 0, .2, 1)],
    [CUE.rise[1] + .3, HY, inOut],
  );

  const wide = { x: DW / 2, y: DH / 2, s: 1 };
  const shots = {
    close: keep({ x: 960, y: 395, s: 1.4 }),
    closer: keep({ x: 972, y: 388, s: 1.45 }),
    wide,
    end: about(wide, [(HX + OX) / 2, HY - 20], 1.055),
  };
  const camera = makeCamera([
    [0, shots.close],
    [CUE.slide[0] - .25, shots.closer, glide],
    // Pulls back as HydraFusion sets off, a little ahead of it.
    [CUE.settle + .15, shots.wide],
    [DURATION, shots.end, glide],
  ]);

  const pose = t => {
    t = clamp(t, 0, DURATION);
    film(stage, camera(t));
    board.grain(t);

    rows.forEach((line, i) => set(line, { x2: lerp(P.l, P.r, out(span(t, CUE.grid + i * .07, CUE.grid + i * .07 + 1))) }));
    cols.forEach((line, j) => set(line, { y2: lerp(P.b, P.t, out(span(t, CUE.grid + .15 + j * .06, CUE.grid + .95 + j * .06))) }));
    yLabels.forEach((node, i) => arrive(node, t, CUE.labels + i * .05, .5, out, -8, 0));
    xLabels.forEach((node, j) => arrive(node, t, CUE.labels + .12 + j * .05, .5, out, 0, 8));
    arrive(yTitle, t, .4, .6, out, 0, 6);
    arrive(xTitle, t, .5, .6, out, 0, 6);
    arrive(eyebrow, t, .3, .6, out, 0, 6);
    arrive(title, t, .38, .6, out, 0, 8);

    others.forEach(({ dot, name }, k) => {
      const start = CUE.others + k * .08;
      set(dot, { r: 5 * outBack(span(t, start, start + .4)) });
      arrive(name, t, start + .12, .45, out, 0, 4);
    });

    // Opus 5 lands with a little spring, and its crosshairs run to the axes.
    set(opusDot, { r: 8 * spring(t - CUE.opus, 2.2, 8) });
    set(opusHalo, { r: 15 * out(span(t, CUE.opus + .05, CUE.opus + .5)) });
    set(opusGlow, { r: 44 * out(span(t, CUE.opus, CUE.opus + .7)) });
    arrive(opusName, t, CUE.opus + .12, .45, out, -6, 0);
    // Zero-length lines with round caps still draw a dot, so these stay hidden
    // until they start.
    set(cross, { opacity: t < CUE.cross ? 0 : .8 });
    set(crossH, { x2: lerp(OX - 14, P.l, out(span(t, CUE.cross, CUE.cross + .7))) });
    set(crossV, { y2: lerp(OY + 14, P.b, out(span(t, CUE.cross + .08, CUE.cross + .7))) });

    // HydraFusion.
    const [x, y] = [hydraX(t), hydraY(t)];
    set(hydraDot, { cx: x, cy: y, r: 9 * out(span(t, CUE.bud, CUE.bud + .35)) });
    set(hydraHalo, { cx: x, cy: y, r: 17 * out(span(t, CUE.bud + .1, CUE.bud + .5)) });
    set(hydraGlow, { cx: x, cy: y, r: 54 * out(span(t, CUE.bud + .1, CUE.bud + .8)) });
    place(hydraName, x, y - 15);
    arrive(hydraName, t, CUE.name, .45, out, 0, 6);

    const left = span(t, CUE.slide[0] + .05, CUE.slide[0] + .4);
    set(ghost, { r: 9 * lerp(.4, 1, out(left)), opacity: .7 * out(left) });
    const said = span(t, CUE.callout, CUE.callout + .5);
    set(trail, { x2: Math.min(OX - 13, x + 14), opacity: t < CUE.slide[0] ? 0 : lerp(.45, .8, said) });
    const ring = span(t, CUE.slide[1], CUE.slide[1] + .75);
    set(ripple, { r: lerp(10, 46, out(ring)), opacity: ring > 0 && ring < 1 ? .6 * (1 - ring) : 0, 'stroke-width': lerp(2, .75, ring) });

    // 67% lower cost.
    const rise = out(span(t, CUE.callout, CUE.callout + .6));
    big.style.transform = `translateY(${r3((1 - rise) * 108)}%)`;
    small.style.transform = `translateY(${r3((1 - out(span(t, CUE.callout + .12, CUE.callout + .72))) * 112)}%)`;
    callout.style.visibility = rise > 0 ? 'visible' : 'hidden';
    set(hole, { opacity: span(t, CUE.callout - .05, CUE.callout + .35) });
    arrive(note, t, CUE.note, .7, out, 0, 4);
  };

  return {
    pose,
    duration: DURATION,
    fast: [[CUE.windUp[1] - .05, CUE.settle]],
    info: {
      cue: Object.fromEntries(Object.entries(CUE).map(([k, v]) => [k, Array.isArray(v) ? v.map(r3) : r3(v)])),
      callout: [box.x, box.y, box.w, box.h].map(r3),
      shots: Object.fromEntries(Object.entries(shots).map(([k, v]) => [k, [r3(v.x), r3(v.y), r3(v.s)]])),
    },
  };
}
