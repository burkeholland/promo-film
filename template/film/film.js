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
};

(async () => {
  if (!/^[a-z0-9-]+$/.test(SCENE_NAME)) throw new Error(`There is no scene called ${SCENE_NAME}`);
  const { default: build } = await import(`./scenes/${SCENE_NAME}.mjs`);
  const scene = await build();
  pose = scene.pose;
  pose(0);
  settle.resolve({ scene: SCENE_NAME, duration: scene.duration, fast: scene.fast || [], ...scene.info });
})().catch(error => settle.reject(String(error && error.stack || error)));
