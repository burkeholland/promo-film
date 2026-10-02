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
// A camera part switches between the full frame and the CLOSE framing at each
// punchIn time. A film part can play `sounds` the computer itself would make,
// mixed under the voice: a `file` in assets/sounds/, `at` seconds into the
// film, turned up or down by `gain` dB.
// eslint-disable-next-line no-unused-vars
import { cut } from './said.mjs';

// The finished video is build/<NAME>.mp4.
export const NAME = 'routing-test';
// A file in assets/video/. It can be sound alone when no part is a camera
// part. null until there is one: standalone scenes render without it.
export const RECORDING = 'take.mp4';
export const SOURCE_FPS = 30;
export const frame = n => n / SOURCE_FPS;

// Seconds of silence before the recording starts, played over the first part,
// which must be a film.
export const LEAD = 0;

export const PARTS = [
  { camera: true, from: 0, to: cut('a few weeks ago') },
  { film: 'routed', from: cut('automatically use these models'), to: cut('and the inference') },
  { camera: true, from: cut('and the inference'), to: cut('for instance'), punchIn: [cut('completely free')] },
];

// The closer framing of a camera part, in the recording's pixels: about
// 1.15x, centered on the face.
export const CLOSE = { x: 160, y: 30, w: 1670, h: 940 };

// Stretches of the recording to silence, as [from, to] in seconds.
export const MUTE = [];

// Names the captions never split between lines (captions.mjs).
export const NAMES = [];
