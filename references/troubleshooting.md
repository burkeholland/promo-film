# Troubleshooting

## Setup

| Symptom | Fix |
| --- | --- |
| `Microsoft Edge is required` | The renderer drives the installed Edge. On another system, point `findEdge()` in `lib/edge.mjs` at a Chromium browser. |
| `No GPU (...); using the CPU` from transcribe | Normal. It takes about as long as the recording, once per take: the result is cached in `transcript/`. `--model small.en` is quicker and rougher. |
| `ModuleNotFoundError: faster_whisper` | `pip install faster-whisper numpy` |
| A name is spelled wrong in the transcript | Add it to `transcript/vocabulary.txt` (helps Whisper hear it) or `transcript/fixes.txt` (`heard => said`), then run transcribe again. Cues match the fixed spelling. |

## Rendering

| Symptom | Fix |
| --- | --- |
| A film does not re-render after a change | The cache follows imports from the scene file. A file loaded another way (a new asset folder, a `fetch`) is not seen: `--force`. If the renderer itself changed, bump `RENDER_VERSION` in `render.mjs`. |
| Every film re-renders after a small change | The change was in a file every scene imports (`kit.mjs`, `app.mjs`, `words.mjs`). That is correct. Use `--draft` while iterating. |
| `--scale ... goes with --clip` | Films for the edit are always 1920 x 1080. Other sizes are for standalone clips. |
| A clip will not open ("encoded in ap4h format") | That is ProRes. Windows' player cannot play it. Render with `--clip` (H.264), or convert: `ffmpeg -i in.mov -c:v libx264 -crf 14 -pix_fmt yuv420p out.mp4`. |
| A film in `build/` will not play in some players | Films for the edit are lossless on purpose. Only the composed video and `--clip` files are meant to be watched. |
| First frames show a missing image | The scene did not wait: `await loadAssets([...])` and `await imagesDecoded()` before returning. |
| A sheet shows the right state but the video looks wrong | Motion blur: a fast move needs a `fast: [[start, end]]` range. Or render that stretch alone: `--from 3 --to 4`. |
| A sheet or still is stale after a render that printed its first line | The command was piped to PowerShell's `Select-Object -First n`, which stops it as soon as it has n lines. Use `-Last n`. |
| `warning: "..." is cut off by N px at the side of .x` | The text is longer than its box. Shorten it, widen the box, or, if the cut is meant (a long path, a scrolling list), put `data-clip` on the box. "(the edge of the desktop)" means it runs past the stage itself. |
| `warning: "..." runs N px off the frame` | Big text past the edge of the picture, usually under a camera move. Move the text or end the move sooner. |
| `warning: the caption "..." covers the pointer` | Move the caption, or time it so it is gone before the pointer gets there. |
| Every film is stale after a change to `card.mjs`, `film.js` or `graphics.mjs` that only touched comments or `info` | The cache cannot tell. Render `--stills` of a few scenes, compare with stills from before, and when nothing moved, `node render.mjs --all --stamp` marks every film up to date. |

## Composing

| Symptom | Fix |
| --- | --- |
| `... is open in another app` | The last cut is open in a player. Close it, or `node compose.mjs --tag v2`. |
| `has N frames, but the edit needs M` | A cut moved. `node render.mjs --all` (with `--draft` for a draft cut). |
| `... is not on a frame of the recording` | A cut time was typed by hand. Use `cut('words')` or `frame(n)`. |
| Colors shift at every cut to the camera | The recording's color tag. compose converts BT.601 recordings to match the films; check the tag with `ffprobe -show_entries stream=color_space`. |
| The face cuts to someone's old B-roll | The recording is a rough cut with its own B-roll inside. Find the true face shots by brightness: `ffmpeg -i rec.mp4 -vf scale=192:108,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=yavg.txt -f null -`. Screen footage is much brighter than a face. Keep camera parts inside the face shots. |
| Voice too quiet or loud | compose measures the voice and brings it to -14 LUFS. Set `export const LOUDNESS = -16` in `film/edit.mjs` to change the target. |

## Sound

| Symptom | Fix |
| --- | --- |
| "A word is cut off" after a splice or a cut | The cut is inside the word: at a consonant's gap, or before a quiet ending (M, N, NG, L). `python tools/wave.py <file> <from> <to>` over one second, read the spectrogram, move the cut to the word's real end. See `references/audio.md`. |
| "I can hear the start of the old word" | The stretch that was silenced starts too late. Same fix, the other direction. |
| A pause sounds too long after replaced words | The new words are shorter. Leave the leftover silence out in the edit (end the part early, start the next at the next word). |
| "It does not sound cleaned up" | The cut was turned up into the limiter and then cleaned, or cleaned and then turned up into a limiter. Clean the recording, then one gain: set `LOUDNESS` to the value compose prints for no limiting. |
| Whisper reads the right words but the person hears a mistake | Whisper fills in what it expects. Trust the runs and the spectrogram, and ask the person to listen at the times you changed. |
| The lips drift in a camera part after new sound was laid in | The new sound is offset from the take. Measure it to the millisecond (`lag()` in `examples/local-models/audio/v6audio.py`), one offset for each side of a change. `tools/align.py` gives it to 10 ms. |
| Captions show the old words after a voice splice or a re-recorded line | Captions come from `film/words.mjs`, which was made from the take. Run `python tools/transcribe.py` on the recording you built, then `node captions.mjs`. With only a finished file, transcribe that file. |
| Whisper takes many times the file's length and the transcript ends in nonsense | It made words up over silence at the end. They have no length (start equals end). `transcribe.py` leaves them out and says so; with Whisper used directly, drop everything from the first run of three such words. |
| `wave.py`: `No module named matplotlib` | `pip install matplotlib`, or `--no-picture` for the runs alone. |

## Preview

| Symptom | Fix |
| --- | --- |
| Red text over the picture | That is the scene's own error, the same one the renderer would print. Fix it and save: the page takes the fix in without reloading. |
| No sound | Browsers hold sound until the page is clicked or a key is pressed. The page says "Sound was blocked. Press Space or click Play to start." Do that once. |
| A short freeze at some cuts | The edit jumps in the recording there and the browser has to seek. The page holds its clock for up to a second while the sound catches up, then plays on without the sound, and it loads each scene before its cut. A longer freeze is worth a note with the time. The rendered video does not freeze. |
| The playhead stopped by itself | Read what the page says. At the end of the edit it shows Replay, and Space starts again from 0:00. A link with `?scene=<name>` stops at the end of that one scene (and offers "Continue in the whole edit" when the edit plays that scene). "Playback stopped for a moment, so it was started again" means the page caught a stall and restarted it. If it stops anywhere else with no message, write a note there with N. |
| "The sound is not keeping up, so the picture is playing on without it" | The recording's sound did not catch up with the picture for a full second (a busy machine, or a recording still loading). Pause and press Play to start the sound over. If it repeats at the same place, write a note there. |
| A small "Updated 12:34:56" note appears | A file was saved and the page took it in without stopping. It goes away after a few seconds. It also shows after the page reloads itself because `lib/preview.html` was saved. |
| "Preview server is not answering" | `node preview.mjs` for this project stopped or was restarted. Start it again: the page reconnects by itself and takes in what changed. |
| "The note was not saved" | The words are still in the box. Read the reason under it and press Enter again. Check that `node preview.mjs` is running. Notes go to `review/notes.md`. |
| The notes drawer covers part of the picture | It floats over the picture only in a short window, or a narrow one that is wider than tall. From 800 px wide it sits beside the picture, and in a tall narrow window (a side panel) it sits under it. Press Esc or the Notes button to close it, or make the window taller or wider. The drawer is remembered across reloads only when it does not float. |
| Playback stops or jumps back whenever a file is saved | The project has the old player, which reloaded the whole page on every save. Copy `preview.mjs` and `lib/preview.html` from `SKILL/template` into it and run `node preview.mjs` again. |
| The preview looks sharper or softer than the render | The preview has no motion blur and is scaled by the browser. Judge timing and framing there, sharpness from a still. |
| Export video says another export is running | One at a time. Click the status line beside the buttons to see its log. |
| An export failed | Click the status line: the log shows the step that failed and its message, the same as `node deliver.mjs` would print. |
| Download link is missing | Nothing has been exported yet. The links show the newest `build/<name>.mp4` and `build/<name>-draft.mp4`. |
| The link shows another video, or a 404 that lists other videos | The address was not this project's. Each preview answers only at `http://127.0.0.1:4747/<its NAME>/`: use the `Preview:` line this project's `node preview.mjs` printed. `http://127.0.0.1:4747/` lists every preview that is running, with its folder. |
| The address ends in `-2` | Another folder's video has the same `NAME` and started first. Both work. Give the project its own `NAME` in `film/edit.mjs` and start the preview again. |
| `Port 4747 is held by something that is not this preview` | Another program has the port, so the video is on a port of its own until it is free (the line above the message is the address). Stop that program, or start every preview with the same `--port`. |
| A project made before previews shared a port opens on 4173, 4174, ... | Its `preview.mjs` is the old one, which takes the next free port and serves at `/`. Copy `preview.mjs` and `lib/preview.html` from `SKILL/template` into it. |

## Delivering

| Symptom | Fix |
| --- | --- |
| `deliver.mjs` stops at a step | It runs render, compose, the sheet, captions and the made-up list in order and stops at the first failure. Fix that one and run it again: films already rendered are not rendered again. |
| `The sound is silent` | The recording has no voice (a music-only or silent promo). That is fine: compose keeps the silent track and captions come from the lines on screen. |
| `No part of the edit` from captions or `render --all --check` | `film/edit.mjs` has no parts yet. Fill `PARTS` first. |
| The made-up list is missing something | Its definition has no `DRAWN` comment. Add one where the thing is defined (the constant, not every scene that uses it). |

## ffmpeg on this machine

- `-vsync` is gone: use `-fps_mode passthrough` or `-fps_mode cfr`.
- `drawtext` fails (no fontconfig). Label pictures with a contact sheet (`--sheet`) instead.
- GIF: `-vf "fps=15,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse"`.
- Loudness of any file: `ffmpeg -i file -af ebur128=peak=true -f null -` and read the summary.
