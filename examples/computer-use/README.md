# Computer Use: an expense report in Edge

A 55 s promo with no voice. Copilot is asked to file an expense report, reads three receipt
photos, asks before it controls Edge, fills in a made-up "Contoso Expenses" site field by field,
and stops to ask before it submits. Title and end cards bookend it.

## Files

- `edit.mjs`: six film parts over a silent track (`RECORDING = 'silence.wav'`). The lines are on
  screen as captions, so `captions.mjs` makes the SRT from them.
- `story.mjs`: the one task the four app scenes share: the request, the receipts, each beat's
  time (`BEAT`), the tool rows, the approval card, the question before submit, and where the two
  windows sit. Change the story here, not in a scene.
- `browser.mjs`: Microsoft Edge (tabs, address bar, page area) and the Contoso Expenses pages,
  plus `drawReceipt()`. Its classes are in `film-additions.css`.
- `scenes/`: `title`, `ask`, `allow`, `fill`, `submit`, `end`. `title` and `end` are
  `film/card.mjs` data.
- `outline.md`: the outline and the made-up list as delivered.

## Using it in a project

1. Copy `browser.mjs` and `story.mjs` into `film/`, and `scenes/*` into `film/scenes/`.
2. Append `film-additions.css` to `film/film.css`.
3. Copy `edit.mjs` over `film/edit.mjs`, or take the parts you need into yours. For a silent
   video, put a silent WAV at least as long as the edit in `assets/video/`
   (`ffmpeg -f lavfi -i anullsrc=r=48000:cl=stereo -t 58 assets/video/silence.wav`).
4. The video also changed two pieces of kit data, which are not in the template: `PROJECTS` in
   `app.mjs` (sample projects, with an "expenses" one open) and `USER` in `kit.mjs`. Set them for
   your video.

Everything about Contoso, the trip, the amounts and the replies is made up and tagged `DRAWN`, so
`node tools/madeup.mjs` lists it.
