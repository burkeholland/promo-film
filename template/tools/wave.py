"""Look at sound when you cannot hear it: where it starts and stops, and what it looks like.

    python tools/wave.py <file> <from> <to>            sound runs, and build/wave/<file>-<from>.png
    python tools/wave.py <file> <from> <to> --levels   also the level every 10 ms
    python tools/wave.py a.mp4 58 64 --and b.mp4 --shift 3.05   a second file under the first,
                                                       read `shift` seconds earlier (b's 54.95 is a's 58)

A "run" is a stretch louder than --floor dB (default -50) with no silence longer than --gap
seconds (default 0.06) inside it. Runs tell you where words start and stop, how long each pause
is, and whether a cut landed in silence. The picture has the waveform and a spectrogram with a
line every 0.1 s (every 0.02 s when the stretch is under a second), so a time read off it can go
straight into a script.

Reading the spectrogram, enough to find a word's real end:
  - A vowel is bright bands up to 3 kHz and a tall waveform.
  - M, N, NG and a final L are quiet and sit below 500 Hz only. They belong to the word they
    end ("including", "install"), and they are where a cut by ear or by "lowest point" goes wrong.
  - P, T, K, B, D, G are a short gap (30 to 80 ms) INSIDE a word, then a burst. A gap is not
    a word boundary: "including" has one before "-ding".
  - S, SH, F are noise above 3 kHz with little below.
  - A real pause between words is 60 ms or more of nothing at any height.

Needs ffmpeg, numpy and matplotlib (pip install numpy matplotlib).
"""
import argparse
import pathlib
import subprocess
import sys

import numpy as np

R = 16000


def load(path, t0, t1):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{max(t0, 0):.4f}', '-t', f'{t1 - t0:.4f}', '-i', str(path),
                          '-ac', '1', '-ar', str(R), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32)


def db(x):
    return 20 * np.log10(max(float(x), 1e-9))


def runs(x, t0, floor, gap):
    """[(start, end)] of stretches above `floor` dB, joined across silences shorter than `gap`."""
    step = 80                                             # 5 ms
    n = len(x) // step * step
    env = np.sqrt((x[:n].reshape(-1, step) ** 2).mean(1))
    loud = np.nonzero(env > 10 ** (floor / 20))[0]
    if not len(loud):
        return []
    groups = np.split(loud, np.nonzero(np.diff(loud) > gap * R / step)[0] + 1)
    return [(t0 + g[0] * step / R, t0 + (g[-1] + 1) * step / R) for g in groups]


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('file')
    ap.add_argument('start', type=float)
    ap.add_argument('end', type=float)
    ap.add_argument('--and', dest='other', help='a second file to show under the first')
    ap.add_argument('--shift', type=float, default=0, help="seconds the second file runs ahead: its time is the first's minus this")
    ap.add_argument('--floor', type=float, default=-50)
    ap.add_argument('--gap', type=float, default=.06)
    ap.add_argument('--levels', action='store_true')
    ap.add_argument('--out')
    ap.add_argument('--no-picture', action='store_true')
    args = ap.parse_args()
    if args.end <= args.start:
        sys.exit('<to> must be after <from>.')

    rows = [(args.file, 0.0)] + ([(args.other, args.shift)] if args.other else [])
    sounds = []
    for path, shift in rows:
        x = load(path, args.start - shift, args.end - shift)
        sounds.append(x)
        found = runs(x, args.start, args.floor, args.gap)
        print(f'{pathlib.Path(path).name}  {args.start:.2f}-{args.end:.2f}s' + (f'  (its own time is {shift:+.3f}s earlier)' if shift else ''))
        for k, (a, b) in enumerate(found):
            pause = f'   then {found[k + 1][0] - b:.2f}s of silence' if k + 1 < len(found) else ''
            print(f'  sound {a:7.2f} - {b:7.2f}  ({b - a:.2f}s){pause}')
        if not found:
            print('  silence')
        if args.levels:
            n = R // 100
            for i in range(0, len(x) - n + 1, n):
                seg = x[i:i + n]
                spec = np.abs(np.fft.rfft(np.pad(seg, (0, 512 - n)) * 1.0)) ** 2
                low = spec[: int(500 / (R / 512))].sum() / (spec.sum() + 1e-12)
                print(f'  {args.start + i / R:8.2f}s {db(np.sqrt((seg ** 2).mean())):7.1f} dB   {low:4.0%} below 500 Hz')

    if args.no_picture:
        return
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    span = args.end - args.start
    tick = .02 if span <= 1 else .1 if span <= 8 else .5
    fig, axes = plt.subplots(2 * len(rows), 1, figsize=(22, 6.2 * len(rows)), gridspec_kw={'height_ratios': [1, 1.6] * len(rows)}, squeeze=False)
    for k, ((path, shift), x) in enumerate(zip(rows, sounds)):
        if not len(x):
            continue
        t = args.start + np.arange(len(x)) / R
        wave, spec = axes[2 * k][0], axes[2 * k + 1][0]
        wave.plot(t, x / (np.abs(x).max() + 1e-9), lw=.5, color='k')
        wave.set_title(f'{pathlib.Path(path).name}' + (f'  (shifted {shift:+.3f}s)' if shift else ''), loc='left', fontsize=13)
        fft = 256 if span <= 1 else 400
        spec.specgram(x + 1e-7 * np.random.default_rng(0).standard_normal(len(x)).astype(np.float32), NFFT=fft, Fs=R, noverlap=fft - 16,
                      xextent=(args.start, args.start + len(x) / R), cmap='magma', vmin=-115, vmax=-35)
        spec.set_ylim(0, 5000)
        for ax in (wave, spec):
            ax.set_xlim(args.start, args.end)
            ax.set_xticks(np.arange(np.ceil(args.start / tick - 1e-6) * tick, args.end, tick))
            ax.grid(axis='x', alpha=.5)
            ax.tick_params(axis='x', labelsize=8, rotation=60 if tick < .1 else 0)
    plt.tight_layout()
    out = pathlib.Path(args.out) if args.out else pathlib.Path('build') / 'wave' / f'{pathlib.Path(args.file).stem}-{args.start:07.2f}.png'
    out.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(out, dpi=70)
    print(f'Wrote {out}')


if __name__ == '__main__':
    main()
