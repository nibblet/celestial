import { imagenProvider } from "./imagen";
import { runwayProvider } from "./runway";
import type { VisualProvider, VisualProviderName } from "./types";

export const PROVIDERS: Partial<Record<VisualProviderName, VisualProvider>> = {
  imagen: imagenProvider,
  runway: runwayProvider,
};

export function getProvider(name: VisualProviderName): VisualProvider {
  const provider = PROVIDERS[name];
  if (!provider) throw new Error(`Visual provider '${name}' not registered`);
  return provider;
}
