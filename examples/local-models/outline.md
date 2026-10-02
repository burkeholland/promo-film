# Local models promo - outline

**Status:** v7 delivered: 2:33.7 (4611 frames), 1920x1080 at 30 fps, -16.8 LUFS, true peak -1.6 dBFS. The rounds after the first full cut (v2), each one a short note from the speaker:

| Cut | The note | What changed |
| --- | --- | --- |
| v3 | "Confetti out of the zero, and drop the shot where I look away." | `auto-run.mjs` bursts confetti from the 0 and holds; the camera part after it is gone from the edit. |
| v4 | "They renamed the model. Can you say the new name in my voice?" | `audio/voicepatch.py` lays his own "MAI Code 1.1 Flash" from an earlier take over the old name, both times. |
| v5 | "I can hear the start of the old name." "The model picker goes by too fast." | The splice clears from further back; `automations.mjs` pastes its prompt in one go and slows the picker. |
| v6 | "The pause after the name is too long. I reworded the offline line, here is my file. It does not sound cleaned up." | `audio/v6audio.py` lays the sound of his own cleaned-up re-cut on the take; the edit leaves out the silence after each name and the dropped line; `offline.mjs` is re-timed and its reply no longer makes the promise the script dropped; one gain, no limiter. |
| v7 | "\"Including\" is cut off before the name. Look at the waveform." | The splice had cut inside the word. It now keeps the whole word before each name (`NAMES` in `audio/v6audio.py`). |

Render commands: `node render.mjs --all` (re-renders only changed films), `--draft` (960x540 fast preview), `--check` (lists stale films), `--force`; `node compose.mjs --draft` joins draft films.

**Latest pass:**
- The model chip reads "Auto · Efficiency", and Efficiency has the check mark in the Auto menu.
- The Aion install toast shows only a percentage, with no download size.
- Offline (C6) is reworked: a local redaction task is already running, Airplane mode goes on from the taskbar flyout, the app adds "You're offline · Copilot keeps working on local models", and the task keeps going (sample run, then the full 48,210 rows). Settings picks up the same session as it finishes. **The VO for this part is still the old line - re-record it and the picture is ready.**
- Calmer cameras: zoom is capped at about 1.6x, there is one push per scene, and there is no push in then pull back out. Install ends on routed's exact first framing, so that cut is invisible.
**Project folder:** a copy of the template, as `new-project.mjs` makes.
**Voiceover:** the new take with the talking head, 3:17 (`assets\video\local-models.mp4`). Its own audio is the master track, so the camera shots stay lip-synced. Transcript: `transcript\talkinghead.large-v3-turbo.txt`. The old 2:50 voiceover is retired.
**Format:** 16:9, 1920x1080, 60 fps.
**Look:** a real Windows 11 desktop running the GitHub Copilot app. Smooth cursor moves, real app behavior, slow camera zooms. Nothing flashy.
**How it's built:** the opening is rebuilt in HTML/CSS so we can change any text, model name or state. Sizes come from the app's source code and colors are sampled from your screenshots, and each frame is rendered in Edge. The rest of the screen time is stills with slow push-ins, made three ways: frames of the rebuilt app (the model picker screens), your screenshots with text patched in (drawn in the app's font at measured sizes), and captures of the HydraFusion blog post. FFmpeg joins everything with your recording's sound.

## Motion rules (used for the whole video)

| Rule | Choice |
| --- | --- |
| Personality | Calm and precise. No bounce or overshoot. The one exception is the icon's "hello" hop at the very start. |
| Camera | One move at a time. Ease-in-out, 1.2s to 4.5s. Zoom range 1x (full desktop) to about 2.5x. Light motion blur on camera moves only. |
| Cursor | Standard Windows arrow at real size. Slightly curved, human-like paths, 0.3s to 1s per move. It lands 2-3 frames before the word it goes with. |
| UI | Behaves like the real app: real hover and pressed colors, real menu timing. No fake click ripples. |
| Holds | At least 0.3s of stillness after every landing. |
| Cuts | Straight cuts between CAMERA and SCREEN, always on a sentence break. No cuts inside a screen section. |

## Decisions so far

- **Model list** (GitHub Copilot section, top to bottom): Claude Opus 5.5 (selected, check mark), Fable 5.1 (Claude logo), Claude Sonnet 5.5, GPT-6.1 Sol, GPT-6 Astra, Gemini 3.8 Flash, Grok 4.7, Kimi K3, then a divider and More models.
- **Removed from the list:** Claude Orzata EAP, Claude Sonnet 5, GPT-5.6 Sol, GPT-5.6 Sol Fast and the Hidden models.
- **Local models** ("Other providers": gemma4:26b, qwen3.6:35b-a3b, mai-code-1.1-flash-local) are hidden at the start. They appear in the picker on "will be automatically added to the model picker" (about 1:28 in the new take).
- **Composer chip** starts as "Claude Opus 5.5 · Medium".
- **Opening:** the app icon sits on the desktop, hops a bit to say hello, and opens with the standard Windows 11 launch animation.
- **On-screen names:** "HydraFusion (Research Preview)" with the GitHub logo, and "MAI-Aion-Flash-1.0" with the Microsoft logo (you say "Microsoft Aion Flash").
- **HydraFusion pictures** (A3, A4) come from the HydraFusion blog post.
- **Screens that don't exist yet** (install, routing, explore, offline) are mocked, and the automation prompt is made up.
- **"Staff"** labels are hidden everywhere.

## Cut list with the talking head (approved)

A face tracker measured where you look in every frame. You look into the lens in four blocks and look away (at your notes) everywhere else, and the look-away parts are the ones that describe the product. So: **CAMERA** where you look into the lens, **SCREEN** where you look away. Every cut is a straight cut in a pause between sentences. The exact cut frames were picked from the sound wave (a few frames before the next sentence starts), and your eyes are open at every cut to camera.

Times are from your video file. The finished edit adds a 0.63s silent lead-in (so the icon "hello" happens before "One") and leaves out 2.6s of dead air after "Sol", so after 0:13 everything lands 2.0s earlier in the final. The final runs 3:15.

| Video time | Line | Picture |
| --- | --- | --- |
| 0:00 - 0:11.1 | "One of the best things about GitHub Copilot... frontier models, like Opus, Astra, Fable, and Sol." | **SCREEN**: the animated opening |
| 0:11.1 - 0:13.7 | (silence) | Cut out |
| 0:13.7 - 0:28.6 | "And these models are incredible, but they're not cheap. We know that... a price point that works for you." | **CAMERA**. Punch-in (1.15x) at 0:19.0 ("And we know that...") |
| 0:28.6 - 0:49.8 | "And you need all of this to just work... Project HydraFusion... reducing cost to 67%." | **SCREEN** A1-A4 |
| 0:49.8 - 1:03.5 | "But our vision for this goes beyond just the models that are in the cloud... an AI that runs right on your desk." | **CAMERA**. Punch-in at 0:54.7 ("If you really want to save money...") |
| 1:03.5 - 1:57.8 | Local model routing is coming, no configuration, models found automatically, Aion Flash, automatic routing | **SCREEN** B1-B7 |
| 1:57.8 - 2:03.6 | "This unlocks a bunch of tasks where you can rely heavily on local models and save a ton." | **CAMERA** |
| 2:03.6 - 3:04.9 | Offloading, plan then hand off, automations, going offline, availability, experimental settings | **SCREEN** C1-C9 |
| 3:04.9 - 3:17.3 | "With GitHub Copilot, you can use any model at any time for any task. And now, that includes local models..." | **CAMERA**. Punch-in at 3:10.5 ("And now...") |

## Rough cut: stills with slow push-ins (built)

Each shot is one still with a slow push-in toward the part that matters, and shots change with a straight cut between sentences. Times are in the finished video. Later we can upgrade the key shots to animated UI.

| Shot | Final time | Line | Picture | Made from |
| --- | --- | --- | --- | --- |
| A1 | 0:26.6 - 0:31.5 | "And you need all of this to just work. It shouldn't be something that you have to think about." | The model menu with the Auto switch | A frame of the opening |
| A2 | 0:31.5 - 0:34.4 | "This is why we created Project HydraFusion," | Model list with HydraFusion (Research Preview) on top, hovered | Rebuilt app |
| A3 | 0:34.4 - 0:41.2 | "an intelligent model orchestrator that plans, implements, and executes across a wide range of cloud models." | The architecture diagram | HydraFusion blog post |
| A4 | 0:41.2 - 0:47.8 | "And this can give you Opus-level performance while significantly reducing cost to 67%." | The chart of pass rate vs. cost | HydraFusion blog post |
| B1 | 1:01.5 - 1:08.5 | "This is why we're pleased to announce today that Intelligent Local Model Routing is coming to GitHub Copilot." | Home screen with the model chip on Auto | 01-home, patched |
| B2 | 1:08.5 - 1:19.5 | "First off, we're making it much easier to discover and use local models... You don't need to choose a provider or discover models or pick reasoning levels." | Settings, Model providers (the setup that goes away), then a closer push | 09-settings-model-providers, Staff hidden |
| B3 | 1:19.5 - 1:28.8 | "Any local models that you have across supported providers, such as Ollama or Microsoft Foundry Local, will be automatically added to the model picker." | Model list with Ollama and Foundry Local models | Rebuilt app |
| B4 | 1:28.8 - 1:35.3 | "And we're very excited to announce that we're adding these local models into GitHub Copilot's Intelligent Routing," | Same list, panning to the Auto switch | Rebuilt app |
| B5 | 1:35.3 - 1:42.3 | "starting with Microsoft Aion Flash, powered by MAI Code 1.1 Flash Models." | MAI-Aion-Flash-1.0 in the list, hovered, with its details card | Rebuilt app |
| B6 | 1:42.3 - 1:49.3 | "Soon, Copilot will be able to automatically install and run Microsoft Aion Flash on capable devices." | A Windows notification: "Installing Microsoft Aion Flash" | Rebuilt app |
| B7 | 1:49.3 - 1:55.8 | "Send a prompt, and Copilot will automatically route to the local model when a task is suitable." | A session where the model changes to MAI-Aion-Flash-1.0 | 08-session-model-change, patched |
| C1 | 2:01.6 - 2:10.0 | "For instance, Copilot will offload tasks like exploring files and code bases to a local model, where this task costs you nothing." | An Explore step running on the local model | 08, patched |
| C2 | 2:10.0 - 2:18.4 | "Or, plan with a big model like Opus or Astra, and then hand off to the local model to implement through the night while you sleep," | Your tech spec session, with the prompt now naming MAI-Aion-Flash-1.0 | 03-session-tech-spec, patched |
| C3 | 2:18.4 - 2:23.7 | "letting the local model take the hit of reading all those files and input tokens." | The session browser | 04-session-browser, patched |
| C4 | 2:23.7 - 2:30.8 | "Users love automations in GitHub Copilot. And these are tasks that run in the background..." | New automation dialog, named PR/Issue Triage, prompt still empty | 05-new-automation, patched |
| C5 | 2:30.8 - 2:40.2 | "Like this one here, which just babysits all of my issues and PRs, looks to see if anything is needed from me, perfect for a local model." | The same dialog filled in: a prompt, MAI-Aion-Flash-1.0 · Medium, Create enabled | 05, patched |
| C6 | 2:40.2 - 2:48.4 | "Or, this allows you to go completely offline for super sensitive tasks where you want to be sure nothing leaves your machine." | A session that is offline and runs on the local model | 08, patched |
| C7 | 2:48.4 - 2:53.9 | "Capable devices will be able to start using intelligent local model routing soon." | MAI-Aion-Flash-1.0 in the list again, framed wider | Rebuilt app |
| C8 | 2:53.9 - 2:58.5 | "And Project HydraFusion for hosted models is available today for everyone." | Composer with HydraFusion chosen and a prompt typed | Rebuilt app |
| C9 | 2:58.5 - 3:02.9 | "Just look for it in the experimental settings of the GitHub Copilot app." | Settings, Experimental, searched for "hydrafusion", switch on | 06-settings-experimental, patched |

### Please check: things I made up or assumed

**Made up, because the screen doesn't exist yet (send the real thing if it does):**

- B6: the "Installing Microsoft Aion Flash" notification. With no taskbar, it sits in the bottom-right corner of the screen.
- C1: how an Explore step shows its model, nested under the step with a thin guide line.
- C6: the offline notice.
- C9: the "Models" group and the wording of the HydraFusion setting.
- B3 to B5 and C7: "phi-4-mini" as the Foundry Local model, MAI-Aion-Flash-1.0 placed last in the GitHub Copilot section, and its details card (128K context, 3 reasoning levels, zero cost).
- B7, C1 and C6: "Model changed to MAI-Aion-Flash-1.0 · Local", with "Local" as the provider name.
- B1, B7 and C1: the composer's model chip says "Auto" while routing is on.
- C5: the automation prompt, and the automation pinned to "MAI-Aion-Flash-1.0 · Medium".
- C8: the chip says "HydraFusion (Research Preview) · Medium". It may not have an effort level.

**Wording to check:**

- A4: you say "reducing cost to 67%", but the blog says cost is "67% lower". Those mean different things: "to 67%" is a third off, "67% lower" is two thirds off. One of them should change.
- A3 and A4 are captured live from the blog post, so a rebuild needs the internet and picks up any edits to the post. The diagram has a typo ("conistiuents"). Table 1 in the post could replace the chart in A4.
- C2: the prompt now says "hand it all off to the local MAI-Aion-Flash-1.0 model", and your typos ("dowload", "lets", "abilty") are kept. The session's main model still shows Claude Opus 5.5, which fits "plan with a big model like Opus".
- Your model test sessions in the sidebars got ordinary names ("Implement share links", "Add dark mode" and so on). "Local model test" is kept.

**Framing I left as is for now:**

- There's no taskbar anywhere, as in your screenshots.
- B4 ends mid-pan, with the model list cut off at the right edge.
- B7, C1 and C6 cut through the sidebar's session names at the left edge.
- B1 and C7 show a strip of desktop at the right.
- Your 02-model-picker screenshot isn't used. The rebuilt picker replaced it everywhere.

## Rebuilding

From the `promo` folder:

1. `python mocks.py` remakes the stills in `assets\mocks` (`--only local,aion` for some of them).
2. `python stills.py` renders the three still films into `build` in about 7 minutes (`--only screen-b` for one, `--preview` for PNGs of each shot's first and last frame).
3. `node compose.mjs` builds `build\copilot-promo.mp4` in about 3 minutes.

Shot times and push-ins live in `film\edit.mjs`. The opening film is rendered with `node render.mjs --crf 0`.

## Opening (first 10 seconds)

**Status: built and re-timed to the new take.** It runs 0:00 - 0:11.7 in the final, then cuts to camera. The picture is the approved one, the hover order is now Opus, Astra, Fable, Sol, and every cue after "One" moved to the new word times. All timing lives in `promo\film\timeline.mjs`. The table below is the old take's timing, kept for reference.

Old-take timing (speech started at 0.89s):

| Time | Voiceover | Camera | Cursor and UI |
| --- | --- | --- | --- |
| 0.00 - 0.86 | (silence) | Close-up on the GitHub Copilot desktop icon, 2.5x. Still. | The icon says "hello": a 12px hop (0.15s to 0.45s), then a 6px hop (0.45s to 0.72s), then it settles. The cursor slides in from the lower right (0.50s to 0.86s) |
| 0.86 - 1.02 | "One..." | Still | Double-click at 0.90s and 1.02s. The icon shows the Windows selection highlight |
| 1.00 - 2.30 | "...of the best things about" | Pull back from 2.5x to the full desktop (1x) | A short launch delay, then at 1.85s the window opens with the Windows 11 animation (0.18s fade plus a 95% to 100% scale over 0.3s). It settles at 2.15s. Opening it late means we see a window pop open, not a full-screen dissolve |
| 2.30 - 3.30 | "GitHub Copilot" | Hold wide | Nothing moves. The whole app is on screen as the name is said |
| 3.30 - 5.20 | "is that you get to use all of the latest..." | Push in from 1x to 1.55x toward the composer (3.3s to 5.0s) | Cursor moves to the model chip (3.45s to 4.10s) and the chip shows its hover color. Click at 5.20s on "latest" |
| 5.20 - 7.00 | "...frontier models." | Re-frame onto the model picker, 1.55x to 1.81x (5.7s to 7.0s) | Menu opens (Auto / Model / Effort / Context window). Cursor moves onto Model (5.36s to 5.62s) and the model list opens at 5.57s |
| 7.00 - 9.80 | "Models like Opus, Sol, Astra, Fable." | Hold | The cursor slides up the list onto Opus, and the details card shows up at 7.36s on "Opus". Then **Sol** 8.02s, **Astra** 8.48s, and back up to **Fable** 8.98s. Hold on Fable |
| 9.80 | Next line: "Those models are incredible..." |  |  |

### Boards (framing only, made from your screenshots)

The picker boards still show the old model list. The rebuilt version will use the list above.

![0.0s icon hello](storyboard/b1-icon-hello.png)

![1.05s app opens and camera pulls back](storyboard/b2-reveal.png)

![3.3s click the model chip](storyboard/b3-click-chip.png)

![5.2s picker opens](storyboard/b4-picker-open.png)

![7.2s hover the models](storyboard/b5-hover-models.png)

### Screens to rebuild for this section

1. Desktop: Windows 11 Bloom wallpaper, no taskbar (it's hidden in your screenshots), and the GitHub Copilot icon with its label, hover highlight and selection highlight.
2. App window: title bar with minimize, maximize and close, rounded corners, shadow and the Windows 11 open animation.
3. Sidebar: New (selected), Pull requests, Issues, Automations, Factories, Customize, More, the Projects list and the user row.
4. Home screen: GitHub mark, composer (placeholder, +, Interactive, model chip, mic, send), the project/worktree/branch bar, the 3 suggestion cards and the disclaimer.
5. Model chip: rest, hover and open states.
6. Model menu: Auto switch (off), Model row, Effort row, row hover.
7. Model list: Search models, the GitHub Copilot section with provider icons, row hover, check mark on Claude Opus 5.5, divider, More models.
8. Windows arrow cursor.

### Defaults I'm using unless you say otherwise

- The sidebar, project names and branch match your screenshots.
- The icon sits alone on a clean desktop, a little left of center. No Recycle Bin.
- The cursor stays still after the double-click until it heads for the model chip at 3.45s.
- The model menu opens below the chip, like the real app does on the home screen (it only flips up when there is no room). The model list flips up so its bottom lines up with the Model row, and the details card sits 4px to its right.
- The details card numbers for Fable 5.1, Gemini 3.8 Flash, Grok 4.7 and Kimi K3 are placeholders. Send real numbers if you want them.
- On the way to a model, the cursor passes over the rows in between, so the details card briefly shows those models, just like the real app.
- The cursor is drawn at real size on the desktop, so it gets bigger when the camera zooms in.

### Reference material (received)

- Your screen recording of the model picker. The menu, model list, hover colors and details card were measured from it.
- Your home screen screenshot. The sidebar and home screen were measured against it and land within about 1px.
