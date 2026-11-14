import { imagenProvider } from "./imagen";
import { openaiProvider } from "./openai";
import { runwayProvider } from "./runway";
import type { VisualProvider, VisualProviderName } from "./types";

export const PROVIDERS: Partial<Record<VisualProviderName, VisualProvider>> = {
  imagen: imagenProvider,
  openai: openaiProvider,
  runway: runwayProvider,
};

export function getProvider(name: VisualProviderName): VisualProvider {
  const provider = PROVIDERS[name];
  if (!provider) throw new Error(`Visual provider '${name}' not registered`);
  return provider;
}
