# Custom instructions - outline

**Status:** built from this outline without a yes, because the request ran unattended. Say what to change.
**Recording:** `assets/video/talk.m4a` (65.2 s, voice only). Its sound is the soundtrack.
**Format:** 16:9, 1920 x 1080, 30 fps.
**Look:** a real Windows 11 desktop running the app. Real app behavior, a calm pointer, slow
camera moves. A dark title card, one diagram and an end card around it.

## Beats

There is no talking head, so every part is a film. Times are in the recording.

| Time | Words | Picture | Scene | Have it? |
| --- | --- | --- | --- | --- |
| 0:00 - 0:05 | "Custom instructions are where you teach Copilot how you work." | Title card: the app, "Custom instructions" rising as it is said, one line under it | `title` | card from data |
| 0:05 - 0:13 | "Write down your conventions once and Copilot reads them at the start of every session. No more explaining..." | Diagram: three rules typed into an Instructions note, three sessions arrive, a line runs to each. Then each session gets a short ask | `once` | new graphic |
| 0:13 - 0:17 | "To add instructions, right-click a project and open Settings." | Right click on the project in the sidebar, the menu opens, Settings is clicked, the dialog opens on the project's page | `settings` | new: menu and page built from the app's source |
| 0:17 - 0:25 | "Under Instructions, you can write the things you find yourself repeating..." | The page scrolls to Instructions. The pointer runs along the field's example, then clicks into the field | `settings` | same |
| 0:25 - 0:33 | "I'm telling it to use pnpm and not npm. To start branch names with feat or fix and to run lint before committing." | Each rule is typed while it is said | `settings` | same |
| 0:33 - 0:42 | "These instructions could even contain very long and complex guidelines..." | A long set of guidelines is pasted in on "very long", then scrolled: Naming, Structure, Style land on "named", "structured", "written" | `settings` | same |
| 0:42 - 0:45 | "And that's it. They're saved for this repo." | A click outside the field (the app saves on blur), then the dialog is closed | `settings` | same |
| 0:45 - 0:53 | "Now I start a new session and ask for a new feature. The instructions are automatically sent to Copilot with my prompt. And that's just the start." | A prompt is typed and sent. Copilot works the way the rules say: a `feat/` branch, `pnpm lint` | `work` | in the kit |
| 0:53 - 0:59 | "In Customize, you can add MCP servers, skills, plugins, and a lot more." | Customize is clicked in the sidebar. The Add menu opens and each row lights as it is named. The list scrolls on "a lot more" | `work` | new: page built from the app's source |
| 0:59 - 1:05 | "Set instructions for GitHub Copilot and teach it how you and your team like to work." | End card: "Set your instructions.", one line, the app | `end` | card from data |

## Needed from you

Nothing blocks the cut. These would make it more exact:

- [ ] A screenshot at 100% zoom of a project's right click menu, of its Settings page at the Instructions section, and of Customize with the Add menu open. They were rebuilt from the app's source, so spacing may be a few px off.
- [ ] A listen. See the delivery note for the two things to check by ear.

## Decisions

- Names on screen: the project is `storefront` (made up). The person signed in is the kit's default, Burke Holland.
- Model shown: GPT-5.6 Sol, the kit's default.
- The three rules are the app's own example text from the Instructions field, which is also what the voice says.
- Loudness: the voice is brought to -16 LUFS instead of -14, so the limiter barely touches it.
- Hidden or removed: the Connectors tab and menu item on Customize (behind a flag in the app), staff-only Settings sections.

## Made up or assumed

`node tools/madeup.mjs` writes the full list to `build/custom-instructions-madeup.md`.
