/**
 * Era accent colors from design spec (life chapters / timeline).
 * Years: Red Clay 1935–1955, Coming of Age 1956–1968, Building 1969–1980,
 * Leadership 1981–1998, Legacy 1999–2015.
 */

export type EraKey =
  | "red_clay"
  | "coming_of_age"
  | "building"
  | "leadership"
  | "legacy";

export interface EraAccent {
  key: EraKey;
  label: string;
  hex: string;
  dot: string;
  yearText: string;
  border: string;
  cardRing: string;
  /** Life-stage / era pill on story cards */
  badgeClass: string;
  /** Solid border-color class for era accent stripes (e.g. story title left border) */
  accentBorder: string;
}

const ACCENTS: Record<EraKey, EraAccent> = {
  red_clay: {
    key: "red_clay",
    label: "Red Clay Hills",
    hex: "#8b2c2c",
    dot: "bg-burgundy",
    yearText: "text-burgundy",
    border: "border-burgundy/25",
    cardRing: "ring-burgundy",
    badgeClass: "bg-burgundy-light text-burgundy",
    accentBorder: "border-burgundy",
  },
  coming_of_age: {
    key: "coming_of_age",
    label: "Coming of Age",
    hex: "#c8662a",
    dot: "bg-clay",
    yearText: "text-clay",
    border: "border-clay/25",
    cardRing: "ring-clay",
    badgeClass: "bg-clay-light text-clay",
    accentBorder: "border-clay",
  },
  building: {
    key: "building",
    label: "Building",
    hex: "#d4a843",
    dot: "bg-gold",
    yearText: "text-gold",
    border: "border-gold/40",
    cardRing: "ring-gold",
    badgeClass: "bg-gold-pale text-gold",
    accentBorder: "border-gold",
  },
  leadership: {
    key: "leadership",
    label: "Leadership",
    hex: "#4a7fa0",
    dot: "bg-ocean",
    yearText: "text-ocean",
    border: "border-ocean/25",
    cardRing: "ring-ocean",
    badgeClass: "bg-ocean-pale text-ocean",
    accentBorder: "border-ocean",
  },
  legacy: {
    key: "legacy",
    label: "Legacy",
    hex: "#6ba35a",
    dot: "bg-green",
    yearText: "text-green",
    border: "border-green/25",
    cardRing: "ring-green",
    badgeClass: "bg-green-pale text-green",
    accentBorder: "border-green",
  },
};

export const orderedEraKeys: EraKey[] = [
  "red_clay",
  "coming_of_age",
  "building",
  "leadership",
  "legacy",
];

export function getEraAccent(key: EraKey): EraAccent {
  return ACCENTS[key];
}

export function getAllEraAccents(): EraAccent[] {
  return orderedEraKeys.map((key) => ACCENTS[key]);
}

export function yearToEraKey(year: number): EraKey {
  if (year <= 1955) return "red_clay";
  if (year <= 1968) return "coming_of_age";
  if (year <= 1980) return "building";
  if (year <= 1998) return "leadership";
  return "legacy";
}

export function yearToEraAccent(year: number): EraAccent {
  return ACCENTS[yearToEraKey(year)];
}

/** When story year is unknown, map wiki Life Stage to closest era accent. */
export function lifeStageToEraAccent(lifeStage: string): EraAccent {
  const s = lifeStage.toLowerCase();
  if (s.includes("childhood")) return ACCENTS.red_clay;
  if (s.includes("education")) return ACCENTS.coming_of_age;
  if (s.includes("early career") || s.includes("mid career"))
    return ACCENTS.building;
  if (s.includes("leadership")) return ACCENTS.leadership;
  if (s.includes("reflection") || s.includes("legacy")) return ACCENTS.legacy;
  return ACCENTS.building;
}
