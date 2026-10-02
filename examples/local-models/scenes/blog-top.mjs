// "A few weeks ago, we announced Project HydraFusion," The top of the blog post that
// announced it. The camera is already moving when the cut lands: it starts on
// the whole screen, the blog's header and all, eases in on the title so it has
// all but settled by "Project", and keeps creeping in at the speed it arrived
// with until the cut. There is no browser around the page and no pointer on
// it, and so no scroll either: with nothing fixed on screen, a scroll would
// only look like the camera tilting.
import { bezier, clamp } from '../motion.mjs';
import { clock } from '../timeline.mjs';
import { DH, DW, image, imagesDecoded, r3 } from '../kit.mjs';
import { buildStage, film } from '../app.mjs';
import { between, keep } from '../camera.mjs';

const T = clock('blog-top');
const DURATION = T.duration;
// Onsets measured from the waveform.
const WORDS = T.words({ a: 4.67, project: 6.43, hydrafusion: 7.0 });

// A capture of the post at 2.5x, shown 1536 px wide like the screen, so it
// stays sharp up to about 2x. Its background, for anything the camera could
// show past it.
const PAGE = { src: 'assets/blog-top.png', w: 1536, h: 1440, ground: 'rgb(33, 40, 48)' };

const SHOTS = {
  screen: { x: DW / 2, y: DH / 2, s: 1 },
  // The title a little above the middle, with the line under the menus just
  // out of the top and the margins either side of the text about even.
  title: keep({ x: 650, y: 400, s: 1.7 }),
};
// It lands as "HydraFusion" is said and creeps 2.5% further by the cut.
const LAND = WORDS.hydrafusion;
const CREEP = 1.025;
// Progress from one shot to the other, past 1 for the creep. The move leaves
// at twice its average speed, as if it began before the cut, and slows to the
// creep's speed, so there is no bump where one becomes the other.
const SPEED = Math.log(CREEP) / Math.log(SHOTS.title.s / SHOTS.screen.s) / (DURATION - LAND);
const X2 = .35;
const ease = bezier(.25, .5, X2, 1 - SPEED * LAND * (1 - X2));
const progress = t => (t < LAND ? ease(clamp(t / LAND)) : 1 + SPEED * (t - LAND));
const camera = t => keep(between(SHOTS.screen, SHOTS.title, progress(t)));

export default async function blogTop() {
  const stage = buildStage();
  stage.querySelector('#wallpaper').style.display = 'none';
  stage.style.background = PAGE.ground;
  image(stage, 'logo', PAGE.src, 0, 0, PAGE.w, PAGE.h);
  await imagesDecoded();

  const pose = t => {
    film(stage, camera(clamp(t, 0, DURATION)));
  };

  const at = t => {
    const { x, y, s } = camera(t);
    return [r3(x), r3(y), r3(s), r3(progress(t))];
  };
  return {
    pose,
    duration: DURATION,
    info: {
      words: Object.fromEntries(Object.entries(WORDS).map(([k, v]) => [k, r3(v)])),
      // [x, y, zoom, progress] at the cut, the words and the end.
      camera: { start: at(0), a: at(WORDS.a), project: at(WORDS.project), land: at(LAND), end: at(DURATION) },
      creepSpeed: r3(SPEED),
    },
  };
}
