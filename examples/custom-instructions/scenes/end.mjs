// "Set instructions for GitHub Copilot and teach it how you and your team
// like to work." The closing card: a short headline that rises with the
// first words, one line under it that comes in whole, then the app it is
// in. The last frame holds for a second after the voice ends.
import { card } from '../card.mjs';
import { clock } from '../timeline.mjs';
import { COPILOT } from '../kit.mjs';
import { DIM, LIGHT_PURPLE } from '../graphics.mjs';

const T = clock('end');

export default card('end', {
  center: 410,
  zoom: 1.045,
  blocks: [
    { words: 'Set your [instructions.]', y: 262, at: T.said('set instructions') - .06, size: 100, track: -.028, accent: LIGHT_PURPLE, step: .09 },
    { words: 'The way you and your team like to work.', y: 420, at: T.said('teach it') - .1, size: 34, weight: 500, color: DIM, track: -.01, step: 0 },
    { app: `in the ${COPILOT} app`, y: 548, at: T.said('your team') - .1, icon: 34, gap: 12, weight: 500, lift: 8 },
  ],
});
