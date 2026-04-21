/**
 * Persona registry — a single indexable source of truth for every sub-agent
 * the orchestrator can fire.
 *
 * Each PersonaDefinition carries:
 *   - the ledger/telemetry key (used as the `persona` column on
 *     sb_ai_interactions rows)
 *   - the display label used in the Synthesizer prompt's "agents who have
 *     analyzed" header
 *   - model + sampling parameters
 *   - a pure buildSystemPrompt(args) fn (delegated to ./perspectives.ts)
 *
 * The registry is intentionally data-only: all prompt *content* lives in
 * perspectives.ts so this file stays compact and the prompt content is easy
 * to skim and test without pulling in the registry machinery.
 */

import {
  buildCelestialNarratorPrompt,
  buildLorekeeperPrompt,
  buildArchivistPrompt,
  buildFinderPrompt,
  buildSynthesizerPrompt,
  buildEditorPrompt,
  type PersonaPromptArgs,
} from "./perspectives";

export type {
  OpenThreadForContext,
  BeatForContext,
  SceneForContext,
  PersonaPromptArgs,
} from "./perspectives";

export type PersonaKey =
  | "celestial_narrator"
  | "lorekeeper"
  | "archivist"
  | "finder"
  | "synthesizer"
  | "editor";

export type PersonaDefinition = {
  key: PersonaKey;
  /** Short display label used by the Synthesizer when listing sub-agents. */
  label: string;
  model: string;
  temperature: number;
  maxTokens: number;
  buildSystemPrompt: (args: PersonaPromptArgs) => string;
};

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

export const PERSONAS: Record<PersonaKey, PersonaDefinition> = {
  celestial_narrator: {
    key: "celestial_narrator",
    label: "Celestial Narrator",
    model: DEFAULT_MODEL,
    temperature: 0.7,
    maxTokens: 512,
    buildSystemPrompt: buildCelestialNarratorPrompt,
  },
  lorekeeper: {
    key: "lorekeeper",
    label: "Lore-keeper",
    model: DEFAULT_MODEL,
    temperature: 0.5,
    maxTokens: 512,
    buildSystemPrompt: buildLorekeeperPrompt,
  },
  archivist: {
    key: "archivist",
    label: "Archivist",
    model: DEFAULT_MODEL,
    temperature: 0.5,
    maxTokens: 512,
    buildSystemPrompt: buildArchivistPrompt,
  },
  finder: {
    key: "finder",
    label: "Finder",
    model: DEFAULT_MODEL,
    temperature: 0.3,
    maxTokens: 512,
    buildSystemPrompt: buildFinderPrompt,
  },
  synthesizer: {
    key: "synthesizer",
    label: "Synthesizer",
    model: DEFAULT_MODEL,
    temperature: 0.6,
    maxTokens: 1024,
    buildSystemPrompt: buildSynthesizerPrompt,
  },
  editor: {
    key: "editor",
    label: "Editor (not implemented)",
    model: DEFAULT_MODEL,
    temperature: 0.3,
    maxTokens: 1024,
    buildSystemPrompt: buildEditorPrompt,
  },
};

export function getPersona(key: PersonaKey): PersonaDefinition {
  return PERSONAS[key];
}

export function getPersonaLabels(keys: PersonaKey[]): string[] {
  return keys.map((k) => PERSONAS[k].label);
}
