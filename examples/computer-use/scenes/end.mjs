// The closing card, on the dark board: "Turn it on in Settings > Computer Use."
// Under it, the setting itself, drawn large: "Enable Computer Use" with the
// app's own description, and its switch flips on. Then the app it is in.
// The last frame holds. No voice: the times are for the eye.
import { card } from '../card.mjs';
import { COPILOT } from '../kit.mjs';
import { LIGHT_PURPLE } from '../graphics.mjs';

export default card('end', {
  center: 420,
  zoom: 1.045,
  glow: { ry: 440 },
  blocks: [
    { words: 'Turn it on in Settings > [Computer] [Use].', y: 225, at: .2, size: 60, weight: 700, accent: LIGHT_PURPLE, track: -.024, stretch: 103, step: .045, fast: 1 },
    // The setting's name and description, as the app has them
    // (ComputerUseSettingsView.tsx).
    { setting: { name: 'Enable Computer Use', about: 'Computer Use lets Copilot interact with desktop apps by clicking controls, entering text, and using visual context when needed.' }, y: 365, at: 1.2, flip: 2.1 },
    { app: `in the ${COPILOT} app`, y: 596, at: 3.0, icon: 34, gap: 12, weight: 500, lift: 8 },
  ],
});