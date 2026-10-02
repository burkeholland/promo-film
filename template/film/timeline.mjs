// Clocks for the films. Each film plays one part of the edit (edit.mjs), so
// its time starts where that part starts in the recording, plus the silent
// lead for the first part. A clock turns a time in the recording (when a word
// is said) into a time in the film.
import { LEAD, PARTS } from './edit.mjs';
import { said, saidEnd } from './said.mjs';

export const FPS = 30;
// A film opens a frame or two before its first word, and a cue can sit on the
// first word of the next part.
const PAD = .25;

export function clock(film) {
  const index = PARTS.findIndex(part => part.film === film);
  if (index < 0) throw new Error(`No part of the edit plays the film ${film}`);
  const part = PARTS[index];
  const lead = index === 0 ? LEAD : 0;
  const at = time => lead + time - part.from;
  const scope = options => ({ from: part.from - PAD, to: part.to + PAD, ...(typeof options === 'number' ? { nth: options } : options) });
  return {
    part,
    lead,
    duration: lead + part.to - part.from,
    at,
    // When a word or phrase is said during this film, as a time in the film:
    // said('use'), said('set to [auto-routing]'), said('local', 2). Words said
    // outside the film need a range: said('automations', { to: Infinity }).
    said: (text, options) => at(said(text, scope(options))),
    saidEnd: (text, options) => at(saidEnd(text, scope(options))),
    // { word: time in the recording } as times in the film, for times
    // measured by hand.
    words: times => Object.fromEntries(Object.entries(times).map(([word, time]) => [word, at(time)])),
  };
}
