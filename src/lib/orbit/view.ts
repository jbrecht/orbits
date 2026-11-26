import { GALACTIC_PITCH_AU } from "./constants";

export type PresetId = "galactic" | "lsr";

export interface Preset {
  id: PresetId;
  label: string;
  frameName: string;
  pitchAU: number;
}

export const PRESETS: readonly Preset[] = [
  { id: "galactic", label: "Galactic", frameName: "Galactic Orbit", pitchAU: GALACTIC_PITCH_AU },
  { id: "lsr", label: "Local Stars / LSR", frameName: "Local Standard of Rest", pitchAU: 4.11 },
];

export const CUSTOM_FRAME_NAME = "Custom Axial Scale";

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
}

export const INITIAL_VIEW: ViewState = {
  pitchAU: GALACTIC_PITCH_AU,
  spanYears: 2,
  isPlaying: true,
  showMoon: false,
  showInnerPlanets: false,
  showOuterPlanets: false,
  showSymbols: true,
  showNames: false,
  preset: "galactic",
};

export const INITIAL_PHASE_YEARS = 0.35;

export function frameName(view: ViewState): string {
  return PRESETS.find((p) => p.id === view.preset)?.frameName ?? CUSTOM_FRAME_NAME;
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
