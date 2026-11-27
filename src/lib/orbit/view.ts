import { PLANETS, type PlanetConfig } from "./bodies";
import { GALACTIC_PITCH_AU } from "./constants";

export type PresetId = "galactic" | "lsr";

export interface Preset {
  id: PresetId;
  label: string;
  pitchAU: number;
}

const LSR_PITCH_AU = 4.11;

export const PRESETS: readonly Preset[] = [
  { id: "galactic", label: "Galactic Orbit", pitchAU: GALACTIC_PITCH_AU },
  { id: "lsr", label: "Nearby Stars (LSR)", pitchAU: LSR_PITCH_AU },
];

export const CUSTOM_FRAME_NAME = "Custom Speed";

/** Everything the user can change. The scene reads it; the UI writes it. */
export interface ViewState {
  pitchAU: number;
  spanYears: number;
  isPlaying: boolean;
  showMoon: boolean;
  showInnerPlanets: boolean;
  showOuterPlanets: boolean;
  showSymbols: boolean;
  showNames: boolean;
  /** null once the pitch slider moves off a preset. */
  preset: PresetId | null;
  /** The frame the sky is turned to, so the arrow points at its apex. The last preset chosen. */
  skyFrame: PresetId;
}

export const INITIAL_VIEW: ViewState = {
  // Galactic speed stretches the helix almost straight; the LSR coils are easy to see.
  pitchAU: LSR_PITCH_AU,
  spanYears: 2,
  isPlaying: true,
  showMoon: false,
  showInnerPlanets: false,
  showOuterPlanets: false,
  showSymbols: false,
  showNames: true,
  preset: "lsr",
  skyFrame: "lsr",
};

export const INITIAL_PHASE_YEARS = 0.35;

/** How far the animation is along the span, in Earth years. */
export function formatElapsed(years: number): string {
  return `t = ${years.toFixed(1)} yrs`;
}

/** The Sun's speed as shown everywhere: whole km/s from 100 up, one decimal below. */
export function formatKms(kms: number): string {
  return `${kms >= 100 ? kms.toFixed(0) : kms.toFixed(1)} km/s`;
}

export function isPlanetVisible(view: ViewState, planet: PlanetConfig): boolean {
  return planet.group === "inner" ? view.showInnerPlanets : view.showOuterPlanets;
}

/** The scene's accessible name: which bodies' paths are drawn. */
export function describeScene(view: ViewState): string {
  const bodies = ["Earth"];
  if (view.showMoon) bodies.push("the Moon");
  for (const p of PLANETS) if (isPlanetVisible(view, p)) bodies.push(p.name);
  const list = bodies.length === 1 ? bodies[0] : `${bodies.slice(0, -1).join(", ")} and ${bodies.at(-1)}`;
  const paths = bodies.length === 1 ? "path" : "paths";
  return `Helical ${paths} of ${list} around the Sun’s straight path, over ${view.spanYears} years`;
}

export function formatBodyLabel(view: ViewState, symbol: string, name: string): string {
  if (view.showSymbols && view.showNames) return `${symbol} ${name}`;
  if (view.showSymbols) return symbol;
  if (view.showNames) return name;
  return "";
}

export function labelsVisible(view: ViewState): boolean {
  return view.showSymbols || view.showNames;
}
