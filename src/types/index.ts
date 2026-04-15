// Supabase table names are prefixed with sb_ to avoid collisions
// with other projects sharing the same Supabase instance.
// Tables: sb_profiles, sb_conversations, sb_messages

export type AgeMode = "young_reader" | "teen" | "adult";

export type UserRole = "admin" | "member" | "keith";
export type ContributionMode = "tell" | "beyond";

export interface Profile {
  id: string;
  display_name: string;
  age: number | null;
  age_mode: AgeMode | null;
  role: UserRole;
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
