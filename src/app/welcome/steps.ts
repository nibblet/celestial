import type { ComponentType } from "react";
import type { AgeMode } from "@/types";
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
      title: isYoungReader ? "Find stories you love" : "Browse Keith's stories",
      body: isYoungReader
        ? "Tap a story to read it. Tap the heart to save your favorites. Paint over lines you like to keep them."
        : "Every story is one chapter of Keith's life. Favorite the ones that move you; highlight lines you want to return to.",
      Demo: ReadDemo,
    },
    {
      key: "ask",
      title: isYoungReader ? "Ask Keith anything" : "Have a conversation with Keith",
      body: isYoungReader
        ? "Type a question like 'What was your favorite game as a kid?' — Keith will answer from his stories."
        : "Ask about any moment in his life. Answers are grounded in his own stories and always point back to where they came from.",
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
