// How a person drives the app: pointer moves that speed up, slow down and bow
// a little, clicks, and typing with an uneven rhythm. Everything is a pure
// function of time, so any frame can be drawn on its own.
import { bezier, random, smooth, span } from './motion.mjs';

// A hand on a mouse: each move speeds up, slows down and bows a little.
export const hand = bezier(.3, .1, .15, 1);
export function along(a, b, u, bend) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const bow = bend * Math.sin(Math.PI * u) / (Math.hypot(dx, dy) || 1);
  return [a[0] + dx * u - dy * bow, a[1] + dy * u + dx * bow];
}
// Where a move has the pointer at t. A move with a `miss` aims that far past
// its target and corrects on the way in, the way a hand lands a long reach.
export function at(m, t) {
  if (t <= m.t0) return m.a;
  if (t >= m.t0 + m.dur) return m.b;
  const u = (t - m.t0) / m.dur;
  if (!m.miss) return along(m.a, m.b, hand(u), m.bend);
  const p = along(m.a, [m.b[0] + m.miss[0], m.b[1] + m.miss[1]], hand(u), m.bend);
  const k = smooth(span(u, .5, 1));
  return [p[0] - m.miss[0] * k, p[1] - m.miss[1] * k];
}

// A pointer path: moves that must not overlap, and the clicks between them.
export function makePath(start) {
  const moves = [];
  const clicks = [];
  let here = start;
  const path = {
    moves,
    clicks,
    get here() { return here; },
    // A move from wherever the pointer is to b, starting at t0.
    move(b, t0, dur, bend = 0, miss) {
      const m = { t0, dur, a: here, b, bend };
      if (miss) m.miss = miss;
      moves.push(m);
      here = b;
      return m;
    },
    // A long reach that lands a little past b and settles back onto it. The
    // miss runs along the move, `over` of its length but at most `most` px.
    reach(b, t0, dur, bend = 0, { over = .035, most = 9, side = .4 } = {}) {
      const dx = b[0] - here[0], dy = b[1] - here[1];
      const length = Math.hypot(dx, dy) || 1;
      const size = Math.min(most, length * over);
      const miss = [(dx - dy * side) / length * size, (dy + dx * side) / length * size];
      return path.move(b, t0, dur, bend, miss);
    },
    // A move timed so the pointer gets onto a target (hit(p) is true) at
    // `when`, so a highlight lands on a spoken word.
    enter(b, dur, bend, when, hit, miss) {
      const probe = { t0: 0, dur, a: here, b, bend };
      if (miss) probe.miss = miss;
      for (let ms = 0; ms <= dur * 1000; ms++) {
        if (hit(at(probe, ms / 1000))) return path.move(b, when - ms / 1000, dur, bend, miss);
      }
      throw new Error('A pointer move never reaches its target');
    },
    click(t) {
      clicks.push(t);
      return t;
    },
    // Throws when a move starts before the one before it ends, or a click
    // happens while the pointer is moving.
    check() {
      for (let i = 1; i < moves.length; i++) {
        if (moves[i].t0 < moves[i - 1].t0 + moves[i - 1].dur - 1e-9) throw new Error(`Pointer moves ${i - 1} and ${i} overlap`);
      }
      for (const c of clicks) {
        const m = moves.find(m => c > m.t0 + 1e-9 && c < m.t0 + m.dur - 1e-9);
        if (m) throw new Error(`A click at ${c.toFixed(3)} s happens while the pointer moves`);
      }
      return path;
    },
    pointer(t) {
      let p = moves.length ? moves[0].a : here;
      for (const m of moves) {
        if (t < m.t0) break;
        p = at(m, t);
      }
      return p;
    },
    // Whether the button is down: a click holds it for about 90 ms.
    down: t => clicks.some(c => t >= c && t < c + .09),
    // The last click at or before t.
    lastClick: t => clicks.reduce((last, c) => (c <= t && c > last ? c : last), -Infinity),
  };
  return path;
}

// ---------------------------------------------------------------- keyboard
const KEYBOARD = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
// A key next to the one meant, for a typo.
function neighbor(ch) {
  const lower = ch.toLowerCase();
  const row = KEYBOARD.find(keys => keys.includes(lower));
  if (!row) return ch;
  const i = row.indexOf(lower);
  const near = row[i + 1] || row[i - 1];
  return ch === lower ? near : near.toUpperCase();
}

// Keystrokes that type `text` from `start` until `end`, at an uneven rhythm:
// quick runs inside words, a beat before each new word and a breath after
// punctuation. `typos` lists indexes in text where a neighboring key is hit
// first, noticed, and backspaced.
export function typing(text, start, end, { seed = 7, typos = [] } = {}) {
  const rnd = random(seed);
  const keys = [];
  let u = 0, shown = '';
  const press = (next, wait) => {
    u += wait;
    shown = next;
    keys.push([u, shown]);
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], before = text[i - 1];
    let wait = i === 0 ? 0 : .6 + .75 * rnd();
    if (before === ' ') wait += .35 + .9 * rnd();
    if (/[,.;:!?]/.test(before)) wait += 1.4 + rnd();
    if (/[A-Z&]/.test(ch)) wait += .35;
    if (typos.includes(i)) {
      press(shown + neighbor(ch), wait);
      press(shown.slice(0, -1), 2.4 + rnd());
      wait = 1.1 + .4 * rnd();
    }
    press(shown + ch, wait);
  }
  const scale = u ? (end - start) / u : 0;
  const times = keys.map(([k]) => start + k * scale);
  const index = t => {
    let lo = 0, hi = times.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (times[mid] <= t) lo = mid + 1; else hi = mid;
    }
    return lo - 1;
  };
  // Before the first key lands (a capital first letter waits for Shift),
  // nothing is shown yet.
  return {
    start,
    end,
    keys: keys.map(([, s], i) => [times[i], s]),
    text: t => { const i = index(t); return i < 0 ? '' : keys[i][1]; },
    lastKey: t => { const i = index(t); return i < 0 ? -Infinity : times[i]; },
  };
}

// The caret blinks every 530 ms (the Windows default), but stays lit while
// keys are being pressed. `since` is when the field got focus or the last key.
export const caretOn = (t, since) => t >= since && Math.floor((t - since) / .53) % 2 === 0;
