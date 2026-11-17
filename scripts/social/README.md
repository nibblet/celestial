# Social video tooling (Reels and teaser)

These scripts were written in a cloud session; their paths still point at that session's scratch folders. **Update the `Path(...)` constants at the top of each script before running it locally.**

| Script | What it does |
|---|---|
| `teaser_build.py` | Builds the 16:9 teaser from the 8 Runway clips: trims, on-screen narration text, synthesized score (numpy), CELESTIAL HERITAGE end title. |
| `post1_reel.py` / `post1_reel_hook.py` | Post 1 Reel (9:16): picks narration takes from the Whisper transcript, cuts the clips vertically to the voice, writes ASS captions, ducks the score under the voice, and appends the cover end card. The `_hook` version adds a 4-cut montage cold open. |
| `transcribe.py` | Whisper (faster-whisper `small.en`) with word timestamps: `python transcribe.py audio.f32 out.json`. Takes 16 kHz mono float32: `ffmpeg -i in.m4a -ac 1 -ar 16000 -f f32le audio.f32`. |
| `post2-narration-transcript.json` | Word-timed transcript of the post 2 narration file (`Gerardia Ln 7.m4a`, 98 s). |

**Requirements:** ffmpeg (with libass and drawtext), Python 3 with numpy, faster-whisper in a venv, and fonts Cinzel (`scripts/cover/fonts`) and Lora Italic.

**Source clips:** the teaser clip URLs are in `docs/celestial/visual-canon/teaser-shot-list.md`, under **Cut**.
