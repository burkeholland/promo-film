# Writing a scene

A scene is one file, `film/scenes/<name>.mjs`. Its default export is an async function that
builds the page once and returns:

```js
{ pose(t), duration, fast?: [[start, end]], info?: {} }
```

- `pose(t)` sets every node from `t` (seconds) alone. The renderer calls it out of order, from
  six browsers at once, and the preview calls it 60 times a second. So nothing may be remembered
  between calls, and nothing is created or measured inside it: build first, then only set styles
  and text.
- `duration` is the film's length. A film in the edit takes it from its clock; a standalone scene
  (`demo.mjs`) sets its own.
- `fast` lists stretches that move fast enough to need finer motion blur (a whip pan, a pop).
- `info` is printed by `--stills` and `--sheet`. Put cue times and measured boxes there so they
  can be checked without a picture.

Start from `SKILL/examples/said-cues/skeleton.mjs`. It is 70 lines, it runs, and its six numbered
steps are the shape of every scene: cues, build, measure, pointer and keys, camera, pose.

## Space

Everything is CSS px on a 1536 x 864 desktop (`DW`, `DH`), which renders at 1920 x 1080.

- The app window is `WIN` (`{ x: 82, y: 62.5, w: 1372, h: 739 }`); `W` and `H` are its size.
- `rect(node, WIN)` is a node's box in window px. Call it once, after building and before any
  camera move, because it reads the screen.
- The pointer and the camera work in desktop px: add `WIN.x`, `WIN.y`. Scenes define
  `const desk = (x, y) => [WIN.x + x, WIN.y + y]`.

## Time

```js
import { clock } from '../timeline.mjs';
const T = clock('routed');          // the part of the edit that plays this film
T.duration                          // its length
T.said('use')                       // when "use" is said, in film seconds
T.said('set to [auto-routing]')     // the word in brackets; the rest picks which one
T.said('local', 2)                  // the second "local" in this film
T.saidEnd('free for you')           // when the phrase's last word ends
T.said('automations', { to: Infinity })   // a word outside this film's part
T.at(71.13)                         // a time in the recording, by hand
```

`film/edit.mjs` uses the same lookup for cuts: `cut('for instance')` is the frame just before
"For instance" (`{ lead: 2 }` cuts a frame earlier; `frame(n)` is a cut picked by eye).

Rules that keep a scene alive through a re-cut or a new take:

1. Name words. Case, punctuation and spaces don't count, so `'auto routing'` finds "auto-routing,".
2. A phrase said twice is an error until it is unique: add words around it, or pass `nth`.
3. Hang every other time off a cue. A move that ends in a click is `[CLICK - .5, CLICK - .02]`. A
   row that follows a word is `T.said('myriad') + .18`. A bare number like `toSend: [.32, .8]`
   breaks the day the cut moves one frame.
4. A click, a highlight or a row lands 2 to 3 frames (`.06` to `.1` s) ahead of its word, never
   after it.
5. Word times are measured from the sound and are within 0.02 s nine times in ten. About one in
   ten is off by 0.1 to 0.3 s (`node tools/said.mjs 60 75` marks unmeasured ones with `?`). For a
   cue that must be exact, watch it in the preview, where the word being said is highlighted, and
   nudge it: `T.said('copilot') + .3`.

## Motion (`motion.mjs`)

| | |
| --- | --- |
| `clamp(x, lo, hi)`, `lerp(a, b, u)` | the usual |
| `span(t, t0, t1)` | 0 to 1 as t goes from t0 to t1, clamped. The base of every animation: `ease(span(t, start, start + dur))` |
| `out`, `inOut`, `easeIn`, `bezier(x1, y1, x2, y2)` | easings; `out` for things that appear, `inOut` for things that travel |
| `outBack(u)`, `spring(t)`, `wobble(t)` | overshoot. For title cards and icons, not for app UI |
| `track([t, value, ease], ...)` | a keyframed number or array |
| `noise(t, seed)`, `random(seed)` | seeded, so every render matches |

App UI behaves like the app: `popIn(node, t, start, dur)` and `popInOut(node, t, start, end)` in
`app.mjs` are the menu's own fade and grow (200 ms in, 100 ms out).

## Camera (`camera.mjs`)

A shot is `{ x, y, s }`: the desktop point at mid-frame and the zoom.

```js
const camera = makeCamera([[0, wide], [3.8, wide], [7.4, close, glide]]);
film(stage, camera(t));             // in pose
```

- `wide` is the whole desktop. `look(x, y, s)` centers a point; `fit(box, mx, my)` frames a box
  with margins. Both keep the frame inside the window (`inWin`) so no sliver of wallpaper shows;
  pass `keep` instead to allow the desktop.
- Each key's ease shapes the move that arrives at it. The default, `glide`, is the one to use. A
  move that a cut lands in the middle of starts at speed: `u => 1 - (1 - u) ** 2`.
- Zooming goes about the point that stays still on screen, so a push never swings sideways.
- `film()` turns the stage by an invisible fraction of a degree. That is on purpose: without it
  Chrome snaps text to whole pixels and a slow push makes every line of text jump.

The limits (see direction.md): one move a scene, about 1.6x at most, slow (2 to 5 s), and never in
and back out.

## Pointer and keys (`input.mjs`)

```js
const path = makePath(desk(900, 560));          // where the pointer rests at the start
path.reach(target, t0, dur, bend);              // a long move: lands a hair past and settles
path.move(target, t0, dur, bend);               // a short move
path.enter(target, dur, bend, when, hit);       // timed so hit(p) turns true at `when`
path.click(t);
path.check();                                   // throws if moves overlap or a click is mid-move
path.pointer(t)   path.down(t)   path.lastClick(t)

const typed = typing('Write unit tests', t0, t1, { seed: 23 });
typed.text(t)   typed.lastKey(t)
caretOn(t, since)                               // the blink; lit while keys go in
```

- Moves take 0.3 to 1 s and bend a little (`bend` of 8 to 26 px, alternate the sign).
- Hover states come from where the pointer is: `inside([p[0] - WIN.x, p[1] - WIN.y], box)`. Use
  the kit's hit tests for menus (`menuRowAt`, `autoRowAt`, `listRowAt`).
- A typed prompt that continues across a cut uses the same text, seed and span in both scenes.

## Joining scenes

- A cut between two films of the same screen is invisible when the first ends on exactly the
  shot the second starts on. Export the shot from one scene and import it in the other.
- A scene can read another's timing: `clock('offline').duration`.
- After an action lands, hold at least 0.4 s before the cut. A cut right on a click reads as harsh.

## Looking at it

```
node render.mjs --scene routed --sheet              # 12 frames, one picture
node render.mjs --scene routed --sheet --count 20
node render.mjs --scene routed --stills 3.2,3.4     # exact moments (add --sheet to tile them)
```

The first line printed is the scene's `info`. Pictures go to `build/stills/`. Check, in order:
what is in frame at the first and last frame (those are the cuts), that nothing is clipped at the
frame's edge, that the pointer is where the highlight is, and that text is the right text.

## What the errors mean

| Error | Cause and fix |
| --- | --- |
| `No part of the edit plays the film X` | `clock('X')` needs `{ film: 'X', ... }` in `PARTS`. A scene outside the edit sets its own duration and has no clock. |
| `"..." is not said between a and b` | The words changed, or belong to another part. The message lists what is said there. |
| `"..." is said N times` | Add the words around it, or `nth`. |
| `A click at T s happens while the pointer moves` | A fixed time met a cue. Time the move back from the click. |
| `Pointer moves i and j overlap` | The same, between two moves. |
| `The film reported a problem: ...` | An exception or a 404 in the page. A missing icon means it was not passed to `loadAssets([...])`. |
| `has N frames, but the edit needs M` | The edit changed after the film was rendered: `node render.mjs --all`. |
