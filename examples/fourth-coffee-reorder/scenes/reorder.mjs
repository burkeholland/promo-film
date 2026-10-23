// A 9:16 promo, standalone: Fourth Coffee's one-tap reorder lands on its
// confirmation. Drawn in a 486 x 864 column centered on the desktop; the
// render is cropped to that column and scaled to 1080 x 1920.
// DRAWN: the Fourth Coffee app screen, its layout and the tagline cards.
import { clamp, out, outBack, span } from '../motion.mjs';

const X = 525, W = 486, H = 864, G = '#3ddc84';
const DURATION = 12;
const T = { tap: 1.6, check: 2.1, head: 2.6, eta: 3.4, store: 4.0, item: 4.6, total: 5.2, tag: 8.2, end: 9.6 };

const el = (tag, css, parent, text) => {
  const n = document.createElement(tag);
  n.style.cssText = css;
  if (text) n.textContent = text;
  parent.appendChild(n);
  return n;
};
const MONO = "font-family:'Mona Sans Mono',monospace;letter-spacing:.08em;text-transform:uppercase;";
const SANS = "font-family:'Mona Sans',sans-serif;";

export default async function reorder() {
  document.body.style.background = '#000';
  const col = el('div', `position:absolute;left:${X}px;top:0;width:${W}px;height:${H}px;background:#050705;overflow:hidden;color:#fff;${SANS}`, document.body);
  const pad = 'position:absolute;left:36px;right:36px;';
  el('div', `${pad}top:34px;${MONO}font-size:11px;color:${G};`, col, 'Fourth Coffee');

  // The tap: a "Reorder usual" button pressed.
  const btn = el('div', `${pad}top:380px;height:70px;border-radius:35px;background:${G};color:#000;${SANS}font-weight:800;font-size:22px;display:flex;align-items:center;justify-content:center;`, col, 'Reorder my usual');
  const finger = el('div', `position:absolute;left:${W / 2 - 22}px;top:470px;width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.85);`, col);

  // The confirmation.
  const ring = el('div', `position:absolute;left:36px;top:110px;width:84px;height:84px;border-radius:50%;background:${G};display:flex;align-items:center;justify-content:center;`, col);
  ring.innerHTML = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path id="tick" d="M5 12.5l4.5 4.5L19 7.5" stroke-dasharray="22" stroke-dashoffset="22"/></svg>';
  const tick = ring.querySelector('#tick');
  const head = el('div', `${pad}top:222px;font-weight:850;font-stretch:110%;font-size:50px;line-height:.98;letter-spacing:-.02em;`, col);
  const words = ['Your', 'usual', 'is', 'on', 'the', 'way'].map(w => el('span', 'display:inline-block;margin-right:.22em;', head, w));
  const eta = el('div', `${pad}top:352px;${MONO}font-size:14px;color:${G};`, col, '● Ready in about 6 min');
  const rule = 'border-top:1px solid #1f2a22;padding-top:14px;';
  const store = el('div', `${pad}top:420px;${rule}`, col);
  el('div', `${MONO}font-size:11px;color:#7d8a80;margin-bottom:6px;`, store, 'Pickup at');
  el('div', 'font-weight:700;font-size:22px;', store, 'Fourth Coffee Mission');
  el('div', 'font-size:16px;color:#b8c2ba;margin-top:2px;', store, '1146 Valencia St');
  const item = el('div', `${pad}top:530px;${rule}display:flex;justify-content:space-between;`, col);
  el('div', 'font-weight:700;font-size:20px;', item, '1 × Oat milk cortado');
  const total = el('div', `${pad}top:600px;${rule}display:flex;justify-content:space-between;align-items:baseline;`, col);
  el('div', `${MONO}font-size:12px;color:#7d8a80;`, total, 'Due at pickup');
  el('div', 'font-weight:800;font-size:30px;', total, '$5.31');

  // The closing cards.
  const tag = el('div', `position:absolute;inset:0;background:${G};color:#000;display:flex;flex-direction:column;justify-content:center;padding:0 36px;`, col);
  el('div', `${SANS}font-weight:850;font-stretch:110%;font-size:58px;line-height:.95;letter-spacing:-.02em;`, tag, 'One tap. Same order.');
  el('div', `${MONO}font-size:13px;margin-top:22px;`, tag, 'Fourth Coffee · Reorder');

  let now = 0;
  const show = (n, t0, dy = 18) => {
    const u = out(span(now, t0, t0 + .5));
    n.style.opacity = u;
    n.style.transform = `translateY(${(1 - u) * dy}px)`;
  };
  const pose = t => {
    t = clamp(t, 0, DURATION);
    now = t;
    const pressed = t >= T.tap && t < T.tap + .15;
    finger.style.opacity = clamp(span(t, .6, 1) - span(t, T.tap + .1, T.tap + .4));
    finger.style.transform = `translateY(${(1 - out(span(t, .6, T.tap))) * 120 - 40}px) scale(${pressed ? .85 : 1})`;
    const gone = out(span(t, T.tap + .15, T.check));
    btn.style.transform = `scale(${pressed ? .96 : 1 - gone * .1})`;
    btn.style.opacity = 1 - gone;
    const c = span(t, T.check, T.check + .5);
    ring.style.transform = `scale(${c ? outBack(c, 2.2) : 0})`;
    tick.setAttribute('stroke-dashoffset', 22 * (1 - out(span(t, T.check + .25, T.check + .65))));
    words.forEach((w, i) => show(w, T.head + i * .1, 30));
    show(eta, T.eta); show(store, T.store); show(item, T.item); show(total, T.total);
    // The ETA dot pulses while waiting.
    eta.style.color = t > T.eta + .5 && Math.floor(t * 1.6) % 2 ? '#2a9d5c' : G;
    const w = out(span(t, T.tag, T.tag + .45));
    tag.style.clipPath = `inset(${(1 - w) * 100}% 0 0 0)`;
  };
  return { pose, duration: DURATION, info: {} };
}
