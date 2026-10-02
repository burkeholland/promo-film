# Examples

Read these and copy from them. They are not projects: to run a scene, copy it into a project's
`film/scenes/` and give it a part in that project's `film/edit.mjs`.

## `said-cues/`

The current way to time a scene: every cue names the words it lands on.

- `skeleton.mjs`: the smallest complete scene, with the six steps numbered. Start here.
- `routed.mjs`: a real scene (a prompt is sent, the session opens, the model changes, tool rows
  arrive), with every time hanging off a word.
- `edit.mjs`: a three part edit cut with `cut('words')`, including a punch-in.
- `vocabulary.txt`, `fixes.txt`: what goes in `transcript/` so names are heard and spelled right.

Both scenes use `clock('routed')` and words from one recording, so they only run as they are
against that recording. In a new project, change the clock's name and the words.

## `local-models/`

A finished video: 2:33, 14 films and 4 camera parts, about GitHub Copilot's local model routing.

- `scenes/`: all 16 scenes. `references/kit.md` lists which screen is in which.
- `edit.mjs`: the full edit, including three places where a stretch of the take is left out
  (a part ends before the next one starts): the pause after a spliced name, twice, and a line
  the speaker dropped.
- `outline.md`: the outline as it grew, the list of things that were made up, and a table of the
  five rounds of notes after the first full cut.
- `audio/voicepatch.py`: replaces a name the speaker said with the same speaker saying the new
  name in an earlier take. `audio/v6audio.py`: lays the sound of the speaker's own cleaned-up
  re-cut back on the take's timeline. Both are scripts with their numbers at the top, written for
  this video's files: copy one, change the constants, and read `references/audio.md` first.

These scenes are timed the old way, with recording times typed in by hand
(`T.words({ use: 69.15 })`). That still works, but do not copy it: a new take meant re-timing
every scene. Copy their builders, shots and choreography, and time them with `T.said()`.

`blog-top.mjs` needs a picture that is not in the template (`assets/blog-top.png`, a tall
screenshot of a web page).
