// Celestial uses cel_* physical tables.
// Runtime remap keeps legacy sb_* callsites working while targeting cel_*.

export type AgeMode = "young_reader" | "teen" | "adult";

export type UserRole = "admin" | "member" | "author";
export type ContributionMode = "tell" | "beyond";

export interface Profile {
  id: string;
  display_name: string;
  age: number | null;
  age_mode: AgeMode | null;
  role: UserRole;
  has_onboarded: boolean;
  onboarded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string | null;
  age_mode: AgeMode;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  cited_story_slugs: string[] | null;
  created_at: string;
}

export type ChapterQuestionCategory =
  | "person"
  | "place"
  | "object"
  | "timeline"
  | "other";

export type ChapterQuestionStatus = "pending" | "answered" | "archived";

export type ChapterAnswerVisibility = "public" | "private";

export interface ChapterQuestion {
  id: string;
  asker_id: string;
  story_id: string;
  category: ChapterQuestionCategory | null;
  context_excerpt: string | null;
  question: string;
  age_mode: AgeMode | null;
  status: ChapterQuestionStatus;
  created_at: string;
  updated_at: string;
}

export interface ChapterAnswer {
  id: string;
  question_id: string;
  answerer_id: string;
  answer_text: string | null;
  linked_draft_id: string | null;
  visibility: ChapterAnswerVisibility;
  created_at: string;
  updated_at: string;
}
