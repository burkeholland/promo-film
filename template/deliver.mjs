// Everything a delivery needs, in one command, so nothing is forgotten and a
// small model (or a person) can run it and pass on the summary:
//
//   node deliver.mjs              render what changed, compose, storyboard,
//                                 layout checks, captions, the made-up list
//   node deliver.mjs --tag v2     the video as build/<NAME>-v2.mp4
//   node deliver.mjs --draft      a quick review cut only (960 x 540 films)
//
// It stops at the first step that fails, with that step's own message. At the
// end it writes build/<NAME>-delivery.md: the files, the length and loudness,
// every layout warning and the made-up list. Read that before sending.
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import * as edit from './film/edit.mjs';

const { NAME = 'promo', PARTS } = edit;
const here = dirname(fileURLToPath(import.meta.url));
const { values: options } = parseArgs({ options: { draft: { type: 'boolean' }, tag: { type: 'string' } } });
const draft = Boolean(options.draft);

// Runs one step, showing its output as it comes, and returns that output.
function run(label, args) {
  console.log(`\n== ${label}: node ${args.join(' ')}`);
  return new Promise((done, fail) => {
    const child = spawn(process.execPath, args, { cwd: here, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let text = '';
    const echo = stream => data => { text += data; stream.write(data); };
    child.stdout.on('data', echo(process.stdout));
    child.stderr.on('data', echo(process.stderr));
    child.on('error', fail);
    child.on('exit', code => (code === 0 ? done(text) : fail(new Error(`${label} failed (exit ${code}). Its message is above.`))));
  });
}

const started = Date.now();
const tag = options.tag ? ['--tag', options.tag] : [];
await run('Render the films that changed', ['render.mjs', '--all', ...(draft ? ['--draft'] : [])]);
const composed = await run('Compose', ['compose.mjs', ...(draft ? ['--draft'] : tag)]);
if (draft) {
  console.log(`\nDraft ready in ${Math.round((Date.now() - started) / 1000)}s.`);
  process.exit(0);
}
await run('Storyboard and layout checks', ['render.mjs', '--all', '--sheet']);
await run('Captions', ['captions.mjs']);
await run('Made-up list', [join('tools', 'madeup.mjs')]);

// The summary.
const wrote = /Wrote (\S+): (.+)$/m.exec(composed);
const scenes = [...new Set(PARTS.filter(part => part.film).map(part => part.film))];
const warnings = scenes.flatMap(scene => {
  const file = join(here, 'build', 'info', `${scene}.json`);
  if (!existsSync(file)) return [];
  return (JSON.parse(readFileSync(file, 'utf8')).warnings || []).map(text => `${scene}: ${text}`);
});
const madeupFile = join(here, 'build', `${NAME}-madeup.md`);
const madeup = readFileSync(madeupFile, 'utf8').split('\n').filter(line => line.startsWith('- '));
const srt = readdirSync(join(here, 'build')).find(file => file === `${NAME}.srt`);
const summary = [
  `# Delivery: ${NAME}`,
  '',
  `- Video: ${wrote ? `${wrote[1]} (${wrote[2]})` : 'see the compose output'}`,
  `- Captions: ${srt ? `build/${srt}` : 'none'}`,
  '- Storyboard: build/stills/edit-sheet.png (read every cut, row end to next row start)',
  `- Made-up list: ${relative(here, madeupFile)} (${madeup.length} items)`,
  '',
  `## Layout warnings (${warnings.length})`,
  '',
  ...(warnings.length ? warnings.map(text => `- ${text}`) : ['None.']),
  '',
  '## Made up',
  '',
  ...(madeup.length ? madeup : ['Nothing is tagged DRAWN.']),
  '',
].join('\n');
const out = join(here, 'build', `${NAME}-delivery.md`);
writeFileSync(out, summary);
console.log(`\n${summary}\nWritten to ${relative(here, out)} in ${Math.round((Date.now() - started) / 1000)}s.`);
