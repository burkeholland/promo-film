"""Build the recording for v6: Burke's take with his own cleaned-up sound.

Burke's local-models-announcement-v4 (assets/video/local-models-v4-enhanced.mp4) is an edit of
an earlier cut of this video whose sound he ran through Adobe Podcast Enhance. Its sound is the
second take, with the end of the offline line changed to "or when you just don't have an
internet connection" (3.1 s shorter). This lays that sound back on the second take's own
timeline, so every cue in film/ still holds:

  up to OUT            v4's sound, in step with the take
  OUT to IN            nothing (the edit leaves this stretch out: film/edit.mjs)
  from IN              v4's sound again, 3.1 s later than in v4

Both times he says "Microsoft Aion Flash 1.0" are then replaced with his "MAI Code 1.1 Flash",
taken from build/copilot-promo-v5-adobe-raw.mp4, where that splice (work/voicepatch.py) has been
through the same Adobe pass. The word before each name is kept whole (NAMES below).

    python work/v6audio.py     writes assets/video/local-models-v6.mp4
"""
import pathlib
import subprocess

import numpy as np

HERE = pathlib.Path(__file__).resolve().parents[1]
R = 48000
V2 = HERE / 'assets/video/local-models-v2.mp4'
V4 = HERE / 'assets/video/local-models-v4-enhanced.mp4'
V5 = HERE / 'build/copilot-promo-v5.mp4'
V5A = HERE / 'build/copilot-promo-v5-adobe-raw.mp4'
OUT_FILE = HERE / 'assets/video/local-models-v6.mp4'
# Frames of the take where the edit jumps (film/edit.mjs: offline ends, settings-hydra starts).
OUT, IN = 3778 / 30, 3871 / 30
# The two names. `keep` is where the word before the name ends, read off the waveform and
# spectrogram: "install" runs on into "Microsoft" through its L, which ends at 59.95 where the M
# starts, and "including" ends with its "-ng" dying away at 142.36, 0.1 s before "Microsoft".
# (v5 and v6 cut both words short, at the dip before "-ll" and at the D of "including".)
# The old name is silenced from there to `clear_to`. `phrase` is where the name is in v5's
# Adobe pass, and `at` is where it goes: 4 frames earlier than in v5 the first time and 4 frames
# later the second, so it starts about 0.08 s after the word before it, as "Microsoft" did.
NAMES = [
    {'keep': 59.955, 'clear_to': 62.93, 'phrase': (60.14, 62.26), 'at': 60.14 - 4 / 30},
    {'keep': 142.375, 'clear_to': 144.75, 'phrase': (142.29, 144.41), 'at': 142.29 + 4 / 30},
]
# Words said the same way in both, next to each name, to match levels on.
NEAR = [(56.9, 59.8), (136.8, 142.0)]
FADE = .012
# The last 30 ms of the word before the name fade out.
LEAD_OUT = .03


def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '2', '-ar', str(R), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()


def envelope(x, hop=48):
    mono = x.mean(1)
    n = len(mono) // hop * hop
    return np.sqrt((mono[:n].reshape(-1, hop) ** 2).mean(1))


def lag(ref, other, t0, t1, guess, reach=.25):
    """s such that other(t + s) sounds like ref(t), from their 1 ms envelopes."""
    a = ref[int(t0 * 1000):int(t1 * 1000)]
    a = a - a.mean()
    best = (-2, 0)
    for ms in range(int((guess - reach) * 1000), int((guess + reach) * 1000) + 1):
        i = int(t0 * 1000) + ms
        if i < 0 or i + len(a) > len(other):
            continue
        b = other[i:i + len(a)]
        b = b - b.mean()
        c = float((a * b).sum() / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-12))
        best = max(best, (c, ms / 1000))
    return best[1], best[0]


def db(x):
    return 20 * np.log10(max(float(x), 1e-9))


def rms(x):
    return float(np.sqrt((x ** 2).mean()))


def take(x, t0, t1, shift):
    """x from t0 + shift to t1 + shift, padded with silence past its ends."""
    i0, n = int(round((t0 + shift) * R)), int(round((t1 - t0) * R))
    out = np.zeros((n, 2), np.float32)
    a, b = max(i0, 0), min(i0 + n, len(x))
    if b > a:
        out[a - i0:b - i0] = x[a:b]
    return out


def main():
    v2, v4, v5, v5a = load(V2), load(V4), load(V5), load(V5A)
    e2, e4, e5, e5a = envelope(v2), envelope(v4), envelope(v5), envelope(v5a)
    before, c0 = lag(e2, e4, 20, 110, .045)
    after, c1 = lag(e2, e4, 131, 155, -3.055)
    adobe, c2 = lag(e5, e5a, 20, 110, .045)
    print(f'v4 is {before * 1000:+.0f} ms off the take before the change ({c0:.2f}) and {after * 1000:+.0f} ms after it ({c1:.2f}); '
          f'it is {(before - after) * 30:.2f} frames shorter. The v5 Adobe pass is {adobe * 1000:+.0f} ms off v5 ({c2:.2f}).')

    total = len(v2)
    out = np.zeros((total, 2), np.float32)
    n_out, n_in = int(round(OUT * R)), int(round(IN * R))
    out[:n_out] = take(v4, 0, OUT, before)
    out[n_in:] = take(v4, IN, total / R, after)
    jump = (IN + after) - (OUT + before)
    print(f'the jump skips {jump * 1000:+.0f} ms of v4, at {OUT + before:.3f}s in v4')
    for label, t in [('before the jump', OUT), ('after the jump', IN)]:
        i = int(t * R)
        print(f'  {label}: {db(rms(out[i - 2400:i]))-0:.0f} dB in the 50 ms before, {db(rms(out[i:i + 2400])):.0f} dB in the 50 ms after')

    for name, (n0, n1) in zip(NAMES, NEAR):
        gain = rms(out[int(n0 * R):int(n1 * R)]) / rms(take(v5a, n0, n1, adobe))
        keep, clear_to, at = name['keep'], name['clear_to'], name['at']
        # The word before the name plays out to `keep`, then the old name goes.
        k, c, lead = int(round(keep * R)), int(round(clear_to * R)), int(LEAD_OUT * R)
        out[k - lead:k] *= np.cos(np.linspace(0, np.pi / 2, lead, dtype=np.float32))[:, None] ** 2
        out[k:c] = 0
        edge = int(FADE * R)
        ramp = np.sin(np.linspace(0, np.pi / 2, edge, dtype=np.float32)) ** 2
        out[c:c + edge] *= ramp[:, None]
        phrase = take(v5a, *name['phrase'], adobe) * gain
        phrase[:edge] *= ramp[:, None]
        phrase[-edge:] *= ramp[::-1, None]
        i = int(round(at * R))
        if i < k or i + len(phrase) > c:
            raise SystemExit('The name does not fit between the word before it and the end of the old name.')
        out[i:i + len(phrase)] += phrase
        # Where sound runs around the name, from the 5 ms envelope (above -50 dB).
        t0 = keep - .5
        env = envelope(out[int(t0 * R):int((clear_to + .6) * R)], 240)
        loud = np.nonzero(env > 10 ** (-50 / 20))[0]
        runs = [f'{t0 + g[0] / 200:.2f}-{t0 + (g[-1] + 1) / 200:.2f}' for g in np.split(loud, np.nonzero(np.diff(loud) > 12)[0] + 1)]
        print(f"name at {at:.3f}s, turned {db(gain):+.1f} dB. Sound runs: {', '.join(runs)}")

    print(f'peak {db(np.abs(out).max()):.1f} dBFS')
    wav = HERE / 'work' / 'v6audio.wav'
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'f32le', '-ar', str(R), '-ac', '2', '-i', '-', '-c:a', 'pcm_s24le', str(wav)],
                   input=out.tobytes(), check=True)
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(V2), '-i', str(wav), '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
                    '-c:a', 'aac', '-b:a', '320k', '-movflags', '+faststart', str(OUT_FILE)], check=True)
    print(f'Wrote {OUT_FILE.relative_to(HERE)}')


if __name__ == '__main__':
    main()
