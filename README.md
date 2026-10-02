# promo-film

An agent skill that makes a realistic app promo video from a talk track and screenshots.

You record yourself talking (or just a voiceover) and hand over screenshots of the app. The agent
rebuilds the app's screens in HTML, animates them like a clean screen recording (pointer, typing,
menus, a slow camera), times every action to the words you say, and cuts that against your
talking head. Because the screens are code and not a recording, any name, label or state can
change in minutes, including after you thought you were done.

> This repository is private on purpose. `examples/local-models/` is a real video's source and
> shows product and model names from before their announcement. See "Before making this public".

## What you give it and what you get

| You give | You get |
| --- | --- |
| A talking head video or a voiceover. Its sound becomes the soundtrack. | `build/<name>.mp4`: 1920 x 1080, 30 fps, H.264 |
| Screenshots of each screen you talk about, at 100% zoom, and a short screen recording of anything that moves | `build/<name>.srt` captions |
| What must differ from the screenshots: names, lists, things to hide | A list of everything the agent made up, so nothing false ships by accident |

It also makes short clips and GIFs of one feature, up to 4K.

## How it works

- **Scenes are code.** A scene builds the app from a UI kit and returns what the screen looks
  like at second `t`. Nothing is recorded.
- **The edit is a list.** Each part of the video is either the camera (your take) or a film (a
  scene) over the same sound, so picture and voice always cut together.
- **Cues name words.** "Open the menu on *for instance*" is written as those words, looked up in
  a transcript. A new take needs a new transcript, not new numbers.
- **Three ways to look, cheapest first.** A contact sheet of a scene in about 10 seconds, a live
  preview in the browser with sound, a draft cut in about the video's own length. Full quality is
  rendered once, for delivery.
- **An engine and a kit.** The engine (motion, camera, pointer, typing, word cues, render,
  compose, preview) is not about any app. The kit is one app's screens. The kit included here
  draws the GitHub Copilot desktop app on Windows 11, measured to about 1 px. Another app needs
  its own kit, built from its screenshots the same way (`references/kit.md`).
- **Sound is checked by sight.** The agent cannot hear. Before it changes the voice it reads
  where sound starts and stops and looks at the waveform and spectrogram, then tells you which
  moments to listen to.

## Install

Clone it into your agent's skills folder under the name `promo-film`. For GitHub Copilot:

```
git clone https://github.com/burkeholland/promo-film "$HOME/.copilot/skills/promo-film"
```

It needs, on the machine the agent runs on:

- Node 22 or newer
- Microsoft Edge (the renderer drives the installed browser)
- ffmpeg and ffprobe on the PATH
- Python 3 with `pip install faster-whisper numpy matplotlib`

Built and used on Windows. The renderer looks for Edge; on another system point `findEdge()` in
`template/lib/edge.mjs` at a Chromium browser.

## Use

Ask in plain words. The skill triggers on requests like these:

- "Make a promo video from this talk track and these screenshots. Start with the first 10 seconds."
- "Here's new audio. Update the video."
- "They renamed X to Y. Fix it everywhere."
- "I say the old name twice. Can you put the new name in, in my voice?"
- "The pause after the name is too long." / "A word is cut off at 2:18."
- "I reworded a line and cleaned up the audio. Here's my file."
- "Give me a 4K clip of just the part where the local model runs." (or "as a GIF")

What to expect:

1. The agent asks once for anything missing, writes a short outline, and waits for a yes.
2. It builds the opening ten seconds first and shows you, before building the rest.
3. You review in a live preview in the browser. Space plays, arrows step a frame, and **N writes
   a note at the frame you are on**. "Too fast" is enough: the note carries the time and scene.
4. It delivers the MP4, the captions and the made-up list.
5. Changes after that are short notes. Each reply says what changed, what the agent decided on
   its own, and what it could not check.

`SKILL.md` is what the agent reads: the rules, the workflow, every command, and a table of what
to do for each kind of change.

## Which model

Use the most capable model you have, and one that can look at pictures. The work runs for
hundreds of steps, it reads screenshots, stills and spectrograms, and the mistakes that matter
are small ones a person notices at once: a cue 0.2 seconds off, a cut inside a word.

It was built in the GitHub Copilot app on Anthropic's top Claude models (Claude Opus 5.5 and a
newer preview model). Smaller, faster or text-only models have not been tried with it and should
not be expected to hold up.

## How fast it is

Measured on the machine it was built on:

| Step | Takes |
| --- | --- |
| Contact sheet of one scene | about 10 s |
| Live preview | instant, reloads on save |
| Draft cut of a 20 s film | about 20 s |
| Full quality render | about 3x the film's length, only for films that changed |
| Compose the finished video | about its own length |

## What is in here

```
SKILL.md                  what the agent reads
references/
  scenes.md               how to write a scene
  kit.md                  what the UI kit draws, and how to make one for another app
  direction.md            camera, pacing, cuts, and what vague review notes usually mean
  audio.md                the voice: loudness, cleanup, replacing words, pauses, re-cuts
  troubleshooting.md      errors and traps, each with its fix
scripts/new-project.mjs   starts a project: a full copy of template/
template/                 the toolkit a project is made of
  render.mjs compose.mjs preview.mjs captions.mjs
  film/                   the engine, the Copilot app kit, and a demo scene
  tools/                  transcribe.py, said.mjs, wave.py, align.py
examples/
  said-cues/              a scene and an edit timed by words: start here
  local-models/           a finished 2:33 video: 16 scenes, the edit, the outline, two sound
                          scripts, and the five rounds of notes after the first cut
```

## Limits

- The included kit is one app on one desktop. A different app is real work up front: its screens
  have to be measured and rebuilt before the first scene.
- The agent cannot hear. Sound changes are checked by transcript and waveform and can still be
  wrong in ways only a listener catches. Listen to the moments it names.
- Replacing words in your own voice needs a take where you said the new words. It does not
  synthesize speech.
- Rendering uses the installed Edge and has only been run on Windows.

## Before making this public

- `examples/local-models/` (scenes, edit, outline, sound scripts) names products and models as
  they were in an unreleased video. Remove it or wait until they are announced.
- `template/film/assets/wallpaper.jpg` and `template/assets/sounds/notify.wav` are a Windows
  wallpaper and notification sound, and `app-icon.png` and the provider logos belong to their
  owners. Replace them or confirm they can be shared.
- There is no license file yet.
