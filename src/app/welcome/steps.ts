import type { ComponentType } from "react";
import type { AgeMode } from "@/types";
import { book } from "@/config/book";
import { ReadDemo } from "./demos/ReadDemo";
import { AskDemo } from "./demos/AskDemo";
import { TellDemo } from "./demos/TellDemo";
import { JourneysDemo } from "./demos/JourneysDemo";

export type StepSpec = {
  key: "read" | "ask" | "tell" | "journeys";
  title: string;
  body: string;
  Demo: ComponentType<{ ageMode: AgeMode }>;
};

/**
 * Returns the four onboarding steps with copy branched by age mode. `teen`
 * falls through to adult copy unless the step explicitly overrides it.
 */
export function getSteps(ageMode: AgeMode): StepSpec[] {
  const isYoungReader = ageMode === "young_reader";

  return [
    {
      key: "read",
      title: isYoungReader ? "Find stories you love" : `Browse ${book.title}`,
      body: isYoungReader
        ? "Tap a story to read it. Tap the heart to save your favorites. Paint over lines you like to keep them."
        : `Pick up ${book.shortName} chapter by chapter. Favorite what moves you; highlight lines worth revisiting.`,
      Demo: ReadDemo,
    },
    {
      key: "ask",
      title: `Ask about ${book.title}`,
      body: isYoungReader
        ? "Ask what confuses or excites you — answers stay grounded in the companion's story catalog."
        : `Ask lore and meaning questions about ${book.shortName}. Answers cite specific stories when they can.`,
      Demo: AskDemo,
    },
    {
      key: "tell",
      title: isYoungReader ? "Share your own memory" : "Add your memories to the archive",
      body: isYoungReader
        ? "Type or talk about something you remember. We'll help turn it into a little story to share."
        : "Record or type a memory. We'll help shape it into a story worth keeping for the family.",
      Demo: TellDemo,
    },
    {
      key: "journeys",
      title: isYoungReader ? "Follow a trail of stories" : "Explore by journey or theme",
      body: isYoungReader
        ? "Journeys take you through stories in order, like a path. Themes group stories by big ideas."
        : "Journeys are curated sequences; themes cluster stories by idea — resilience, family, craft. Start anywhere.",
      Demo: JourneysDemo,
    },
  ];
}
