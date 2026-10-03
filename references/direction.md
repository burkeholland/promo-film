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
- The last frame of the video holds for a second.

## Truth

- The app does only what the real app does, or what the person said it will do. Anything else
  (a screen that does not exist yet, numbers, names, an invented flow) is on the made-up list.
- If the words and the picture disagree ("67% lower" against "to 67%"), say so. Do not pick one
  quietly.
- Internal labels, staff badges, unreleased items and real private project names come out.

## What a review note usually means

| The note | What to change |
| --- | --- |
| "Too much zoom" / "these are all stills" | Fewer camera keys, lower top zoom, and add motion in the app itself: typing, rows arriving, a menu opening, a spinner. |
| "The zooms are jerky" | Use `glide` for the move, make it longer, and remove a key in the middle of a move. Two short moves become one long one. |
| "The text jumps when it zooms" | The move is not going through `film()`, or a node sets its own `transform` with whole pixels. Every camera move must go through `film(stage, camera(t))`. |
| "That cut is harsh" / "it cuts too quickly" | Hold longer after the last action (0.4 s or more), or end the scene on the next scene's first framing. Often the last click sits too close to the cut. |
| "There is a fast cut going into that demo" | The scene opens on a screen that changes within a second (a typed prompt, then Enter), which reads as two cuts. Open in the state the action starts from: the prompt already sent and in the thread. Give a cue a negative time so its rows have finished fading in by the first frame. `examples/local-models/scenes/plan-handoff.mjs`. |
| "Too fast" / "I can't read it" | Longer hold on the thing to read, or a closer framing. Not a slower pointer. |
| "It feels fake" | Something behaves unlike the app: a hover that is missing, a menu that appears with no fade, a pointer that moves in a straight line, text that appears with no typing. |
| "Show X when I say Y" | A cue: `T.said('Y') - .08`. Then check every later cue still fits. |
| "The chip should say X" / a wording change | Data in the scene or the kit. Then look for the same text in every other scene. |
| "It takes too long to render" | Use the preview and drafts for review. Render full quality once, at the end. 30 fps is the standard. |
| "That move is too fast, I can't tell what happened" | Make the slow part cheaper, not the whole thing longer: paste a prompt in one go instead of typing it, and give the time to the clicks the person needs to follow. |
| "I'm not looking at the camera there" | Do not show that stretch of the take. Hold the film before it over those words, with something still happening in it. |
| "The pause after X is awkward" | Sound, not picture. Measure the pause (`tools/wave.py`), compare with the speaker's other pauses, leave the extra out in the edit. `references/audio.md`. |
| "X is cut off" / "I can hear the start of the old word" | A cut inside a word. Find the word's real end on the spectrogram. `references/audio.md`. |
| "We can't promise that" (a line is reworded or dropped) | Use the new line, then search the scenes for on-screen text that makes the same promise. |
