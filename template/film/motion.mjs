// Timing and easing shared by the picture (film.js) and the soundtrack
// (audio/score.mjs), so a whoosh speeds up and slows down with its move.
export const clamp = (x, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
export const lerp = (a, b, u) => a + (b - a) * u;
export const span = (t, t0, t1) => (t1 <= t0 ? (t >= t1 ? 1 : 0) : clamp((t - t0) / (t1 - t0)));
export const during = (t, t0, t1, fadeIn = .35, fadeOut = .35) => Math.min(span(t, t0, t0 + fadeIn), 1 - span(t, t1 - fadeOut, t1));

// CSS-style cubic-bezier easing.
export function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const x = s => ((ax * s + bx) * s + cx) * s;
  const y = s => ((ay * s + by) * s + cy) * s;
  const slope = s => (3 * ax * s + 2 * bx) * s + cx;
  return u => {
    if (u <= 0) return 0;
    if (u >= 1) return 1;
    let s = u;
    for (let i = 0; i < 8; i++) {
      const error = x(s) - u;
      if (Math.abs(error) < 1e-7) return y(s);
      const d = slope(s);
      if (Math.abs(d) < 1e-6) break;
      s -= error / d;
      if (s < 0 || s > 1) break;
    }
    let lo = 0, hi = 1;
    s = u;
    for (let i = 0; i < 60; i++) {
      const value = x(s);
      if (Math.abs(value - u) < 1e-7) break;
      if (value < u) lo = s; else hi = s;
      s = (lo + hi) / 2;
    }
    return y(s);
  };
}
export const out = bezier(.16, 1, .3, 1);
export const inOut = bezier(.65, 0, .35, 1);
export const easeIn = bezier(.5, 0, .75, 0);

// Runs past the end and comes back, like something with a little spring in it.
export const outBack = (u, s = 1.70158) => {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const v = u - 1;
  return 1 + (s + 1) * v * v * v + s * v * v;
};
// A spring let go at t = 0: rises from 0, overshoots, and settles on 1.
export const spring = (t, freq = 2.2, damping = 6) => (t <= 0 ? 0 : 1 - Math.exp(-damping * t) * Math.cos(2 * Math.PI * freq * t));
// The swing left over after a knock at t = 0: 0 at rest, dying away.
export const wobble = (t, freq = 3, damping = 7) => (t <= 0 ? 0 : Math.exp(-damping * t) * Math.sin(2 * Math.PI * freq * t));

export const smooth = u => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const hold = () => 0;

// A keyframed value. Each key is [time, value, ease]: the ease shapes the move
// that arrives at that key (inOut when left out, hold to jump at the key).
// Values are numbers or arrays of numbers.
export function track(...keys) {
  const mix = (a, b, u) => (Array.isArray(a) ? a.map((x, i) => lerp(x, b[i], u)) : lerp(a, b, u));
  return t => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1, ease = inOut] = keys[i];
      if (t < t1) {
        const [t0, v0] = keys[i - 1];
        return mix(v0, v1, ease(span(t, t0, t1)));
      }
    }
    return keys[keys.length - 1][1];
  };
}
track.hold = hold;

// Smooth value noise between -1 and 1, for the small drift that keeps a
// character alive while it holds still.
export function noise(t, seed = 0) {
  const hash = i => {
    let h = Math.imul((i | 0) ^ Math.imul(seed + 1, 0x9e3779b1), 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296 * 2 - 1;
  };
  const i = Math.floor(t);
  return lerp(hash(i), hash(i + 1), smooth(t - i));
}

// Seeded random numbers (mulberry32), so every render scatters the same way.
export function random(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
