# Story Audio Options

> Status: research captured for later implementation
> Last reviewed: 2026-04-15

## Current product state

- The story listen UI is currently **hidden by default** behind `NEXT_PUBLIC_ENABLE_STORY_AUDIO`.
- Browser-based narration code remains in the repo as a temporary implementation path, but it is not visible unless that flag is explicitly set to `true`.
- This keeps the product clean while preserving the work as a fallback/reference implementation.

## Goal

Add high-quality narration for memoir (`P1_*`) and interview (`IV_*`) stories, with a path to:

- better voice quality than browser speech
- exact audio duration
- reusable cached audio
- optional future voice clone of Keith Cobb

## Options reviewed

### 1. Browser speech (`speechSynthesis`)

**Pros**
- no API cost
- no backend work
- immediate playback

**Cons**
- inconsistent voice quality across browsers/devices
- no true voice identity
- no durable cached audio asset
- estimated duration only, not exact duration

**Use when**
- MVP fallback only

### 2. OpenAI TTS

**Pros**
- lowest-cost polished API option reviewed
- good voice quality
- straightforward server-side generation
- strong fit for "generate on first play, cache for everyone"

**Cons**
- not the preferred path for a true Keith-specific voice clone
- long stories may require chunking/stitching
- still needs storage + metadata + generation route

**Best fit**
- low-cost, high-quality narrated library

**Official references**
- Pricing: https://developers.openai.com/api/docs/pricing
- TTS guide: https://platform.openai.com/docs/guides/text-to-speech
- Audio overview: https://platform.openai.com/docs/guides/audio

### 3. ElevenLabs

**Pros**
- strongest option reviewed for voice cloning
- excellent narration quality
- purpose-built voice products
- supports Instant Voice Cloning and Professional Voice Cloning

**Cons**
- more expensive than OpenAI for pure narration
- still needs storage/caching/integration work on our side

**Best fit**
- recreate Keith's voice as faithfully as possible

**Official references**
- Pricing: https://elevenlabs.io/pricing
- API pricing: https://elevenlabs.io/pricing/api
- TTS docs: https://elevenlabs.io/docs/overview/capabilities/text-to-speech
- Voice cloning docs: https://elevenlabs.io/docs/creative-platform/voices/voice-cloning
- Professional cloning docs: https://elevenlabs.io/docs/product-guides/voices/voice-cloning/professional-voice-cloning

### 4. HeyGen

**Pros**
- supports voice cloning
- stronger option if we eventually want avatar/video experiences

**Cons**
- less focused than ElevenLabs for audio-only narration
- not the clearest fit for a simple story-audio library
- billing/product model is less straightforward for pure narration use

**Best fit**
- future avatar/video storytelling, not first-choice audio-only narration

**Official references**
- Pricing: https://www.heygen.com/pricing
- Voice cloning: https://www.heygen.com/tool/ai-voice-cloning
- API docs: https://docs.heygen.com/
- TTS reference: https://docs.heygen.com/reference/text-to-speech

## Recommendation snapshot

### Lowest-cost polished solution

Use **OpenAI TTS** with server-side generation and caching.

Why:
- best cost/quality balance
- simple mental model
- good for story-library narration

### Best "sounds like Keith" solution

Use **ElevenLabs** with a professional voice clone.

Why:
- strongest voice-clone fit
- likely best emotional fidelity for memoir narration

### Not recommended as first implementation

Use **HeyGen** only if we decide avatar/video is part of the near-term roadmap.

## Recommended architecture for later

### Preferred pattern

Generate audio on first play, then cache it for everyone.

Flow:

1. User clicks play on a story
2. Server checks for a cached audio asset for that story/version/voice
3. If cached, return the stored audio URL + exact duration
4. If missing, generate audio, store it, save metadata, then return it
5. Future plays reuse the stored asset

### Why this is preferred

- avoids paying generation cost repeatedly
- gives consistent playback across browsers/devices
- supports exact duration
- allows future pre-generation of the most important stories

### Cache key guidance

Do not cache by `storyId` alone.

Cache key should include:

- story text hash
- provider
- model
- voice
- narration instructions
- optional speed/version

This prevents stale audio when story text or narration settings change.

## Implementation direction for this repo

When we resume this work, likely additions:

- `src/app/api/stories/[storyId]/audio/route.ts`
- `src/lib/audio/tts.ts`
- `src/lib/audio/cache.ts`
- storage in Supabase Storage, Vercel Blob, or S3-compatible storage
- metadata record/table for cached assets
- upgrade `StoryAudioControls` to use real stored audio URLs instead of browser speech

## Open questions for later review

- Do we want a neutral narrator voice or Keith-specific voice recreation?
- Are we comfortable using a cloned voice from a family/estate consent standpoint?
- Which storage provider do we want for audio assets?
- Do we want to pre-generate featured stories, or only generate on first play?
- Should browser speech remain as a fallback if the external TTS provider fails?

## Decision guide

Choose **OpenAI** if:

- cost matters most
- we want a clean narrated-library feature soon
- voice clone is optional or unnecessary

Choose **ElevenLabs** if:

- "this should sound like Keith" is the product goal
- we are willing to spend more for higher emotional fidelity

Choose **HeyGen** if:

- we expect the roadmap to include avatar/video storytelling soon

## Notes

- Any AI-generated narration should be clearly disclosed in the UI.
- Any Keith voice clone should be treated as a consent-sensitive feature and reviewed before launch.
