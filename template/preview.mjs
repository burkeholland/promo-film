// Plays the edit in a browser, live, with the recording's sound: nothing is
// rendered, so a change shows up as soon as the file is saved. This is where
// a cut gets watched and notes get written; render.mjs is only for the files
// that leave the building.
//
//   node preview.mjs                 serves http://127.0.0.1:4747/<name>/
//   node preview.mjs --port 5000     another port for every video's address
//
// <name> is the video's NAME in film/edit.mjs. Under it:
//   /<name>/                the whole edit (film/edit.mjs)
//   /<name>/?scene=demo     one scene, with its part's sound if the edit plays it
//   /<name>/#t=72.4         opens at 72.4 s
//
// Every video being previewed on this computer is a path on the one port, so
// an address names its video and can never show another one. The first
// preview to start opens the port (the front door) and passes each request on
// to the preview it names; later ones ask it for a path. When the one holding
// the door stops, another takes it over within a few seconds and the
// addresses stay the same. http://127.0.0.1:4747/ lists what is running.
// Give a person the address this prints, never one from memory.
//
// In the page: Space plays, the arrows step a frame (Shift: a second),
// [ and ] jump between parts, L loops the part, N writes a note. Notes are
// kept in review/notes.md with the time, the scene and the scene's own time,
// which is what a fix needs.
//
// Export video and Quick draft run deliver.mjs (with --draft for the quick
// one) and Download hands over the newest build/<NAME>*.mp4, so a person can
// get a file without a terminal. One export runs at a time.
import { spawn } from 'node:child_process';
import { createReadStream, existsSync, watch } from 'node:fs';
import { appendFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { createServer, request as httpRequest } from 'node:http';
import { basename, dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { fetchIcon, iconName } from './lib/icons.mjs';

const here = dirname(fileURLToPath(import.meta.url));
// 4747 and not 4173: that one is Vite's preview port, and older copies of
// this file still take it.
const { values: options } = parseArgs({ options: { port: { type: 'string', default: '4747' } } });
const DOOR = Number(options.port);
// How a front door says it is one of these, and not some other server.
const HUB = 'promo-film-preview';
const NOTES = join(here, 'review', 'notes.md');
const BUILD = join(here, 'build');

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
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};
const MOUNTS = [['/film/', join(here, 'film')], ['/media/', join(here, 'assets', 'video')], ['/sounds/', join(here, 'assets', 'sounds')]];

// A file, whole or the range a <video> asks for when it seeks.
async function sendFile(request, response, file) {
  const type = TYPES[extname(file).toLowerCase()];
  let info;
  try { info = type && await stat(file); } catch { info = null; }
  if (!info?.isFile()) { response.writeHead(404).end(); return; }
  const headers = { 'content-type': type, 'cache-control': 'no-store', 'accept-ranges': 'bytes' };
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range || '');
  if (!range) {
    response.writeHead(200, { ...headers, 'content-length': info.size });
    createReadStream(file).pipe(response);
    return;
  }
  const start = range[1] ? Number(range[1]) : Math.max(0, info.size - Number(range[2]));
  const end = range[1] && range[2] ? Math.min(Number(range[2]), info.size - 1) : info.size - 1;
  if (!(start <= end)) { response.writeHead(416, { 'content-range': `bytes */${info.size}` }).end(); return; }
  response.writeHead(206, { ...headers, 'content-range': `bytes ${start}-${end}/${info.size}`, 'content-length': end - start + 1 });
  createReadStream(file, { start, end }).pipe(response);
}

async function body(request) {
  let text = '';
  for await (const chunk of request) {
    text += chunk;
    if (text.length > 20000) throw new Error('Too long');
  }
  return JSON.parse(text);
}

// ------------------------------------------------------------ export
// The video's name is read when asked, so a renamed NAME needs no restart.
async function videoName() {
  const text = await readFile(join(here, 'film', 'edit.mjs'), 'utf8');
  return /export const NAME\s*=\s*['"]([^'"]+)['"]/.exec(text)?.[1] || 'promo';
}

// The newest finished video (or draft) in build/, or null.
async function newestVideo(draft) {
  const name = await videoName();
  const pattern = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(-.+)?\\.mp4$`);
  let best = null;
  for (const file of existsSync(BUILD) ? await readdir(BUILD) : []) {
    if (!pattern.test(file) || file.endsWith('-draft.mp4') !== draft) continue;
    const info = await stat(join(BUILD, file));
    if (!best || info.mtimeMs > best.time) best = { file, time: info.mtimeMs, size: info.size };
  }
  return best;
}

let job = null;
function startExport(draft) {
  const child = spawn(process.execPath, ['deliver.mjs', ...(draft ? ['--draft'] : [])], { cwd: here, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  job = { draft, running: true, ok: null, started: Date.now(), ended: null, lines: [] };
  const mine = job;
  const keep = data => {
    // Progress lines end in \r, so they are lines too.
    mine.lines.push(...String(data).split(/\r?\n|\r/).filter(line => line.trim()));
    if (mine.lines.length > 200) mine.lines.splice(0, mine.lines.length - 200);
  };
  child.stdout.on('data', keep);
  child.stderr.on('data', keep);
  const finish = ok => { if (mine.running) Object.assign(mine, { running: false, ok, ended: Date.now() }); };
  child.on('error', error => { keep(error.message); finish(false); });
  child.on('exit', code => finish(code === 0));
}
async function exportState() {
  const [video, draftVideo] = await Promise.all([newestVideo(false), newestVideo(true)]);
  return {
    running: Boolean(job?.running), draft: job?.draft ?? null, ok: job?.ok ?? null,
    seconds: job ? Math.round(((job.ended ?? Date.now()) - job.started) / 1000) : 0,
    log: job ? job.lines.slice(-40) : [],
    video: video && { file: video.file, size: video.size, time: video.time },
    draftVideo: draftVideo && { file: draftVideo.file, size: draftVideo.size, time: draftVideo.time },
  };
}
const json = (response, value, status = 200) => response.writeHead(status, { 'content-type': TYPES['.json'], 'cache-control': 'no-store' }).end(JSON.stringify(value));
const text = (response, status, words) => response.writeHead(status, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }).end(words);
const goTo = (response, where) => response.writeHead(302, { location: where, 'cache-control': 'no-store' }).end();
// Only this computer's own pages may talk to a preview: a request has to be
// addressed to it by its loopback name, and one that changes something has
// to come from one of its own pages.
const local = value => { try { return ['127.0.0.1', 'localhost'].includes(new URL(value).hostname); } catch { return false; } };
const allowed = request => local(`http://${request.headers.host}`) && (request.method === 'GET' || !request.headers.origin || local(request.headers.origin));

// This video's path: its NAME, in the letters an address can hold.
const slug = (await videoName()).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'promo';

// ------------------------------------------------------------ this video
// The video's own server, on a port of its own. It answers under /<slug>/
// only, so a request meant for another video gets a 404 and not this one.
const listeners = new Set();
const server = createServer(async (request, response) => {
  try {
    if (!allowed(request)) return text(response, 403, 'Previews only answer pages on this computer.');
    const url = new URL(request.url, 'http://localhost');
    const whole = decodeURIComponent(url.pathname);
    if (whole === '/' || whole === `/${slug}`) return goTo(response, `/${slug}/${url.search}`);
    if (!whole.startsWith(`/${slug}/`)) return text(response, 404, `This is the preview of "${slug}". Its address ends in /${slug}/`);
    const path = whole.slice(slug.length + 1);
    if (path === '/') return await sendFile(request, response, join(here, 'lib', 'preview.html'));
    // Which video this is, so an address can be checked before it is given out.
    if (path === '/__whoami') return json(response, { hub: HUB, name: slug, root: here, pid: process.pid });
    if (path === '/events') {
      response.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
      response.write('retry: 1000\n\n');
      listeners.add(response);
      request.on('close', () => listeners.delete(response));
      return;
    }
    if (path === '/scenes') {
      const names = (await readdir(join(here, 'film', 'scenes'))).filter(name => name.endsWith('.mjs')).map(name => name.slice(0, -4)).sort();
      response.writeHead(200, { 'content-type': TYPES['.json'], 'cache-control': 'no-store' }).end(JSON.stringify(names));
      return;
    }
    if (path === '/notes' && request.method === 'GET') {
      const text = existsSync(NOTES) ? await readFile(NOTES, 'utf8') : '';
      response.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }).end(text);
      return;
    }
    if (path === '/notes' && request.method === 'POST') {
      const { line } = await body(request);
      if (typeof line !== 'string' || !line.trim()) { response.writeHead(400).end(); return; }
      await mkdir(dirname(NOTES), { recursive: true });
      if (!existsSync(NOTES)) await writeFile(NOTES, '# Review notes\n\nOne line per note: the time in the cut, the frame, the scene and its own time. Tick a box when its note is done.\n\n');
      await appendFile(NOTES, `- [ ] ${line.replace(/\s+/g, ' ').trim()}\n`);
      response.writeHead(204).end();
      return;
    }
    if (path === '/export' && request.method === 'GET') return json(response, await exportState());
    if (path === '/export' && request.method === 'POST') {
      if (job?.running) return json(response, await exportState(), 409);
      startExport(new URL(request.url, 'http://localhost').searchParams.get('draft') === '1');
      return json(response, await exportState());
    }
    if (path === '/download') {
      const video = await newestVideo(new URL(request.url, 'http://localhost').searchParams.get('draft') === '1');
      if (!video) { response.writeHead(404, { 'content-type': 'text/plain' }).end('There is no video yet. Export one first.'); return; }
      const file = join(BUILD, video.file);
      response.writeHead(200, { 'content-type': TYPES['.mp4'], 'content-length': video.size, 'content-disposition': `attachment; filename="${basename(file)}"`, 'cache-control': 'no-store' });
      createReadStream(file).pipe(response);
      return;
    }
    const mount = MOUNTS.find(([prefix]) => path.startsWith(prefix));
    const file = mount && resolve(mount[1], path.slice(mount[0].length));
    if (!file || !file.startsWith(mount[1] + sep)) { response.writeHead(404).end(); return; }
    // A Lucide icon the kit asks for and does not have yet is downloaded.
    if (!existsSync(file) && iconName(file)) await fetchIcon(iconName(file));
    await sendFile(request, response, file);
  } catch (error) {
    if (!response.headersSent) response.writeHead(500);
    response.end(String(error.message || error));
  }
});

// Saving a file in film/ reloads the page, which comes back where it was.
let pending = null;
watch(join(here, 'film'), { recursive: true }, () => {
  clearTimeout(pending);
  pending = setTimeout(() => { for (const listener of listeners) listener.write('data: reload\n\n'); }, 150);
});

// ------------------------------------------------------------ the front door
// The one port every video's address is on. Whichever preview holds it keeps
// a list of the videos being previewed, by path, and passes each request on
// to the server of the video it names.
const videos = new Map(); // path -> { name, port, root, seen }
const STALE = 6000;
// Gives a video its path: the one it has, the one it had under the last
// door (`want`), or its name, with a number after it when another folder's
// video has that name.
function mount({ name, want, port, root }) {
  for (const [key, video] of videos) {
    if (video.root === root) { Object.assign(video, { name, port, seen: Date.now() }); return key; }
  }
  let key = typeof want === 'string' && /^[a-z0-9_-]+$/.test(want) && !videos.has(want) ? want : name;
  for (let n = 2; videos.has(key); n++) key = `${name}-${n}`;
  videos.set(key, { name, port, root, seen: Date.now() });
  return key;
}
// A preview that stopped asking has stopped.
function prune() {
  for (const [key, video] of videos) if (video.root !== here && Date.now() - video.seen > STALE) videos.delete(key);
}
const escape = value => String(value).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
function listing(response, status, lead) {
  const rows = [...videos].map(([key, video]) => `<li><a href="/${key}/">${escape(key)}</a><small>${escape(video.root)}</small></li>`).join('');
  response.writeHead(status, { 'content-type': TYPES['.html'], 'cache-control': 'no-store' }).end(`<!doctype html><meta charset="utf-8"><title>Previews</title><meta http-equiv="refresh" content="4">
<style>body { margin: 48px; background: #0d1117; color: #e6edf3; font: 15px/1.5 'Segoe UI', system-ui, sans-serif; } a { color: #4493f8; font-size: 20px; font-weight: 600; text-decoration: none; } li { margin: 14px 0; } small { display: block; color: #8b949e; } p { color: #8b949e; }</style>
<h1>Previews</h1><p>${escape(lead)}</p><ul>${rows || '<li>None is running. Start one with: node preview.mjs</li>'}</ul>`);
}
// Passes a request on to a video's own server and its answer back, as it
// comes: a seek's byte range, a long-lived reload stream, a download.
function forward(request, response, key, video, path) {
  const upstream = httpRequest({ host: '127.0.0.1', port: video.port, method: request.method, path, headers: { ...request.headers, host: `127.0.0.1:${video.port}` } }, reply => {
    response.writeHead(reply.statusCode, reply.headers);
    reply.pipe(response);
  });
  upstream.on('error', () => {
    // Its server is gone: the video is no longer being previewed.
    if (video.root !== here) videos.delete(key);
    if (!response.headersSent) text(response, 502, `The preview of "${key}" has stopped. Start it again with: node preview.mjs`);
    else response.destroy();
  });
  response.on('close', () => upstream.destroy());
  request.pipe(upstream);
}
const door = createServer(async (request, response) => {
  try {
    if (!allowed(request)) return text(response, 403, 'Previews only answer pages on this computer.');
    prune();
    const [, first, rest] = /^\/([^/?#]*)(.*)$/.exec(request.url) || [];
    const key = decodeURIComponent(first ?? '');
    if (key === '__previews' && request.method === 'POST') {
      const entry = await body(request);
      const fits = /^[a-z0-9_-]+$/.test(entry.name ?? '') && Number.isInteger(entry.port) && typeof entry.root === 'string';
      return fits ? json(response, { hub: HUB, name: mount(entry) }) : json(response, { hub: HUB, error: 'A preview gives its name, port and root.' }, 400);
    }
    if (key === '__previews') return json(response, { hub: HUB, videos: [...videos].map(([name, video]) => ({ name, port: video.port, root: video.root })) });
    if (!key) return listing(response, 200, 'Every video being previewed on this computer. Each has its own address.');
    const video = videos.get(key);
    if (!video) return listing(response, 404, `No preview called "${key}" is running. These are:`);
    if (!rest || rest[0] !== '/') return goTo(response, `/${key}/${rest}`);
    forward(request, response, key, video, `/${video.name}${rest}`);
  } catch (error) {
    if (!response.headersSent) response.writeHead(500);
    response.end(String(error.message || error));
  }
});

// ------------------------------------------------------------ start
// events.once() rejects its 'listening' promise when 'error' fires, so the
// two are listened for by hand: a busy port is an answer, not a throw.
const listen = (which, port) => new Promise(done => {
  const failed = error => { which.off('listening', ready); done({ error }); };
  const ready = () => { which.off('error', failed); done({ port: which.address().port }); };
  which.once('error', failed);
  which.once('listening', ready);
  which.listen(port, '127.0.0.1');
});
const mine = await listen(server, 0);
if (mine.error) throw mine.error;

let holding = false; // this preview holds the front door
let mounted = slug; // this video's path under the door
let address = null;
let unready = null;
// Asks the front door for a path. Answers { name }, { closed: true } when
// nothing listens on the port, { stranger: true } when something else does,
// or {} when the door did not answer in time.
async function knock() {
  try {
    const reply = await fetch(`http://127.0.0.1:${DOOR}/__previews`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: slug, want: mounted, port: mine.port, root: here }), signal: AbortSignal.timeout(1500),
    });
    const answer = await reply.json().catch(() => null);
    return answer?.hub === HUB && answer.name ? { name: answer.name } : { stranger: true };
  } catch (error) {
    return error.cause?.code === 'ECONNREFUSED' ? { closed: true } : {};
  }
}
// The address is checked before it is said: it has to answer as this folder.
async function announce(url, note) {
  if (url === address) return;
  const who = await fetch(`${url}__whoami`, { signal: AbortSignal.timeout(1500) }).then(reply => reply.json()).catch(() => null);
  if (who?.root !== here) {
    if (unready !== url) console.log(`Not ready: ${url} does not answer as this video yet.`);
    unready = url;
    return;
  }
  address = url;
  console.log(`Preview: ${url}`);
  if (note) console.log(note);
}
// Finds this video's address, and keeps it: asks the door again every
// second or so, and takes the door over when whoever held it has gone.
async function settle() {
  if (holding) { mount({ name: slug, want: mounted, port: mine.port, root: here }); return; }
  const answer = await knock();
  if (answer.closed) {
    const opened = await listen(door, DOOR);
    if (opened.error && opened.error.code !== 'EADDRINUSE') throw opened.error;
    // Another preview got there first: ask it next time.
    if (opened.error) return;
    holding = true;
    answer.name = mount({ name: slug, want: mounted, port: mine.port, root: here });
  }
  if (answer.name) {
    mounted = answer.name;
    await announce(`http://127.0.0.1:${DOOR}/${mounted}/`);
  } else if (answer.stranger) {
    await announce(`http://127.0.0.1:${mine.port}/${slug}/`, `Port ${DOOR} is held by something that is not this preview, so this video is on a port of its own for now.\nStop what is on ${DOOR} (or start every preview with the same --port) and this address moves there by itself.`);
  }
}
for (let tries = 0; !address && tries < 8; tries++) {
  await settle();
  if (!address) await new Promise(done => setTimeout(done, 400));
}
if (!address) console.log(`No address yet: port ${DOOR} is not answering. This keeps trying.`);
console.log('Notes go to review/notes.md. Ctrl+C stops the server.');
setInterval(() => settle().catch(error => console.log(`Preview: ${error.message || error}`)), 1500);
