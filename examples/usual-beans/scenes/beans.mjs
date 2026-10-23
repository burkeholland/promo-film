// A 9:16 standalone clip: Fourth Coffee Subscriptions, "Reorder your usual beans".
// The phone screen is a 486 x 864 column in the middle of the 1536 x 864 stage;
// the render is cropped to it and scaled to 1080 x 1920.
// DRAWN: the whole app screen (layout, bag art, tap, confirmation) is drawn from the brief, not screenshots.
import { clamp, out, inOut, span, outBack } from '../motion.mjs';

const PW = 486, PH = 864, PX = (1536 - PW) / 2;
const CREAM = '#f6efe4', RUST = '#b5532a', INK = '#2b1d14', MUTE = '#7a6656';
const SERIF = 'Georgia, "Times New Roman", serif';
const CUE = { hello: .3, card: 1.1, toBtn: [3.0, 4.1], tap: 4.25, done: 5.0, facts: 5.9, end: 9.6 };
const DURATION = 12.5;

const el = (tag, css, parent, text) => { const n = document.createElement(tag); n.style.cssText = css; if (text) n.textContent = text; parent.appendChild(n); return n; };

export default async function beans() {
  document.body.style.cssText = 'margin:0;background:#1b120c';
  const stage = el('div', `position:absolute;left:0;top:0;width:1536px;height:864px;background:#1b120c;overflow:hidden`, document.body);
  stage.id = 'stage';
  const phone = el('div', `position:absolute;left:${PX}px;top:0;width:${PW}px;height:${PH}px;background:${CREAM};overflow:hidden;font-family:system-ui,"Segoe UI",sans-serif;color:${INK}`, stage);
  const cam = el('div', `position:absolute;inset:0;transform-origin:50% 55%`, phone);

  const top = el('div', `position:absolute;left:28px;top:34px;font:600 12px/1 system-ui;letter-spacing:.18em;color:${RUST}`, cam, 'FOURTH COFFEE · SUBSCRIPTIONS');
  const hello = el('div', `position:absolute;left:28px;top:70px;width:430px;font:400 38px/1.1 ${SERIF}`, cam);
  const words = 'Welcome back, Jordan'.split(' ').map(w => el('span', 'display:inline-block;margin-right:.25em', hello, w));
  const sub = el('div', `position:absolute;left:28px;top:120px;font:15px/1.4 system-ui;color:${MUTE}`, cam, 'Your usual is ready when you are.');

  const card = el('div', `position:absolute;left:24px;top:170px;width:438px;height:470px;background:#fffaf2;border-radius:22px;box-shadow:0 12px 34px rgba(80,40,10,.14);overflow:hidden`, cam);
  const art = el('div', `position:absolute;left:0;top:0;width:438px;height:200px;background:linear-gradient(160deg,#e9d6bd,#d9b892)`, card);
  const bag = el('div', `position:absolute;left:164px;top:28px;width:110px;height:150px;background:${RUST};border-radius:10px 10px 14px 14px;box-shadow:0 10px 20px rgba(60,25,5,.3)`, art);
  el('div', `position:absolute;left:0;right:0;top:46px;text-align:center;font:italic 15px ${SERIF};color:#fbe9d8`, bag, 'No. 4');
  el('div', `position:absolute;left:0;right:0;top:70px;text-align:center;font:600 8px system-ui;letter-spacing:.2em;color:#fbe9d8`, bag, 'HOUSE BLEND');
  el('div', `position:absolute;left:0;right:0;top:0;height:16px;background:rgba(0,0,0,.15);border-radius:10px 10px 0 0`, bag);
  el('div', `position:absolute;left:24px;top:220px;font:400 28px/1.1 ${SERIF}`, card, 'No. 4 House Blend');
  el('div', `position:absolute;left:24px;top:258px;font:15px/1.4 system-ui;color:${MUTE}`, card, 'Milk chocolate · toasted almond · dried cherry');
  el('div', `position:absolute;left:24px;top:296px;font:14px system-ui;color:${INK}`, card, '12 oz bag · Whole bean');
  el('div', `position:absolute;right:24px;top:290px;font:400 24px ${SERIF}`, card, '$17.00');
  const btn = el('div', `position:absolute;left:24px;top:350px;width:390px;height:58px;border-radius:29px;background:${RUST};color:#fff;font:600 18px/58px system-ui;text-align:center`, card);
  const label = el('span', '', btn, 'Reorder');
  el('div', `position:absolute;left:24px;top:424px;width:390px;text-align:center;font:13px system-ui;color:${MUTE}`, card, 'Arrives in 2–3 days');

  const facts = ['Roasted this week at the Dogpatch Roastery', 'Shipping is always free'].map((s, i) =>
    el('div', `position:absolute;left:28px;top:${668 + i * 46}px;width:430px;font:400 19px/1.3 ${SERIF};color:${INK}`, cam, s));
  const dots = facts.map(f => { const d = el('span', `display:inline-block;width:8px;height:8px;border-radius:4px;background:${RUST};margin:0 12px 3px 0`, f); f.prepend(d); return d; });

  const tapDot = el('div', `position:absolute;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:22px;background:rgba(43,29,20,.22);border:2px solid rgba(255,255,255,.8)`, phone);

  const endCard = el('div', `position:absolute;inset:0;background:${RUST};color:#fbefe2;display:flex;flex-direction:column;align-items:center;justify-content:center`, phone);
  const endA = el('div', `font:400 46px/1.1 ${SERIF}`, endCard, 'Fourth Coffee');
  const endB = el('div', `margin-top:16px;font:italic 22px ${SERIF};opacity:.9`, endCard, 'Reorder your usual beans.');

  const BTN = [24 + 24 + 195, 170 + 350 + 29]; // button center in phone px (camera is 1 at tap... applied below)
  const pose = t => {
    const fade = (n, t0, d = .5, y = 18) => { const u = out(span(t, t0, t0 + d)); n.style.opacity = u; n.style.transform = `translateY(${(1 - u) * y}px)`; };
    fade(top, 0, .5, 8);
    words.forEach((w, i) => fade(w, CUE.hello + i * .22, .55, 24));
    fade(sub, 1.0, .5, 10);
    fade(card, CUE.card, .8, 60);
    const k = 1 + .06 * inOut(span(t, 1.6, 4.0));
    cam.style.transform = `scale(${k})`;

    // The tap: a finger comes in from below and presses Reorder.
    const u = inOut(span(t, ...CUE.toBtn));
    const [ox, oy] = [243, 431 + (BTN[1] - 431) * k]; // scaled about 50% 55%
    const bx = 243 + (BTN[0] - 243) * k, by = 475 + (BTN[1] - 475) * k;
    tapDot.style.left = `${bx + (1 - u) * 90}px`;
    tapDot.style.top = `${by + (1 - u) * 330}px`;
    const press = span(t, CUE.tap - .05, CUE.tap + .05) - span(t, CUE.tap + .12, CUE.tap + .3);
    tapDot.style.opacity = Math.min(span(t, CUE.toBtn[0], CUE.toBtn[0] + .3), 1 - span(t, CUE.tap + .3, CUE.tap + .6));
    tapDot.style.transform = `scale(${1 - .2 * press})`;
    btn.style.transform = `scale(${1 - .04 * press})`;
    const working = t >= CUE.tap + .1 && t < CUE.done;
    const done = t >= CUE.done;
    btn.style.background = done ? '#3f6b3a' : working ? '#9c4622' : RUST;
    label.textContent = done ? '✓  Ordered — see you soon' : working ? 'Placing order…' : 'Reorder';
    const pop = done ? 1 + .05 * Math.sin(Math.PI * clamp((t - CUE.done) / .3)) : 1;
    if (done) btn.style.transform = `scale(${pop})`;
    void ox; void oy;

    facts.forEach((f, i) => fade(f, CUE.facts + i * .9, .6, 14));
    dots.forEach((d, i) => { d.style.transform = `scale(${outBack(span(t, CUE.facts + i * .9 + .1, CUE.facts + i * .9 + .5))})`; });

    const e = inOut(span(t, CUE.end, CUE.end + .6));
    endCard.style.clipPath = `inset(${(1 - e) * 100}% 0 0 0)`;
    fade(endA, CUE.end + .4, .6, 20);
    fade(endB, CUE.end + 1.0, .6, 12);
    bag.style.transform = `translateY(${-4 * Math.sin(t * 1.4)}px)`;
  };
  return { pose, duration: DURATION, info: { cue: CUE } };
}
