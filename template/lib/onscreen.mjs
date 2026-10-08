// Captions for a video with no voice: the words the films put on screen with
// buildCaptions (film/graphics.mjs), at the times they show in the finished
// video. render.mjs keeps each film's captions in build/info/<film>.json
// whenever it opens the film; captions.mjs comes here when there is no
// transcript.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MAX = 42;

// Splits text into lines of at most MAX characters, at spaces.
function lines(text) {
  const out = [];
  for (const word of text.split(' ')) {
    const last = out.at(-1);
    if (last !== undefined && `${last} ${word}`.length <= MAX) out[out.length - 1] = `${last} ${word}`;
    else out.push(word);
  }
  return out;
}
// Two lines of about the same length, when one is too long.
function balance(text) {
  if (text.length <= MAX) return [text];
  const words = text.split(' ');
  let best = null;
  for (let k = 1; k < words.length; k++) {
    const top = words.slice(0, k).join(' '), bottom = words.slice(k).join(' ');
    if (top.length > MAX || bottom.length > MAX) continue;
    const cost = Math.abs(top.length - bottom.length);
    if (!best || cost < best.cost) best = { cost, lines: [top, bottom] };
  }
  return best?.lines;
}

export function onScreenCaptions(here, PARTS, LEAD = 0) {
  const shown = [];
  let at = 0;
  for (const [i, part] of PARTS.entries()) {
    const length = (i === 0 ? LEAD : 0) + part.to - part.from;
    if (part.film) {
      const file = join(here, 'build', 'info', `${part.film}.json`);
      if (!existsSync(file)) throw new Error(`There is no transcript, and ${part.film}'s on-screen captions have not been read yet. Run: node render.mjs --all --sheet`);
      for (const { from, to, text } of JSON.parse(readFileSync(file, 'utf8')).captions || []) {
        const start = at + Math.max(0, from), end = at + Math.min(length, to ?? Infinity);
        if (end - start < .1 || !text) continue;
        // A caption that carries on across a cut is one caption.
        const last = shown.at(-1);
        if (last && last.text === text && start - last.end < .2) last.end = end;
        else shown.push({ start, end, text });
      }
    }
    at += length;
  }
  // A caption too long for two lines is split, its time shared by length.
  const captions = [];
  for (const { start, end, text } of shown) {
    const two = balance(text);
    if (two) { captions.push({ start, end, lines: two }); continue; }
    const all = lines(text);
    const groups = [];
    for (let k = 0; k < all.length; k += 2) groups.push(all.slice(k, k + 2));
    const total = text.length;
    let t = start;
    for (const group of groups) {
      const share = (end - start) * group.join(' ').length / total;
      captions.push({ start: t, end: t + share, lines: group });
      t += share;
    }
  }
  return captions;
}
