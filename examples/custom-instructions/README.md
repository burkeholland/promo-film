# Custom instructions (65 s, voiceover only)

A promo for per-project custom instructions in the GitHub Copilot app, cut to a voiceover with no
talking head, so every part is a film. Cues name words (`T.said`), the new way.

| File | What it has |
| --- | --- |
| `project.mjs` | Kit builders: a project's right click menu (`buildRowMenu`, also used for the Customize page's Add menu), the Settings dialog on a project's page with a scrolling page and the Instructions field (`buildProjectSettings`), and the Customize page on its Featured tab (`buildCustomize`). Built from the app's source, not from screenshots. |
| `film-additions.css` | The classes those builders use. Append it to `film/film.css`. |
| `story.mjs` | The project, the rules, the pasted guidelines and the session, shared by the scenes, and the shot and pointer where one film hands over to the next. |
| `scenes/title.mjs`, `scenes/end.mjs` | Cards from data, timed to words. |
| `scenes/once.mjs` | A diagram on the dark board: a note that types itself, cards that arrive, lines that draw out to them. |
| `scenes/settings.mjs` | Right click, menu, dialog, a page that scrolls, typing in three timed runs, a paste, and a field that scrolls inside the page. |
| `scenes/work.mjs` | Home to session to another page in one film, with a menu whose rows light as they are named. |

The Customize page's pictures are the app's own (`public/featured-assets` and `public/mcp-icons` in
its source), copied into `film/assets/customize/`. They are not in this example.
