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
The video opened with the app on Claude Opus 5.5. The scenes here open on the kit's
`DEFAULT_MODEL` (GPT-5.6 Sol), as every new scene does.

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

## `computer-use/`

A finished 55 s promo with no voice: Copilot fills in an expense report in Microsoft Edge. Its
`README.md` says how to copy it into a project.

- `browser.mjs`: Edge and a web form, drawn by hand. Its classes are in `film-additions.css`
  (append it to `film/film.css`).
- `story.mjs`: one task's state and beats shared by four scenes, so the scenes cut together.
- `scenes/title.mjs`, `scenes/end.mjs`: cards written as data with `film/card.mjs`.
- `edit.mjs`: an edit over a silent track, with captions made from the lines on screen.

## `web-frontend-kit/`

A kit for an app whose interface is a web page (Wails, Electron, Tauri) and whose source is at
hand. It does not redraw the app: each state is a frame running the app's own render code and
style sheets. From a 43 s promo for MirrorMe with no voice.

- `build-ui.mjs`: bundles the app's frontend (its render function, its state object, its CSS)
  into `film/ui/` with the Vite that is already in the app's `node_modules`.
- `index.html`: the page each frame loads. It turns the app's animations off, since the film sets
  everything from the time.
- `mirrorme.mjs`: `buildApp(stage).view(state)` puts one state of the app on screen and returns
  `q()` and `box()` for its nodes. Also here: twins of every `:hover`, `:active` and `:focus`
  rule that match a class (the drawn pointer never triggers the real ones), a typed text field
  with a drawn caret, a drawn drop-down list, and a second, native window drawn by hand.
- `settings.mjs`: a scene on that kit. Five views, five clicks.

Three things it had to solve, each of which will come up again:

1. A frame's text goes soft under the camera. Lay the frame out at twice the size (`zoom: 2`
   inside, `scale(.5)` outside) and measure boxes against the page's width.
2. A page that changes in the middle of a frame is blended with the one before it by the motion
   blur, as a one frame ghost. `onFrame(time)` moves the change to between two frames.
3. A pipeline that ends in `Select-Object -First n` stops `render.mjs` before it has written its
   pictures. Collect the output first (`| Out-String`).
