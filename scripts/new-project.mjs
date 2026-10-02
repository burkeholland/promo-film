// Starts a new film project from the template beside this script.
//
//   node new-project.mjs <folder> [--name <name>]
//
// <folder> is made if it is missing and must be empty. --name is the finished
// video's file name (build/<name>.mp4); it defaults to the folder's name.
import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({ options: { name: { type: 'string' } }, allowPositionals: true });
if (positionals.length !== 1) {
  console.error('Usage: node new-project.mjs <folder> [--name <name>]');
  process.exit(1);
}
const target = resolve(positionals[0]);
const template = join(dirname(fileURLToPath(import.meta.url)), '..', 'template');
const name = (values.name || basename(target)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'promo';

await mkdir(target, { recursive: true });
if ((await readdir(target)).length) {
  console.error(`${target} is not empty. Pick a new folder so nothing is overwritten.`);
  process.exit(1);
}
await cp(template, target, { recursive: true, filter: source => !/[\\/](build|review|node_modules)([\\/]|$)/.test(source.slice(template.length)) });
for (const folder of ['assets/video', 'assets/screens', 'transcript']) await mkdir(join(target, folder), { recursive: true });
const edit = join(target, 'film', 'edit.mjs');
await writeFile(edit, (await readFile(edit, 'utf8')).replace("export const NAME = 'promo';", `export const NAME = '${name}';`));

console.log(`Made ${target}

Next, from that folder:
  1. Put the recording in assets/video/ and name it as RECORDING in film/edit.mjs.
  2. python tools/transcribe.py      words and their times -> film/words.mjs
  3. node preview.mjs                watch it live at http://127.0.0.1:4173
  4. node render.mjs --scene demo --sheet     look at a scene as one picture
  5. node render.mjs --all --draft && node compose.mjs --draft     a review cut
  6. node render.mjs --all && node compose.mjs                     the final`);
