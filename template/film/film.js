// The film's page. Each scene is the app rebuilt as HTML, so every label and
// name can change. render.mjs and the preview call window.__film.seek(t) for
// each frame; every state is a pure function of t.
//
//   index.html?scene=demo              one scene (scenes/<name>.mjs)
//   index.html?scene=...&desktop=1280  the app alone at the reference size
//
// A scene module's default export builds the scene and returns
// { pose(t), duration, fast?: [[start, end]], info? }.
import { SCENE_NAME } from './kit.mjs';

let pose = () => {};
let settle;
window.__film = {
  ready: new Promise((resolve, reject) => { settle = { resolve, reject }; }),
  seek: t => pose(Number(t)),
  lint: () => lint(),
};

// Layout problems in the frame as it is now, as sentences. render.mjs asks at
// a dozen moments of every film it opens and prints what it finds:
//  - text cut off at the side of a box that clips it (a title too long for
//    its row, a label under the next column);
//  - big text (20 px and up: headlines, captions) running off the frame;
//  - a caption over the pointer.
// Text that is meant to be cut goes inside an element with data-clip.
const say = text => `"${text.replace(/\s+/g, ' ').trim().slice(0, 48)}"`;
function lint() {
  const found = [];
  const W = innerWidth, H = innerHeight;
  const shown = node => node.checkVisibility({ opacityProperty: true, visibilityProperty: true });
  for (const node of document.body.querySelectorAll('*')) {
    if (!(node instanceof HTMLElement) || node.closest('[data-clip]')) continue;
    const own = [...node.childNodes].some(child => child.nodeType === 3 && child.data.trim());
    if (!own || !shown(node)) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    const box = range.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) continue;
    let cut = false;
    for (let clip = node; clip && clip !== document.body; clip = clip.parentElement) {
      if (getComputedStyle(clip).overflowX === 'visible') continue;
      const c = clip.getBoundingClientRect();
      const over = Math.max(c.left - box.left, box.right - c.right);
      const seen = box.right > c.left && box.left < c.right && box.bottom > c.top && box.top < c.bottom;
      if (over > 1.5 && seen) {
        const where = clip.id ? `#${clip.id}` : clip.className ? `.${String(clip.className).split(' ')[0]}` : clip.tagName.toLowerCase();
        found.push(`${say(node.textContent)} is cut off by ${Math.round(over)} px at the side of ${where}${clip.id === 'stage' ? ' (the edge of the desktop)' : ''}`);
        cut = true;
        break;
      }
    }
    if (!cut && parseFloat(getComputedStyle(node).fontSize) >= 20) {
      const out = Math.max(-box.left, box.right - W, -box.top, box.bottom - H);
      if (out > 1.5 && box.right > 0 && box.left < W && box.bottom > 0 && box.top < H) found.push(`${say(node.textContent)} runs ${Math.round(out)} px off the frame`);
    }
  }
  const pointer = document.getElementById('cursor');
  if (pointer && shown(pointer)) {
    const p = pointer.getBoundingClientRect();
    for (const caption of document.querySelectorAll('.cap')) {
      if (!shown(caption)) continue;
      const c = caption.getBoundingClientRect();
      if (p.right > c.left && p.left < c.right && p.bottom > c.top && p.top < c.bottom) found.push(`the caption ${say(caption.textContent)} covers the pointer`);
    }
  }
  return found;
}

(async () => {
  if (!/^[a-z0-9-]+$/.test(SCENE_NAME)) throw new Error(`There is no scene called ${SCENE_NAME}`);
  const { default: build } = await import(`./scenes/${SCENE_NAME}.mjs`);
  const scene = await build();
  pose = scene.pose;
  pose(0);
  settle.resolve({ scene: SCENE_NAME, duration: scene.duration, fast: scene.fast || [], ...scene.info, captions: window.__captions || [] });
})().catch(error => settle.reject(String(error && error.stack || error)));
