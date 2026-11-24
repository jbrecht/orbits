import {
  AU_PER_YR_PER_KMS,
  CIRCUMFERENCE_AU,
  GALACTIC_PITCH_AU,
  WORLD_UNITS_PER_AU,
} from "./constants";

/** Earth's helix angle against the orbital plane: arctan(v☉ / v⊕). */
export function helixAngleDeg(pitchAU: number): number {
  return (Math.atan(pitchAU / CIRCUMFERENCE_AU) * 180) / Math.PI;
}

export function sunSpeedKms(pitchAU: number): number {
  return pitchAU / AU_PER_YR_PER_KMS;
}

/** Axial stretch relative to the true galactic speed. */
export function axialScale(pitchAU: number): number {
  return pitchAU / GALACTIC_PITCH_AU;
}

export interface HelixFrame {
  /** World units the Sun travels per Earth year. */
  pitchUnits: number;
  totalLength: number;
  /** The visible helix is centred on the origin. */
  xStart: number;
}

export function helixFrame(pitchAU: number, spanYears: number): HelixFrame {
  const pitchUnits = pitchAU * WORLD_UNITS_PER_AU;
  const totalLength = pitchUnits * spanYears;
  return { pitchUnits, totalLength, xStart: -totalLength / 2 };
}

/** The Sun's position along the axis after `years` Earth years. */
export function sunX(frame: HelixFrame, years: number): number {
  return frame.xStart + years * frame.pitchUnits;
}

/** A body's [y, z] offset from the Sun in the Y–Z orbital plane. */
export function orbitOffset(
  radiusUnits: number,
  years: number,
  periodYr: number,
  phaseOffset = 0,
): [number, number] {
  const theta = (years / periodYr) * Math.PI * 2 + phaseOffset;
  return [radiusUnits * Math.sin(theta), radiusUnits * Math.cos(theta)];
}

/** Playback speed scales with the span so one sweep takes `sweepSeconds`. */
export function advancePhase(
  phase: number,
  dtSeconds: number,
  spanYears: number,
  sweepSeconds: number,
): number {
  return (phase + (dtSeconds * spanYears) / sweepSeconds) % spanYears;
}

/** Keeps the relative progress along the helix when the span changes. */
export function rescalePhase(phase: number, prevSpan: number, nextSpan: number): number {
  return (phase / prevSpan) * nextSpan;
}

/** Camera distance that frames the whole visible helix. */
export function fitCameraRadius(totalLength: number): number {
  return Math.max(24, Math.min(15000, totalLength * 0.82 + 20));
}
