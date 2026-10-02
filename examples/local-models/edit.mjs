// The finished video, part by part. Every part plays a stretch of the talking
// head recording (assets/video/RECORDING, Burke's second take of the script),
// whose sound is the soundtrack. A camera part shows the recording itself and a film part shows a
// rendered film (build/<film>.mp4) over its sound. Times are seconds in the
// recording and fall on its frames, so picture and sound always cut together.
// Each film cuts in a frame or two before its first word.
//
// A film part is an animated scene (film/scenes/<film>.mjs, rendered by
// `node render.mjs --scene <film> --crf 0`) unless it has shots. Then it is a
// run of stills with slow push-ins, rendered by `python stills.py`, which
// stands in until the scene is built. Each shot starts at its `at` time and
// runs until the next one. It shows an `image` (a file in assets/), a `frame`
// of a rendered film, or a numbered placeholder card for a screenshot we still
// `need`. `push: [x, y, zoom]` is where the push-in ends, in the image's
// pixels, and `start` is where it begins (the whole image when left out).
// local-models-v6.mp4 is the second take (local-models-v2.mp4) with the sound of Burke's own
// re-edit, which he cleaned up in Adobe Podcast (work/v6audio.py). The offline line now ends
// "or when you just don't have an internet connection", and both times he said "Microsoft Aion
// Flash 1.0" it is his "MAI Code 1.1 Flash" (work/voicepatch.py). Three stretches of the take
// are left out, so three parts end before the next one starts: the pause after each name, and
// the old end of the offline line.
export const RECORDING = 'local-models-v6.mp4';
export const SOURCE_FPS = 30;
const frame = n => n / SOURCE_FPS;

// A film part can also play `sounds` the computer itself would make, mixed
// under the voice: a `file` in assets/sounds/, `at` seconds into the film, and
// turned up or down by `gain` dB.

// The take opens on Burke, so there is no silent lead.
export const LEAD = 0;

export const PARTS = [
  // "Intelligent local model routing is coming to GitHub Copilot."
  { camera: true, from: 0, to: frame(133) },
  // "A few weeks ago, we announced Project HydraFusion,"
  { film: 'blog-top', from: frame(133), to: frame(240) },
  // "an intelligent model orchestration that plans, implements, and executes
  // across a wide range of cloud models,"
  { film: 'hydra-pick', from: frame(240), to: frame(427) },
  // "giving you frontier-level performance while significantly reducing cost,
  // up to 67%. But"
  { film: 'graphic-67', from: frame(427), to: frame(640) },
  // "our vision goes beyond just the models that are available in the cloud,
  // because we think that unlimited and unmetered intelligence belongs on
  // every desktop." Punches in on "because".
  { camera: true, from: frame(640), to: frame(1006), punchIn: [frame(787)] },
  // "This is why we're pleased to announce that soon, Copilot will
  // intelligently route to and leverage local models on capable devices.
  // First, you'll no longer have to configure local models ... Any models that
  // you have installed with supported providers, such as Microsoft Foundry
  // Local or Ollama, will just automatically be discovered and will appear in
  // the model picker."
  { film: 'local', from: frame(1006), to: frame(1709) },
  // "Capable devices will also be able to install MAI Code 1.1 Flash," The
  // name is shorter than the words it replaced, so the 21 frames of silence
  // after it are left out.
  { film: 'aion-title', from: frame(1709), to: frame(1869) },
  // "a local model available for install right from GitHub Copilot. Copilot will
  // then" Windows chimes as the notification slides in (CUE.toast in
  // film/scenes/install.mjs).
  { film: 'install', from: frame(1890), to: frame(2049), sounds: [{ file: 'notify.wav', at: 0.84, gain: -4 }] },
  // "automatically use these models when set to auto-routing. There are a myriad of scenarios where local models are
  // perfect,"
  { film: 'routed', from: frame(2049), to: frame(2274) },
  // "and the inference is completely free for you."
  { camera: true, from: frame(2274), to: frame(2376) },
  // "For instance, when set to auto-routing, Copilot can automatically offload
  // to a local model for simple tasks, such as explaining how a codebase works
  // or how to run a project."
  { film: 'explore', from: frame(2376), to: frame(2694) },
  // "You can also plan with large frontier models, such as Astra, and then hand
  // off to a local model to implement while you sleep. And users love"
  // One take with the next part: the click on Automations lands on
  // "automations".
  { film: 'plan-handoff', from: frame(2694), to: frame(2998) },
  // "automations in GitHub Copilot. These are tasks that run on a schedule in
  // the background. Local models work incredibly here," The automation is
  // made with MAI Code 1.1 Flash and the cut comes on the click on Create.
  { film: 'automations', from: frame(2998), to: frame(3227) },
  // "able to work on very long-running tasks and costing you exactly zero AI
  // credits to use. You can also go completely" Its run goes for hours, the
  // session's details show what it cost, and confetti flies out of the zero.
  // It holds there through "You can also go completely" (Burke looks off
  // camera for that line, so the take isn't shown).
  { film: 'auto-run', from: frame(3227), to: frame(3499) },
  // "offline and still have access to your local models, which is perfect for
  // working disconnected or when you just don't have an internet connection."
  // The take's own ending of this line ("...handling sensitive data that you
  // need to be 100% sure does not leave your machine") is not a promise we
  // can make, so it is left out: 93 frames.
  { film: 'offline', from: frame(3499), to: frame(3778) },
  // "Project HydraFusion is available today in GitHub Copilot. You can look for
  // it under Experimental Settings. And capable devices"
  { film: 'settings-hydra', from: frame(3871), to: frame(4105) },
  // "will be able to use intelligent local model routing very soon, including
  // MAI Code 1.1 Flash." The picker, with MAI Code 1.1 Flash among the local
  // models. It holds until the take is back on Burke. 8 frames of the
  // silence after the name are left out.
  { film: 'aion-end', from: frame(4105), to: frame(4343) },
  // "With GitHub Copilot, you get intelligent multi-model routing, both in the
  // cloud and very soon, with local models that run on your machine and cost
  // you exactly $0.00. And zero cents." Punches in on "with local models".
  { camera: true, from: frame(4351), to: frame(4733), punchIn: [frame(4540)] },
];

// A camera part switches between the full frame and this closer framing at
// each punchIn time: 1.15x, centered on the face.
export const CLOSE = { x: 160, y: 30, w: 1670, h: 940 };

// Stretches of the recording to silence.
export const MUTE = [];