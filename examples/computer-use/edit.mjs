// The finished video, part by part. Every part plays a stretch of the
// recording (assets/video/RECORDING: the talking head take, or just the
// voiceover's sound), whose sound is the soundtrack. A camera part shows the
// recording itself and a film part shows a rendered film (build/<film>.mp4,
// from film/scenes/<film>.mjs) over its sound. Times are seconds in the
// recording and fall on its frames, so picture and sound always cut together.
//
// Name the cuts by what is said: cut('for instance') is the frame just before
// "For instance", so a new take with the same script cuts itself. frame(n) is
// frame n of the recording, for a cut picked by eye.
//
//   { camera: true, from: 0, to: cut('a few weeks ago'), punchIn: [cut('because we think')] },
//   { film: 'picker', from: cut('a few weeks ago'), to: cut('this is why') },
//   { film: 'install', from: ..., to: ..., sounds: [{ file: 'notify.wav', at: 0.84, gain: -4 }] },
//
// Parts do not have to touch. A part that starts later than the one before it
// ended leaves that stretch of the recording out of the video, sound and
// picture (a pause that ran long, a line that was dropped). Cues are times in
// the recording, so everything after the gap still lands. Cut in silence:
// `python tools/wave.py <recording> <from> <to>` shows where that is.
//
// A camera part switches between the full frame and the CLOSE framing at each
// punchIn time. A film part can play `sounds` the computer itself would make,
// mixed under the voice: a `file` in assets/sounds/, `at` seconds into the
// film, turned up or down by `gain` dB.
// eslint-disable-next-line no-unused-vars
import { cut } from './said.mjs';

// The finished video is build/<NAME>.mp4.
export const NAME = 'computer-use';
// A file in assets/video/. It can be sound alone when no part is a camera
// part. null until there is one: standalone scenes render without it.
// This film has no voice: the words are on screen. The recording is 58 s of
// silence, so every cut is a frame picked by eye.
export const RECORDING = 'silence.wav';
export const SOURCE_FPS = 30;
export const frame = n => n / SOURCE_FPS;

// Seconds of silence before the recording starts, played over the first part,
// which must be a film.
export const LEAD = 0;

export const PARTS = [
  // "Copilot can now use your desktop apps."
  { film: 'title', from: frame(0), to: frame(150) },
  // Home: the request is typed and sent.
  { film: 'ask', from: frame(150), to: frame(390) },
  // The session: Copilot reads the receipts and asks to use Edge.
  { film: 'allow', from: frame(390), to: frame(570) },
  // Edge, next to the session: the report filled in, one step at a time.
  { film: 'fill', from: frame(570), to: frame(1170) },
  // Copilot asks before it submits, then submits.
  { film: 'submit', from: frame(1170), to: frame(1440) },
  // The end card.
  { film: 'end', from: frame(1440), to: frame(1650) },
];

// The closer framing of a camera part, in the recording's pixels: about
// 1.15x, centered on the face.
export const CLOSE = { x: 160, y: 30, w: 1670, h: 940 };

// Stretches of the recording to silence, as [from, to] in seconds.
export const MUTE = [];

// The loudness compose brings the voice to, in LUFS. -14 by default. compose
// prints the value that needs no limiting; use it when the sound was already
// cleaned up (Adobe Podcast, a mastered voiceover).
// export const LOUDNESS = -16.8;

// Names the captions never split between lines (captions.mjs).
export const NAMES = ['GitHub Copilot', 'Computer Use', 'Contoso Expenses', 'Microsoft Edge'];
