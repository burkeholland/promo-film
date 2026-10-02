// Writes build/<NAME>.srt, the captions for the finished video. The words and
// their times come from film/words.mjs (`python tools/transcribe.py`) and go
// through the same edit as the picture (film/edit.mjs), so run
// `node captions.mjs` again after changing the edit. Spelling is fixed where
// the words are made, in transcript/fixes.txt.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as edit from './film/edit.mjs';
import { WORDS } from './film/words.mjs';

const { LEAD = 0, NAME = 'promo', PARTS } = edit;
const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, 'build', `${NAME}.srt`);
// Captions are one or two lines of at most 42 characters.
const MAX = 42;
// Names that are never split between lines or captions.
const NAMES = edit.NAMES || [];
if (!WORDS.length) throw new Error('There is no transcript yet. Make one with: python tools/transcribe.py');
// Words that lean on the next one, so a line shouldn't end on them.
const LEANS = new Set(("a an the of to for and or but with in on at by from as into is are be will can " +
  "that this these those my your our all any just such so if where while when which than then there " +
  "you we we're it they're").split(' '));
// Words a line reads well starting with.
const OPENS = new Set('and but or so which where while when because if like such starting powered'.split(' '));

// Only what the edit keeps is captioned.
const kept = time => PARTS.some(part => time >= part.from - 1e-6 && time < part.to);
const words = WORDS.filter(([, start]) => kept(start)).map(([text, at, end]) => ({ text, at, end }));
words.forEach((word, i) => { word.i = i; });

const plain = word => word.text.replace(/[,.;:!?]+$/, '').replace(/'s$/, '').toLowerCase();
const glued = new Set();
for (const name of NAMES) {
  const parts = name.toLowerCase().split(' ');
  for (let i = 0; i + parts.length <= words.length; i++) {
    if (parts.every((part, k) => plain(words[i + k]) === part)) {
      for (let k = 0; k < parts.length - 1; k++) glued.add(i + k);
    }
  }
}
const joined = list => list.map(word => word.text).join(' ');
const ends = word => /[.!?]$/.test(word.text);
const pauses = word => /[,;:]$/.test(word.text);
const leans = word => !/[,.;:!?]$/.test(word.text) && LEANS.has(word.text.toLowerCase());
const opens = word => OPENS.has(word.text.toLowerCase());

// The best way to set a caption on one or two lines, with what it costs to
// read, or null when it doesn't fit. A sentence that ends mid-line costs more.
function layout(list) {
  const midEnds = (from, to) => list.slice(from, to - 1).filter(ends).length * 8;
  const one = joined(list);
  if (one.length <= MAX) return { cost: midEnds(0, list.length), lines: [one] };
  let best = null;
  for (let k = 1; k < list.length; k++) {
    const top = joined(list.slice(0, k)), bottom = joined(list.slice(k));
    const last = list[k - 1];
    if (top.length > MAX || bottom.length > MAX || glued.has(last.i)) continue;
    let cost = Math.abs(top.length - bottom.length) * .2 + midEnds(0, k) + midEnds(k, list.length);
    if (ends(last)) cost -= 6;
    else if (pauses(last)) cost -= 4;
    else if (leans(last)) cost += 10;
    else if (opens(list[k])) cost -= 2;
    if (!best || cost < best.cost) best = { cost, lines: [top, bottom] };
  }
  return best;
}

// What a caption of words[i] up to words[j] costs, or null when it can't be
// one: it breaks a name, runs past 7 seconds or doesn't fit. The cheapest
// captions end on a sentence or a pause, aren't tiny and are easy to read in
// the time they're up.
function cost(i, j) {
  const list = words.slice(i, j);
  const last = list.at(-1), next = words[j];
  const lines = layout(list);
  const seconds = last.end - list[0].at;
  if (!lines || (next && glued.has(last.i)) || seconds > 7) return null;
  let total = 10 + lines.cost;
  for (const [k, word] of list.slice(0, -1).entries()) {
    const gap = list[k + 1].at - word.end;
    if (gap > .3) total += 15 + 40 * gap;
  }
  if (next) {
    if (pauses(last)) total += 4;
    else if (leans(last)) total += 30;
    else if (!ends(last)) total += opens(next) ? 8 : 16;
    if (next.at - last.end > .3) total -= 6;
  }
  const characters = joined(list).length;
  total += Math.max(0, 24 - characters) * 1.2 + Math.max(0, 1.2 - seconds) * 20;
  total += Math.max(0, characters / Math.max(seconds, .5) - 20) * 3;
  return total;
}

const best = [{ cost: 0 }];
for (let j = 1; j <= words.length; j++) {
  for (let i = Math.max(0, j - 30); i < j; i++) {
    const price = best[i] && cost(i, j);
    if (price == null) continue;
    if (!best[j] || best[i].cost + price < best[j].cost) best[j] = { cost: best[i].cost + price, from: i };
  }
}
const captions = [];
for (let j = words.length; j > 0; j = best[j].from) captions.unshift(words.slice(best[j].from, j));

// Seconds in the recording to seconds in the finished video. A time in a
// stretch the edit leaves out moves to where the next part starts.
const starts = [];
let length = LEAD;
for (const part of PARTS) {
  starts.push(length);
  length += part.to - part.from;
}
const finished = t => {
  for (const [i, part] of PARTS.entries()) {
    if (t < part.from) return starts[i];
    if (t < part.to) return starts[i] + t - part.from;
  }
  return length;
};

// Each caption stays up a beat after its last word and for at least a
// second. When the next one comes within half a second they run together,
// three frames apart.
const GAP = 3 / 60;
const times = captions.map(list => ({ start: finished(list[0].at), end: finished(list.at(-1).end) + .2 }));
times.forEach((time, k) => {
  const next = times[k + 1];
  time.end = Math.max(time.end, time.start + 1);
  if (next && next.start - time.end < .5) time.end = next.start - GAP;
  time.end = Math.min(time.end, next ? next.start - GAP : length);
});

const stamp = seconds => {
  const ms = Math.round(seconds * 1000);
  const pad = (n, width = 2) => String(n).padStart(width, '0');
  return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`;
};
const srt = captions.map((list, k) =>
  [k + 1, `${stamp(times[k].start)} --> ${stamp(times[k].end)}`, ...layout(list).lines, ''].join('\r\n'));
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, srt.join('\r\n'));
console.log(`${captions.length} captions in ${OUT}`);
