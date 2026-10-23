// A 9:16 social cut for Fourth Coffee's "Your usual": the menu greets Jordan,
// the usual slides up, one tap on "Order again" and it's ordered.
// DRAWN: Fourth Coffee's app, Jordan, the order, price, store and pickup time.
// Drawn on a 486 x 864 column in the middle of the 1536 x 864 stage; render
// with --clip --scale 2.5 and crop the middle 1215 x 2160 to 1080 x 1920.
import { clamp, span, out, inOut, outBack } from '../motion.mjs';

const DURATION = 12;
const X0 = (1536 - 486) / 2;
const TAP = 5.2;
const CUE = { hi: .35, card: 1.5, btn: 2.4, bar: 2.9, reach: [3.9, TAP - .03], done: TAP + .35, tag: 7.6, end: 9.6 };
const GREEN = '#00d26a';

const el = (tag, css, parent, text) => {
  const n = document.createElement(tag); n.style.cssText = css; if (text) n.textContent = text; parent.appendChild(n); return n;
};

export default async function usual() {
  document.body.style.background = '#000';
  await document.fonts.load('700 20px "Mona Sans"'); await document.fonts.load('500 20px "Mona Sans Mono"');
  const stage = el('div', 'position:absolute;left:0;top:0;width:1536px;height:864px;background:#000;overflow:hidden', document.body);
  const ph = el('div', `position:absolute;left:${X0}px;top:0;width:486px;height:864px;background:#050605;overflow:hidden;font-family:"Mona Sans";color:#f2f2ee`, stage);
  const mono = 'font-family:"Mona Sans Mono";font-weight:500;letter-spacing:.08em;text-transform:uppercase;';

  const app = el('div', 'position:absolute;inset:0', ph);
  const top = el('div', `position:absolute;left:28px;top:40px;font-size:12px;color:${GREEN};${mono}`, app, '● Fourth Coffee · Menu');
  const hi = el('div', 'position:absolute;left:26px;top:74px;font-size:58px;font-weight:800;font-stretch:110%;letter-spacing:-.03em;line-height:1', app);
  const sub = el('div', `position:absolute;left:28px;top:146px;font-size:12px;color:#8a8f88;${mono}`, app, 'Tue 8:12 am · Mission st');

  const card = el('div', 'position:absolute;left:20px;top:196px;width:446px;height:380px;border-radius:22px;background:#111511;border:1px solid #1f2a20;overflow:hidden', app);
  el('div', `position:absolute;left:24px;top:24px;font-size:12px;color:${GREEN};${mono}`, card, '★ Your usual');
  el('div', 'position:absolute;left:22px;top:52px;font-size:44px;font-weight:800;font-stretch:105%;letter-spacing:-.03em;line-height:1.02;width:400px;white-space:normal', card, 'Oat milk cortado');
  const meta = el('div', `position:absolute;left:24px;top:162px;display:flex;gap:8px;font-size:12px;${mono}`, card);
  for (const m of ['Small', 'Mission']) el('span', 'padding:7px 11px;border:1px solid #2c362d;border-radius:99px;color:#c8cdc6', meta, m);
  el('div', 'position:absolute;right:24px;top:160px;font-size:30px;font-weight:700', card, '$4.95');
  const btn = el('div', `position:absolute;left:20px;top:256px;width:406px;height:96px;border-radius:18px;background:${GREEN};color:#031a0c;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:800;letter-spacing:-.02em;transform-origin:50% 50%`, card);
  const btnLabel = el('span', '', btn, 'Order again');
  const btnDone = el('span', 'position:absolute', btn, 'Ordered ✓');

  const bar = el('div', `position:absolute;left:20px;top:596px;width:446px;height:58px;border-radius:14px;background:#0c120d;border:1px solid #1f2a20;display:flex;align-items:center;padding:0 20px;font-size:13px;color:#c8cdc6;${mono}`, app);
  const dot = el('span', `width:9px;height:9px;border-radius:9px;background:${GREEN};margin-right:12px`, bar);
  el('span', '', bar, 'Ready in ~6 min · pay at pickup');
  const prog = el('div', `position:absolute;left:0;bottom:0;height:3px;background:${GREEN}`, bar);

  const others = el('div', `position:absolute;left:28px;top:690px;font-size:12px;color:#5d635c;${mono};line-height:2.2`, app);
  others.innerHTML = 'Also popular<br><span style="color:#9aa098;font-family:Mona Sans;text-transform:none;letter-spacing:0;font-size:20px;font-weight:600">Iced honey latte · Drip, large</span>';

  const touch = el('div', 'position:absolute;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:56px;background:rgba(255,255,255,.35);border:2px solid rgba(255,255,255,.8)', ph);
  const ripple = el('div', `position:absolute;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:56px;border:3px solid ${GREEN}`, ph);

  // End: big type over black.
  const end = el('div', 'position:absolute;inset:0;background:#000', ph);
  const l1 = el('div', 'position:absolute;left:26px;top:300px;font-size:76px;font-weight:800;font-stretch:112%;letter-spacing:-.04em;line-height:.95', end, 'Your usual.');
  const l2 = el('div', `position:absolute;left:26px;top:378px;font-size:76px;font-weight:800;font-stretch:112%;letter-spacing:-.04em;line-height:.95;color:${GREEN}`, end, 'One tap.');
  const l3 = el('div', `position:absolute;left:28px;top:500px;font-size:13px;color:#8a8f88;${mono}`, end, 'Fourth Coffee app · Now in all cafes');

  const BX = 20 + 20 + 203, BY = 196 + 256 + 48;
  const from = [380, 820], to = [BX + 30, BY + 8];
  const NAME = 'Hi, Jordan';

  const pose = t => {
    t = clamp(t, 0, DURATION);
    const f = (n, a, d = .5, dy = 18) => { const u = out(span(t, a, a + d)); n.style.opacity = u; n.style.transform = `translateY(${(1 - u) * dy}px)`; };
    f(top, .1); f(sub, .9);
    hi.textContent = NAME.slice(0, Math.round(span(t, CUE.hi, CUE.hi + .7) * NAME.length));
    f(card, CUE.card, .7, 120); f(bar, CUE.bar, .5); f(others, CUE.bar + .3, .5);
    const b = outBack(span(t, CUE.btn, CUE.btn + .45));
    const press = t >= TAP - .05 && t < TAP + .15 ? .95 : 1;
    btn.style.transform = `scale(${(.8 + .2 * b) * press})`;
    btn.style.opacity = clamp(b * 2, 0, 1);
    const d = span(t, CUE.done - .15, CUE.done + .1);
    btnLabel.style.opacity = 1 - d; btnDone.style.opacity = d;
    btn.style.background = d > .5 ? '#f2f2ee' : GREEN;
    prog.style.width = `${inOut(span(t, CUE.done, CUE.done + 2)) * 100}%`;
    dot.style.opacity = t > CUE.done ? .4 + .6 * Math.abs(Math.cos((t - CUE.done) * 3)) : 1;
    const u = inOut(span(t, ...CUE.reach));
    const tin = span(t, CUE.reach[0] - .3, CUE.reach[0]), tout = 1 - span(t, TAP + .3, TAP + .7);
    touch.style.left = `${from[0] + (to[0] - from[0]) * u}px`; touch.style.top = `${from[1] + (to[1] - from[1]) * u}px`;
    touch.style.opacity = Math.min(tin, tout);
    touch.style.transform = `scale(${t >= TAP - .05 && t < TAP + .15 ? .8 : 1})`;
    const r = span(t, TAP, TAP + .6);
    ripple.style.left = `${to[0]}px`; ripple.style.top = `${to[1]}px`;
    ripple.style.opacity = r > 0 && r < 1 ? 1 - r : 0; ripple.style.transform = `scale(${1 + r * 3})`;
    const e = span(t, CUE.tag, CUE.tag + .35);
    end.style.opacity = e;
    f(l1, CUE.tag + .1, .5, 40); f(l2, CUE.tag + .5, .5, 40); f(l3, CUE.end, .5);
    app.style.transform = `scale(${1 + .04 * inOut(span(t, 0, CUE.tag))})`;
  };
  return { pose, duration: DURATION, fast: [[TAP - .1, TAP + .4]], info: { TAP, CUE } };
}
