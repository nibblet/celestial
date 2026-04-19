# Dev Plan: [IDEA-017] Photo Frame Mode — Fullscreen Rotating Memoir Photos

## What This Does

A "Photo Frame" button triggers a fullscreen mode where all app chrome disappears and the
35 original memoir photos cycle slowly across the screen, one at a time, with a soft crossfade.
A subtle caption — story title and life era — floats at the bottom. Escape or a hover-revealed
close button exits.

Designed for a tablet left on the coffee table at a family gathering, or anyone who wants to
sit with Keith's life in images without navigating the archive.

## User Stories

- As a family member at a gathering, I want to put the storybook into photo frame mode so the
photos cycle on the table like a living family album.
- As a grandchild, I want to see the memoir photos full-screen without any buttons or menus
getting in the way.

## Implementation

### Phase 1: Photo Data File

**New file:** `src/lib/wiki/frame-photos.ts`

Read `cobb_brain_lab/book_images_manifest.csv` and cross-reference against the story wiki files
that have inline `![...]` image refs to identify which story each image belongs to. Build a
static array:

```ts
export type FramePhoto = {
  src: string;       // "/book-images/page-NNN_img-NN_xref-NNNN.jpeg"
  alt: string;       // brief accessibility description
  caption: string;   // story title or scene description shown in frame
  era: string;       // "Early Life" | "Education & Service" | "Career & Leadership" | "Family & Legacy"
};

export const framePhotos: FramePhoto[] = [
  {
    src: "/book-images/page-002_img-01_xref-24.jpeg",
    alt: "Young Keith Cobb in the red clay hills",
    caption: "A Towhead from the Red Clay Hills",
    era: "Early Life",
  },
  // ... all 35 entries in chronological order by page number
];
```

Populate all 35 entries. Order chronologically by page number (already embedded in the
filename: `page-NNN`). Assign eras by rough page range:

- Pages 001–050: "Early Life"
- Pages 051–130: "Education & Service"
- Pages 131–270: "Career & Leadership"
- Pages 271–340: "Family & Legacy"

**Checkpoint:** File compiles cleanly. `framePhotos.length === 35`.

---

### Phase 2: PhotoFrameOverlay Component

**New file:** `src/components/PhotoFrameOverlay.tsx`

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FramePhoto } from "@/lib/wiki/frame-photos";

const ADVANCE_MS = 8000;   // 8 seconds per photo
const FADE_MS    = 1200;   // crossfade duration

type Props = {
  photos: FramePhoto[];
  onClose: () => void;
};

export function PhotoFrameOverlay({ photos, onClose }: Props) {
  const [index, setIndex]     = useState(0);
  const [visible, setVisible] = useState(true);  // controls img opacity for crossfade
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Request true fullscreen on mount
  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {/* ignore — some browsers block */});

    const onFsChange = () => {
      if (!document.fullscreenElement) onClose();
    };
    document.addEventListener("fullscreenchange", onFsChange);

    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      if (document.fullscreenElement) document.exitFullscreen?.();
    };
  }, [onClose]);

  // Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Auto-advance with crossfade
  const advance = useCallback(() => {
    setVisible(false);                        // start fade-out
    setTimeout(() => {
      setIndex(i => (i + 1) % photos.length);
      setVisible(true);                       // fade-in new photo
    }, FADE_MS);
  }, [photos.length]);

  useEffect(() => {
    timerRef.current = setInterval(advance, ADVANCE_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [advance]);

  const photo = photos[index];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black">
      {/* Photo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={photo.src}
        src={photo.src}
        alt={photo.alt}
        style={{
          opacity: visible ? 1 : 0,
          transition: `opacity ${FADE_MS}ms ease-in-out`,
        }}
        className="max-h-screen max-w-full object-contain"
      />

      {/* Caption — bottom center, fades with photo */}
      <div
        style={{ opacity: visible ? 1 : 0, transition: `opacity ${FADE_MS}ms ease-in-out` }}
        className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-6 pb-8 pt-16 text-center"
      >
        <p className="font-[family-name:var(--font-lora)] text-lg font-medium text-white/90">
          {photo.caption}
        </p>
        <p className="mt-1 font-[family-name:var(--font-inter)] text-xs font-medium uppercase tracking-widest text-white/50">
          {photo.era}
        </p>
      </div>

      {/* Close — top right, visible on hover of the whole overlay */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Exit photo frame"
        className="absolute right-5 top-5 rounded-full bg-black/40 px-3 py-1.5 font-[family-name:var(--font-inter)] text-xs font-medium text-white/60 opacity-0 transition-opacity duration-300 hover:bg-black/60 hover:text-white [.group:hover_&]:opacity-100"
      >
        × Close
      </button>
    </div>
  );
}
```

**Note on the close button visibility:** wrap the outer `<div>` in a `group` class so the
button reveals on hover of the whole overlay. Update the outer div className to include `group`.

**Checkpoint:** Import the component somewhere and render it — photos cycle, crossfade works,
Escape exits.

---

### Phase 3: Entry Point — Home Page Button

**File:** `src/app/page.tsx`

The home page already has nav cards. Add a "Photo Frame" trigger — either as a nav card in the
grid, or as a subtle button below the main nav card row.

1. Convert the home page from a pure Server Component to a thin shell that imports a
  `HomeClient` component (or add `"use client"` if the home page doesn't already have
   interactive elements).
2. Add state: `const [photoFrame, setPhotoFrame] = useState(false)`
3. Import `PhotoFrameOverlay` and `framePhotos`:

```tsx
{photoFrame && (
  <PhotoFrameOverlay
    photos={framePhotos}
    onClose={() => setPhotoFrame(false)}
  />
)}
```

1. Add the trigger button in the home page nav section:

```tsx
<button
  type="button"
  onClick={() => setPhotoFrame(true)}
  className="... your nav card style ..."
>
  <span>📷</span>
  <span>Photo Frame</span>
</button>
```

Style it to match the existing nav cards but slightly subdued (it's a secondary feature).

**Checkpoint:** Click "Photo Frame" on home page → fullscreen activates, photos cycle, Escape
closes, returns to home page cleanly.

---

### Phase 4: Polish

1. **Preload next image** — use a hidden `<img>` or `new Image()` to preload the next photo
  before it's needed, preventing a flash of blank while the next image loads.

```ts
// In the auto-advance useEffect, preload next:
useEffect(() => {
  const next = photos[(index + 1) % photos.length];
  const img = new Image();
  img.src = next.src;
}, [index, photos]);
```

1. **Photo counter** — optional, very subtle: "12 / 35" in small text, top-left, same
  hover-reveal behavior as the close button.
2. **Pause on manual click** — clicking anywhere on the photo pauses auto-advance for 30
  seconds, then resumes. Good for when someone wants to linger on a photo.

**Checkpoint:** Photos preload smoothly with no blank flash; counter visible on hover.

---

## Content Considerations

- No wiki changes — all 35 images already in `public/book-images/`
- `frame-photos.ts` is the only new content-adjacent file; populate from `book_images_manifest.csv`
- Caption copy should be warm but brief — story title is usually enough

## Age-Mode Impact

- Works identically across all age modes — no AI, no text content, just photos
- Young readers especially benefit from the visual, immersive format

## Testing

- Build passes
- Click "Photo Frame" → fullscreen activates (or overlay fills screen if fullscreen blocked)
- Photos advance automatically every ~8 seconds
- Crossfade is smooth — no flash of black between photos
- Caption updates with each photo
- Escape key exits and returns to home page
- Close button appears on hover, exits cleanly
- `fullscreenchange` event exits correctly if user presses browser's own Escape
- Works on mobile (fullscreen API may not be available — overlay fallback still covers screen)

## Dependencies

- Requires `public/book-images/` (already present — 35 photos from commit `c7ebef7`)
- No DB changes, no migrations, no new API routes

## Estimated Total: 1.5–2 hours

(~30 min to populate `frame-photos.ts`, ~45 min for `PhotoFrameOverlay`, ~30 min for home page
integration + preload polish)