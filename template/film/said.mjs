// Finds when words are said in the recording, so cuts and cues are tied to
// the script and not to numbers. A new take only needs a new transcript
// (`python tools/transcribe.py`): every cue that names its words moves with
// them, and one whose words changed fails with the words that are there now.
//
//   said('automatically use these models')   when "automatically" starts
//   said('set to [auto-routing]')            when "auto-routing" starts; the
//                                            words around it pick which one
//   said('local', { nth: 2 })                the second "local"
//   saidEnd('free for you')                  when "you" ends
//   cut('for instance')                      the frame to cut on so a part
//                                            opens just before "For"
//
// Case, punctuation and spaces don't count: 'auto routing' finds
// "auto-routing," and '67' finds "67%.". A phrase said more than once is an
// error until it has more words, an nth, or a from/to range around it.
import { WORDS } from './words.mjs';

const strip = text => text.toLowerCase().replace(/[^a-z0-9]+/g, '');
// Every word's letters in one string, and the word that starts at each place.
const firstAt = new Map();
const lastAt = new Map();
const owner = [];
let stream = '';
WORDS.forEach(([text], i) => {
  const letters = strip(text);
  if (!letters) return;
  firstAt.set(stream.length, i);
  for (let k = 0; k < letters.length; k++) owner.push(i);
  stream += letters;
  lastAt.set(stream.length, i);
});

const stamp = t => t.toFixed(2);
const heard = (from, to) => {
  const list = WORDS.filter(([, start]) => start >= from && start <= to).map(([text]) => text);
  return list.length > 70 ? `${list.slice(0, 70).join(' ')} ...` : list.join(' ');
};

function find(text, { from = -Infinity, to = Infinity, nth } = {}) {
  if (!WORDS.length) throw new Error('There is no transcript yet. Make one with: python tools/transcribe.py');
  const needle = strip(text);
  if (!needle) throw new Error(`said('${text}') has no words in it`);
  const open = text.indexOf('[');
  const offset = open < 0 ? 0 : strip(text.slice(0, open)).length;
  const found = [];
  for (let at = stream.indexOf(needle); at >= 0; at = stream.indexOf(needle, at + 1)) {
    const first = firstAt.get(at);
    const last = lastAt.get(at + needle.length);
    if (first === undefined || last === undefined) continue;
    const word = firstAt.get(at + offset);
    if (word === undefined) throw new Error(`said('${text}'): the brackets must hold whole words`);
    if (WORDS[word][1] >= from && WORDS[word][1] <= to) found.push({ first, last, word });
  }
  const where = Number.isFinite(from) || Number.isFinite(to) ? ` between ${stamp(Math.max(0, from))} s and ${Number.isFinite(to) ? `${stamp(to)} s` : 'the end'}` : '';
  if (!found.length) {
    const near = Number.isFinite(from) || Number.isFinite(to) ? ` What is said there: "${heard(from, to)}"` : '';
    throw new Error(`"${text}" is not said${where}.${near}`);
  }
  if (nth === undefined && found.length > 1) {
    throw new Error(`"${text}" is said ${found.length} times${where} (at ${found.map(m => stamp(WORDS[m.word][1])).join(', ')} s). Add the words around it, or pass nth.`);
  }
  const match = found[(nth ?? 1) - 1];
  if (!match) throw new Error(`"${text}" is said ${found.length} times${where}, so there is no number ${nth}.`);
  return match;
}

// Seconds in the recording when a word or phrase starts (its first word, or
// the word in [brackets]).
export const said = (text, options) => WORDS[find(text, options).word][1];
// Seconds in the recording when a phrase's last word ends.
export const saidEnd = (text, options) => WORDS[find(text, options).last][2];
// The time of the frame to cut on so a part opens `lead` whole frames before
// a phrase starts. Picture and sound cut together, so this never clips a word.
export const cut = (text, { fps = 30, lead = 1, ...options } = {}) => Math.max(0, Math.floor(said(text, options) * fps + 1e-6) - lead) / fps;
// The words that start in a stretch of the recording, as [text, start, end].
export const wordsBetween = (from, to) => WORDS.filter(([, start]) => start >= from && start < to);
