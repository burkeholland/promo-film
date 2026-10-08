// "Custom instructions are where you teach Copilot how you work." The title
// card: the app, the feature's name rising as it is said, and one line under
// it that comes in whole.
import { card } from '../card.mjs';
import { clock } from '../timeline.mjs';
import { COPILOT } from '../kit.mjs';
import { DIM } from '../graphics.mjs';

const T = clock('title');

export default card('title', {
  center: 420,
  zoom: 1.045,
  blocks: [
    { app: COPILOT, y: 268, at: .2 },
    { words: 'Custom instructions', y: 330, at: T.said('custom') - .08, size: 108, track: -.028 },
    { words: 'Teach Copilot how you work.', y: 496, at: T.said('teach') - .1, size: 34, weight: 500, color: DIM, track: -.01, step: 0 },
  ],
});
