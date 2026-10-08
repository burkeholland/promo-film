# The UI kit

The kit in `film/` draws the GitHub Copilot desktop app on a Windows 11 desktop, measured from
the real app (within about 1 px of the screenshots). Read the module before drawing anything: the
screen you need is probably here or in `examples/`.

## A different app

Only the kit is about one app. Everything else is the engine and works unchanged:
`motion.mjs`, `camera.mjs`, `input.mjs` (pointer, clicks, typing), `timeline.mjs`, `said.mjs`,
`graphics.mjs` (title cards and charts), `film.js`, and the render, compose, preview, caption
and sound tools.

To make a kit for another app:

1. Keep the DOM helpers and `loadAssets` in `kit.mjs`. Replace its sizes, colors and names with
   the new app's, measured as in "Adding a screen that is not here" below.
2. Write one module per surface in place of `app.mjs` and `session.mjs` (the window and its
   navigation, each page, each menu or dialog). Every builder takes its text as arguments and
   returns the nodes a scene poses. Keep `buildStage`, `buildCursor` and `film(stage, shot)` from
   `app.mjs`: the desktop, the pointer and the camera transform are not about the app.
3. Keep `windows.mjs` if the app is shown on a Windows desktop. For a web app, the "window" is a
   browser frame or the page alone; for a phone app, a device frame on a plain board.
4. Swap `assets/` (icon, wallpaper, fonts, logos) for the new app's.
5. Build the first screen, compare it with its screenshot until it is within 2 px, then build
   the opening ten seconds before any other screen.

The scenes in `examples/` then serve as choreography to copy (how a menu opens, how typing is
paced, where the camera goes), not as screens.

When the app's interface is a web page and its source is at hand, do not redraw it at all: run
its own render code in frames, one per state. `examples/web-frontend-kit/` is that kit.

## What is where

| Module | Draws |
| --- | --- |
| `kit.mjs` | Sizes (`DW`, `DH`, `WIN`, `W`, `H`), the app's colors, **the model list, every model name and `DEFAULT_MODEL`** (the model the app is on), DOM helpers (`h`, `place`, `label`, `value`, `icon`, `logo`, `image`, `rect`, `inside`, `mix`), `loadAssets(icons, pictures)`, `imagesDecoded()` |
| `app.mjs` | The desktop, the window and sidebar, the home page and composer, the model picker (menu, Auto switch and levels, model list, details card), a Windows toast, the arrow and I-beam pointers, popup motion, and `film(stage, shot)` |
| `session.mjs` | The session page: header, composer with stop button, and the timeline (tool rows, model changes, sub agents, user bubbles, streamed markdown replies, the working spinner, auto scroll) |
| `windows.mjs` | The Windows 11 taskbar that slides up, and the quick settings flyout (Wi-Fi, Bluetooth, Airplane mode) |
| `graphics.mjs` | A dark GitHub board for title cards and charts: Mona Sans, grain, glow, SVG helpers, `arrive()` |
| `card.mjs` | Title and end cards from data: `card(name, { blocks })` is the whole scene (see `references/scenes.md`) |
| `film.css` | Every class the builders use |
| `assets/` | Wallpaper, app icon, avatar, provider logos, fonts, and Lucide icons in `icons/`. Name any Lucide icon and it is downloaded the first time it is asked for (or ahead of time: `node tools/icons.mjs NAME ...`). |

## Builders

Each returns the nodes a scene poses. All positions are window px unless it says desktop.

```js
const stage = buildStage();                       // the desktop and wallpaper
const { ui, pops, session, showSession, navHover } =
  buildWindow(stage, { active: 0, session: { project: 'local-auto', name: 'New session' }, projects });
//  ui: the page layer   pops: the layer menus go on   showSession(on): the sidebar's session row
//  showSession(true, false): the session is listed, but the highlight stays on the page the app is on
//  navRect(i): where sidebar row i is

// The model the app is on is kit.mjs's DEFAULT_MODEL (GPT-5.6 Sol) wherever a scene does not
// pass one: buildHome's and buildSession's chip (DEFAULT_CHIP, "GPT-5.6 Sol · Medium"),
// buildMenu's second argument and buildList's third.
const home = buildHome(ui, { chip, project, branch, mode });
//  home.page  home.composer  home.chip  home.send  home.cards
showText(home, text, caretOn, home.send);         // typed text, caret, and the send button's state

const picker = buildMenu(pops);                   // { menu, menuHl, below, levels, toggle }
const { fly, flyHl, rows } = buildList(pops, [[COPILOT, MODELS], [OTHERS, LOCAL]]);
const { card, show } = buildCard(pops);           // show(model) fills the details card
const L = layoutPicker({ chip: home.chip, menu: picker.menu, fly, card, rows });
//  L.chip  L.menu  L.fly  L.rowMid(i)  L.cardX  L.cardTop(i)
setAuto(picker, autoState(t, false, [[clickTime, true]]));   // the Auto switch and its levels
menuRowAt(L, p)  autoRowAt(L, p)  listRowAt(L, p)            // which row the pointer is on (desktop p)
placeMenuHl(picker.menuHl, row)  placeListHl(flyHl, L, row)  // the hover highlight
popIn(node, t, start, .2)   popInOut(node, t, start, end)    // menus open and close like the app's

const S = buildSession(ui, { title, branch, chip, mode });
//  S.page  S.composer.running(on)  S.rename(text)  S.tl
const tl = S.tl;
const item = tl.row({ icon: 'search', text: 'Searched src/**/date*' });   // also: code, took, diff: [86, 0], detail, nest
tl.model(AION, 'Local');            // "Model changed to ... · Local"
tl.agent({ ... });                  // a sub agent; later rows with nest: 1 hang under it
tl.bubble('the prompt');            // the user's message
tl.stream(tl.md('A **reply**'), t0, t1, seed);   // markdown that arrives in bursts
item.at = time;                     // when an item appears. Set it on every item.
tl.work.from = open; tl.work.to = idle;          // the spinner row and its clock
tl.finish(DURATION);                // call once all times are set: works out the scrolling
tl.pose(t);                         // in pose
tl.where(item, t);                  // an item's box on screen, for the camera

const note = buildToast(stage, cursor, { title, body, status, value, progress });
const done = buildToast(stage, cursor, { title, body });   // no progress: the app's own plain notification, body cut at three lines
const T = buildTaskbar(stage);  poseTaskbar(T, { up, hover, down, open, airplane });
const Q = buildQuickSettings(stage);  poseQuickSettings(Q, { open, on: { wifi, airplane }, hover });

// Modes (kit.mjs: INTERACTIVE, PLAN, AUTOPILOT, each with its label, menu line and placeholders)
const built = buildModeMenu(pops);                 // the menu from the mode chip: { menu, hl, rows, w, h }
const M = layoutModeMenu(home.mode, built);        // M.chip  M.menu  M.rowAim(i): a point on row i, off its words
modeRowAt(M, p)  placeModeHl(built.hl, M, row)     // hover, with the pointer in desktop px
showMode(home, AUTOPILOT, 'home');                 // chip name, placeholder and Autopilot's green edge ('session' for S.composer)
paintSend(home.send, AUTOPILOT, { ready, over, down });   // the send button in that mode's color

// Copilot stopping to ask (session.mjs). Interactive mode only: in Autopilot it never asks.
const Q = buildQuestion(S.page, { question, choices });   // the card over the composer: Q.card  Q.boxes  Q.lift  Q.mark(selected, hover)
const asked = tl.ask(question);  asked.answered(on);      // the "Asking user:" row, then "Asked user:"
tl.answer(text);                                          // the "Answer:" row under it
tl.finish(DURATION, { endAt: t => tl.end(t) + Q.lift * shown(t) });   // the thread scrolls clear of the card

// A film with no voice (graphics.mjs)
const caption = buildCaptions([{ from, to, parts: ['lit from the start, ', ['lit at 2.4 s', 2.4]] }]);   // caption(t) in pose
const line = words(card, 'Words that [rise]', { size, weight, accent });  rise(line, t, start, step);     // title cards
```

`film/scenes/demo.mjs` uses most of the picker, session and camera calls in 200 lines. The mode
menu, question card, captions and rising words were built for a 48 s Autopilot promo with no
voiceover: its recording was a silent WAV (`ffmpeg -f lavfi -i anullsrc=r=48000:cl=stereo -t 41.5
assets/video/silence.wav`), its cuts were `frame(n)`, and every word came from the copy it
went out with.

Pages are layers. A scene that goes from the home page to a session builds both and switches
`visibility` in `pose` at the moment the app would. Popups not in use must be hidden.

## Data to set per video

- `kit.mjs`: `DEFAULT_MODEL`, the model the app is on (the chip, the menu's Model and Context
  window rows, the check mark in the list). It is GPT-5.6 Sol. Change it only when the person
  names another model for the video.
- `kit.mjs`: `MODELS` and the model constants (name, logo, context, prices), `LOCAL`, `USER` (the
  name in the sidebar; its picture is `assets/avatar.png`), and any product name. One constant
  per name, so a rename is a one line change.
- `app.mjs`: `NAV` (sidebar items; internal ones are already out), `PROJECTS`, the suggestion
  cards, the placeholder text. The user row shows the avatar in `assets/avatar.png`.
- Chip text, session titles, prompts, tool rows and replies are passed in by each scene.

Everything here that the person did not give you gets a comment with the word `DRAWN` in it where
it is defined, saying what is made up (`// DRAWN: the user's name.`). `node tools/madeup.mjs`
turns those comments into the made-up list. A tag on a kit constant covers every scene that uses
it.

## Which example has which screen

In `SKILL/examples/local-models/scenes/`. Copy the builder functions into a kit module when you
need them; do not import from `examples/`.

| Screen or effect | Scene |
| --- | --- |
| Desktop icon, double click, the window's open animation | `opening.mjs` |
| Model picker: hovering models, the details card | `opening.mjs`, `aion-end.mjs` |
| Picking a model, then typing a prompt | `hydra-pick.mjs` |
| Auto switch on and off, local models appearing in the list | `local.mjs` |
| Send a prompt, session opens, model changes, tool rows | `routed.mjs`, `demo.mjs` |
| Sub agent with nested rows | `explore.mjs` |
| A long plan streaming in, scrolling, a hand-off to another model | `plan-handoff.mjs` |
| Automations page and the New automation dialog (with its own picker) | `automations.mjs` |
| A long-running session; the session info popover with credits | `auto-run.mjs` |
| Taskbar, quick settings, Airplane mode, an offline notice in the app | `offline.mjs` |
| Settings dialog: categories, search filter, a switch | `settings-hydra.mjs` |
| Windows toast with a progress bar; I-beam pointer | `install.mjs` |
| A web page (one tall screenshot) with a camera move | `blog-top.mjs` (its picture is not in the template) |
| An animated chart on the dark board | `graphic-67.mjs` |
| A title card: logo pops in, words rise as they are said, a sheen | `aion-title.mjs` |

In `SKILL/examples/computer-use/` (a silent promo, its own `edit.mjs`):

| Screen or effect | File |
| --- | --- |
| Microsoft Edge (tabs, address bar) with a web form inside, a receipt photo | `browser.mjs` (classes in `film-additions.css`) |
| Typing a request on the home page and sending it | `scenes/ask.mjs` |
| The agent reads files, then an approval card over the composer; the person picks Allow | `scenes/allow.mjs` |
| A form filling itself in, field by field, each step a row in the thread | `scenes/fill.mjs` |
| The agent stops and asks before it submits | `scenes/submit.mjs` |
| One task's state (fields, amounts, tool rows) shared by four scenes | `story.mjs` |
| Title and end cards as data, including a settings switch turning on | `scenes/title.mjs`, `scenes/end.mjs` |

In `SKILL/examples/custom-instructions/` (a 65 s promo over a voiceover, cues that name words):

| Screen or effect | File |
| --- | --- |
| A project's right click menu in the sidebar; any menu of icon rows | `project.mjs` `buildRowMenu` (classes in `film-additions.css`) |
| Settings on a project's page: a page that scrolls, the Instructions field with typing, a paste and its own scroll | `project.mjs` `buildProjectSettings`, `scenes/settings.mjs` |
| The Customize page (Featured tab) and its Add menu | `project.mjs` `buildCustomize`, `scenes/work.mjs` |
| A diagram on the dark board: text that types itself, lines that draw out to cards | `scenes/once.mjs` |

## Adding a screen that is not here

1. Ask for a screenshot at 100% zoom and, if anything moves, a short screen recording. If the
   app's source is at hand, read sizes and colors from it: it is faster and exact.
2. Measure the screenshot with the ui-craft skill (`uicheck.py elements`, `colors`, `bands`). Write
   the numbers down as constants. Do not eyeball.
3. Write a builder in the kit module the screen belongs to (or a new module). It takes its text
   as arguments, places nodes with `place()` and `label()`, and returns the nodes a scene will
   pose. Add its classes to `film.css`.
4. Shoot it (`--stills 0`) at the same state as the screenshot and compare with
   `uicheck.py compare`. Fix the largest difference first. Within 2 px and one shade is done.
5. States the screenshot does not show (hover, pressed, open, disabled) come from the recording
   or the app's source. If you have to invent one, it goes on the made-up list.

A screen that does not exist yet (an unreleased feature) is designed in the app's language from
the nearest real screen, and goes on the made-up list.
