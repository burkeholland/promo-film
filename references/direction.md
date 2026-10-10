# Direction

The look is a real screen recording of the real app, made by someone careful: calm, exact, a
little slower than a person would really go. Nothing flashy. Every rule here came out of a review
note on a real video.

## What to put where

- **Camera parts** (the talking head) go where the speaker looks into the lens: the hook, the
  opinion, the sign-off. **Film parts** go where they describe the product, which is usually
  where they look away at their notes.
- Cut between them on a sentence break, straight, a frame or two before the next word
  (`cut('words')` does this). No dissolves.
- A camera part longer than about 8 s gets one `punchIn` (1.15x) at a sentence break.
- One idea per film. When the voice moves to the next idea, the picture is already there.
- Before using a recording that is someone's rough cut, check that the camera parts are really
  the camera: rough cuts have their own B-roll inside them (see troubleshooting).

## Camera

- **Animate the app, not the camera.** The picture should be changing because the app is doing
  something. A still with a zoom on it is a placeholder.
- At most one camera move per scene. It is slow (2 to 5 s), eased at both ends (`glide`), and it
  goes one way: in, or across, never in and back out.
- Zoom from 1x (the whole desktop) to about 1.6x. Text is readable at 1.3x on a phone.
- Start a scene already framed on where the action will be. Do not open wide and travel there.
- When a cut joins two scenes on the same screen, end the first on the second's exact framing.
- It is fine, and good, for UI to animate while the camera holds a close framing.
- Keep close shots inside the window (`look` and `fit` do), so no strip of wallpaper shows.

## Pointer

- The standard arrow at real size. It gets bigger when the camera is in; that is right.
- Moves bend slightly, take 0.3 to 1 s, and never start before the last one ends.
- The pointer arrives 2 to 3 frames before the word it goes with, then rests at least 0.3 s.
- It rests off the text it just acted on, so it never covers what the viewer should read.
- Hover and pressed states are the app's real ones. No click ripples, no glow.

## Pace

- At least 0.3 s of stillness after anything lands, and 0.4 s between an action and a cut.
- Typing is uneven on purpose (`typing()`); a prompt takes 2 to 4 s however long it is.
- Work that takes hours in life (a long run, a download) is shown as a few beats and a clock
  that jumps, not sped-up noise.
- The last frame of the video holds for a second. When the voice is the end of the recording, end
  the last part about 36 frames past it (`to: frame(n + 36)` in `film/edit.mjs`): compose pads the
  sound with silence to the picture's length, and the preview plays that time without sound.

## Words on screen

- Words that come up one by one as they are said are a device, not a style. Use it in one or two
  short places in a video (a title's name, the first few words of the end card), on a headline
  of about six words at most. Done on every line it looks strange: people do not put every word
  they say on a slide.
- Everything else on a card or a graphic comes in as one piece: a subtitle fades up whole, a
  headline over a diagram rises as one line, on the first word of the sentence it goes with.
- A card does not repeat the voice. It carries a name or a short headline and one subtitle that
  sums the sentence up in its own words. Leave the rest to the voice.
- A title card is the name and a subtitle. An end card is a short closing headline (the only
  part that may follow the voice) and the closing phrase as its subtitle.

## Truth

- The app does only what the real app does, or what the person said it will do. Anything else
  (a screen that does not exist yet, numbers, names, an invented flow) is on the made-up list.
- If the words and the picture disagree ("67% lower" against "to 67%"), say so. Do not pick one
  quietly.
- Internal labels, staff badges, unreleased items and real private project names come out.

## What a review note usually means

| The note | What to change |
| --- | --- |
| "The words appearing as I speak look weird" / "you don't need to put every word I say" | Word by word text was used everywhere. Keep it for one or two short headlines (the title's name, the first few words of the end card). Make every other line a summary that fades in as one piece, and cut lines that only repeat the voice. See "Words on screen". |
| "Too much zoom" / "these are all stills" | Fewer camera keys, lower top zoom, and add motion in the app itself: typing, rows arriving, a menu opening, a spinner. |
| "Zoom in on what I am talking about, but not excessively" | Start closer to the narrated control, usually 1.3 to 1.55x, and use one restrained move. Keep shared camera endpoints across continuous scenes. Measure the control at the click, not just the camera's final position, so an edge button stays fully in frame. |
| "The zooms are jerky" | Use `glide` for the move, make it longer, and remove a key in the middle of a move. Two short moves become one long one. |
| "I can't read the text and watch what is happening" / "everything moves too fast" (a video with no voice) | Split reading from watching. Before each feature, a card with its name and one sentence (about 4 s). Then the film, with one short line under the page per beat in place of a sentence, a closer framing on the part that matters, and one action at a time with a second or more between them. Expect the video to be two to three times as long, and say so. `buildSteps` and `featureCard` in a project made this way. |
| "The text jumps when it zooms" | The move is not going through `film()`, or a node sets its own `transform` with whole pixels. Every camera move must go through `film(stage, camera(t))`. |
| "That cut is harsh" / "it cuts too quickly" | Hold longer after the last action (0.4 s or more), or end the scene on the next scene's first framing. Often the last click sits too close to the cut. |
| "There is a fast cut going into that demo" | The scene opens on a screen that changes within a second (a typed prompt, then Enter), which reads as two cuts. Open in the state the action starts from: the prompt already sent and in the thread. Give a cue a negative time so its rows have finished fading in by the first frame. `examples/local-models/scenes/plan-handoff.mjs`. |
| "Too fast" / "I can't read it" | Longer hold on the thing to read, or a closer framing. Not a slower pointer. |
| "It just stops" / "the playhead stopped" (about the preview, not the video) | Check the preview before the edit. A `?scene=` link ends at the end of that scene, the end of the edit shows Replay, and an older `preview.mjs` or `lib/preview.html` reloads the whole page on every save. See "Preview" in `references/troubleshooting.md`. |
| "It feels fake" | Something behaves unlike the app: a hover that is missing, a menu that appears with no fade, a pointer that moves in a straight line, text that appears with no typing. |
| "Show X when I say Y" | A cue: `T.said('Y') - .08`. Then check every later cue still fits. |
| "The chip should say X" / a wording change | Data in the scene or the kit. Then look for the same text in every other scene. |
| "It takes too long to render" | Use the preview and drafts for review. Render full quality once, at the end. 30 fps is the standard. |
| "That move is too fast, I can't tell what happened" | Make the slow part cheaper, not the whole thing longer: paste a prompt in one go instead of typing it, and give the time to the clicks the person needs to follow. |
| "I'm not looking at the camera there" | Do not show that stretch of the take. Hold the film before it over those words, with something still happening in it. |
| "The pause after X is awkward" | Sound, not picture. Measure the pause (`tools/wave.py`), compare with the speaker's other pauses, leave the extra out in the edit. `references/audio.md`. |
| "X is cut off" / "I can hear the start of the old word" | A cut inside a word. Find the word's real end on the spectrogram. `references/audio.md`. |
| "We can't promise that" (a line is reworded or dropped) | Use the new line, then search the scenes for on-screen text that makes the same promise. |
| "No voiceover, just a video to go with this copy" | The copy's own lines go on screen: `buildCaptions()` for the app scenes, title cards at each end. Put the caption where the app is empty, or over the strip of desktop under the window (a close shot with `keep` in place of `inWin`). Light up the phrases of a line as the app does each thing. Give a card or a question twice the time a voice would. |
| "Don't show my name, photo or projects" | `USER` in `kit.mjs`, `assets/avatar.png` and `PROJECTS` in `app.mjs`, in the project and not the template. Then frame the sidebar and the session header out anyway. |
| "It should be a big task" / "show it running for an hour" | Real speed for the first beats, then a stretch of fast time: rows land evenly through it ("Edit x and 40 other tool calls") while `tl.work.elapsed` runs the working clock up on a log scale, and a caption names the length. Slow back down for anything the viewer must read. Leave the pointer alone the whole time. |
| "It will let you know when it's done" (a notification) | The app only sends one when the person is not looking at that session (`desktopNotification.ts`), so show the app on another page with the session spinning in the sidebar (`showSession(true, false)`), then the plain toast (`buildToast` with no `progress`): the session's name, and "Agent finished: " with the start of the reply. Play `notify.wav` at the same moment from the part's `sounds`. The report is whole when the next scene opens; it does not stream in again. |
| "Autopilot doesn't ask questions" | True of the app: in Autopilot there is no question card. Copilot decides, says so in the thread, and ends with a report of its decisions and open questions. `buildQuestion` is for Interactive mode only. Check the copy you were given for the same wrong promise and say so. |
