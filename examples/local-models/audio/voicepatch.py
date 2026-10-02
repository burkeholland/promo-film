"""Replaces "Microsoft Aion Flash 1.0" in the v2 recording with Burke's own
"MAI Code 1.1 Flash" from his first take, at both places it is said.

  python work/voicepatch.py            writes assets/video/local-models-v2-mai.mp4
                                       and work/voicepatch.wav

The phrase is lifted between two silences in take 1 (after "powered by" and
before "models"), given the v2 recording's tone (its long-term spectrum is
thinner in the lows and brighter at the top) and the level of the words it
replaces, and laid in where "Microsoft" started. The recording keeps its
length. The new name is shorter than the old one, so a pause is left after
it: the edit leaves that silence out (film/edit.mjs, the parts that end
before the next one starts).

To use this for another video, change the constants: the two files, SOURCE,
TONE and PLACES. Read references/audio.md first: where `clear` starts is
the thing to get right.
"""
import subprocess
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent.parent
V2 = HERE / 'assets' / 'video' / 'local-models-v2.mp4'
TAKE1 = HERE / 'assets' / 'video' / 'local-models.mp4'
OUT = HERE / 'assets' / 'video' / 'local-models-v2-mai.mp4'
R = 44100

# "MAI Code 1.1 Flash" in take 1: from the silence after "by" to the dip
# between the "sh" of "Flash" and the "m" of "models".
SOURCE = (101.455, 103.497)
# Take 1 to v2, in dB at Hz, from the two recordings' average speech spectra.
TONE = [(113, -5.0), (226, -2.0), (453, 0.0), (905, -1.5), (1810, -0.5), (3620, -0.3), (7240, 3.9), (14140, 5.0)]
# Where it goes in v2: the stretch to clear (the old name, from the end of
# the word before it to the silence after "1.0") and when the new phrase
# starts. `clear` starts 30 ms (LEAD_OUT) before the word before the name
# ends, read off the spectrogram (python tools/wave.py):
#   "install" runs on into "Microsoft" through its L, which ends at 59.95,
#     where the M starts;
#   "including" ends with its "-ng" dying away at 142.37, 0.1 s before
#     "Microsoft".
# The first two versions of this cut at 59.875 and 142.09 instead, the lowest
# points of the waveform. Those are the end of the vowel in "install" and the
# D inside "including", so both words lost their endings and the speaker
# heard it at once. The name starts about 0.08 s after the word before it.
PLACES = [
    {'clear': (59.925, 62.93), 'start': 60.017},
    {'clear': (142.345, 144.75), 'start': 142.433},
]
FADE = 0.012
# The word before fades out over this long.
LEAD_OUT = 0.03


def decode(path, channels):
    data = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', str(channels), '-ar', str(R), '-f', 'f32le', '-'],
                          capture_output=True, check=True).stdout
    return np.frombuffer(data, np.float32).reshape(-1, channels).copy()


def level(x):
    """The 90th percentile of the RMS over 20 ms windows, in dB: how loud the speech is."""
    mono = x.mean(axis=1) if x.ndim == 2 else x
    frames = np.lib.stride_tricks.sliding_window_view(mono, int(0.02 * R))[::int(0.005 * R)]
    return np.percentile(20 * np.log10(np.sqrt((frames ** 2).mean(axis=1)) + 1e-9), 90)


def tone(x):
    """Applies TONE with no phase shift."""
    n = len(x)
    size = 1 << (n + 4096 - 1).bit_length()
    spectrum = np.fft.rfft(np.pad(x, (2048, size - n - 2048)))
    freqs = np.fft.rfftfreq(size, 1 / R)
    points, gains = zip(*TONE)
    gain = np.interp(np.log(np.maximum(freqs, 1)), np.log(points), gains)
    return np.fft.irfft(spectrum * 10 ** (gain / 20), size)[2048:2048 + n].astype(np.float32)


def fade(n, up):
    ramp = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, n))
    return ramp if up else ramp[::-1]


def main():
    v2 = decode(V2, 2)
    take = decode(TAKE1, 1)[:, 0]
    a, b = (int(t * R) for t in SOURCE)
    phrase = tone(take[a:b])
    edge = int(FADE * R)
    phrase[:edge] *= fade(edge, True)
    phrase[-edge:] *= fade(edge, False)

    out = v2.copy()
    for place in PLACES:
        c0, c1 = (int(t * R) for t in place['clear'])
        old = level(v2[c0:c1])
        gain = 10 ** ((old - level(phrase)) / 20)
        # The old words fade out after the word before them and back in at
        # the silence after them.
        lead = int(LEAD_OUT * R)
        shape = np.zeros(c1 - c0, np.float32)
        shape[:lead] = fade(lead, False)
        shape[-edge:] = fade(edge, True)
        out[c0:c1] *= shape[:, None]
        s = int(place['start'] * R)
        if s < c0 or s + len(phrase) > c1:
            raise SystemExit('The phrase does not fit in the stretch it replaces.')
        out[s:s + len(phrase)] += (phrase * gain)[:, None]
        print(f"{place['start']:.2f}s: the old words were at {old:.1f} dB, so the new ones are turned {20 * np.log10(gain):+.1f} dB; "
              f"they end at {place['start'] + len(phrase) / R:.2f}s, {place['clear'][1] - place['start'] - len(phrase) / R:.2f}s before the stretch ends")
    print(f'peak {20 * np.log10(np.abs(out).max()):.1f} dBFS (was {20 * np.log10(np.abs(v2).max()):.1f})')

    wav = HERE / 'work' / 'voicepatch.wav'
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'f32le', '-ar', str(R), '-ac', '2', '-i', '-', '-c:a', 'pcm_s16le', str(wav)],
                   input=out.tobytes(), check=True)
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(V2), '-i', str(wav), '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
                    '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', str(OUT)], check=True)
    print(f'Wrote {OUT.relative_to(HERE)}')


if __name__ == '__main__':
    main()
