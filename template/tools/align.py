"""Find how a re-cut of a recording differs from the recording it came from, by sound alone.

    python tools/align.py <take> <recut>

Use it when the person sends back their own edit of the take ("I changed the wording here",
"I cleaned up the audio"). It follows the recut's loudness shape through the take and prints, for
each stretch of the recut, where that sound is in the take:

    recut   0.00 - 122.95   is the take  +0.045s later      (same words)
    recut 122.95 - 125.40   is not in the take              (new or replaced words)
    recut 125.40 - 154.69   is the take  -3.055s (take 128.46 - 157.75)

From that you know what was left out or replaced, to the frame: the offsets differ by what was
removed (here 3.100 s, 93 frames at 30 fps). Leave the same stretch out of film/edit.mjs (a part
that ends before the next one starts) and every cue after it still holds, because cues are times
in the take. It works on sound that has been cleaned up, compressed or turned up or down: only
the shape of the loudness is compared. Check the words in a stretch it calls new with
tools/transcribe.py or tools/wave.py.

Needs ffmpeg and numpy.
"""
import argparse
import subprocess

import numpy as np

HOP = 480          # 10 ms at 48 kHz
R = 48000


def envelope(path, hop=HOP):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(R), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32)
    n = len(x) // hop * hop
    return np.sqrt((x[:n].reshape(-1, hop) ** 2).mean(1))


def best_place(take, piece):
    """Where `piece` (a window of the recut's envelope) fits the take best: (index, correlation)."""
    a = piece - piece.mean()
    na = np.linalg.norm(a)
    if na < 1e-6 or len(take) < len(piece):
        return 0, 0.0
    n = len(piece)
    dots = np.correlate(take, a, 'valid')
    sums = np.concatenate([[0], np.cumsum(take)])
    squares = np.concatenate([[0], np.cumsum(take ** 2)])
    energy = squares[n:] - squares[:-n] - (sums[n:] - sums[:-n]) ** 2 / n
    corr = dots / (na * np.sqrt(np.maximum(energy, 1e-12)))
    i = int(corr.argmax())
    return i, float(corr[i])


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('take')
    ap.add_argument('recut')
    ap.add_argument('--window', type=float, default=3.0, help='seconds of sound matched at a time')
    ap.add_argument('--match', type=float, default=.7, help='how alike two stretches must be to count as the same (0 to 1)')
    ap.add_argument('--fps', type=float, default=30)
    args = ap.parse_args()

    take, recut = envelope(args.take), envelope(args.recut)
    win, step = int(args.window * 100), 25
    found = []                                             # (recut time, offset or None)
    for s in range(0, max(len(recut) - win, 1), step):
        i, c = best_place(take, recut[s:s + win])
        found.append((s / 100, (i - s) / 100 if c >= args.match else None, c))

    # Stretches with one offset (within 30 ms). A window that straddles a change matches
    # neither side well, so short unmatched stretches between two offsets are the change itself.
    stretches = []
    for t, off, c in found:
        last = stretches[-1] if stretches else None
        same = last and ((off is None and last['off'] is None) or (off is not None and last['off'] is not None and abs(off - last['off']) <= .03))
        if same:
            last['to'] = t
            if off is not None:
                last['offs'].append(off)
        else:
            stretches.append({'from': t, 'to': t, 'off': off, 'offs': [] if off is None else [off]})
    half = args.window / 2
    total = len(recut) / 100
    print(f'take {len(take) / 100:.2f}s, recut {total:.2f}s. Times are where a stretch is centered, good to about {half:.1f}s; offsets are good to 10 ms.')
    kept = [s for s in stretches if s['off'] is None or s['to'] - s['from'] >= 1.0]
    # Join what is left of the unmatched stretches, and drop a short one at either end (the
    # first and last windows often match poorly: a fade, a breath, an encoder's padding).
    merged = []
    for s in kept:
        if merged and s['off'] is None and merged[-1]['off'] is None:
            merged[-1]['to'] = s['to']
        else:
            merged.append(s)
    while merged and merged[0]['off'] is None and merged[0]['to'] - merged[0]['from'] < args.window:
        merged.pop(0)
    while merged and merged[-1]['off'] is None and merged[-1]['to'] - merged[-1]['from'] < args.window:
        merged.pop()
    kept = merged
    for k, s in enumerate(kept):
        a = 0 if k == 0 else s['from'] + half
        b = total if k == len(kept) - 1 else s['to'] + half
        if s['off'] is None:
            print(f'recut {a:7.2f} - {b:7.2f}   is not in the take (new or replaced words, or silence)')
        else:
            off = float(np.median(s['offs']))
            print(f'recut {a:7.2f} - {b:7.2f}   is the take {off:+.3f}s  (take {max(a + off, 0):.2f} - {b + off:.2f})')
    offs = [float(np.median(s['offs'])) for s in kept if s['off'] is not None]
    for before, after in zip(offs, offs[1:]):
        gone = after - before
        if abs(gone) > .03:
            print(f'Between those, the recut is {abs(gone):.3f}s {"shorter" if gone > 0 else "longer"} than the take: {abs(gone) * args.fps:.2f} frames at {args.fps:g} fps.')


if __name__ == '__main__':
    main()
