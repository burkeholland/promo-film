// The MirrorMe kit. The control window is not redrawn: each view is a frame
// that runs the app's own render.js and style sheets (film/ui/, built from
// the repository by tools/build-ui.mjs), put into one state. A scene builds
// the views it needs, then shows one at a time and sets the few things that
// move (typed text, a hover, a spinner, the session clock).
//
// The second window, "MirrorMe - iPhone screen", is a native Windows window
// in the app, so it is drawn here, with example content in it.
import { clamp, lerp, out, span } from './motion.mjs';
import { NS, W, H, WIN, h, place, px } from './kit.mjs';

// ---------------------------------------------------------------- names
// Every name the film shows lives here.
export const APP = 'MirrorMe';
export const TAGLINE = 'iPhone screen mirroring, made for Windows.';
export const SOURCE = 'github.com/burkeholland/mirror-me';
export const VERSION = '0.2.4';
// The name a new install starts with (the PC's hostname), and the one typed.
export const HOSTNAME = 'DESKTOP-4KM2Q7';
export const PC = 'Studio PC';
export const PHONE = 'iPhone';
export const VIDEO_TITLE = 'MirrorMe - iPhone screen';
export const PIN = '4827';

// The video window. media.cpp sizes its picture to 80% of the work area's
// height: a 1179 x 2556 phone on this 864 px desktop is 301 x 652.
const PICTURE = { w: 301, h: 652 };
const ZOOM = 2;
export const BAR = 32;
export const VIDEO = { x: WIN.x + W + 40, y: WIN.y + (H - PICTURE.h - BAR) / 2, w: PICTURE.w, h: PICTURE.h + BAR };

// ---------------------------------------------------------------- app state
const SETTINGS = {
  deviceName: PC, resolution: 'auto', maxFps: 0, audioEnabled: true, hardwareDecode: true, h265: false,
  preferNewestConnection: true, idleTimeoutSeconds: 15, requirePin: false, pinCode: '', launchAtStartup: false,
  startMinimized: false, autoStartMirroring: true, alwaysOnTop: false, verboseLogging: false, theme: 'system', firstRun: false,
};
// What the app's state object holds for one view. `settings` are the saved
// ones and `draft` the edits on the Settings page that are not saved yet.
export function appState({
  status = 'advertising', video = false, route = 'home', section = 'connection', firstRun = false, step = 1,
  name = PC, setupName = name, settings = {}, draft = {}, toast = '', details = {},
} = {}) {
  const saved = { ...SETTINGS, deviceName: name, firstRun, ...settings };
  const connected = ['connecting', 'mirroring', 'paused'].includes(status);
  return {
    settings: saved,
    draft: { ...saved, ...draft },
    version: VERSION,
    settingsFolder: 'C:\\Users\\you\\AppData\\Roaming\\MirrorMe',
    logsFolder: 'C:\\Users\\you\\AppData\\Roaming\\MirrorMe\\logs',
    status: { status, backend: 'native', deviceName: connected ? PHONE : '', videoReceived: video, connectedAt: status === 'mirroring' ? new Date().toISOString() : null, lastError: '' },
    route, settingsSection: section, setupStep: step, setupName, details,
    toasts: toast ? [{ id: 1, message: toast, tone: 'success' }] : [],
    loading: false, saving: false, busy: false, error: '', fieldError: '', dialog: null,
  };
}

// ---------------------------------------------------------------- views
// The film's pointer is drawn, so :hover, :active and :focus never match.
// Every rule that uses one gets a twin that matches a class instead.
function mirrorStates(doc) {
  const view = doc.defaultView;
  const swap = text => text.replace(/:hover/g, '.is-hover').replace(/:active/g, '.is-press').replace(/:focus-visible/g, '.is-focus').replace(/:focus(?![-\w])/g, '.is-focus');
  const walk = owner => {
    for (let i = owner.cssRules.length - 1; i >= 0; i--) {
      const rule = owner.cssRules[i];
      if (!(rule instanceof view.CSSStyleRule)) { if (rule.cssRules) walk(rule); continue; }
      if (!/:(hover|active|focus)/.test(rule.selectorText)) continue;
      try { owner.insertRule(`${swap(rule.selectorText)} { ${rule.style.cssText} }`, i + 1); } catch { /* a selector this browser cannot parse */ }
    }
  };
  for (const sheet of doc.styleSheets) walk(sheet);
}

// The control window. `view(state, { mode })` adds one state of the app and
// resolves to its handle:
//   q(selector)         a node in it
//   box(node|selector)  that node's box in desktop px
//   show(on)            whether this is the view on screen
//   over(node, p)       whether the pointer (desktop px) is on a node
export function buildApp(stage) {
  const win = place(h('div', 'mm-win', stage), WIN.x, WIN.y, W, H);
  const views = [];
  async function view(state, { mode = 'light' } = {}) {
    const frame = h('iframe', 'mm-view', win);
    frame.style.visibility = 'hidden';
    frame.src = 'ui/index.html';
    await new Promise((resolve, reject) => { frame.addEventListener('load', resolve, { once: true }); frame.addEventListener('error', reject, { once: true }); });
    const page = frame.contentWindow;
    const doc = page.document;
    if (!page.ui) throw new Error('The app bundle did not load. Run: node tools/build-ui.mjs <repository>');
    doc.documentElement.dataset.mode = mode;
    // A frame is drawn at its own size and then scaled by the camera, which
    // softens its text. So it is laid out ZOOM times larger and scaled back.
    doc.documentElement.style.zoom = ZOOM;
    mirrorStates(doc);
    Object.assign(page.ui.state, state);
    page.ui.renderApp(doc.querySelector('#app'));
    await doc.fonts.ready;
    const q = selector => {
      const node = typeof selector === 'string' ? doc.querySelector(selector) : selector;
      if (!node) throw new Error(`The view has no ${selector}`);
      return node;
    };
    // Boxes come back in the frame's own px, which may or may not count the
    // zoom (browsers differ), so they are measured against the page's width.
    const k = doc.documentElement.getBoundingClientRect().width / W;
    const local = selector => {
      const r = q(selector).getBoundingClientRect();
      return { x: r.left / k, y: r.top / k, w: r.width / k, h: r.height / k };
    };
    const box = selector => {
      const r = local(selector);
      return { x: WIN.x + r.x, y: WIN.y + r.y, w: r.w, h: r.h };
    };
    const handle = {
      frame, doc, q, box, local,
      all: selector => [...doc.querySelectorAll(selector)],
      show: on => { frame.style.visibility = on ? 'visible' : 'hidden'; },
    };
    views.push(handle);
    return handle;
  }
  // Shows the one view that is on screen at t: `at` is [[time, view], ...].
  // A page changes between two frames, never inside one, or the motion blur
  // would blend the two pages into a ghost.
  const play = (t, at) => {
    let now = at[0][1];
    for (const [time, next] of at) if (t >= onFrame(time)) now = next;
    for (const item of views) item.show(item === now);
    return now;
  };
  return { win, view, play };
}

export const inBox = (p, r) => p[0] >= r.x && p[0] < r.x + r.w && p[1] >= r.y && p[1] < r.y + r.h;
// The time a change should happen at so it falls between two frames: just
// ahead of the first frame at or after `time`. render.mjs blends the moments
// a quarter of a frame either side of each frame, so a change at any other
// time is blended into a ghost of both states.
export const onFrame = time => (Math.ceil(time * 30 - 1e-6) - .5) / 30;
export const mid = (r, fx = .5, fy = .5) => [r.x + r.w * fx, r.y + r.h * fy];
// A button's look under the pointer: hovered, and pressed while it is down.
export function touch(node, over, down = false) {
  node.classList.toggle('is-hover', over);
  node.classList.toggle('is-press', over && down);
}
// The app's loader icon turns once every 1.4 s.
export const turn = (node, t) => { node.style.transform = `rotate(${Math.round((t / 1.4 % 1) * 3600) / 10}deg)`; };
// A toast or dialog arrives the way the app's "dialog-in" animation does.
export function arrive(node, t, start, end = Infinity) {
  const u = Math.min(out(span(t, start, start + .2)), 1 - span(t, end, end + .15));
  node.style.visibility = t >= start && u > 0 ? 'visible' : 'hidden';
  node.style.opacity = u;
  node.style.transform = `translateY(${px((1 - out(span(t, start, start + .2))) * 6)})`;
}
// The session clock, as format.js writes it.
export function elapsed(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return s >= 60 ? `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s` : `${s}s`;
}

// A text field that is typed into: the text, the focus ring and a caret
// (the frame never has real focus, so the caret is drawn).
export function buildField(view, selector) {
  const input = view.q(selector);
  const style = view.doc.defaultView.getComputedStyle(input);
  const probe = view.doc.createElement('canvas').getContext('2d');
  probe.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const caret = view.doc.createElement('i');
  caret.className = 'film-caret';
  view.doc.body.appendChild(caret);
  const r = view.local(input);
  const left = r.x + parseFloat(style.paddingLeft) + parseFloat(style.borderLeftWidth);
  const size = parseFloat(style.fontSize);
  Object.assign(caret.style, { top: px(r.y + (r.h - size * 1.25) / 2), height: px(size * 1.25) });
  const widths = new Map();
  const width = text => { if (!widths.has(text)) widths.set(text, probe.measureText(text).width); return widths.get(text); };
  return {
    input,
    width,
    // Measure every text the field will show, so pose() never has to.
    prepare: texts => texts.forEach(width),
    set(text, focused, caretLit) {
      input.value = text;
      input.classList.toggle('is-focus', focused);
      caret.style.visibility = focused && caretLit ? 'visible' : 'hidden';
      caret.style.left = px(left + width(text));
    },
  };
}

// A select's open menu. WebView2 draws it outside the page, so it is drawn
// here, on the stage: the options at the select's font, the one under the
// pointer in the system highlight color.
export function buildSelectMenu(stage, anchor, options, chosen) {
  const menu = h('div', 'mm-menu', stage);
  const rows = options.map(text => h('div', null, menu, text));
  place(menu, anchor.x, anchor.y + anchor.h, anchor.w);
  const rowH = 21;
  const box = i => ({ x: anchor.x + 1, y: anchor.y + anchor.h + 1 + rowH * i, w: anchor.w - 2, h: rowH });
  return {
    menu, box,
    rowAt: p => options.findIndex((_, i) => inBox(p, box(i))),
    pose(t, open, close, row) {
      const shown = t >= onFrame(open) && t < onFrame(close);
      menu.style.visibility = shown ? 'visible' : 'hidden';
      rows.forEach((node, i) => { node.className = i === (row < 0 ? chosen : row) ? 'on' : ''; });
    },
  };
}

// ---------------------------------------------------------------- video window
const CAPTION = '<g fill="none" stroke="#1b1b1b" stroke-width="1"><path d="M18 16.5H28"/><rect x="64.5" y="11.5" width="9" height="9" rx="1.2"/><path d="M110 11L120 21M120 11L110 21"/></g>';
// The mountain picture on the project's website (site/index.html), in three
// lights. The colors are [sky, sun, far ridge, snow, middle ridge, near
// ridge, river, trees].
const LANDSCAPE = c => `<svg xmlns="${NS}" viewBox="0 0 320 480" preserveAspectRatio="xMidYMid slice">
  <rect width="320" height="480" fill="${c[0]}"/><circle cx="242" cy="112" r="37" fill="${c[1]}"/>
  <path d="m-25 300 103-154 88 81 40-40 145 165v128H-25Z" fill="${c[2]}"/><path d="m78 146 31 88-31-17-32 15Z" fill="${c[3]}"/>
  <path d="m-30 346 97-87 72 70 69-96 143 128v119H-30Z" fill="${c[4]}"/><path d="m-25 429 89-69 76 27 81-63 124 89v67H-25Z" fill="${c[5]}"/>
  <path d="M230 353c-100 56 80 55-11 90s-66 47-66 47h-43c-7-42 124-37 90-69s-16-45 30-68Z" fill="${c[6]}"/>
  <path d="m35 385 12-34 13 34h-8l12 25H29l13-25Zm231 29 17-47 17 47h-10l16 34h-46l17-34Z" fill="${c[7]}"/></svg>`;
export const PHOTOS = [
  { colors: ['#dfedf2', '#fbfdfe', '#b4ccd8', '#f4f9fb', '#7195aa', '#38677e', '#b6ddea', '#254e63'], day: 'Today', time: '10:24 AM' },
  { colors: ['#f7d9bd', '#fff4e2', '#e0a99b', '#fbeadf', '#b36f7c', '#6a3f60', '#f6c7a4', '#40264a'], day: 'Yesterday', time: '7:52 PM' },
  { colors: ['#1b2a45', '#e9eff7', '#33496d', '#8296b8', '#24395b', '#14253f', '#4a6896', '#0b1626'], day: 'Sunday', time: '9:31 PM' },
];
const STATUS = '<svg width="46" height="12" viewBox="0 0 46 12" fill="#fff"><rect x="0" y="7" width="3" height="5" rx=".8"/><rect x="4.5" y="5" width="3" height="7" rx=".8"/><rect x="9" y="2.5" width="3" height="9.5" rx=".8"/><rect x="13.5" y="0" width="3" height="12" rx=".8"/>'
  + '<rect x="23.5" y=".5" width="19" height="11" rx="3.2" fill="none" stroke="#fff" stroke-opacity=".5"/><rect x="25" y="2" width="13" height="8" rx="1.8"/><rect x="43.6" y="4" width="1.6" height="4" rx=".8" fill-opacity=".5"/></svg>';

// The phone's screen, as the video shows it: a photo full screen, its date,
// and the strip of pictures under it. swipe(u) is how far along the pictures
// the phone is: 0 is the first, 1 the second, 1.5 halfway to the third.
export function buildPhone(parent, w = PICTURE.w) {
  const screen = h('div', 'ph', parent);
  const track = h('div', 'ph-track', screen);
  for (const photo of PHOTOS) {
    const frame = h('div', 'ph-photo', track);
    frame.style.width = px(w);
    frame.innerHTML = LANDSCAPE(photo.colors);
  }
  const top = h('div', 'ph-top', screen);
  h('div', 'ph-time', top, '10:24');
  h('div', 'ph-stat', top).innerHTML = STATUS;
  const dates = PHOTOS.map(photo => {
    const node = h('div', 'ph-date', top, photo.day);
    h('small', null, node, photo.time);
    return node;
  });
  const foot = h('div', 'ph-foot', screen);
  const strip = h('div', 'ph-thumbs', foot);
  const thumbs = PHOTOS.map(photo => {
    const node = h('div', 'ph-thumb', strip);
    node.innerHTML = LANDSCAPE(photo.colors);
    return node;
  });
  h('div', 'ph-home', foot);
  const PITCH = 33;
  return {
    screen,
    swipe(u) {
      u = clamp(u, 0, PHOTOS.length - 1);
      track.style.transform = `translateX(${px(-u * w)})`;
      strip.style.transform = `translateX(${px(w / 2 - 15 - u * PITCH)})`;
      const now = Math.round(u);
      dates.forEach((node, i) => { node.style.opacity = clamp(1 - Math.abs(u - i) * 2.5); });
      thumbs.forEach((node, i) => {
        const near = clamp(1 - Math.abs(u - i));
        node.style.transform = `scale(${Math.round(lerp(.86, 1.12, near) * 1000) / 1000})`;
        node.style.opacity = lerp(.62, 1, near);
        node.style.zIndex = i === now ? 1 : 0;
      });
    },
  };
}

// "MirrorMe - iPhone screen": the window the picture arrives in.
export function buildVideoWindow(stage, before = null) {
  const win = h('div', 'vw');
  stage.insertBefore(win, before);
  place(win, VIDEO.x, VIDEO.y, VIDEO.w, VIDEO.h);
  const bar = h('div', 'vw-bar', win);
  h('img', null, bar).src = 'assets/mark.svg';
  h('div', 'name', bar, VIDEO_TITLE);
  const caps = document.createElementNS(NS, 'svg');
  caps.setAttribute('width', 138);
  caps.setAttribute('height', BAR);
  caps.innerHTML = CAPTION;
  bar.appendChild(caps);
  const client = h('div', 'vw-client', win);
  const phone = buildPhone(client);
  return {
    win, client, phone,
    // The window opens the way a Windows 11 window does: it grows a little
    // and fades in, in about a fifth of a second.
    open(t, start) {
      const u = out(span(t, start, start + .22));
      win.style.visibility = t >= start ? 'visible' : 'hidden';
      win.style.opacity = u;
      win.style.transform = u >= 1 ? 'none' : `scale(${Math.round(lerp(.94, 1, u) * 1e4) / 1e4})`;
    },
  };
}
