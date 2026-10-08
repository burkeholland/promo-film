// The list of what was made up, from the code itself. Anything a scene or kit
// module draws that did not come from the person's screenshots or words (a
// screen, a site, a number, a name, a flow) carries a comment with the word
// DRAWN in it, where it is defined:
//
//   // Contoso Expenses, a made-up expense site. DRAWN.
//   /* The approval card. DRAWN: the words are made up, in the app's style. */
//
// This collects every one into build/<NAME>-madeup.md, which goes out with
// each delivery (rule 7). It cannot know about a made-up thing nobody tagged,
// so tag as you build, and read the list before sending it.
//
//   node tools/madeup.mjs
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { NAME = 'promo' } = await import('../film/edit.mjs');
const TAG = /\bDRAWN\b/;

const files = folder => readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
  const path = join(folder, entry.name);
  if (entry.isDirectory()) return entry.name === 'assets' ? [] : files(path);
  return /\.(mjs|js|css|html)$/.test(entry.name) ? [path] : [];
});

const comment = line => /^\s*(\/\/|\/\*|\*|<!--)/.test(line);
const clean = line => line.replace(/^\s*(\/\/+|\/\*+|\*+|<!--)\s?/, '').replace(/\s*(\*\/|-->)\s*$/, '').trim();

const found = [];
for (const file of files(join(root, 'film')).sort()) {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  const used = new Set();
  lines.forEach((line, i) => {
    if (!TAG.test(line) || used.has(i)) return;
    let text;
    if (comment(line)) {
      // The paragraph of the comment the tag is in, so the note reads on its
      // own. A blank comment line ends a paragraph.
      const inside = k => comment(lines[k]) && clean(lines[k]) !== '' && !/^-{5,}/.test(clean(lines[k]));
      let from = i, to = i;
      while (from > 0 && inside(from - 1) && !/\*\/\s*$/.test(lines[from - 1]) && !/^DRAWN\b/.test(clean(line))) from--;
      while (to + 1 < lines.length && inside(to + 1) && !/\*\/\s*$/.test(lines[to])) to++;
      for (let k = from; k <= to; k++) used.add(k);
      text = lines.slice(from, to + 1).map(clean).filter(Boolean).join(' ');
    } else {
      // A tag after code on the same line.
      text = clean(line.slice(line.search(/\/\/|\/\*/)));
    }
    found.push({ where: `${relative(root, file).split(sep).join('/')}:${i + 1}`, text });
  });
}

const out = join(root, 'build', `${NAME}-madeup.md`);
const body = [
  `# Made up in ${NAME}`,
  '',
  'Everything here was drawn without a screenshot or the person\'s words behind it. It is collected from the DRAWN comments in film/ (`node tools/madeup.mjs`), so add anything untagged by hand before sending.',
  '',
  ...found.map(({ where, text }) => `- ${text} (${where})`),
  '',
].join('\n');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, body);
console.log(`${found.length} made-up things in ${relative(root, out)}`);
if (!found.length) console.log('Nothing is tagged DRAWN. If anything on screen is made up, tag it where it is defined.');
