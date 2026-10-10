// DRAWN: the app minimizing the way Windows 11 does it: the minimize button lights under the pointer, then the window
// shrinks and fades toward its button on the taskbar. The taskbar stays hidden in this film, so the window goes where its
// button would be (the fifth one, windows.mjs). The button's size is the pitch of the caption glyphs in app.mjs. Build
// once, then poseMinimize each frame.
import { W, WIN, h, place, px } from './kit.mjs';
import { easeIn, lerp, span } from './motion.mjs';

// The minimize button in window px (its glyph is at W - 57.9, the three buttons 23.2 apart), and its glyph in desktop px,
// which is what the pointer aims at.
export const MINIMIZE = { x: W - 57.9 - 11.6, y: 0, w: 23.2, h: 14 };
export const MINIMIZE_AT = [WIN.x + W - 57.9, WIN.y + 6.7];
// How long the window takes to shrink away.
export const SHRINK = .28;
const TASKBAR = [856 - WIN.x, 840 - WIN.y];

export function buildMinimize(win) {
  const hot = place(h('div', 'cap-hot', win), MINIMIZE.x, MINIMIZE.y, MINIMIZE.w, MINIMIZE.h);
  hot.style.visibility = 'hidden';
  win.style.transformOrigin = `${px(TASKBAR[0])} ${px(TASKBAR[1])}`;
  return { win, hot };
}

// `hover`: the pointer is on the button. `at`: when the window starts to shrink.
export function poseMinimize({ win, hot }, t, { hover = false, at = Infinity } = {}) {
  hot.style.visibility = hover ? 'visible' : 'hidden';
  const u = t >= at ? easeIn(span(t, at, at + SHRINK)) : 0;
  win.style.visibility = u >= 1 ? 'hidden' : 'visible';
  win.style.opacity = u > 0 ? 1 - u * u : 1;
  win.style.transform = u > 0 ? `scale(${lerp(1, .14, u)})` : 'none';
}

// DRAWN: the window coming back from its taskbar button: the shrink played backward, so it jumps out fast and settles.
// Until `at` it is not there. Build with buildMinimize first (it sets where the window grows from).
export const GROW = .3;
export function poseRestore({ win }, t, { at = 0 } = {}) {
  const r = span(t, at, at + GROW);
  const u = r <= 0 ? 1 : easeIn(1 - r);
  win.style.visibility = u >= 1 ? 'hidden' : 'visible';
  win.style.opacity = u > 0 ? 1 - u * u : 1;
  win.style.transform = u > 0 ? `scale(${lerp(1, .14, u)})` : 'none';
}
