// Looks words up in the transcript (film/words.mjs) from the command line.
//
//   node tools/said.mjs "auto routing"     every time the phrase is said
//   node tools/said.mjs 60 75              the words between two times
import { WORDS } from '../film/words.mjs';

const args = process.argv.slice(2);
if (!WORDS.length) {
  console.error('There is no transcript yet. Make one with: python tools/transcribe.py');
  process.exit(1);
}
const show = ([text, start, , measured]) => `${start.toFixed(2).padStart(7)}${measured ? ' ' : '?'} ${text}`;
if (args.length === 2 && args.every(arg => Number.isFinite(Number(arg)))) {
  const [from, to] = args.map(Number);
  console.log(WORDS.filter(([, start]) => start >= from && start <= to).map(show).join('\n'));
  console.log('\nA ? marks a start that is Whisper\'s guess, not measured from the sound.');
} else if (args.length) {
  const strip = text => text.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const needle = strip(args.join(' '));
  let found = 0;
  for (let i = 0; i < WORDS.length; i++) {
    let letters = '';
    let k = i;
    while (k < WORDS.length && letters.length < needle.length) letters += strip(WORDS[k++][0]);
    if (letters !== needle) continue;
    found++;
    const around = WORDS.slice(Math.max(0, i - 4), k + 4).map(([text], n) => `${Math.max(0, i - 4) + n === i ? '[' : ''}${text}${Math.max(0, i - 4) + n === k - 1 ? ']' : ''}`).join(' ');
    console.log(`${WORDS[i][1].toFixed(2).padStart(7)} s  frame ${String(Math.floor(WORDS[i][1] * 30)).padStart(5)}  ${around}`);
  }
  if (!found) console.log('Not said.');
} else {
  console.log('Usage: node tools/said.mjs "words"   or   node tools/said.mjs <from> <to>');
}
