/** Curated stills for the reading-room frame UI; repopulate when fiction art is available. */
export type FramePhoto = {
  src: string;
  alt: string;
  caption: string;
  era: string;
};

export const framePhotos: FramePhoto[] = [];
