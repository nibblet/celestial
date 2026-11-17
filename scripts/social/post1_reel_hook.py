"""Post 1 Reel: narration + vertical footage + captions + ducked score + end card."""
import json, subprocess, sys, wave
from pathlib import Path
import numpy as np

V = Path(__file__).resolve().parent
T = V.parent / "teaser"
CL = T / "clips"
OUT = V / "post1b"
OUT.mkdir(exist_ok=True)
SR = 48000
REPO = Path("/home/user/celestial")
END_CARD = REPO / "docs/celestial/cover/celestial-heritage-end-card-9x16.png"

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        print(" ".join(map(str, cmd))[:500]); print(r.stderr[-3000:]); sys.exit(1)

segs = json.load(open(V / "full.json"))
# chosen takes (segment index) and caption chunks (first-word index, text)
LINES = [
    (17, [(0, "I wrote a novel with AI."), (6, "Then I tried to film it.")]),
    (1, [(0, "Eighteen months ago,\nI asked myself a question:"), (8, "could I use AI\nto help me write a novel?")]),
    (4, [(0, "So I tried."), (3, "That became\nCelestial Heritage:"), (7, "an ancient ship\nburied on Mars,"), (13, "and the people\nwho wake it up.")]),
    (6, [(0, "Then I built\nan app around it,"), (7, "so readers can explore\nthe world and ask it questions.")]),
    (9, [(0, "Now I've picked it back up\nfor a new experiment:"), (10, "can AI help me see it?")]),
    (12, [(0, "Every character,\nthe ship, every room,"), (7, "designed from the book\nand then brought to life.")]),
    (15, [(0, "This is the first teaser."), (5, "I'll share how I made it."), (11, "Follow along.")]),
]
PAD_IN, PAD_OUT, GAP, LEAD = 0.12, 0.25, 0.55, 0.4

# ---- place voice lines ----
placed = []  # (timeline_start, src_start, src_end, words)
t = LEAD
for idx, chunks in LINES:
    w = segs[idx]["words"]
    s0, s1 = w[0]["s"] - PAD_IN, w[-1]["e"] + PAD_OUT
    placed.append((t, s0, s1, w, chunks))
    t += (s1 - s0) + GAP
line_start = [p[0] + PAD_IN for p in placed]  # first word time on the timeline
def word_time(line, wi):
    p = placed[line]
    return p[0] + (p[3][wi]["s"] - p[1])

# ---- picture: (clip, src_in, timeline_start, timeline_end, crop_factor_start, crop_factor_end) ----
L = line_start[1:]
def wt(line, wi):
    return word_time(line + 1, wi)
hook_end = L[0] - 0.3
q = hook_end / 4
HOOK = [
    ("c6", 4.2, 0.0, q, 0.68, 0.64),
    ("c8", 4.4, q, 2 * q, 0.5, 0.5),
    ("c4", 6.2, 2 * q, 3 * q, 0.5, 0.5),
    ("c7", 0.6, 3 * q, hook_end, 0.08, 0.1),
]
cut_jump = L[5] - 0.6
snap = cut_jump + 5.4               # c8 3.0 -> 8.4 ends on the snap
end_card = 3.6
total = snap + end_card
SHOTS = HOOK + [
    ("c2", 0.3, hook_end, L[1] - 0.3, 0.72, 0.52),
    ("c1", 0.2, L[1] - 0.3, wt(1, 7) - 0.1, 0.04, 0.08),          # trench until "an ancient ship"
    ("c3", 1.0, wt(1, 7) - 0.1, L[2] - 0.3, 0.33, 0.37),          # Thane on the hull
    ("c4", 4.9, L[2] - 0.3, L[3] - 0.3, 0.5, 0.5),                      # the wall opens
    ("c5", 0.0, L[3] - 0.3, L[4] - 0.2, 0.42, 0.44),                    # into the vault
    ("c7", 0.0, L[4] - 0.2, wt(4, 2) - 0.05, 0.06, 0.1),          # "Every character"
    ("c8", 1.2, wt(4, 2) - 0.05, wt(4, 4) - 0.05, 0.5, 0.5),  # "the ship"
    ("c6", 3.0, wt(4, 4) - 0.05, cut_jump, 0.72, 0.62),           # "every room..." ALARA
    ("c8", 3.0, cut_jump, snap, 0.5, 0.5),                              # the jump
]
print("total", round(total, 2), "lines", [round(x, 2) for x in L])

parts = []
for i, (clip, a, t0, t1, f0, f1) in enumerate(SHOTS):
    dur = t1 - t0
    out = OUT / f"v{i}.mp4"
    clip_len = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
                                     str(CL / f"{clip}.mp4")], capture_output=True, text=True).stdout) - 0.05
    avail = clip_len - a
    slow = max(1.0, dur / avail)  # stretch a short source instead of running out of picture
    if slow > 1.0:
        print(f"  {clip}: slowing {slow:.2f}x to fill {dur:.2f}s")
    vf = (f"setpts={slow:.4f}*PTS,scale=-2:1920:flags=lanczos,"
          f"crop=1080:1920:'(iw-1080)*({f0}+({f1}-{f0})*t/{dur:.3f})':0,setsar=1,fps=24")
    run(["ffmpeg", "-y", "-v", "error", "-ss", f"{a:.3f}", "-i", str(CL / f"{clip}.mp4"), "-t", f"{dur:.3f}",
         "-vf", vf, "-an", "-c:v", "libx264", "-crf", "17", "-pix_fmt", "yuv420p", "-r", "24", str(out)])
    parts.append(out)
card = OUT / "card.mp4"
run(["ffmpeg", "-y", "-v", "error", "-loop", "1", "-t", f"{end_card}", "-i", str(END_CARD),
     "-vf", f"scale=1080:1920,setsar=1,fps=24,fade=t=in:st=0:d=0.5,zoompan=z='1+0.02*on/{int(end_card*24)}':d=1:s=1080x1920:fps=24",
     "-c:v", "libx264", "-crf", "17", "-pix_fmt", "yuv420p", str(card)])
parts.append(card)
(OUT / "list.txt").write_text("".join(f"file '{p}'\n" for p in parts))
run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(OUT / "list.txt"), "-c", "copy", str(OUT / "video.mp4")])

# ---- captions (ASS) ----
def ts(x):
    h = int(x // 3600); m = int(x % 3600 // 60); s = x % 60
    return f"{h}:{m:02d}:{s:05.2f}"
events = []
for li, (t0, s0, s1, w, chunks) in enumerate(placed):
    line_end = t0 + (s1 - s0)
    for ci, (wi, text) in enumerate(chunks):
        a = word_time(li, wi) - 0.05
        b = word_time(li, chunks[ci + 1][0]) - 0.07 if ci + 1 < len(chunks) else line_end + 0.15
        events.append(f"Dialogue: 0,{ts(a)},{ts(b)},Cap,,0,0,0,,{text.replace(chr(10), '\\N')}")
ass = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Lora,64,&H00DFEEF6,&H000000FF,&H73000000,&H8C000000,0,1,0,0,100,100,0,0,1,3,1.5,2,70,70,560,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
""" + "\n".join(events) + "\n"
(OUT / "captions.ass").write_text(ass)

# ---- voice track ----
voice = OUT / "voice.wav"
filters, inputs = [], []
for i, (t0, s0, s1, w, chunks) in enumerate(placed):
    ms = int(t0 * 1000)
    filters.append(f"[0]atrim={s0:.3f}:{s1:.3f},asetpts=PTS-STARTPTS,afade=t=in:d=0.05,afade=t=out:st={s1-s0-0.08:.3f}:d=0.08,adelay={ms}|{ms}[l{i}]")
mix = "".join(f"[l{i}]" for i in range(len(placed))) + f"amix=inputs={len(placed)}:normalize=0,apad=whole_dur={total:.3f}"
chain = ";".join(filters) + ";" + mix + ",highpass=f=80,afftdn=nf=-50,acompressor=threshold=-24dB:ratio=3:attack=8:release=120,loudnorm=I=-15:TP=-1.5[v]"
run(["ffmpeg", "-y", "-v", "error", "-i", str(V / "full.m4a"), "-filter_complex", chain, "-map", "[v]",
     "-ar", str(SR), "-ac", "2", "-t", f"{total:.3f}", str(voice)])

# ---- score ----
n = int(total * SR); tl = np.arange(n) / SR
rng = np.random.default_rng(3)
env = lambda pts: np.interp(tl, *zip(*pts))
sine = lambda f, ph=0.0: np.sin(2 * np.pi * f * tl + ph)
def onepole(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); acc = 0.0
    from itertools import accumulate
    return np.fromiter(accumulate(x * (1 - a), lambda p, v: p * a + v), dtype=np.float64, count=len(x))
drone = 0.55 * sine(55) + 0.35 * sine(55.18, 1) + 0.3 * sine(82.41) + 0.22 * sine(110.1, 0.4)
drone *= env([(0, 0), (1.5, 0.6), (snap - 0.02, 1.0), (snap, 0), (total, 0)])
noise = rng.standard_normal(n)
wind = onepole(noise, 700) - onepole(noise, 120)
wind = wind / np.abs(wind).max() * (0.6 + 0.4 * np.sin(2 * np.pi * 0.13 * tl))
wind *= env([(0, 0), (0.6, 0.35), (L[2] + 2, 0.35), (L[3], 0), (total, 0)])
sub = sine(36) * env([(0, 0), (L[3] - 0.8, 0), (L[3] + 1, 0.9), (L[3] + 4, 0.1), (L[4], 0), (total, 0)])
def bell(t0, f, amp, decay=2.2):
    x = np.zeros(n); i0 = int(t0 * SR); tt = np.arange(n - i0) / SR
    x[i0:] = amp * (np.sin(2*np.pi*f*tt) + 0.35*np.sin(2*np.pi*2.01*f*tt) + 0.12*np.sin(2*np.pi*3*f*tt)) * np.exp(-tt/decay) * np.minimum(1, tt/0.04)
    return x
c0 = wt(4, 4) + 0.3
cadence = 0.12 * (bell(c0, 440, 1) + bell(c0 + 0.75, 554.37, 0.9) + bell(c0 + 1.5, 659.25, 1.05))
chord = sum(a * sine(f) for f, a in [(110, .5), (164.81, .4), (220, .35), (277.18, .25), (329.63, .25), (440, .12)])
chord *= env([(0, 0), (cut_jump, 0), (cut_jump + 2, 0.15), (snap - 0.5, 0.9), (snap - 0.02, 1), (snap, 0), (total, 0)])
tone = np.zeros(n); i0 = int((snap + 0.4) * SR); tt = np.arange(n - i0) / SR
tone[i0:] = (np.sin(2*np.pi*55*tt) + 0.5*np.sin(2*np.pi*110*tt)) * np.exp(-tt/1.4) * np.minimum(1, tt/0.3) * 0.7
mixd = 0.22 * drone + 0.28 * wind + 0.35 * sub + cadence + 0.2 * chord + 0.3 * tone
fade = env([(0, 1), (total - 0.8, 1), (total, 0)])
st = np.stack([mixd * fade, mixd * fade], 1); st /= np.abs(st).max() / 0.89
with wave.open(str(OUT / "score.wav"), "wb") as wv:
    wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(SR); wv.writeframes((st * 32767).astype("<i2").tobytes())

# ---- final mix + burn captions ----
final = V / "celestial-post1-reel-hook.mp4"
fonts = T / "fonts"
run(["ffmpeg", "-y", "-v", "error", "-i", str(OUT / "video.mp4"), "-i", str(OUT / "score.wav"), "-i", str(voice),
     "-filter_complex",
     "[1]volume=0.5[s];[2]asplit[v1][v2];[s][v1]sidechaincompress=threshold=0.02:ratio=10:attack=15:release=450[d];"
     "[d][v2]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.9[a];"
     f"[0]subtitles={OUT / 'captions.ass'}:fontsdir={fonts}[v]",
     "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p",
     "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", "-t", f"{total:.3f}", str(final)])
print("wrote", final)
