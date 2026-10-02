"""Transcribes the recording and writes every word's time to film/words.mjs.

    python tools/transcribe.py                    the RECORDING in film/edit.mjs
    python tools/transcribe.py assets/video/x.mp4 another file
    python tools/transcribe.py --model small.en   a faster, rougher model
    python tools/transcribe.py --force            listen again (the result is
                                                  kept in transcript/ otherwise)

Whisper hears the words, but its word times are often 0.1 to 0.4 s off. So
each word's start is measured from the sound itself, as the moment the voice
rises out of the quiet before it. A word inside a phrase has no quiet before
it and keeps Whisper's time (its `measured` flag is 0).

Two optional files in transcript/ make the words right:
  vocabulary.txt  product and model names, in a sentence or two, so Whisper
                  spells them correctly.
  fixes.txt       one `heard => said` per line for what it still gets wrong,
                  like `Hydrofusion => HydraFusion` or `play in with => plan with`.

Also writes transcript/<name>.txt, the script by sentence with times, for
planning the edit. Needs: pip install faster-whisper numpy, and ffmpeg.
"""
import argparse
import json
import re
import subprocess
import sys
import time
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
RATE = 16000
HOP = 0.005


def recording_from_edit():
    text = (ROOT / 'film' / 'edit.mjs').read_text(encoding='utf-8')
    match = re.search(r"^export const RECORDING = '([^']+)'", text, re.M)
    if not match:
        sys.exit('film/edit.mjs names no RECORDING. Set it, or pass a file.')
    return ROOT / 'assets' / 'video' / match.group(1)


def listen(audio, model_name, prompt):
    from faster_whisper import WhisperModel

    def run(device, compute_type):
        model = WhisperModel(model_name, device=device, compute_type=compute_type)
        segments, info = model.transcribe(str(audio), language='en', beam_size=5, word_timestamps=True,
                                          initial_prompt=prompt or None, condition_on_previous_text=True)
        return [{'start': s.start, 'end': s.end, 'text': s.text.strip(),
                 'words': [{'word': w.word, 'start': w.start, 'end': w.end} for w in (s.words or [])]} for s in segments], info

    try:
        segments, info = run('cuda', 'float16')
    except Exception as error:  # Missing CUDA libraries show up when it runs.
        print(f'No GPU ({str(error).splitlines()[0]}); using the CPU', file=sys.stderr)
        segments, info = run('cpu', 'int8')
    return {'model': model_name, 'duration': info.duration, 'segments': segments}


def loudness(audio):
    """RMS in dBFS over 20 ms windows every 5 ms."""
    data = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(audio), '-ac', '1', '-ar', str(RATE), '-f', 's16le', '-'],
                          capture_output=True, check=True).stdout
    samples = np.frombuffer(data, np.int16).astype(np.float32) / 32768
    frames = np.lib.stride_tricks.sliding_window_view(samples, int(0.02 * RATE))[::int(HOP * RATE)]
    return 20 * np.log10(np.sqrt((frames ** 2).mean(axis=1)) + 1e-9)


def onset(db, at, limit):
    """Where the voice rises out of at least 40 ms of quiet, from 0.15 s before
    Whisper's time to 0.5 s after it, but never as late as the next word."""
    lo, hi = max(0, int((at - 0.15) / HOP)), min(len(db), int((at + 0.5) / HOP))
    span = db[lo:hi]
    after = db[int(at / HOP):min(len(db), int((at + 0.6) / HOP))]
    if len(span) < 20 or not len(after):
        return None
    quiet, loud = np.percentile(span, 10), np.percentile(after, 90)
    if loud - quiet < 15:
        return None
    threshold = quiet + 0.25 * (loud - quiet)
    run = 0
    for i, value in enumerate(span):
        if value < threshold:
            run += 1
            continue
        if run >= 8:
            found = (lo + i) * HOP
            return found if found <= limit else None
        run = 0
    return None


def fix(words, fixes):
    for heard, said in fixes:
        old, new = heard.split(), said.split()
        i = 0
        while i + len(old) <= len(words):
            if [w['text'] for w in words[i:i + len(old)]] != old:
                i += 1
                continue
            # The new words line up with the old ones from the end, and the
            # first one starts where the first old one did.
            source = words[i:i + len(old)]
            made = []
            for k, text in enumerate(new):
                src = source[max(0, len(old) - len(new) + k)]
                made.append({**src, 'text': text, 'start': source[0]['start'] if k == 0 else src['start'],
                             'measured': source[0]['measured'] if k == 0 else src['measured']})
            words[i:i + len(old)] = made
            i += len(new)


def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('audio', nargs='?')
    parser.add_argument('--model', default='large-v3-turbo')
    parser.add_argument('--force', action='store_true')
    args = parser.parse_args()

    audio = Path(args.audio).resolve() if args.audio else recording_from_edit()
    if not audio.exists():
        sys.exit(f'{audio} is missing.')
    notes = ROOT / 'transcript'
    notes.mkdir(exist_ok=True)
    read = lambda name: (notes / name).read_text(encoding='utf-8') if (notes / name).exists() else ''
    prompt = ' '.join(read('vocabulary.txt').split())
    fixes = [tuple(part.strip() for part in line.split('=>')) for line in read('fixes.txt').splitlines()
             if '=>' in line and not line.lstrip().startswith('#')]

    cache = notes / f'{audio.stem}.whisper.json'
    stat = audio.stat()
    key = {'size': stat.st_size, 'modified': int(stat.st_mtime), 'model': args.model, 'prompt': prompt}
    heard = json.loads(cache.read_text(encoding='utf-8')) if cache.exists() else None
    if args.force or not heard or heard.get('key') != key:
        started = time.time()
        heard = {'key': key, **listen(audio, args.model, prompt)}
        cache.write_text(json.dumps(heard, indent=1), encoding='utf-8')
        print(f'Transcribed {heard["duration"]:.1f} s with {args.model} in {time.time() - started:.0f} s')

    # Whisper splits some words in two ("cutting -edge", "1 .1", "100 %").
    words = []
    for index, segment in enumerate(heard['segments']):
        for word in segment['words']:
            text = word['word'].strip()
            if not text:
                continue
            if words and words[-1]['line'] == index and (text[0] in '-.' or not re.search(r'\w', text)):
                words[-1]['text'] += text
                words[-1]['end'] = word['end']
            else:
                words.append({'text': text, 'start': word['start'], 'heard': word['start'], 'end': word['end'], 'line': index})

    # Over silence at the end Whisper can make words up. They have no length.
    for i in range(len(words) - 2):
        if all(w['end'] - w['start'] < 0.02 for w in words[i:i + 3]):
            print(f'Left out {len(words) - i} made-up words after {words[i]["start"]:.1f} s (silence)')
            del words[i:]
            break

    db = loudness(audio)
    for i, word in enumerate(words):
        limit = words[i + 1]['start'] - 0.03 if i + 1 < len(words) else word['end']
        found = onset(db, word['start'], limit)
        word['measured'] = int(found is not None)
        if found is not None:
            word['start'] = found
    # A short word just ahead of a pause-free one can pick up its neighbor's
    # rise. Two words can't start together, so the first goes back to
    # Whisper's time.
    for i in range(len(words) - 1):
        word, after = words[i], words[i + 1]
        if word['measured'] and after['start'] - word['start'] < 0.04:
            word['start'] = min(word['heard'], after['start'] - 0.05)
            word['measured'] = 0
    for i, word in enumerate(words):
        if i:
            word['start'] = max(word['start'], words[i - 1]['start'])
        word['end'] = max(word['end'], word['start'] + 0.05)
    fix(words, fixes)

    lines = []
    for word in words:
        if not lines or lines[-1][-1]['line'] != word['line']:
            lines.append([])
        lines[-1].append(word)
    quote = lambda text: "'" + text.replace('\\', '\\\\').replace("'", "\\'") + "'"
    body = ['// Every word of the recording: [text, start, end, measured]. Times are seconds in',
            '// the recording; `measured` is 1 when the start was found in the sound itself',
            '// and 0 when it is Whisper\'s guess. `python tools/transcribe.py` writes this',
            '// file, so don\'t edit it by hand. Fix a misheard name in transcript/fixes.txt',
            '// and run it again.',
            f'export const SOURCE = {quote(audio.name)};',
            'export const WORDS = [']
    for line in lines:
        body.append('  ' + ' '.join(f"[{quote(w['text'])}, {w['start']:.3f}, {w['end']:.3f}, {w['measured']}]," for w in line))
    body.append('];')
    (ROOT / 'film' / 'words.mjs').write_text('\n'.join(body) + '\n', encoding='utf-8')

    stamp = lambda t: f'{int(t // 60)}:{t % 60:05.2f}'
    script = [f'[{stamp(line[0]["start"])} - {stamp(line[-1]["end"])}]  {" ".join(w["text"] for w in line)}' for line in lines]
    (notes / f'{audio.stem}.txt').write_text('\n'.join(script) + '\n', encoding='utf-8')
    measured = sum(w['measured'] for w in words)
    print(f'{len(words)} words ({measured} measured from the sound) -> film/words.mjs and transcript/{audio.stem}.txt')


if __name__ == '__main__':
    main()
