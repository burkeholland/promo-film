// The virtual camera. A shot is a point on the desktop to put mid-frame and a
// zoom; the camera eases from shot to shot along a list of keys.
import { clamp, lerp, span } from './motion.mjs';
import { DH, DW, H, W, WIN } from './kit.mjs';

export const wide = { x: DW / 2, y: DH / 2, s: 1 };
// A slow drift: eases in and out so gently that it reads as one long glide.
export const glide = u => .5 - .5 * Math.cos(Math.PI * u);
export const linear = u => u;

// Keeps a shot on the desktop.
export function keep({ x, y, s }) {
  const hw = DW / 2 / s, hh = DH / 2 / s;
  return { x: clamp(x, hw, DW - hw), y: clamp(y, hh, DH - hh), s };
}
// Keeps a close shot inside the window so no sliver of wallpaper shows.
export function inWin({ x, y, s }) {
  const hw = DW / 2 / s, hh = DH / 2 / s;
  return { x: clamp(x, WIN.x + hw, WIN.x + W - hw), y: clamp(y, WIN.y + hh, WIN.y + H - hh), s };
}
// A box in window px, moved onto the desktop.
export const onDesk = r => ({ x: WIN.x + r.x, y: WIN.y + r.y, w: r.w, h: r.h });
// The closest shot that shows all of a box (desktop px) with margins.
export const fit = (r, mx, my, limit = inWin) => limit({ x: r.x + r.w / 2, y: r.y + r.h / 2, s: Math.min((DW - 2 * mx) / r.w, (DH - 2 * my) / r.h) });
// A shot of zoom s centered on a point (desktop px).
export const look = (x, y, s, limit = inWin) => limit({ x, y, s });

// Zooms around the one point that stays put on screen, so a push in or a
// pull out moves in a straight line instead of swinging.
export function between(a, b, u) {
  if (Math.abs(a.s - b.s) < 1e-3) return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), s: lerp(a.s, b.s, u) };
  const s = a.s * (b.s / a.s) ** u;
  const fx = (a.x * a.s - b.x * b.s) / (a.s - b.s);
  const fy = (a.y * a.s - b.y * b.s) / (a.s - b.s);
  return { x: fx + (a.x - fx) * a.s / s, y: fy + (a.y - fy) * a.s / s, s };
}

// Keys are [time, shot, ease]: the ease shapes the move that arrives at that
// key (a glide when left out). Before the first key and after the last, the
// camera holds.
export function makeCamera(keys) {
  for (let i = 1; i < keys.length; i++) {
    if (!(keys[i][0] >= keys[i - 1][0])) throw new Error(`Camera key ${i} is earlier than the one before it`);
  }
  return t => {
    let shot = keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [t0, from] = keys[i - 1];
      const [t1, to, ease = glide] = keys[i];
      if (t < t0) break;
      shot = t >= t1 ? to : between(from, to, ease(span(t, t0, t1)));
    }
    return shot;
  };
}
