export type PlanetGroup = "inner" | "outer";

export interface PlanetConfig {
  id: PlanetId;
  name: string;
  symbol: string;
  group: PlanetGroup;
  /** Semi-major axis. */
  radiusAU: number;
  /** Orbital period in Earth years. */
  periodYr: number;
  /** Starting angle on the orbit, in radians. */
  phaseOffset: number;
  sphereRadius: number;
  /** Width of the orbit path on screen, in CSS pixels. */
  pathWidthPx: number;
  color: number;
  emissive: number;
}

export const PLANET_IDS = [
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
] as const;
export type PlanetId = (typeof PLANET_IDS)[number];
export type BodyId = "sun" | "earth" | "moon" | PlanetId;

/**
 * Every planet moves forward at the Sun's speed, so a planet's pitch is
 * Earth's pitch × its period, and its helix angle is arctan(v☉ / v_planet).
 */
export const PLANETS: readonly PlanetConfig[] = [
  { id: "mercury", name: "Mercury", symbol: "☿", group: "inner", radiusAU: 0.387, periodYr: 0.240846, phaseOffset: 0.3, sphereRadius: 0.3, pathWidthPx: 1.6, color: 0xa8a29e, emissive: 0x57534e },
  { id: "venus", name: "Venus", symbol: "♀", group: "inner", radiusAU: 0.723, periodYr: 0.615198, phaseOffset: 2.1, sphereRadius: 0.43, pathWidthPx: 2, color: 0xfde68a, emissive: 0xb45309 },
  { id: "mars", name: "Mars", symbol: "♂", group: "inner", radiusAU: 1.524, periodYr: 1.88082, phaseOffset: 4.1, sphereRadius: 0.36, pathWidthPx: 1.8, color: 0xf87171, emissive: 0x991b1b },
  { id: "jupiter", name: "Jupiter", symbol: "♃", group: "outer", radiusAU: 5.204, periodYr: 11.862, phaseOffset: 1.7, sphereRadius: 0.92, pathWidthPx: 2.8, color: 0xfb923c, emissive: 0x9a3412 },
  { id: "saturn", name: "Saturn", symbol: "♄", group: "outer", radiusAU: 9.582, periodYr: 29.457, phaseOffset: 5.0, sphereRadius: 0.78, pathWidthPx: 2.6, color: 0xfcd34d, emissive: 0x92400e },
  { id: "uranus", name: "Uranus", symbol: "♅", group: "outer", radiusAU: 19.201, periodYr: 84.011, phaseOffset: 1.1, sphereRadius: 0.62, pathWidthPx: 2.4, color: 0x5eead4, emissive: 0x115e59 },
  { id: "neptune", name: "Neptune", symbol: "♆", group: "outer", radiusAU: 30.047, periodYr: 164.79, phaseOffset: 3.7, sphereRadius: 0.6, pathWidthPx: 2.4, color: 0x6366f1, emissive: 0x312e81 },
];

export interface BodyLabelInfo {
  id: BodyId;
  name: string;
  symbol: string;
  title: string;
}

export const BODY_LABELS: readonly BodyLabelInfo[] = [
  { id: "sun", name: "Sun", symbol: "☉", title: "Sun" },
  { id: "earth", name: "Earth", symbol: "⊕", title: "Earth" },
  { id: "moon", name: "Moon", symbol: "☽", title: "Moon (13.37 orbits/yr)" },
  ...PLANETS.map((p) => ({ id: p.id, name: p.name, symbol: p.symbol, title: p.name })),
];
