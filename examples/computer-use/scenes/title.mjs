// The opening card, on the dark board: the app's icon and name, then the
// headline, "Copilot can now use your desktop apps.", word by word, and its
// promise under it. There is no voice, so the times are for the eye. The
// camera creeps in the whole time.
import { card } from '../card.mjs';
import { COPILOT } from '../kit.mjs';
import { DIM, LIGHT_PURPLE } from '../graphics.mjs';

export default card('title', {
  center: 418,
  blocks: [
    { app: COPILOT, y: 233, at: .15 },
    { words: ['Copilot can now use', 'your desktop apps.'], y: 318, at: .5, size: 88, weight: 720, track: -.026, stretch: 103, step: .075 },
    { words: '[Computer] [Use] in the GitHub Copilot app. Now in public preview.', y: 588, at: 2.1, size: 31, weight: 450, color: DIM, accent: LIGHT_PURPLE, track: -.005, step: .03, dur: .55, fast: .4 },
  ],
});