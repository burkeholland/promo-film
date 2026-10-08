# Computer Use promo - outline

**Status:** outline, waiting for a yes.
**Recording:** none. `assets/video/silence.wav` is silence, so the video has a silent sound track and every word is on screen.
**Format:** 16:9, 1920 x 1080, 30 fps, about 55 s.
**Look:** a real Windows 11 desktop running the GitHub Copilot app, between two dark title cards. Real app behavior, a calm pointer, one slow camera move per scene.
**Story:** you ask Copilot to file an expense report from three receipts. It asks to control Edge, opens a (made-up) Contoso Expenses site, fills in every line, and checks with you before it submits.

## Beats

| Time | Words on screen | Picture | Scene | Have it? |
| --- | --- | --- | --- | --- |
| 0:00 - 0:05 | "Copilot can now use your desktop apps." / "Computer Use in the GitHub Copilot app. Now in public preview." | Title card. | `title` | graphics in the kit |
| 0:05 - 0:13 | "Tell Copilot what you need done, and which app to use." | Home page, Interactive mode. The pointer types "File an expense report for my Seattle trip. The receipts are in Downloads\seattle-receipts. Use Contoso Expenses in Edge." and sends it. | `ask` | in the kit |
| 0:13 - 0:20 | "It reads your receipts, then asks before it controls any app." | The session. "View 3 images" with three receipt thumbnails. Then the approval card over the composer: "Allow Copilot to control Microsoft Edge?" The pointer picks "Allow for this session". | `allow` | session in the kit; receipts new; approval card new (drawn in the app's style) |
| 0:20 - 0:40 | "It clicks, types and fills in every field, one step at a time." | Edge slides in on the right half of the desktop, Copilot's thread on the left. Contoso Expenses: New report, title, dates, then three lines (Hotel $612.40, Taxi $48.20, Dinner $86.75), each receipt attached. No pointer moves in Edge: fields light up and fill as Copilot works. On the left, rows arrive: "Computer Use · Click", "Computer Use · Type Text", "Computer Use · Get Window State · 1 image" with a small screenshot under it. Total reads $747.35. | `fill` | Edge frame new (drawn); Contoso Expenses new (made up) |
| 0:40 - 0:48 | "And it checks with you before anything is sent." | Copilot: "The report is filled in: 3 expenses, $747.35. Want me to submit it?" Question card with "Submit it" / "Not yet". The pointer clicks "Submit it". One last click in Edge, and the report shows "Submitted". | `submit` | question card in the kit |
| 0:48 - 0:55 | "Turn it on in Settings > Computer Use." / "in the GitHub Copilot app" | End card: the line rises, then the "Enable Computer Use" setting (the app's own wording) with its switch turning on, then the app's icon and name. Holds 2 s. | `end` | `film/card.mjs` data |

## Received

- A screenshot of real computer use rows (assets/screens/computer-use-rows.png). The rows in the film follow it: `Computer Use · <Tool>`, a lighter `app: MSEdge` argument, then `· N lines`.
- You said to draw the rest, so the approval card and the Edge frame are drawn in the app's and Windows 11's style.

## Decisions

- No voice and no music. The sound track is silent.
- Mode is Interactive, because the video shows Copilot asking you. In Autopilot it would not ask.
- Names on screen: user "Mona Lisa" with a generated identicon, project `expenses`, Edge with one tab. No real name, photo, project, tab or session shows.
- The model chip shows the kit's default, GPT-5.6 Sol.
- Edge shows Copilot's clicks as focus rings and typed values, not a moving mouse, because computer use works in the background without moving your pointer.

## Made up or assumed

- The whole task: the Seattle trip, the receipts, the amounts, the dates, and every row and reply in the thread.
- Contoso Expenses: the site, its layout, its words and its "Submitted" state.
- The approval card's words and choices ("Allow Copilot to control Microsoft Edge?", "Allow for this session", "Always allow", "Don't allow"). Drawn, not from a screenshot.
- The Edge frame. Drawn, not from a screenshot.
- Row labels like "Computer Use · Click" follow the app's source code, which builds them from the tool's name. The plugin could send its own titles, which I could not check.
- Caption pill, both title cards, and "Now in public preview" (from the October 1 changelog).
