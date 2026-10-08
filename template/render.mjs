// Renders a film (one scene in film/scenes) with the installed Microsoft Edge
// and ffmpeg. Films have no sound: compose.mjs lays them over the recording.
//
// Looking at a scene (seconds, no video is made):
//   node render.mjs --scene local --sheet          12 frames across the film
//                                                  on one labeled sheet
//   node render.mjs --scene local --stills 4,5.5   those moments, as PNG
//   node render.mjs --scene local --stills 4,5.5 --sheet   and on a sheet
//   node render.mjs --all --sheet                  the first, middle and last
//                                                  frame of every film
//
// Rendering:
//   node render.mjs --all --draft          every film that changed, fast and
//                                          small, for a review cut
//   node render.mjs --all                  the same at full quality
//   node render.mjs --scene local          one film, as build/local.mp4
//   node render.mjs --scene demo --clip    a finished clip that plays
//                                          anywhere, as build/clips/demo.mp4
//
// A whole film is skipped when nothing it is made from has changed since it
// was last rendered: its scene file and every file that imports, the assets,
// its part's times in the edit, and the render settings. Each video keeps that
// fingerprint beside it (build/<film>.mp4.json). --check lists the films that
// would render, --force renders anyway, and --stamp records the fingerprint
// for films already rendered, without rendering them.
//
// --draft renders at 960 x 540 with no motion blur and a fast encode, into
// build/draft/. `node compose.mjs --draft` builds a review cut from those.
//
// --clip makes a video to share on its own (H.264, in build/clips/) instead
// of the lossless one compose.mjs wants. With it, --scale <n> draws the
// desktop at n x (2.5 is 3840 x 2160) and --prores writes a ProRes 4444 MOV
// for an editor. ProRes does not play in Windows' own player.
//
// Other options: --count <n> frames on a sheet, --from <s> --to <s> render
// part of a film, --workers <n> sets the number of browsers, --out <file>
// names the video, --crf <n> its quality, --blur <n> how many moments are
// blended into each frame (1 turns off motion blur; stills are always one
// sharp moment), --compare <s> shows the app alone at the reference
// screenshot's size (2000 x 1125).
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { availableParallelism } from 'node:os';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { Worker } from 'node:worker_threads';
import { launchEdge, until } from './lib/edge.mjs';
import { fetchIcon, iconName } from './lib/icons.mjs';
import { LEAD, PARTS } from './film/edit.mjs';
import { FPS } from './film/timeline.mjs';

const here = dirname(fileURLToPath(import.meta.url));

const { values: options } = parseArgs({
  options: {
    scene: { type: 'string', default: 'demo' },
    all: { type: 'boolean' },
    draft: { type: 'boolean' },
    clip: { type: 'boolean' },
    force: { type: 'boolean' },
    check: { type: 'boolean' },
    stamp: { type: 'boolean' },
    stills: { type: 'string' },
    sheet: { type: 'boolean' },
    count: { type: 'string' },
    compare: { type: 'string' },
    from: { type: 'string', default: '0' },
    to: { type: 'string' },
    workers: { type: 'string' },
    out: { type: 'string' },
    crf: { type: 'string' },
    blur: { type: 'string' },
    scale: { type: 'string' },
    prores: { type: 'boolean' },
  },
});

const draft = Boolean(options.draft);
const PRORES = Boolean(options.prores);
const clip = Boolean(options.clip) || PRORES;
if (draft && clip) throw new Error('--draft is for review cuts and --clip for finished clips: pick one.');
if (options.scale && !clip) throw new Error('--scale changes the size of the video, so it goes with --clip or --prores. compose.mjs wants every film at 1920 x 1080.');
const build = join(here, 'build', ...(draft ? ['draft'] : clip ? ['clips'] : []));
const stills = join(here, 'build', 'stills');
// The film is a 1536 x 864 desktop at 125%, which is 1920 x 1080 pixels (a
// draft draws the same desktop at 62.5%, 960 x 540). The reference screenshot
// is a 1280 x 720 desktop at 156.25%.
const FILM = { width: 1536, height: 864, deviceScaleFactor: draft ? 0.625 : Number(options.scale ?? 1.25) };
const EXT = PRORES ? 'mov' : 'mp4';
const COMPARE = { width: 1280, height: 720, deviceScaleFactor: 1.5625 };
const WIDTH = FILM.width * FILM.deviceScaleFactor;
const HEIGHT = FILM.height * FILM.deviceScaleFactor;
// 0 is lossless, which is what compose.mjs wants and what few players play.
const CRF = Number(options.crf ?? (draft ? 20 : clip ? 14 : 0));
const PRESET = draft ? 'veryfast' : 'slow';
// Bump this when a change to how frames are made changes the pictures, so
// every film renders again.
const RENDER_VERSION = 1;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};
const MOUNTS = [['/film/', join(here, 'film')], ['/stills/', stills]];

async function serve() {
  const server = createServer(async (request, response) => {
    let file = null;
    try {
      const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const mount = MOUNTS.find(([prefix]) => path.startsWith(prefix));
      if (mount) {
        const candidate = resolve(mount[1], path.slice(mount[0].length));
        if (candidate.startsWith(mount[1] + sep)) file = candidate;
      }
    } catch { /* A malformed address is simply not found. */ }
    if (!file || !TYPES[extname(file)]) { response.writeHead(404).end(); return; }
    // A Lucide icon the kit asks for and does not have yet is downloaded.
    if (!existsSync(file) && iconName(file)) await fetchIcon(iconName(file));
    try {
      const body = await readFile(file);
      response.writeHead(200, { 'content-type': TYPES[extname(file)], 'cache-control': 'no-store' });
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return server;
}

// The browsers stay open from one film to the next: starting them is most of
// what a short film costs.
const browsers = [];
async function launch() {
  const edge = await launchEdge([`--window-size=${WIDTH},${HEIGHT}`, '--disable-lcd-text']);
  try {
    const page = await edge.newPage();
    const problems = [];
    page.on(({ method, params }) => {
      if (method === 'Runtime.exceptionThrown') problems.push(params.exceptionDetails.exception?.description || params.exceptionDetails.text);
      if (method === 'Runtime.consoleAPICalled' && params.type === 'error') problems.push(params.args.map(arg => arg.value ?? arg.description).join(' '));
      if (method === 'Log.entryAdded' && params.entry.level === 'error') problems.push(`${params.entry.text} ${params.entry.url || ''}`.trim());
    });
    await page.send('Runtime.enable');
    await page.send('Log.enable');
    await page.send('Page.enable');
    const check = () => { if (problems.length) throw new Error(`The film reported a problem:\n${problems.join('\n')}`); };
    const film = { edge, page, problems, check, info: null };
    browsers.push(film);
    return film;
  } catch (error) {
    await edge.close();
    throw error;
  }
}
// Opens a page in a browser and waits until it says it is ready.
async function go(film, url, metrics, ready) {
  film.problems.length = 0;
  await film.page.send('Emulation.setDeviceMetricsOverride', { ...metrics, mobile: false });
  await film.page.send('Page.navigate', { url });
  await until(async () => {
    film.check();
    // The page before this one can still answer while the new one loads.
    return film.page.evaluate(`location.href === ${JSON.stringify(url)} && ${ready}`).catch(() => false);
  }, `load ${url}`, 30000);
}
async function show(film, url, metrics = FILM) {
  await go(film, url, metrics, 'Boolean(window.__film)');
  film.info = await film.page.evaluate('window.__film.ready', 60000);
  film.check();
  return film;
}
// `count` browsers, all showing the same film.
async function openFilms(url, count, metrics = FILM) {
  const missing = Math.max(0, count - browsers.length);
  const opened = await Promise.allSettled(Array.from({ length: missing }, launch));
  const failure = opened.find(result => result.status === 'rejected');
  if (failure) throw failure.reason;
  return Promise.all(browsers.slice(0, count).map(film => show(film, url, metrics)));
}
const closeBrowsers = () => Promise.all(browsers.splice(0).map(film => film.edge.close()));

const SETTLE = 'new Promise(done => requestAnimationFrame(() => requestAnimationFrame(() => done(true))))';
async function capture(film, time) {
  await film.page.evaluate(`window.__film.seek(${time}); ${SETTLE}`);
  film.check();
  const { data } = await film.page.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true });
  return Buffer.from(data, 'base64');
}

// Visit every state once so each image is decoded before the frames that count.
// The same moments are checked for layout problems (film.js), and what the
// film reports about itself goes to build/info/<scene>.json, where
// captions.mjs and deliver.mjs read it.
const linted = new Set();
async function warm(film) {
  const { duration, scene } = film.info;
  const check = !linted.has(scene);
  linted.add(scene);
  const warnings = new Map();
  for (let k = 0; k <= 12; k++) {
    const time = (duration * k) / 12;
    await capture(film, time);
    if (!check) continue;
    for (const text of await film.page.evaluate('window.__film.lint ? window.__film.lint() : []')) {
      if (!warnings.has(text)) warnings.set(text, time);
    }
  }
  await capture(film, 0);
  if (!check) return;
  const list = [...warnings].map(([text, time]) => `at ${time.toFixed(2)}s, ${text}`);
  for (const text of list) console.log(`${scene}: warning: ${text}`);
  await mkdir(join(here, 'build', 'info'), { recursive: true });
  await writeFile(join(here, 'build', 'info', `${scene}.json`), `${JSON.stringify({ ...film.info, warnings: list }, null, 2)}\n`);
}

const stamp = time => `t${time.toFixed(2).padStart(5, '0')}`;
function parseTimes(text, flag) {
  const times = text.split(',').map(Number);
  if (times.some(time => !Number.isFinite(time))) throw new Error(`${flag} takes times in seconds, like 4.3,7.5`);
  return times;
}
// `count` moments spread over a film, from its first frame to its last.
const spread = (duration, count) => Array.from({ length: count }, (_, k) => Math.round((duration - 1 / FPS) * k / Math.max(1, count - 1) * 100) / 100);

// Stills of one film. `pick` turns the film's length into the times to take.
async function renderStills(url, pick, metrics, folder, prefix, quiet = false) {
  await mkdir(folder, { recursive: true });
  const [film] = await openFilms(url, 1, metrics);
  if (!quiet) {
    const { captions, ...info } = film.info;
    console.log(JSON.stringify(info));
  }
  await warm(film);
  const shots = [];
  for (const time of pick(film.info.duration)) {
    const file = join(folder, `${prefix}${stamp(time)}.png`);
    await writeFile(file, await capture(film, time));
    if (!quiet) console.log(relative(here, file));
    shots.push({ file, time });
  }
  return shots;
}

// Tiles stills (files in build/stills) into one labeled picture, drawn by the
// browser that took them.
async function renderSheet(server, tiles, out, columns = 3, tile = 640) {
  const gap = 4;
  const html = `<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>
body { margin: 0; background: #282828; display: grid; grid-template-columns: repeat(${columns}, ${tile}px); gap: ${gap}px; width: max-content; }
figure { margin: 0; position: relative; }
img { display: block; width: ${tile}px; height: auto; }
figcaption { position: absolute; left: 0; top: 0; padding: 0 8px; background: #000; color: #ff0; font: 15px/24px 'Segoe UI', sans-serif; }
</style>${tiles.map(({ file, label }) => `<figure><img src="${encodeURI(relative(stills, file).split(sep).join('/'))}"><figcaption>${label}</figcaption></figure>`).join('')}`;
  const page = join(stills, '_sheet.html');
  await writeFile(page, html);
  try {
    const [film] = browsers;
    const width = columns * tile + (columns - 1) * gap;
    const url = `http://127.0.0.1:${server.address().port}/stills/_sheet.html`;
    await go(film, url, { width, height: 600, deviceScaleFactor: 1 }, "document.readyState === 'complete'");
    const height = await film.page.evaluate('Promise.all([...document.images].map(image => image.decode())).then(() => document.body.getBoundingClientRect().height)');
    film.check();
    const { data } = await film.page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width, height, scale: 1 } });
    await writeFile(out, Buffer.from(data, 'base64'));
    console.log(`Sheet: ${relative(here, out)} (${tiles.length} frames, ${width} x ${Math.round(height)})`);
  } finally {
    await rm(page, { force: true });
  }
}

// Motion blur: every frame blends several moments spread across half a frame,
// like a film camera with a 180 degree shutter. The scene's fast moves get
// four times as many, so a whip pan smears instead of stuttering.
const SAMPLES = Math.max(1, Math.round(Number(options.blur ?? (draft ? 1 : 4))) || 1);
const SHUTTER = 0.5;
const samplesFor = (info, frame) => {
  const time = frame / FPS;
  return SAMPLES > 1 && info.fast.some(([start, end]) => time >= start && time < end) ? SAMPLES * 4 : SAMPLES;
};
const sampleTime = (info, frame, k, count) => Math.min(info.duration, Math.max(0, (frame + ((k + 0.5) / count - 0.5) * SHUTTER) / FPS));

async function captureSamples(film, frame) {
  const count = samplesFor(film.info, frame);
  const at = k => sampleTime(film.info, frame, k, count);
  const shots = [await capture(film, at(0))];
  if (count === 1) return shots;
  const final = await capture(film, at(count - 1));
  // Nothing moved during the shutter, so one picture will do.
  if (final.equals(shots[0])) return shots;
  for (let k = 1; k < count - 1; k++) shots.push(await capture(film, at(k)));
  shots.push(final);
  return shots;
}

// Worker threads decode and average the screenshots so the browsers never wait.
function startBlenders(size) {
  const url = new URL('./lib/blend.mjs', import.meta.url);
  const pending = new Map();
  const queue = [];
  const idle = [];
  let next = 0;
  let broken = null;
  const pump = () => {
    while (idle.length && queue.length) {
      const worker = idle.pop();
      const job = queue.shift();
      worker.postMessage({ id: job.id, shots: job.shots });
    }
  };
  const workers = Array.from({ length: size }, () => {
    const worker = new Worker(url);
    worker.on('message', ({ id, rgb, error }) => {
      const job = pending.get(id);
      pending.delete(id);
      idle.push(worker);
      pump();
      if (error) job.reject(new Error(error));
      else job.resolve(Buffer.from(rgb.buffer, rgb.byteOffset, rgb.byteLength));
    });
    worker.on('error', error => {
      broken = error;
      for (const job of pending.values()) job.reject(error);
      pending.clear();
    });
    idle.push(worker);
    return worker;
  });
  return {
    blend(shots) {
      if (broken) return Promise.reject(broken);
      return new Promise((resolveJob, reject) => {
        const id = next++;
        pending.set(id, { resolve: resolveJob, reject });
        queue.push({ id, shots });
        pump();
      });
    },
    close: () => Promise.all(workers.map(worker => worker.terminate())),
  };
}

function startEncoder(out) {
  const args = ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${WIDTH}x${HEIGHT}`, '-framerate', String(FPS), '-i', '-'];
  const format = PRORES ? 'yuv444p10le' : 'yuv420p';
  args.push(
    '-vf', `scale=out_color_matrix=bt709:out_range=tv,format=${format},setparams=colorspace=bt709:color_primaries=bt709:color_trc=bt709:range=tv`,
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    ...(PRORES
      ? ['-c:v', 'prores_ks', '-profile:v', '4', '-vendor', 'apl0', '-pix_fmt', format]
      : ['-c:v', 'libx264', '-preset', PRESET, '-crf', String(CRF)]),
    '-movflags', '+faststart', out,
  );
  const ffmpeg = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'pipe'], windowsHide: true });
  let log = '';
  ffmpeg.stderr.on('data', data => { log = (log + data).slice(-4000); });
  const failed = new Promise((_, reject) => {
    ffmpeg.on('error', error => reject(new Error(`Could not start ffmpeg: ${error.message}`)));
    ffmpeg.stdin.on('error', error => reject(new Error(`ffmpeg stopped reading frames (${error.code}).\n${log}`)));
    ffmpeg.on('close', (code, signal) => {
      if (!ffmpeg.stdin.writableEnded) reject(new Error(`ffmpeg exited (${code ?? signal}) before the last frame.\n${log}`));
    });
  });
  failed.catch(() => {});
  const finished = new Promise((resolveExit, reject) => {
    ffmpeg.on('exit', code => (code === 0 ? resolveExit() : reject(new Error(`ffmpeg exited with ${code}.\n${log}`))));
  });
  finished.catch(() => {});
  return { ffmpeg, failed, finished };
}

// What a film is made from, as one hash: the scene and every file it imports
// (followed from the page itself), the assets, the times of each part of the
// edit the scene asks a clock for, and the settings that change the pictures.
const filmRoot = join(here, 'film');
const IMPORTS = /(?:\bfrom\s*|\bimport\s*\(?\s*|\b(?:src|href)=)["'`](\.{1,2}\/[^"'`$]+|[\w-]+\.(?:mjs|js|css))["'`]/g;
const CLOCKS = /\bclock\(\s*["'`]([a-z0-9-]+)["'`]\s*\)/g;

async function listFiles(folder) {
  const entries = await readdir(folder, { withFileTypes: true });
  const files = await Promise.all(entries.map(entry => {
    const path = join(folder, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  }));
  return files.flat().sort();
}

async function fingerprint(scene) {
  const hash = createHash('sha256');
  const add = (label, data) => hash.update(`${label}\0`).update(data).update('\0');
  const seen = new Set();
  const clocks = new Set();
  const visit = async file => {
    if (seen.has(file) || file === join(filmRoot, 'edit.mjs')) return;
    seen.add(file);
    const body = await readFile(file);
    add(relative(here, file), body);
    const text = body.toString('utf8');
    for (const [, name] of text.matchAll(CLOCKS)) clocks.add(name);
    for (const [, path] of text.matchAll(IMPORTS)) {
      const target = resolve(dirname(file), path);
      if (target.startsWith(filmRoot + sep) && existsSync(target)) await visit(target);
    }
  };
  for (const start of ['index.html', 'film.js', join('scenes', `${scene}.mjs`)]) await visit(join(filmRoot, start));
  for (const file of await listFiles(join(filmRoot, 'assets'))) add(relative(here, file), await readFile(file));
  for (const name of [...clocks].sort()) {
    const index = PARTS.findIndex(part => part.film === name);
    const part = PARTS[index] || {};
    add(`clock ${name}`, JSON.stringify({ from: part.from, to: part.to, lead: index === 0 ? LEAD : 0 }));
  }
  add('settings', JSON.stringify({ version: RENDER_VERSION, FILM, CRF, PRESET, SAMPLES, SHUTTER, FPS, ...(PRORES ? { PRORES } : {}) }));
  return hash.digest('hex').slice(0, 16);
}

const stampFile = out => `${out}.json`;
async function isFresh(out, key) {
  if (!existsSync(out) || !existsSync(stampFile(out))) return false;
  try {
    return JSON.parse(await readFile(stampFile(out), 'utf8')).key === key;
  } catch {
    return false;
  }
}
const writeStamp = (out, scene, key) => writeFile(stampFile(out), `${JSON.stringify({ scene, key, at: new Date().toISOString() }, null, 2)}\n`);

async function renderVideo(url, scene, whole) {
  const opening = Date.now();
  const [lead] = await openFilms(url, 1);
  const { duration } = lead.info;
  const from = whole ? 0 : Number(options.from);
  const to = whole || options.to === undefined ? duration : Number(options.to);
  const first = Math.round(from * FPS);
  const last = Math.round(Math.min(to, duration) * FPS);
  if (!(last > first)) throw new Error('Nothing to render: --to must be later than --from.');
  const out = resolve(options.out && !options.all ? options.out : join(build, first === 0 && last === Math.round(duration * FPS) ? `${scene}.${EXT}` : `${scene}-${from}-${to}.${EXT}`));
  await mkdir(dirname(out), { recursive: true });

  const count = Math.min(Number(options.workers) || Math.min(6, Math.max(1, availableParallelism() - 2)), last - first);
  const { ffmpeg, failed, finished } = startEncoder(out);
  const blenders = startBlenders(count);
  try {
    const films = await openFilms(url, count);
    await Promise.all(films.map(warm));
    console.log(`${scene}: ${films.length} browsers ready in ${((Date.now() - opening) / 1000).toFixed(1)}s`);

    // Browsers finish frames out of order. Frames wait here until they can be
    // written in order, and no browser runs too far ahead of the encoder.
    const done = new Map();
    const waiting = new Set();
    const wait = () => new Promise(wake => waiting.add(wake));
    const wake = () => { for (const resume of waiting) resume(); waiting.clear(); };
    const ahead = films.length * 3;
    let handed = first;
    let written = first;
    const started = Date.now();
    let fail;
    const blendFailed = new Promise((_, reject) => { fail = reject; });

    const work = async film => {
      for (;;) {
        while (handed - written >= ahead) await wait();
        if (handed >= last) return;
        const index = handed++;
        const shots = await captureSamples(film, index);
        blenders.blend(shots).then(frame => { done.set(index, frame); wake(); }, fail);
      }
    };
    const write = async () => {
      let reported = Date.now();
      while (written < last) {
        if (!done.has(written)) { await wait(); continue; }
        const frame = done.get(written);
        done.delete(written);
        written++;
        wake();
        if (!ffmpeg.stdin.write(frame)) await Promise.race([once(ffmpeg.stdin, 'drain'), failed]);
        if (Date.now() - reported > 10000) {
          reported = Date.now();
          const rate = (written - first) / ((Date.now() - started) / 1000);
          console.log(`${scene}: frame ${written - first}/${last - first}  ${rate.toFixed(1)} fps  about ${Math.ceil((last - written) / rate)}s left`);
        }
      }
      ffmpeg.stdin.end();
    };
    await Promise.race([Promise.all([...films.map(work), write()]), failed, blendFailed]);
    await Promise.race([finished, failed]);
    return out;
  } catch (error) {
    ffmpeg.kill();
    throw error;
  } finally {
    await blenders.close();
  }
}

// A whole film, unless it is already up to date. Parts (--from, --to, --out)
// always render and are never fingerprinted.
async function renderFilm(server, scene) {
  const url = `http://127.0.0.1:${server.address().port}/film/index.html?scene=${scene}`;
  const part = !options.all && (options.out || Number(options.from) !== 0 || options.to !== undefined);
  if (part) {
    console.log(`Wrote ${relative(here, await renderVideo(url, scene, false))}`);
    return;
  }
  const out = join(build, `${scene}.${EXT}`);
  const key = await fingerprint(scene);
  if (options.stamp) {
    if (!existsSync(out)) throw new Error(`${relative(here, out)} is missing, so there is nothing to stamp.`);
    await writeStamp(out, scene, key);
    console.log(`${scene}: stamped ${key}`);
    return;
  }
  if (!options.force && await isFresh(out, key)) {
    console.log(`${scene}: up to date`);
    return;
  }
  if (options.check) {
    console.log(`${scene}: changed, would render`);
    return;
  }
  const started = Date.now();
  await renderVideo(url, scene, true);
  await writeStamp(out, scene, key);
  console.log(`${scene}: wrote ${relative(here, out)} in ${Math.round((Date.now() - started) / 1000)}s`);
}

const scenes = options.all ? [...new Set(PARTS.filter(part => part.film).map(part => part.film))] : [options.scene];
for (const scene of scenes) {
  if (!/^[a-z0-9-]+$/.test(scene)) throw new Error(`--scene takes a scene name, like demo`);
  if (!existsSync(join(filmRoot, 'scenes', `${scene}.mjs`))) throw new Error(`There is no film/scenes/${scene}.mjs`);
}
if (options.all && !scenes.length) throw new Error('The edit (film/edit.mjs) has no film parts yet. Use --scene <name> for one scene.');
if (options.all && (options.compare || (options.stills && !options.sheet))) throw new Error('--all renders whole films or, with --sheet, a storyboard of them; use --scene with --stills or --compare.');
const server = await serve();
const address = scene => `http://127.0.0.1:${server.address().port}/film/index.html?scene=${scene}`;
const started = Date.now();
try {
  if (options.compare) {
    await renderStills(`${address(scenes[0])}&desktop=1280`, () => parseTimes(options.compare, '--compare'), COMPARE, stills, `compare-${scenes[0]}-`);
  } else if (options.sheet && options.all) {
    // A storyboard of the edit: each film's first, middle and last frame on
    // one row, so every cut can be read from the end of a row to the start
    // of the next.
    const tiles = [];
    for (const scene of scenes) {
      const shots = await renderStills(address(scene), duration => spread(duration, 3), FILM, stills, `${scene}-`, true);
      tiles.push(...shots.map(({ file, time }) => ({ file, label: `${scene} ${time.toFixed(2)}` })));
    }
    await renderSheet(server, tiles, join(stills, 'edit-sheet.png'));
  } else if (options.sheet || options.stills) {
    const pick = options.stills ? () => parseTimes(options.stills, '--stills') : duration => spread(duration, Number(options.count) || 12);
    const shots = await renderStills(address(scenes[0]), pick, FILM, stills, `${scenes[0]}-`);
    if (options.sheet) await renderSheet(server, shots.map(({ file, time }) => ({ file, label: time.toFixed(2) })), join(stills, `${scenes[0]}-sheet.png`));
  } else {
    for (const scene of scenes) await renderFilm(server, scene);
    if (options.all && !options.check && !options.stamp) console.log(`Done in ${Math.round((Date.now() - started) / 1000)}s`);
  }
} finally {
  await closeBrowsers();
  server.close();
  server.closeAllConnections();
}
