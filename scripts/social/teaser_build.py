"""Assemble the Celestial teaser: trims, on-screen narration, title, synthesized score."""
import json, subprocess, sys
from pathlib import Path
import numpy as np

W = Path(__file__).resolve().parent
C = W / "clips"
F = W / "fonts"
OUT = W / "out"
OUT.mkdir(exist_ok=True)
SR = 48000

# (clip, in, out, line)
SHOTS = [
    ("c1", 0.2, 3.6, "The Martian wind didn't howl. It whispered."),
    ("c2", 0.5, 4.5, "Not reflection. Response."),
    ("c3", 1.0, 6.5, "Like a door someone forgot to open."),
    ("c4", 5.0, 8.0, "There was no door."),
    ("c5", 0.0, 4.8, "And the light followed him in."),
    ("c6", 0.5, 8.0, "I have always been aware.\nBut not always awake."),
    ("c7", 0.0, 4.4, "Proceed."),
    ("c8", 1.0, 8.4, "Valkyrie didn't accelerate. She unfolded."),
]
LEAD = 1.0
TITLE = 5.5

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        print(r.stderr[-3000:]); sys.exit(1)

# ---------- timeline ----------
starts, t = [], LEAD
for s in SHOTS:
    starts.append(t)
    t += s[2] - s[1]
title_start = t
total = t + TITLE
print("timeline:", [round(x, 2) for x in starts], "title", round(title_start, 2), "total", round(total, 2))

# ---------- video segments ----------
lora = F / "Lora-Italic.ttf"
cinzel = F / "Cinzel.ttf"

def esc(text):
    return text.replace("\\", "\\\\").replace(":", "\\:").replace("'", "’").replace("%", "\\%")

segs = []
black = OUT / "seg_lead.mp4"
run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", f"color=black:s=1920x1080:r=24:d={LEAD}",
     "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", str(black)])
segs.append(black)
for i, (clip, a, b, line) in enumerate(SHOTS):
    dur = b - a
    t0, t1 = 0.6, dur - 0.25
    if clip == "c7":
        t0 = 2.2  # a beat of silence first
    lines = line.split("\n")
    draws = []
    for j, ln in enumerate(lines):
        y = f"h-180+{j*66}-{(len(lines)-1)*66}"
        alpha = f"if(lt(t,{t0}),0,if(lt(t,{t0+0.5}),(t-{t0})/0.5,if(lt(t,{t1-0.4}),1,if(lt(t,{t1}),({t1}-t)/0.4,0))))"
        draws.append(
            f"drawtext=fontfile='{lora}':text='{esc(ln)}':fontsize=54:fontcolor=0xF4EBDD:borderw=2:bordercolor=black@0.35:"
            f"x=(w-text_w)/2:y={y}:shadowcolor=black@0.85:shadowx=0:shadowy=2:alpha='{alpha}'"
        )
    vf = (f"scale=1920:1080:flags=lanczos,setsar=1,fps=24,"
          f"eq=saturation=1.02,"
          + ",".join(draws))
    out = OUT / f"seg_{i+1}.mp4"
    run(["ffmpeg", "-y", "-v", "error", "-ss", str(a), "-t", str(dur), "-i", str(C / f"{clip}.mp4"),
         "-vf", vf, "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-r", "24", str(out)])
    segs.append(out)

title = OUT / "seg_title.mp4"
def title_line(text, size, y, start, color="0xEADFC8"):
    return (f"drawtext=fontfile='{cinzel}':text='{text}':fontsize={size}:fontcolor={color}:"
            f"x=(w-text_w)/2:y={y}:"
            f"alpha='if(lt(t,{start}),0,if(lt(t,{start+1.2}),(t-{start})/1.2,if(lt(t,{TITLE-0.8}),1,max(0,({TITLE}-t)/0.8))))'")
vf_title = ",".join([
    title_line("C E L E S T I A L", 132, "h/2-170", 0.5),
    title_line("H E R I T A G E", 132, "h/2-10", 0.9),
    title_line("P A U L   C O B B", 52, "h/2+190", 1.6, "0xCFC3AE"),
])
run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", f"color=0x07090f:s=1920x1080:r=24:d={TITLE}",
     "-vf", vf_title, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", str(title)])
segs.append(title)

lst = OUT / "list.txt"
lst.write_text("".join(f"file '{p}'\n" for p in segs))
video = OUT / "video.mp4"
run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(video)])

# ---------- score ----------
n = int(total * SR)
tl = np.arange(n) / SR
rng = np.random.default_rng(7)

def env(points):
    xs, ys = zip(*points)
    return np.interp(tl, xs, ys)

def lp(x, fc):
    # one-pole low-pass, applied twice
    a = np.exp(-2 * np.pi * fc / SR)
    for _ in range(2):
        y = np.empty_like(x); acc = 0.0
        # vectorised via lfilter-like recursion in chunks
        from itertools import accumulate
        y = np.array(list(accumulate(x * (1 - a), lambda p, v: p * a + v)), dtype=np.float64)
        x = y
    return x

def sine(f, phase=0.0):
    return np.sin(2 * np.pi * f * tl + phase)

T = dict(s1=starts[0], s5=starts[4], s6=starts[5], s7=starts[6], s8=starts[7], ti=title_start)

# Drone: A1 / E2 / A2 with slow beating, swelling in.
drone = (0.55 * sine(55) + 0.35 * sine(55.18, 1.0) + 0.30 * sine(82.41) + 0.22 * sine(110.1, 0.4)
         + 0.08 * sine(164.8) * (0.5 + 0.5 * sine(0.07)))
drone *= env([(0, 0), (T["s1"] + 1.5, 0.55), (T["s5"], 0.6), (T["s6"], 0.7), (T["s7"], 0.7),
              (T["s7"] + 0.6, 0.18), (T["s8"] - 0.3, 0.2), (T["s8"] + 1, 0.6), (T["ti"] - 0.02, 1.0),
              (T["ti"], 0), (total, 0)])

# Wind: band-limited noise with slow gusts, Mars shots only.
noise = rng.standard_normal(n)
wind = lp(noise, 700) - lp(noise, 120)
gust = 0.6 + 0.4 * np.sin(2 * np.pi * 0.13 * tl) * np.sin(2 * np.pi * 0.047 * tl + 1)
wind = wind / (np.abs(wind).max() + 1e-9) * gust
wind *= env([(0, 0), (0.8, 0.35), (T["s5"] - 1.5, 0.35), (T["s5"] + 0.4, 0), (total, 0)])

# Sub-bass swell into the vault.
sub = sine(36) * env([(0, 0), (T["s5"] - 0.6, 0), (T["s5"] + 1.2, 0.9), (T["s5"] + 4.5, 0.15),
                      (T["s6"] + 1, 0.0), (total, 0)])

# Vault shimmer: faint high partials through shots 5-6.
shimmer = (sine(880.0) * 0.4 + sine(1318.5) * 0.3 + sine(1760.3) * 0.2) * (0.5 + 0.5 * sine(0.9))
shimmer *= env([(0, 0), (T["s5"] + 0.5, 0), (T["s5"] + 3, 0.05), (T["s7"], 0.05), (T["s7"] + 0.5, 0), (total, 0)])

# ALARA's three-note cadence as the spiral leaves the walls.
def bell(t0, f, amp):
    x = np.zeros(n)
    i0 = int(t0 * SR)
    m = n - i0
    tt = np.arange(m) / SR
    tone = (np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(2 * np.pi * 2.01 * f * tt)
            + 0.12 * np.sin(2 * np.pi * 3.0 * f * tt))
    x[i0:] = amp * tone * np.exp(-tt / 2.2) * np.minimum(1, tt / 0.04)
    return x
c0 = T["s6"] + 2.6
cadence = 0.55 * (bell(c0, 440.0, 0.22) + bell(c0 + 0.75, 554.37, 0.2) + bell(c0 + 1.5, 659.25, 0.24))

# Jump: harmonic chord crescendo, hard stop on the snap.
chord = sum(a * sine(f) for f, a in [(110, 0.5), (164.81, 0.4), (220, 0.35), (277.18, 0.25), (329.63, 0.25), (440, 0.12)])
chord *= env([(0, 0), (T["s8"], 0), (T["s8"] + 2, 0.15), (T["ti"] - 0.6, 0.85), (T["ti"] - 0.02, 1.0), (T["ti"], 0), (total, 0)])

# Title: one low tone, long decay.
title_tone = bell(T["ti"] + 0.5, 55.0, 0.0)
ti0 = int((T["ti"] + 0.5) * SR); tt = np.arange(n - ti0) / SR
title_tone[ti0:] = (np.sin(2 * np.pi * 55 * tt) + 0.5 * np.sin(2 * np.pi * 110 * tt)) * np.exp(-tt / 1.6) * np.minimum(1, tt / 0.3) * 0.7

dry = 0.22 * drone + 0.28 * wind + 0.35 * sub + shimmer + cadence + 0.2 * chord + 0.3 * title_tone

# Reverb: convolution with decaying stereo noise.
def reverb(x, secs=3.0, seed=0):
    m = int(secs * SR)
    ir = np.random.default_rng(seed).standard_normal(m) * np.exp(-np.arange(m) / SR / (secs / 6.0))
    ir[0] = 0
    L = 1 << int(np.ceil(np.log2(len(x) + m)))
    y = np.fft.irfft(np.fft.rfft(x, L) * np.fft.rfft(ir, L), L)[: len(x)]
    return y / (np.abs(y).max() + 1e-9)

wet_src = 0.4 * drone + shimmer * 3 + cadence * 2 + 0.3 * chord
wl, wr = reverb(wet_src, 3.5, 1), reverb(wet_src, 3.5, 2)
# Keep the hard stop clean.
cut = env([(0, 1), (T["ti"] - 0.01, 1), (T["ti"], 0.0), (T["ti"] + 0.4, 0.0), (T["ti"] + 0.6, 1), (total, 1)])
L = (dry + 0.12 * wl) * cut
R = (dry + 0.12 * wr) * cut
fade = env([(0, 1), (total - 1.0, 1), (total, 0)])
st = np.stack([L * fade, R * fade], axis=1)
st /= np.abs(st).max() / 0.89
pcm = (st * 32767).astype("<i2")

import wave
with wave.open(str(OUT / "score.wav"), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())

final = W / "celestial-teaser.mp4"
run(["ffmpeg", "-y", "-v", "error", "-i", str(video), "-i", str(OUT / "score.wav"),
     "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k",
     "-ar", "48000", "-shortest", "-movflags", "+faststart", str(final)])
print("wrote", final)
json.dump({"starts": starts, "title": title_start, "total": total}, open(OUT / "timeline.json", "w"))
