# Sound

The recording's sound is the soundtrack, so most videos need nothing here. Read this when the
person asks to change a word they said, tighten a pause, clean up the audio, or sends back their
own re-cut of the take.

**You cannot hear.** Every change to the sound is checked three ways before it is sent: the words
(`python tools/transcribe.py`, or Whisper on the finished file), where sound starts and stops
(`python tools/wave.py`), and the picture of the waveform and spectrogram that `wave.py` writes.
Then say in the delivery which spots the person should listen to. Whisper reading the right
words is not proof: it read "including" correctly from a cut that had lost "-ding".

## Loudness and cleanup

- compose measures the voice, turns it to -14 LUFS and holds peaks at -1.5 dBFS with a limiter.
  That is right for a raw recording.
- **Sound that was already cleaned up gets one plain gain and no limiting.** When compose prints
  "the limiter takes up to N dB off", and the sound came from Adobe Podcast or a mastered
  voiceover, set `LOUDNESS` in `film/edit.mjs` to the value it prints. The video is a little
  quieter (about -16 to -17 LUFS) and sounds like the file the person approved.
- **Never run a cleanup tool on a finished cut.** The cut's sound has already been turned up into
  the limiter, and turning it up again afterwards doubles that. The person hears it as "not
  cleaned up". Clean the recording first, then build on the cleaned recording.
- If the person cleans the audio themselves, ask for that file and use its sound as the
  recording. If it is a re-cut too, see "The person re-cut the take" below.
- A cleanup tool (Adobe Podcast Enhance and the like) returns sound several dB quieter than what
  went in and may shift it a few tens of milliseconds. Check what comes back with ffprobe (same
  length) and `tools/align.py` (the offset) before building on it.

## Replacing words in the speaker's own voice

"They renamed it, and I say the old name twice." If any take has the speaker saying the new words,
they can be laid in. `examples/local-models/audio/voicepatch.py` is a worked script; copy it and
change the constants at the top.

1. **Find the new words.** Transcribe every take the person gave you, including rejected ones.
   One clean reading is enough for every place the words are needed.
2. **Cut the phrase out of its take on real silence** on both sides (`wave.py`, a run boundary).
3. **Match the tone.** Two takes differ in tone even on the same day. Compare long-term spectra
   of a minute of each, in octave bands, and apply the difference to the phrase with a zero-phase
   EQ. Match the level to the words it replaces.
4. **Find where the word before the old words really ends.** This is the step that goes wrong.
   Look at the spectrogram, not the lowest point of the waveform:
   - a short gap inside a word is a P, T, K, B, D or G, not a boundary ("inclu | ding");
   - M, N, NG and a final L are quiet and low, and they belong to the word they end
     ("includi**ng**", "insta**ll**");
   - the old words start where the next sound starts after that.
   Keep the whole word. Fade its last 30 ms. Silence the old words from there to the start of
   the next word you keep.
5. **Start the new words where the old ones started**, so the join has the speaker's own rhythm.
   When the old words ran straight on from the word before (no pause), leave about 0.08 s.
6. **Deal with the leftover time.** New words are rarely the same length. If they are shorter,
   there is now a pause after them. Leave the extra silence out in the edit (below) so the pause
   matches the ones around it. If they are longer, they need a re-record: do not time-stretch.
7. **Move the cues.** Scenes that name the old words (a title card that builds on "Flash") get
   the new word times.
8. **Clean up once.** If the recording is to go through a cleanup tool, do it after the splice,
   so the phrase and the take get the same treatment.

## Rhythm: how long a pause should be

Measure the speaker's own pauses with `wave.py` over a nearby sentence and match them. From one
speaker at a brisk pace, as a starting point:

| Between | Silence |
| --- | --- |
| Words in one phrase | none, or under 0.1 s |
| A word and a name it runs into | about 0.08 s |
| At a comma | 0.3 to 0.35 s |
| Between sentences | about 0.5 s |
| Before a new thought | 0.8 s or more |

A pause 0.3 s longer than its neighbors is heard as a mistake. Read the gap to the next **sound**,
and look at what that sound is: a soft "a" before a loud word still ends the pause.

## Taking time out (and why not to move anything)

To shorten a pause or drop a line, **leave that stretch out of the edit**: end one part early and
start the next where the sound picks up. Parts do not have to touch.

```js
{ film: 'title', from: frame(1709), to: frame(1869) },   // 21 frames of silence after the name
{ film: 'install', from: frame(1890), to: frame(2049) }, // are left out
```

- Both ends of the gap must be in silence (`wave.py`). compose fades each side 10 ms.
- Nothing else moves. Cues are times in the recording, so scenes after the gap need no change.
- The part that got shorter may need its last cue pulled in (a sheen, a reply that finishes on
  the last word). Render a still just before its new end.
- Never shift the sound itself to close a gap: every cue after it would be wrong.

## The person re-cut the take

They send back an edit of an earlier cut: a line reworded, sound cleaned, a pause trimmed. The
picture in their file is stale (it is your old films). What you want is their **sound**, on the
take's own timeline.

1. `python tools/align.py <take> <their file>` prints which stretches are the take (and how far
   they moved) and which are new. The difference between two offsets is what they removed, to
   the frame.
2. Transcribe their file and read the new stretch.
3. Build the recording: the take's picture with their sound laid back at the take's times, and
   nothing in the stretch they removed. `examples/local-models/audio/v6audio.py` does this. Use
   offsets measured to the millisecond (its `lag()`), one for each side of a change, so the
   speaker's lips stay in step in camera parts.
4. Leave the removed stretch out of the edit, re-time the one scene that plays under the new
   words, and give its cues the new words.
5. **Check the screen says nothing the script stopped saying.** A line is usually dropped because
   it promised too much. Search the scenes for the same promise in on-screen text (a reply that
   says "everything ran on this device") and take it out, then say you did.

## What to tell the person

Each delivery that touched sound says: what changed and where (times in the finished video), the
pauses around it in seconds, what you could not check ("I can't hear it, so please listen at 1:00
and 2:18"), and anything you changed that they did not ask for.
