import type { ContributionMode } from "@/types";

export function getVolumeForContributionMode(mode: ContributionMode): string {
  return mode === "beyond" ? "P2" : "P4";
}

export function getContributionLabel(mode: ContributionMode): string {
  return mode === "beyond" ? "Keith Beyond" : "Family Tell";
}

export function getContributorPersonaName(
  mode: ContributionMode,
  displayName: string
): string {
  return mode === "beyond" ? "Keith Cobb" : displayName;
}
