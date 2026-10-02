---
name: promo-film
description: >-
  Make a realistic app promo, demo or announcement video from a talk track and screenshots. The app
  is rebuilt in HTML so every label, name and state can change, animated like a real screen
  recording (pointer, typing, menus, slow camera), synced to the spoken words and cut against a
  talking head. Use when the user asks for a "promo video", "social video", "product demo video",
  "announcement video", "motion design video", "animated screen recording", a video "from a talk
  track / voiceover / audio file and screenshots", a clip or GIF of an app feature, or follows up
  with "new audio", "re-cut", "they renamed it", "update the video", "say the new name in my
  voice", "that pause is too long", "a word is cut off", "clean up the audio". Works for any app
  with screenshots to measure. Ships a live preview with review notes, 20 second draft cuts, cues
  that follow the words through a new take, tools to see sound without hearing it, and one ready
  UI kit as the worked example (the GitHub Copilot app on a Windows 11 desktop).
---

# Promo film

## Goal

A video that looks like a clean screen recording of the real app, in time with the voice, that the
person can review within minutes of asking and that can change in minutes when the script, a name
or the audio changes. Speed of each review round matters more than polish on any one round.

## How it works

- **Scenes are code.** A scene (`film/scenes/<name>.mjs`) builds the app from a UI kit and returns
  `pose(t)`: what the screen looks like at second `t`. Nothing is recorded, so any text can change.
- **The edit is a list.** `film/edit.mjs` lists the parts of the finished video: `camera` parts show
  the talking head, `film` parts show a scene over the same sound. The recording's sound is the
  master track, so picture and voice cut together.
- **Cues name words.** `cut('for instance')` and `T.said('set to [auto-routing]')` look the time up
  in the transcript. A new take needs a new transcript, not new numbers.
- **Three ways to look**, cheapest first: a contact sheet (seconds), the live preview (instant, with
  sound), a draft cut (about as long as the video itself). The full render is only for delivery.
- **An engine and a kit.** The engine (motion, camera, pointer and typing, timeline, word cues,
  render, compose, preview) knows nothing about any app. The kit is one app's screens as
  builders. The kit that ships draws the GitHub Copilot app on Windows 11; another app needs its
  own kit, measured from its screenshots ([references/kit.md](references/kit.md)).
- **Sound is checked by sight.** The agent cannot hear, so it reads where sound starts and stops
  and looks at the waveform and spectrogram (`tools/wave.py`) before it touches the voice.

## Using this skill (for the person asking)

**Hand over**, in one message if you can:

1. The recording: a talking head video, or just the voiceover's sound. Its sound is used as is.
2. Screenshots of every screen you talk about, at 100% zoom, plus one short screen recording of
   anything that moves (menus, hovers). The recording is where hover colors and timings come from.
3. Anything that must be different from the screenshots: names, model lists, things to hide.

**Say** what you want in plain words. These all work:

- "Make a promo video from this talk track and these screenshots. Start with the first 10 seconds."
- "Here's new audio. Update the video."
- "They renamed X to Y. Fix it everywhere."
- "Give me a 4K clip of just the part where the local model runs." (or "as a GIF")
- "Too much zoom in the automations part, and the cut at 1:12 is harsh."

**Review** in the live preview (the agent gives you a link). Space plays, the arrow keys step a
frame, and **N writes a note at the frame you are on**. Notes are saved with the exact time and
scene, so "this is too fast" is enough. Or just say the time: "at 0:42 ...".

**You get** `build/<name>.mp4` (1920 x 1080, 30 fps, H.264, sound at -14 LUFS), `build/<name>.srt`
captions, and a list of everything that was made up, so nothing false ships by accident.

**The model.** Use the most capable model you have, one that can look at pictures. The work is
long (hundreds of steps), it reads screenshots, stills and spectrograms, and small misjudgments
(a cue 0.2 s off, a cut inside a word) are what a person notices. It was built in the GitHub Copilot app on Anthropic's
top Claude models (Claude Opus 5.5 and a newer preview model). Smaller or text-only models have
not been tried and should not be expected to hold up.

**Listen yourself.** The agent cannot hear. It checks sound by transcript and waveform and tells
you which moments to listen to. Do listen to those.

## Rules

Each of these cost a round of review, or a day, the first time.

1. **Reuse before rebuilding.** The kit in `film/` already draws the Copilot app's window, home
   page, model picker, session view, toast and a Windows taskbar, and `examples/` has dialogs,
   settings, charts and title cards. Read [references/kit.md](references/kit.md) before drawing
   anything. A new screen goes into a kit module as a builder, never inside one scene.
2. **Look the cheap way.** Sheet, then preview, then draft, then final. Never render full quality
   to check something. Never send the person a file when a preview link will do.
3. **Cues name words, and everything else hangs off a cue.** No recording times in scenes. A move
   that leads to a click is timed back from the click (`[SEND - .5, SEND - .02]`), not from the
   start of the scene, so a cut that moves a frame breaks nothing.
4. **Animate the app, not the camera.** At most one camera move per scene, never above about 1.6x,
   never in and back out. If a scene is a still with a zoom on it, it is not done: something in
   the app should be moving (typing, a menu, rows arriving, a spinner).
5. **Names are data.** A product or model name lives in one constant in `film/kit.mjs`. Internal
   or unreleased things in the screenshots (staff labels, internal nav items) come out at the kit.
6. **Ten seconds first.** Build the opening ten seconds, show it, and only then build the rest.
   The first look decides whether the direction is right.
7. **Say what you made up.** Every screen, number, name or flow that did not come from the person
   goes in a list with each delivery.
8. **Deliver files that play.** H.264 MP4. ProRes only when asked, for an editor: Windows' own
   player cannot open it.
9. **Look at sound before cutting it.** Never cut the voice at "the quietest point". A gap inside
   a word is a consonant, and quiet low endings (M, N, NG, L) belong to the word. Read the runs
   and the spectrogram (`python tools/wave.py`), keep whole words, and report the pauses in
   seconds. [references/audio.md](references/audio.md) before any change to the voice.
10. **Take time out in the edit, never by moving sound.** A pause that is too long or a dropped
   line is a part that ends early and a next part that starts later. Cues are times in the
   recording, so nothing after it moves.
11. **Cleaned-up sound gets one gain and no limiter**, and a cleanup tool never runs on a finished
   cut. compose prints the setting.
12. **When the script drops a claim, the screen drops it too.** Search every scene's on-screen
   text for the same promise, remove it, and say so.
13. **Answer before working.** A note from the person gets a one line reply saying what you will
   do, then the work. Each delivery says what changed, what you decided on your own, and what
   you could not check.

## Workflow

`SKILL` below is the folder this file is in. Commands run from the project folder.

### 0. Start

```
node SKILL/scripts/new-project.mjs <folder> --name <video-name>
```

Copies the whole toolkit (`SKILL/template`) so the project stands alone. Needs Node 22+,
Microsoft Edge, ffmpeg, and Python with `pip install faster-whisper numpy matplotlib` (the
transcript and the sound tools).

### 1. Take in the material (one round of questions, not five)

1. Put the recording in `assets/video/`, name it as `RECORDING` in `film/edit.mjs`.
2. Put product names in `transcript/vocabulary.txt`, then `python tools/transcribe.py`. Read
   `transcript/<name>.txt`. Fix what Whisper misheard in `transcript/fixes.txt` and run it again
   (seconds: the listening is cached).
3. View every screenshot. List each screen the script talks about and mark it: in the kit, in
   `examples/`, or new.
4. Ask for everything missing **in one message**: screenshots of new screens and states, a screen
   recording of anything animated, the exact names to show, what to hide. Use the ask_user tool
   for real decisions (tone, length, format); do not ask what a default answers.

### 2. Outline

Write `outline.md` (the template has the shape): one row per beat with the words, what is on
screen, and whether it exists. Mark camera parts where the speaker looks into the lens and film
parts where they describe the product. Get a yes on the outline before building. See
[references/direction.md](references/direction.md) for pacing, cuts and camera.

### 3. Edit

Fill `PARTS` in `film/edit.mjs` using `cut('words')`. `node tools/said.mjs "words"` finds a
phrase, `node tools/said.mjs 60 75` lists the words in a stretch. A film that is not built yet can
be a copy of `demo.mjs` so the edit plays end to end from the first hour.

### 4. Build scenes (the inner loop)

Start `node preview.mjs` once, keep it running, and give the person the link. It reloads when a
file is saved. For each scene:

1. Copy the closest scene (`film/scenes/demo.mjs`, `SKILL/examples/said-cues/routed.mjs`, or one in
   `SKILL/examples/local-models/scenes/`) and change it. [references/scenes.md](references/scenes.md)
   has the contract, the APIs and a skeleton.
2. `node render.mjs --scene <name> --sheet` and view `build/stills/<name>-sheet.png`: 12 frames on
   one picture in about 10 seconds. Add `--stills 3.2,3.4,3.6` to look at exact moments.
3. Fix and repeat. The sheet shows framing and state; it cannot show motion, so judge easing and
   timing by the numbers in the scene's `info` and leave the feel to the person in the preview.

A scene that throws ("A click happens while the pointer moves", "is said 2 times") is telling
you which rule above it broke. Fix the cause, do not pad the time.

### 5. Review with the person

1. Send the preview link (add `#t=72.4` to open at a moment, `?scene=<name>` for one scene).
2. Read `review/notes.md`. Each note has the time in the cut, the frame, the scene and the scene's
   own time, for example `1:12.40 (frame 2172) automations @ 3.25s: cut is harsh`.
3. Fix, tick the box (`- [x]`), answer in a sentence per note. If a note is vague, translate it
   with the table in [references/direction.md](references/direction.md) before guessing.

When they want a file instead: `npm run draft` (`render --all --draft`, then `compose --draft`)
makes `build/<name>-draft.mp4`. Only changed films render again.

### 6. Deliver

```
node render.mjs --all        # full quality, only what changed
node compose.mjs             # build/<name>.mp4, loudness printed
node captions.mjs            # build/<name>.srt
node render.mjs --all --sheet   # one row per film: read every cut from row end to next row start
```

Check before sending: the frame count and loudness compose prints (about -14 LUFS, peak under
-1 dBFS), the storyboard sheet for every cut, and one still of anything that changed late. Then
send the path, the length, and the made-up list. If the last cut is open in a player, compose
says so: use `--tag v2`.

### 7. Changes after delivery

| They say | Do |
| --- | --- |
| "New audio" / a new take | Replace the recording, `python tools/transcribe.py`, open the preview. Cues and cuts that name words have moved already. Each one that fails names the words that changed. Then draft, then final. |
| "They renamed X" | Change the constant in `film/kit.mjs`, grep for the old name in scenes (title cards and toasts may spell it out), `render --all`, compose. Check one still of the picker, the chat and each title card. |
| "A clip of just this part" | `node render.mjs --scene <name> --clip` (add `--scale 2.5` for 4K). For a flow that is not one scene, write a standalone scene like `demo.mjs`: no clock, its own times. |
| "As a GIF" | `ffmpeg -i clip.mp4 -vf "fps=15,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse" out.gif` |
| "Hide this" / "that is internal" | Remove it in the kit module, not the scene, so it is gone everywhere. |
| "I say the old name. Fix it in my voice." | Find the new words in any take they gave you and lay them in: [references/audio.md](references/audio.md), `examples/local-models/audio/voicepatch.py`. Keep the whole word before, start the new words where the old ones started, leave the leftover silence out in the edit, move the cues that named the old words. |
| "That pause is too long" / "awkward" | `python tools/wave.py <recording> <from> <to>` gives the pause in seconds. Compare it with the same speaker's pauses nearby (a comma is about 0.3 s, a sentence about 0.5 s) and leave the difference out in the edit. |
| "A word is cut off" | A cut or splice landed inside it. Look at the spectrogram around it (`wave.py`, a 1 s stretch), find the word's real end, move the cut. Check the other places the same splice was used. |
| "I re-cut it / reworded a line, here is my file" | `python tools/align.py <take> <their file>` shows what they removed or replaced. Use their sound on the take's timeline, leave the removed stretch out in the edit, re-time the one scene under the new words ([references/audio.md](references/audio.md), `examples/local-models/audio/v6audio.py`). |
| "Clean up the audio" / "it does not sound cleaned up" | Clean the recording, never the finished cut, and use one gain with no limiter after. If they cleaned it themselves, use their file's sound. |

## Commands

| Command | Makes | Takes |
| --- | --- | --- |
| `node preview.mjs` | Live player with sound, notes and reload on save | instant |
| `node render.mjs --scene S --sheet` | 12 frames of a scene on one picture | ~10 s |
| `node render.mjs --scene S --stills 4,5.5` | Exact moments as PNG (`--sheet` adds the picture) | ~8 s |
| `node render.mjs --all --sheet` | Storyboard: first, middle, last frame of every film | ~5 s a film |
| `node render.mjs --all --draft` | Changed films at 960 x 540, no blur | about real time |
| `node compose.mjs --draft` | Review cut with sound | seconds |
| `node render.mjs --all` | Changed films, full quality | ~3x real time |
| `node compose.mjs [--tag v2]` | The finished video | ~1x real time |
| `node render.mjs --scene S --clip [--scale 2.5] [--prores]` | A clip to share (`build/clips/`) | ~3x, 4K ~10x |
| `node render.mjs --all --check` | Which films are stale | instant |
| `python tools/transcribe.py` | `film/words.mjs` and the script with times | ~1x on CPU, once a take |
| `node tools/said.mjs "words"` | Where a phrase is said | instant |
| `python tools/wave.py FILE FROM TO` | Where sound starts and stops, each pause in seconds, and a waveform and spectrogram picture | seconds |
| `python tools/align.py TAKE RECUT` | Which stretches of someone's re-cut are the take, and what was removed, to the frame | ~10 s |
| `node captions.mjs` | SRT captions through the edit | instant |

## References

- [references/scenes.md](references/scenes.md): how to write a scene. The contract, a skeleton,
  motion, camera, pointer, typing, word cues, what the checks mean.
- [references/kit.md](references/kit.md): what the UI kit draws, which example has which screen,
  and how to add a screen so it matches the real app.
- [references/direction.md](references/direction.md): camera, pointer, pacing and cut rules, and
  what vague review notes usually mean.
- [references/audio.md](references/audio.md): the voice. Loudness and cleanup, replacing words in
  the speaker's own voice, where a word really ends, how long pauses should be, taking time out,
  and using the person's own re-cut.
- [references/troubleshooting.md](references/troubleshooting.md): errors and traps, each with its
  fix.
- `examples/local-models/`: a finished 2:33 video's 16 scenes, edit, outline, the two sound
  scripts and the five rounds of notes that followed the first cut. Read and copy from it; it is
  not a project (its cues are hand-timed numbers, the old way).
- `examples/said-cues/`: one of those scenes and a small edit rewritten with word cues.

## Keeping the skill sharp

A project is a copy, so fixes do not flow back on their own. When a project improves a tool
(`render.mjs`, `compose.mjs`, `preview.mjs`, `lib/`, `tools/`) or adds a builder to a kit module
that another video would use, copy that file back to `SKILL/template` before finishing. When a
round of review teaches something new, add one line to the table in `references/direction.md`.
