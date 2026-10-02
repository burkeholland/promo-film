// Plays the edit in a browser, live, with the recording's sound: nothing is
// rendered, so a change shows up as soon as the file is saved. This is where
// a cut gets watched and notes get written; render.mjs is only for the files
// that leave the building.
//
//   node preview.mjs                 serves http://127.0.0.1:4173
//   node preview.mjs --port 5000
//
//   /                the whole edit (film/edit.mjs)
//   /?scene=demo     one scene, with its part's sound if the edit plays it
//   /#t=72.4         opens at 72.4 s
//
// In the page: Space plays, the arrows step a frame (Shift: a second),
// [ and ] jump between parts, L loops the part, N writes a note. Notes are
// kept in review/notes.md with the time, the scene and the scene's own time,
// which is what a fix needs.
import { once } from 'node:events';
import { createReadStream, existsSync, watch } from 'node:fs';
import { appendFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const here = dirname(fileURLToPath(import.meta.url));
const { values: options } = parseArgs({ options: { port: { type: 'string', default: '4173' } } });
const NOTES = join(here, 'review', 'notes.md');

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

const listeners = new Set();
const server = createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (path === '/') return await sendFile(request, response, join(here, 'lib', 'preview.html'));
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
    const mount = MOUNTS.find(([prefix]) => path.startsWith(prefix));
    const file = mount && resolve(mount[1], path.slice(mount[0].length));
    if (!file || !file.startsWith(mount[1] + sep)) { response.writeHead(404).end(); return; }
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

let port = Number(options.port);
for (;;) {
  server.listen(port, '127.0.0.1');
  const [event, error] = await Promise.race([once(server, 'listening').then(() => ['listening']), once(server, 'error').then(([problem]) => ['error', problem])]);
  if (event === 'listening') break;
  if (error.code !== 'EADDRINUSE' || port > Number(options.port) + 20) throw error;
  port++;
}
console.log(`Preview: http://127.0.0.1:${port}`);
console.log('Notes go to review/notes.md. Ctrl+C stops the server.');
