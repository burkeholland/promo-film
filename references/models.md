# Sharing the work with a smaller model

Most of a promo is judgment: what the screen should do under each line, whether a still matches the
screenshot, whether a cut lands on a word. That stays on the most capable model. But a good part of
each round is running a command and reading back what it printed, and a small, fast model does that
just as well for a fraction of the tokens. This page says which jobs those are, how to find a small
model in whatever harness you are in, and how to hand a job over so it comes back right.

## Find the small model (do this once, at the start)

1. Look at the models your harness lets you choose for a subagent (a helper agent with its own
   context). In the GitHub Copilot app and CLI that is the `model` option of the `task` tool; other
   harnesses have their own list, or none.
2. Take the first one offered from this list, fastest and cheapest first:

   | Prefer | Model |
   | --- | --- |
   | 1 | `claude-haiku-5.5` |
   | 2 | `gpt-6-luna` |
   | 3 | `gpt-5.6-luna` |
   | 4 | `gemini-3.8-flash` |
   | 5 | `gpt-5.4-mini` |
   | 6 | `claude-haiku-4.5` |
   | 7 | `gpt-5-mini` |

   A newer model in the same family (a later Haiku, Luna, Flash or mini) is fine too.
3. If none is offered, or the harness has no subagents, do the jobs below yourself. Nothing else
   changes: the jobs are the same commands either way.

Say which model you picked in your first reply, in one line, so the person knows.

## Which jobs go to it

The small model gets a job only when the answer is something a command prints. If the job needs
eyes on a picture or a feel for timing, it stays with you.

| Small model | Stays with the main model |
| --- | --- |
| `node deliver.mjs` and `node deliver.mjs --draft`, then report the summary | The outline and the cut list |
| `node render.mjs --all --check` / `--stamp` and other runs that print a verdict | Drawing a screen in the kit against a screenshot |
| `node tools/said.mjs "words"`: where a phrase is said | Choosing what the screen does under each line |
| Finding the exact wording of a label in the app's source | Reading sheets and stills and deciding if they are right |
| Mechanical edits: a rename across files, copying a tool back to `SKILL/template` | Anything with sound: cuts, splices, pauses |
| Running the layout lint and listing warnings | Reading review notes and deciding the fix |
| `python tools/transcribe.py` after a new take, then report failing cues | Writing the reply to the person |

Two things never go to the small model, even though they look mechanical: deciding a still is
fine (it cannot be trusted to notice a 4 px shift), and touching the voice.

## How to hand a job over

A small model does well with an exact command and an exact shape for its answer, and badly with
"have a look". Give it:

1. The folder to work in.
2. The command, word for word.
3. What to send back, word for word, and what to do if the command fails.

For example:

> In `C:\videos\launch`, run `node deliver.mjs`. It takes a few minutes. When it finishes, reply
> with only: the "Video:" line, the number of layout warnings and each warning, and the number of
> made-up things. If it fails, reply with the name of the step that failed and the last 20 lines of
> its output. Do not change any file.

Then read its answer and decide what happens next yourself. Do not ask it to fix what it found.

## Why it saves tokens

A full render or delivery prints hundreds of lines of progress. When the main model runs it, every
line goes into the main conversation and is read again on every later step. When a small model runs
it, the main conversation only gets the five lines that matter.
