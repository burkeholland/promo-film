// Builds the finished video from the parts in film/edit.mjs. Camera parts come
// from the recording, film parts from the rendered films (build/<film>.mp4,
// made by `node render.mjs --all`), and the recording's sound runs under both.
//
//   node compose.mjs --draft         a quick review cut from the draft films
//                                    (`node render.mjs --all --draft`), as
//                                    build/<NAME>-draft.mp4
//   node compose.mjs                 the whole edit, as build/<NAME>.mp4
//   node compose.mjs --tag v2        the same, as build/<NAME>-v2.mp4
//   node compose.mjs --to 26.6       only the first 26.6 seconds
//   node compose.mjs --out <file>    names the MP4
//   node compose.mjs --list          also prints every piece and its times
//
// The voice is brought to -14 LUFS, the level social apps play at (LOUDNESS in
// film/edit.mjs changes it), and a limiter holds the peaks at -1.5 dBFS. When
// that gain pushes the voice's own peaks into the limiter, compose says by how
// much and prints the LOUDNESS that needs no limiting: use that for sound that
// was already cleaned up or mastered (references/audio.md). The finished
// file's loudness is measured and printed.
import { spawn, spawnSync } from 'node:child_process';
import { closeSync, existsSync, openSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import * as edit from './film/edit.mjs';

const { CLOSE, LEAD = 0, MUTE = [], NAME = 'promo', PARTS, RECORDING: TAKE, SOURCE_FPS = 30 } = edit;
const here = dirname(fileURLToPath(import.meta.url));
const build = join(here, 'build');
const FPS = 30;
const RATE = 44100;
const LOUDNESS = edit.LOUDNESS ?? -14;
// The limiter holds sample peaks; encoding to AAC can lift the true peak a
// little past that. PEAK in film/edit.mjs lowers the ceiling when the
// finished video measures over -1 dBFS.
const PEAK_DB = edit.PEAK ?? -1.5;
// Each cut in the sound fades over 10 ms so it never clicks.
const FADE = 0.01;

const { values: options } = parseArgs({
  options: { to: { type: 'string' }, out: { type: 'string' }, tag: { type: 'string' }, draft: { type: 'boolean' }, list: { type: 'boolean' } },
});
const draft = Boolean(options.draft);
const films = draft ? join(build, 'draft') : build;

if (!TAKE) throw new Error('film/edit.mjs names no RECORDING yet, so there is no sound to build on.');
if (!PARTS.length) throw new Error('film/edit.mjs has no PARTS yet.');
const RECORDING = join(here, 'assets', 'video', TAKE);
if (!existsSync(RECORDING)) throw new Error(`${relative(here, RECORDING)} is missing.`);

const onFrame = time => Math.abs(time * SOURCE_FPS - Math.round(time * SOURCE_FPS)) < 1e-6;
for (const [index, part] of PARTS.entries()) {
  for (const time of [part.from, part.to, ...(part.punchIn || [])]) {
    if (!onFrame(time)) throw new Error(`${time}s is not on a frame of the recording. Use cut('words') or frame(n).`);
  }
  if (!(part.to > part.from)) throw new Error(`Part ${index + 1}${part.film ? ` (${part.film})` : ''} ends before it starts.`);
}
if (LEAD && !PARTS[0].film) throw new Error('The lead-in plays over a film, so the first part must be one.');

// Picture: a film part is one piece, and a camera part is cut where it punches in.
const frames = seconds => Math.round(seconds * FPS);
const pieces = [];
for (const [index, part] of PARTS.entries()) {
  if (part.film) {
    pieces.push({ film: part.film, frames: frames((index === 0 ? LEAD : 0) + part.to - part.from), sounds: part.sounds || [] });
    continue;
  }
  const cuts = [part.from, ...(part.punchIn || []), part.to];
  for (let k = 0; k + 1 < cuts.length; k++) pieces.push({ from: cuts[k], frames: frames(cuts[k + 1] - cuts[k]), close: k % 2 === 1 });
}
// Sound: the recording in runs, cut only where the edit leaves a stretch out.
const runs = [];
for (const part of PARTS) {
  const last = runs.at(-1);
  if (last && Math.abs(last.to - part.from) < 1e-9) last.to = part.to;
  else runs.push({ from: part.from, to: part.to });
}

const total = pieces.reduce((sum, piece) => sum + piece.frames, 0);
const end = options.to === undefined ? total : Math.min(total, frames(Number(options.to)));
if (!(end > 0)) throw new Error('--to takes seconds of the finished video, like 26.6');

function filmFrames(file) {
  const result = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=nb_frames', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  return Number(result.stdout.trim());
}
// The films are BT.709. A recording tagged BT.601 (some cameras and screen
// recorders) is converted to match, or its colors shift at every cut. The
// colorspace filter does this within a level; scale's own matrix option
// darkened the picture by about 3 levels.
const matrix = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=color_space', '-of', 'csv=p=0', RECORDING], { encoding: 'utf8' }).stdout.trim();
const toBt709 = ['smpte170m', 'bt470bg'].includes(matrix)
  ? 'colorspace=ispace=smpte170m:itrc=bt709:iprimaries=bt709:irange=tv:space=bt709:trc=bt709:primaries=bt709:range=tv:format=yuv420p,'
  : '';
// Integrated loudness (LUFS) and true peak (dBFS) of whatever ffmpeg is given.
function measure(args) {
  const { stderr } = spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...args, '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 28 });
  const last = pattern => Number([...stderr.matchAll(pattern)].at(-1)?.[1]);
  return { loudness: last(/\bI:\s+(-?[\d.]+) LUFS/g), peak: last(/\bPeak:\s+(-?[\d.]+) dBFS/g) };
}

// The voice: the recording's runs joined end to end, before any gain.
const voice = [];
const mute = MUTE.map(([from, to]) => `between(t,${from},${to})`).join('+');
voice.push(`[0:a]${mute ? `volume=0:enable='${mute}',` : ''}asplit=${runs.length}${runs.map((_, i) => `[s${i}]`).join('')}`);
runs.forEach((run, i) => {
  const length = run.to - run.from;
  voice.push(`[s${i}]atrim=start=${run.from}:end=${run.to},asetpts=PTS-STARTPTS,afade=t=in:d=${FADE},afade=t=out:st=${length - FADE}:d=${FADE}[r${i}]`);
});
if (LEAD) voice.push(`anullsrc=r=${RATE}:cl=stereo,atrim=end_sample=${Math.round(LEAD * RATE)}[lead]`);
const joined = `${LEAD ? '[lead]' : ''}${runs.map((_, i) => `[r${i}]`).join('')}concat=n=${runs.length + (LEAD ? 1 : 0)}:v=0:a=1,aresample=48000`;

const { loudness: spoken, peak: spokenPeak } = measure(['-i', RECORDING, '-filter_complex', [...voice, `${joined},ebur128=peak=true[out]`].join(';'), '-map', '[out]']);
// A video with no voice (words on screen, a silent track) has nothing to bring up.
const silent = !(spoken > -60);
const gain = silent ? 0 : Math.round((LOUDNESS - spoken) * 10) / 10;
console.log(silent ? 'The sound is silent, so its level is left alone.' : `The voice measures ${spoken} LUFS, so it is turned ${gain < 0 ? 'down' : 'up'} ${Math.abs(gain)} dB.`);
const limited = spokenPeak + gain - PEAK_DB;
if (Number.isFinite(limited) && limited > 0.05) {
  console.log(`Its peaks are at ${spokenPeak} dBFS, so the limiter takes up to ${limited.toFixed(1)} dB off the loudest ones. For no limiting at all (sound that is already cleaned up or mastered), set LOUDNESS = ${(Math.floor((spoken + PEAK_DB - spokenPeak) * 10) / 10).toFixed(1)} in film/edit.mjs.`);
}

const args = ['-y', '-hide_banner', '-loglevel', 'error', '-nostats', '-i', RECORDING];
const graph = [];
const labels = [];
// Sounds the films play, at seconds in the finished video.
const cues = [];
let at = 0;
for (const piece of pieces) {
  if (at >= end) break;
  const take = Math.min(piece.frames, end - at);
  const label = `[v${labels.length}]`;
  const input = labels.length + 1;
  const range = `${(at / FPS).toFixed(3)} - ${((at + take) / FPS).toFixed(3)}`;
  if (piece.film) {
    const file = join(films, `${piece.film}.mp4`);
    const make = `node render.mjs --scene ${piece.film}${draft ? ' --draft' : ''}`;
    if (!existsSync(file)) throw new Error(`${relative(here, file)} is missing. Render it with: ${make}`);
    const count = filmFrames(file);
    if (count !== piece.frames) throw new Error(`${relative(here, file)} has ${count} frames, but the edit needs ${piece.frames}. Render it again with: ${make}`);
    args.push('-i', file);
    graph.push(`[${input}:v]setpts=PTS-STARTPTS,${draft ? 'scale=1920:1080:flags=bicubic,' : ''}fps=${FPS},trim=end_frame=${take},setsar=1,format=yuv420p${label}`);
    if (options.list) console.log(`${range}  film ${piece.film}`);
    for (const sound of piece.sounds) {
      const file = join(here, 'assets', 'sounds', sound.file);
      if (!existsSync(file)) throw new Error(`${relative(here, file)} is missing.`);
      const time = at / FPS + sound.at;
      if (time < end / FPS) cues.push({ file, time, gain: sound.gain || 0 });
    }
  } else {
    // Seeking a quarter frame early makes the first frame exactly `from`.
    args.push('-ss', (piece.from - 0.25 / SOURCE_FPS).toFixed(4), '-t', (take / FPS + 0.5).toFixed(4), '-i', RECORDING);
    const crop = piece.close ? `crop=${CLOSE.w}:${CLOSE.h}:${CLOSE.x}:${CLOSE.y},` : '';
    graph.push(`[${input}:v]setpts=PTS-STARTPTS,${toBt709}${crop}scale=1920:1080:flags=lanczos,fps=${FPS},trim=end_frame=${take},setsar=1,format=yuv420p${label}`);
    if (options.list) console.log(`${range}  camera ${piece.from.toFixed(3)} - ${(piece.from + take / FPS).toFixed(3)}${piece.close ? ' (close)' : ''}`);
  }
  labels.push(label);
  at += take;
}
graph.push(`${labels.join('')}concat=n=${labels.length}:v=1:a=0[v]`);
graph.push(...voice, `${joined},volume=${gain}dB[voice]`);
// The films' sounds go in after the voice is brought up, so their gains are
// relative to the finished voice, and before the limiter, which holds the sum.
cues.forEach((cue, k) => {
  args.push('-i', cue.file);
  if (options.list) console.log(`${cue.time.toFixed(3)}  sound ${relative(here, cue.file)} at ${cue.gain} dB`);
  graph.push(`[${labels.length + 1 + k}:a]aresample=48000,volume=${cue.gain}dB,adelay=delays=${Math.round(cue.time * 1000)}:all=1[c${k}]`);
});
const mix = cues.length ? `[voice]${cues.map((_, k) => `[c${k}]`).join('')}amix=inputs=${cues.length + 1}:normalize=0:duration=first,` : '[voice]';
graph.push(`${mix}alimiter=limit=${(10 ** (PEAK_DB / 20)).toFixed(4)}:level=0:latency=1[a]`);

const name = [NAME, options.tag, options.to === undefined ? null : `0-${options.to}`, draft ? 'draft' : null].filter(Boolean).join('-');
const out = resolve(options.out || join(build, `${name}.mp4`));
await mkdir(dirname(out), { recursive: true });
if (existsSync(out)) {
  // A player that has the last cut open keeps ffmpeg from replacing it.
  try { closeSync(openSync(out, 'r+')); }
  catch { throw new Error(`${relative(here, out)} is open in another app. Close it there, or write a new file with --tag <name>.`); }
}
args.push(
  '-filter_complex', graph.join(';'), '-map', '[v]', '-map', '[a]', '-t', (end / FPS).toFixed(4),
  '-c:v', 'libx264', '-preset', draft ? 'veryfast' : 'slow', '-crf', draft ? '23' : '17', '-pix_fmt', 'yuv420p', '-fps_mode', 'cfr', '-r', String(FPS),
  // Spends more bits on flat dark areas, where the graphics' gradients band.
  '-x264-params', 'aq-mode=3',
  '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
  '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out,
);
const started = Date.now();
const ffmpeg = spawn('ffmpeg', args, { stdio: 'inherit', windowsHide: true });
const [code] = await new Promise(done => ffmpeg.on('exit', (...result) => done(result)));
if (code !== 0) throw new Error(`ffmpeg exited with ${code}.`);
const made = measure(['-i', out, '-map', '0:a', '-af', 'ebur128=peak=true']);
const level = made.loudness > -60 && Number.isFinite(made.peak) ? `${made.loudness} LUFS, true peak ${made.peak} dBFS` : 'a silent track';
console.log(`Wrote ${relative(here, out)}: ${(end / FPS).toFixed(2)}s, ${end} frames, ${level}, in ${Math.round((Date.now() - started) / 1000)}s`);
