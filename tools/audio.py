"""Original 120 BPM score + UI sound design for the OACE reel, synthesized from scratch.
Every hit is placed on the same timeline as video/comp.js.  Output: 48 kHz stereo WAV."""
import numpy as np
from scipy import signal
from scipy.io import wavfile
import sys

SR = 48000
DUR = 20.0
N = int(SR * DUR)
rng = np.random.default_rng(7)
BEAT = 0.5

def T(n): return np.arange(n) / SR
def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)

class Bus:
    def __init__(self): self.x = np.zeros((N + SR * 3, 2))
    def add(self, t, sig, gain=1.0, pan=0.0):
        i = int(round(t * SR))
        if sig.ndim == 1:
            l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
            sig = np.stack([sig * l * 1.414, sig * r * 1.414], 1)
        j = min(len(self.x), i + len(sig))
        if j > i >= 0: self.x[i:j] += sig[: j - i] * gain

drums, bass, music, fx, ui, verb_send = Bus(), Bus(), Bus(), Bus(), Bus(), Bus()

def sos(kind, f, order=2):
    return signal.butter(order, f, btype=kind, fs=SR, output='sos')
def filt(x, kind, f, order=2): return signal.sosfilt(sos(kind, f, order), x)

def svf_sweep(x, f0, f1, q=0.7, mode='bp', curve='exp'):
    """time-varying state-variable filter (per-sample python loop: fine for short fx)"""
    n = len(x); u = np.linspace(0, 1, n)
    fc = f0 * (f1 / f0) ** u if curve == 'exp' else f0 + (f1 - f0) * u
    g = np.tan(np.pi * np.clip(fc, 20, SR * 0.45) / SR)
    k = 1 / q
    ic1 = ic2 = 0.0; out = np.empty(n)
    for i in range(n):
        gi = g[i]; a1 = 1 / (1 + gi * (gi + k)); a2 = gi * a1; a3 = gi * a2
        v3 = x[i] - ic2; v1 = a1 * ic1 + a2 * v3; v2 = ic2 + a2 * ic1 + a3 * v3
        ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2
        out[i] = v1 if mode == 'bp' else (v2 if mode == 'lp' else x[i] - k * v1 - v2)
    return out

# ---------------- instruments ----------------
def kick(big=1.0, dur=0.5):
    n = int(SR * dur); t = T(n)
    f = 44 + 150 * np.exp(-t * 32) + 40 * np.exp(-t * 6) * big
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * (6.5 / big))
    click = filt(rng.standard_normal(n), 'highpass', 2500) * np.exp(-t * 400) * 0.35
    return np.tanh(1.8 * (body + click)) * 0.95

def clap():
    n = int(SR * 0.4); t = T(n); nz = rng.standard_normal(n)
    env = np.zeros(n)
    for d in (0, 0.009, 0.019):
        env += (t >= d) * np.exp(-np.clip(t - d, 0, None) * 140)
    env += (t >= 0.028) * np.exp(-np.clip(t - 0.028, 0, None) * 16) * 0.8
    return filt(filt(nz, 'bandpass', [900, 4200]), 'highpass', 400) * env * 0.65

def snare():
    n = int(SR * 0.25); t = T(n)
    tone = np.sin(2 * np.pi * 190 * t + 6 * np.exp(-t * 60)) * np.exp(-t * 26)
    nz = filt(rng.standard_normal(n), 'highpass', 1500) * np.exp(-t * 22)
    return (tone * 0.5 + nz * 0.6) * 0.8

def hat(open_=False):
    n = int(SR * (0.25 if open_ else 0.06)); t = T(n)
    nz = filt(rng.standard_normal(n), 'highpass', 7500, 4)
    return nz * np.exp(-t * (14 if open_ else 75)) * 0.35

def saw(f, t, phase=0.0):
    x = (f * t + phase) % 1.0
    return 2 * x - 1

def supersaw(freqs, dur, detune=0.18, voices=7):
    n = int(SR * dur); t = T(n); out = np.zeros(n)
    for f in freqs:
        for v in range(voices):
            d = (v - (voices - 1) / 2) / ((voices - 1) / 2) * detune
            out += saw(f * 2 ** (d / 12), t, rng.random())
    return out / (len(freqs) * voices) * 2.2

def stab(midis, dur=0.32, cutoff=2600, bright=1.0):
    n = int(SR * dur); t = T(n)
    x = supersaw([mtof(m) for m in midis], dur)
    x = filt(x, 'lowpass', cutoff * bright)
    env = np.minimum(1, t / 0.003) * np.exp(-t * 9)
    return np.tanh(x * env * 1.4) * 0.55

def pad(midis, dur, cutoff=1400):
    n = int(SR * dur); t = T(n)
    x = supersaw([mtof(m) for m in midis], dur, detune=0.12, voices=5)
    x = filt(x, 'lowpass', cutoff)
    env = np.minimum(1, t / 0.25) * np.minimum(1, (dur - t) / 0.3).clip(0, 1)
    return x * env * 0.35

def bass_note(m, dur=0.22):
    n = int(SR * dur); t = T(n); f = mtof(m)
    x = saw(f, t) * 0.6 + np.sin(2 * np.pi * f * t) * 0.8 + np.sin(2 * np.pi * f / 2 * t) * 0.6
    fenv = 180 + 1400 * np.exp(-t * 22)
    x = svf_sweep(x, fenv[0], fenv[-1], q=0.9, mode='lp')
    env = np.minimum(1, t / 0.004) * np.exp(-t * 7) * np.minimum(1, (dur - t) / 0.02).clip(0, 1)
    return np.tanh(x * env * 1.6) * 0.7

def pluck(m, dur=0.22):
    n = int(SR * dur); t = T(n); f = mtof(m)
    x = saw(f, t) * 0.5 + saw(f * 1.004, t, 0.3) * 0.5
    x = svf_sweep(x, 5200, 600, q=1.2, mode='lp')
    return x * np.exp(-t * 16) * 0.42

def sub_impact(dur=1.6, f0=70, f1=32):
    n = int(SR * dur); t = T(n)
    f = f1 + (f0 - f1) * np.exp(-t * 3.5)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.4)
    nz = filt(rng.standard_normal(n), 'lowpass', 1800) * np.exp(-t * 9) * 0.6
    crack = filt(rng.standard_normal(n), 'highpass', 3000) * np.exp(-t * 60) * 0.5
    return np.tanh((body + nz + crack) * 1.5) * 0.9

def whoosh(dur=0.45, up=True, f0=250, f1=7000, q=1.3):
    n = int(SR * dur); t = T(n); u = t / dur
    nz = rng.standard_normal(n)
    a, b = (f0, f1) if up else (f1, f0)
    x = svf_sweep(nz, a, b, q=q, mode='bp')
    env = np.sin(np.pi * u) ** (1.4 if up else 0.8)
    if up: env *= np.minimum(1, (1 - u) / 0.08)
    return x * env * 0.7

def riser(dur=1.0):
    n = int(SR * dur); t = T(n); u = t / dur
    nz = svf_sweep(rng.standard_normal(n), 300, 9000, q=2.0, mode='bp')
    f = 220 * 2 ** (u * 2.5)
    tone = saw(np.cumsum(f) / SR / np.maximum(t, 1e-9) * 0 + 1, np.cumsum(f) / SR)  # saw by phase
    tone = filt(tone, 'lowpass', 3000) * 0.25
    return (nz * 0.8 + tone) * (u ** 2.2) * 0.8

def rev_cymbal(dur=0.5):
    n = int(SR * dur); t = T(n); u = t / dur
    nz = filt(rng.standard_normal(n), 'highpass', 4000)
    return nz * u ** 3 * 0.45

def ui_click(bright=1.0):
    n = int(SR * 0.05); t = T(n)
    c = filt(rng.standard_normal(n), 'highpass', 2500) * np.exp(-t * 900)
    tone = np.sin(2 * np.pi * 2400 * bright * t) * np.exp(-t * 260) * 0.5
    thump = np.sin(2 * np.pi * 180 * t) * np.exp(-t * 90) * 0.5
    return (c * 0.9 + tone + thump) * 0.7

def ui_pop(m):
    n = int(SR * 0.12); t = T(n); f = mtof(m)
    f_t = f * (1 + 0.6 * np.exp(-t * 90))
    x = np.sin(2 * np.pi * np.cumsum(f_t) / SR)
    return x * np.minimum(1, t / 0.002) * np.exp(-t * 38) * 0.45

def tick(m):
    n = int(SR * 0.03); t = T(n)
    return np.sin(2 * np.pi * mtof(m) * t) * np.exp(-t * 180) * 0.3 + filt(rng.standard_normal(n), 'highpass', 6000) * np.exp(-t * 500) * 0.2

def chime(m):
    n = int(SR * 1.6); t = T(n); f = mtof(m)
    mod = np.sin(2 * np.pi * f * 3.5 * t) * 2.2 * np.exp(-t * 4)
    return np.sin(2 * np.pi * f * t + mod) * np.exp(-t * 2.6) * 0.35

def glitch(dur=0.35):
    n = int(SR * dur); out = np.zeros(n); s = int(SR * 0.0315)
    src = supersaw([mtof(41), mtof(53), mtof(54)], 0.04) * 0.8
    for k in range(0, n, s):
        if rng.random() < 0.75:
            seg_ = src[: min(s, n - k)] * (1 - k / n)
            out[k:k + len(seg_)] += seg_ * (1 if (k // s) % 2 else -0.7)
    return filt(out, 'highpass', 200) * 0.7

# ---------------- harmony ----------------
Fm, Db, Ab, Eb, Bbm = [53, 56, 60, 65], [49, 53, 56, 61], [51, 56, 60, 63], [51, 55, 58, 63], [49, 53, 58, 61]
ROOT = {id(Fm): 41, id(Db): 37, id(Ab): 44, id(Eb): 39, id(Bbm): 46}
def chord_at(t):
    prog = [(3, Fm), (5, Db), (7, Ab), (9, Eb), (11, Fm), (13, Db), (15.5, Eb), (16.5, Fm), (18, Db), (19, Eb), (19.5, Fm)]
    c = Fm
    for a, ch in prog:
        if t >= a - 1e-6: c = ch
    return c

kicks = []
def K(t, big=1.0, g=1.0):
    drums.add(t, kick(big), g); kicks.append(t)

# ---------------- 0–3s HOOK: one hit per word ----------------
for i, tt in enumerate([0, 0.5, 1.0, 1.5, 2.0]):
    big = 1.0 + 0.25 * i
    K(tt, big, 1.0)
    music.add(tt, stab([m - 12 for m in Fm] + [Fm[0]], 0.45, 1600 + 500 * i), 0.8)
    verb_send.add(tt, stab(Fm, 0.3, 2000), 0.35)
    fx.add(tt, filt(rng.standard_normal(int(SR * 0.12)), 'highpass', 3000) * np.exp(-T(int(SR * 0.12)) * 40) * 0.4, 0.6)
fx.add(1.0, glitch(0.38), 0.75)                     # QUIT
fx.add(2.0, sub_impact(1.0, 90, 35), 0.8)           # YOU.
verb_send.add(2.0, snare(), 0.6)
fx.add(2.45, riser(0.55), 0.9)                      # zoom into the O
for k in range(8):                                   # snare roll 2.5 → 2.94
    tt = 2.5 + k * 0.0625 * (1 - k * 0.04)
    drums.add(tt, snare(), 0.25 + 0.07 * k)
fx.add(2.55, whoosh(0.45, True, 300, 9000, 1.6), 0.8)

# ---------------- groove sections ----------------
def groove(a, b, hats=True, claps=True, full=True):
    t = a
    while t < b - 1e-6:
        beat_in_bar = round((t - 3.0) / BEAT) % 4
        K(t, 1.0, 0.95)
        if claps and beat_in_bar in (1, 3): drums.add(t, clap(), 0.7); verb_send.add(t, clap(), 0.18)
        if hats:
            drums.add(t + 0.25, hat(beat_in_bar % 2 == 1 and full), 0.55, pan=0.15)
            drums.add(t + 0.125, hat(), 0.18, pan=-0.3); drums.add(t + 0.375, hat(), 0.22, pan=0.3)
        # offbeat bass
        ch = chord_at(t)
        root = ROOT[id(ch)]
        bass.add(t + 0.25, bass_note(root + 12 if beat_in_bar == 3 else root, 0.23), 0.85)
        if full and beat_in_bar in (1, 3):
            bass.add(t + 0.375, bass_note(root + 12, 0.1), 0.4)
        # stabs: and-of-2, and-of-4 + downbeat accent
        if full:
            if beat_in_bar == 0: music.add(t, stab(ch, 0.25, 2200), 0.55)
            if beat_in_bar in (1, 3): music.add(t + 0.25, stab(ch, 0.22, 3000), 0.5); verb_send.add(t + 0.25, stab(ch, 0.2, 3000), 0.15)
        t += BEAT

groove(3.0, 13.5)
groove(17.0, 19.5)
# pads under everything after the drop
for a, b in [(3, 5), (5, 7), (7, 9), (9, 11), (11, 13.5), (13.5, 15.5), (15.5, 16.5), (17, 18), (18, 19), (19, 19.5)]:
    ch = chord_at(a + 0.01)
    music.add(a, pad([m + 12 for m in ch] if a >= 13.5 and a < 16.5 else ch, b - a, 1100 if a < 13.5 else 1800), 0.5 if a < 13.5 else 0.8)
    verb_send.add(a, pad(ch, b - a), 0.2)

# drop impact
fx.add(3.0, sub_impact(1.6), 1.0); verb_send.add(3.0, snare(), 0.5)
fx.add(2.94, rev_cymbal(0.06), 0.0)

# arp (features)
arp_pat = [0, 1, 2, 3, 2, 1, 3, 2]
t = 6.0; k = 0
while t < 13.5 - 1e-6:
    ch = chord_at(t)
    m = ch[arp_pat[k % 8]] + 12
    pan = -0.45 if k % 2 else 0.45
    music.add(t, pluck(m), 0.42, pan)
    # dotted-8th delay
    for d, g in ((0.375, 0.32), (0.75, 0.14)):
        music.add(t + d, pluck(m), 0.42 * g, -pan)
    t += 0.125; k += 1

# ---------------- UI sound design ----------------
# product assembles: rising pentatonic pops
scale = [65, 68, 70, 72, 75, 77, 80, 82, 84, 87]
asm = [3.08, 3.16, 3.24, 3.5, 3.64, 3.76, 3.86, 3.95, 4.06, 4.62, 4.72, 4.8, 4.88]
for i, tt in enumerate(asm):
    ui.add(tt, ui_pop(scale[min(i, len(scale) - 1)]), 0.55, pan=(-0.3 if i % 2 else 0.3))
for r in range(5):                                   # colour tiles cascade
    for c in range(5):
        if r * 5 + c >= 23: continue
        tt = 4.1 + (r + c) * 0.045
        ui.add(tt + 0.02 * c, tick(84 + (r + c) % 5 * 2), 0.35, pan=(c - 2) * 0.2)
for i, tt in enumerate([4.0, 4.25, 4.5]): ui.add(tt, ui_pop(77 + i * 3), 0.5)   # callout tags
# whips / transitions
for tt, up, d in [(5.6, True, 0.42), (8.33, True, 0.3), (10.8, True, 0.28), (13.27, True, 0.25), (16.22, True, 0.3)]:
    fx.add(tt, whoosh(d, up), 0.8)
for tt, d in [(6.0, 0.35), (8.6, 0.3), (11.05, 0.3), (11.6, 0.4)]:
    fx.add(tt, whoosh(d, False, 6000, 400, 1.2), 0.55)
# clicks — synced to the cursor
F1 = [6.5, 7.0, 7.5, 7.75, 7.875, 8.0, 8.125, 8.25]
for i, tt in enumerate(F1):
    ui.add(tt, ui_click(1.0 + 0.05 * i), 0.9, pan=0.1)
    ui.add(tt + 0.01, ui_pop([72, 75, 77, 80, 82, 84, 87, 89][i]), 0.4)
for tt in [9.0, 11.5, 13.2, 19.0]:
    ui.add(tt, ui_click(1.1), 1.0)
ui.add(9.2, ui_pop(84), 0.5)                          # fit highlight
for k in range(12): ui.add(9.5 + (k // 3 + k % 3) * 0.045 + k * 0.004, tick(80 + (k % 4) * 3), 0.35, pan=((k % 3) - 1) * 0.4)
ui.add(10.12, ui_pop(89), 0.35)                       # hover
for i in range(9): ui.add(11.6 + i * 0.03, tick(77 + i), 0.3, pan=0.5)    # drawer strips
ui.add(12.45, chime(84), 0.35)                        # free-shipping bar lands

# ---------------- 13.5 BREAKDOWN: the number ----------------
fx.add(13.5, sub_impact(1.8, 60, 30), 0.9)
verb_send.add(13.5, stab(Db, 0.5, 1500), 0.4)
# counter ticks: follow the easeOutExpo count, max one per 1/32
last = -1; t = 13.55
while t < 14.7:
    u = (t - 13.55) / (14.7 - 13.55)
    n = int(1515 * (1 - 2 ** (-10 * u)))
    if n // 40 != last:
        ui.add(t, tick(72 + (n // 100) % 12), 0.5, pan=((n // 40) % 3 - 1) * 0.3)
        last = n // 40
    t += 1 / 32
ui.add(14.7, chime(77), 0.9); ui.add(14.7, chime(84), 0.5); verb_send.add(14.7, chime(89), 0.5)
K(14.7, 1.2, 0.9)
fx.add(14.75, whoosh(0.35, False, 5000, 300), 0.4)
for k in range(4): drums.add(15.5 + k * 0.25, kick(0.8), 0.35)        # build
for k in range(16): drums.add(15.5 + k * 0.0625, snare(), 0.1 + 0.03 * k)
fx.add(15.5, riser(1.0), 1.0)

# ---------------- 16.5 STROBE + 17.0 LOGO SLAM ----------------
for i in range(4):
    tt = 16.5 + i * 0.125
    K(tt, 1.1, 0.8); music.add(tt, stab([m + (12 if i == 3 else 0) for m in Fm], 0.12, 3500), 0.6)
fx.add(17.0, sub_impact(2.2, 80, 30), 1.1)
verb_send.add(17.0, stab(Fm, 0.6, 3000), 0.6); verb_send.add(17.0, snare(), 0.8)
music.add(17.0, stab([m - 12 for m in Fm] + Fm, 0.6, 3500), 0.6)
fx.add(17.35, whoosh(0.5, False, 8000, 800, 1.0), 0.3)
ui.add(17.85, ui_pop(77), 0.6)                         # CTA pops
ui.add(19.08, whoosh(0.3, False, 3000, 300), 0.3)
# final hit
K(19.5, 1.4, 1.0)
music.add(19.5, stab([m - 12 for m in Fm] + Fm + [72], 0.5, 2600), 0.75)
verb_send.add(19.5, stab(Fm + [72], 0.6, 3000), 0.9)
fx.add(19.5, sub_impact(0.5, 70, 40), 0.6)

# ---------------- mix ----------------
def sidechain(n):
    g = np.ones(n); t = T(n)
    for k in kicks:
        i = int(k * SR); j = min(n, i + int(SR * 0.3))
        if i < n: g[i:j] = np.minimum(g[i:j], 1 - 0.75 * np.exp(-(t[i:j] - k) / 0.07))
    return g[:, None]

L_ = len(drums.x)
sc = sidechain(L_)
ir_n = int(SR * 2.0); ir_t = T(ir_n)
ir = np.stack([rng.standard_normal(ir_n), rng.standard_normal(ir_n)], 1) * np.exp(-ir_t / 0.45)[:, None]
ir = np.stack([filt(ir[:, 0], 'lowpass', 5000), filt(ir[:, 1], 'lowpass', 5000)], 1); ir /= np.abs(ir).sum(0).max() / 8
wet = np.stack([signal.fftconvolve(verb_send.x[:, c] + 0.12 * music.x[:, c] + 0.08 * ui.x[:, c], ir[:, c])[:L_] for c in range(2)], 1)

mix = drums.x * 0.9 + bass.x * 0.75 * sc + music.x * 0.55 * sc + fx.x * 0.7 + ui.x * 0.8 + wet * 0.35 * sc
mix = np.stack([filt(mix[:, c], 'highpass', 28) for c in range(2)], 1)
mix = mix[:N]
# gentle end fade on the tail
fade = np.ones(N); fi = int(19.75 * SR); fade[fi:] = np.linspace(1, 0, N - fi) ** 1.5
mix *= fade[:, None]
# master: drive + limiter-ish
mix = mix / (np.abs(mix).max() + 1e-9) * 1.6
mix = np.tanh(mix) / np.tanh(1.6)
mix *= 10 ** (-1.0 / 20) / np.abs(mix).max()
out = sys.argv[1] if len(sys.argv) > 1 else 'score.wav'
wavfile.write(out, SR, (mix * 32767).astype(np.int16))
print('wrote', out, mix.shape, 'rms dBFS', 20 * np.log10(np.sqrt((mix ** 2).mean())))
