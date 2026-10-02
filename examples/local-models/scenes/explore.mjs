// "...instance, when set to auto-routing, Copilot can automatically offload to
// a local model for simple tasks, such as explaining how a codebase works or
// how to run a project." Cuts in on the whole app as a new session opens on
// "How do I start this project?", and the camera creeps, then pushes in on the
// question. On "offload" Copilot hands the digging to an Explore agent, which
// switches to MAI Code 1.1 Flash on "local model" and reads its way through
// the repo on "simple tasks, such as explaining". On "how a codebase works"
// the camera tilts down to the answer as it streams in on "how to run a
// project", settling as Copilot finishes.
import { bezier, clamp } from '../motion.mjs';
import { clock } from '../timeline.mjs';
import { AION, DH, DW, WIN, imagesDecoded, loadAssets, r3, rect } from '../kit.mjs';
import { PROJECTS, buildCursor, buildStage, buildWindow, film, pointAt, showText } from '../app.mjs';
import { caretOn } from '../input.mjs';
import { glide, keep, look, makeCamera } from '../camera.mjs';
import { COL, SESSION_ICONS, buildSession, spinner } from '../session.mjs';

const T = clock('explore');
const DURATION = T.duration;
// Onsets measured from the waveform. "explaining", "codebase", "run" and
// "project" run on from the words before them, so they keep Whisper's times.
const WORDS = T.words({
  instance: 79.57, copilot: 82.105, offload: 83.655, local: 84.635, simple: 85.205,
  tasks: 85.53, explaining: 86.94, codebase: 87.82, works: 88.28, run: 88.88, project: 89.14,
});

const PROJECT = 'storefront-api';
const PROMPT = 'How do I start this project?';
const TITLE = 'Running storefront-api locally';
// What the Explore agent reads, and when, from the start of "simple": a
// quick, uneven pace, the way tool calls come back.
const READS = [
  [0, { icon: 'file-text', text: 'View README.md' }],
  [.29, { icon: 'braces', color: '#bf8700', text: 'View package.json' }],
  [.6, { icon: 'search', text: 'Searched src/**/server*' }],
  [.83, { icon: 'file-code', text: 'View src/server.ts' }],
  [1.15, { icon: 'file', text: 'View .env.example' }],
  [1.44, { icon: 'file', text: 'View docker-compose.yml' }],
];
const ANSWER = [
  `To run **${PROJECT}** locally:`,
  '1. Install dependencies with `npm install`',
  '2. Copy `.env.example` to `.env` and set `DATABASE_URL`',
  '3. Start Postgres with `docker compose up -d db`',
  '4. Run `npm run dev`. The API listens on `localhost:3000`',
].join('\n');

const CUE = {
  // The session opened a moment before the cut, so its rows are still
  // fading in on the first frames.
  open: -.08,
  // Copilot hands the job to an Explore agent as "offload" lands, and the
  // agent's switch to the local model follows on "local model".
  // Copilot thinks it over while "Copilot can automatically" is said.
  thought: WORDS.copilot + .12,
  agent: WORDS.offload + .14,
  model: WORDS.local + .02,
  reads: WORDS.simple - .06,
  // The answer streams in from "works" and is done just after "project".
  answer: [WORDS.works - .04, WORDS.project + .32],
  done: WORDS.project + .5,
};

// The shot whose frame has its top left corner at window (left, top).
const frame = (left, top, s) => look(WIN.x + left + DW / 2 / s, WIN.y + top + DH / 2 / s, s);
// Creeps at the cut, gets going as Copilot hands the job off and takes its
// time arriving.
const push = bezier(.5, .05, .25, 1);

export default async function explore() {
  await loadAssets(SESSION_ICONS);
  const stage = buildStage();
  const projects = [...PROJECTS, ['folder', PROJECT, -1.92]];
  const { ui, session: side, showSession } = buildWindow(stage, { session: { project: PROJECT, name: 'New session' }, projects });
  const S = buildSession(ui, { chip: 'Auto · Efficiency', branch: `${PROJECT}/main` });
  const cursor = buildCursor(stage);
  side.dot.style.visibility = 'hidden';
  const sideSpin = spinner(side.spin, 0, 0);
  await imagesDecoded();

  const tl = S.tl;
  const at = (item, t) => { item.at = t; return item; };
  at(tl.row({ icon: 'circle-check', text: 'Copilot session started' }), CUE.open);
  const bubble = at(tl.bubble(PROMPT), CUE.open);
  at(tl.row({ icon: 'circle-dashed', text: 'Thought for 2s' }), CUE.thought);
  const agentRow = at(tl.agent({ icon: 'folder-search', text: 'Explore', detail: 'How to start the project' }), CUE.agent);
  const modelRow = at(tl.model(AION, 'Local', { nest: 1 }), CUE.model);
  const reads = READS.map(([dt, row]) => at(tl.row({ ...row, nest: 1 }), CUE.reads + dt));
  const answer = tl.stream(tl.md(ANSWER), CUE.answer[0], CUE.answer[1], 7);
  tl.work.from = CUE.open;
  tl.work.to = CUE.done;
  tl.finish(DURATION);

  // The hand rests to the right of the composer: in the wide shot, out of
  // the close ones.
  const p = [WIN.x + 1296, WIN.y + 612];

  const bubbleBox = rect(bubble.node.firstChild, WIN);
  const first = tl.where(reads[0], DURATION);
  const last = tl.where(reads.at(-1), DURATION);
  const reply = tl.where(answer, DURATION);
  const shots = {
    // The whole window on the desktop, with even margins of wallpaper.
    wide: look(WIN.x + WIN.w / 2, WIN.y + WIN.h / 2, 1.05, keep),
    // The conversation column edge to edge, just under the header: the
    // question, and the agent and its reads under it.
    thread: frame(COL.x + COL.w / 2 - DW / 2 / 1.6, 58, 1.6),
    // The same shot tilted down to run from the agent to the answer. The top
    // edge falls in the gap under the question.
    reply: frame(COL.x + COL.w / 2 - DW / 2 / 1.6, bubbleBox.y + bubbleBox.h + 8, 1.6),
  };
  // The push zooms about a point just below the question, so the question
  // stays put and grows while the rest of the app leaves the frame.
  const camera = makeCamera([
    [0, shots.wide],
    [WORDS.offload - .1, shots.thread, push],
    [WORDS.codebase, shots.thread],
    [DURATION, shots.reply, glide],
  ]);

  const pose = t => {
    t = clamp(t, 0, DURATION);
    film(stage, camera(t));
    showSession(true);
    const working = t < CUE.done;
    // The composer keeps focus, empty, while Copilot works.
    showText(S.composer, '', caretOn(t, CUE.open), null);
    S.composer.running(working);
    const name = t >= CUE.agent ? TITLE : 'New session';
    S.rename(name);
    if (side.name.textContent !== name) side.name.textContent = name;
    tl.pose(t);
    side.spin.style.visibility = working ? 'inherit' : 'hidden';
    side.dot.style.visibility = working ? 'hidden' : 'inherit';
    if (working) sideSpin(t);
    pointAt(cursor, p);
  };

  return {
    pose,
    duration: DURATION,
    info: {
      cue: Object.fromEntries(Object.entries(CUE).map(([k, v]) => [k, Array.isArray(v) ? v.map(r3) : r3(v)])),
      bubble: [bubbleBox.x, bubbleBox.y, bubbleBox.w, bubbleBox.h].map(r3),
      agent: [tl.where(agentRow, DURATION).y, tl.where(modelRow, DURATION).y].map(r3),
      reads: [first.y, last.y].map(r3),
      reply: [reply.x, reply.y, answer.h].map(r3),
      shots: Object.fromEntries(Object.entries(shots).map(([k, v]) => [k, [r3(v.x), r3(v.y), r3(v.s)]])),
    },
  };
}
