import type { Vec3 } from "./cameraFit";
import type { PresetId } from "./view";

/** The stars in `public/stars.bin` (built by `scripts/build-stars.mjs`), brightest first. */
export interface StarCatalog {
  count: number;
  /** Unit vectors in galactic coordinates: x toward the Galactic centre, y toward l = 90°, z toward the north galactic pole. */
  directions: Float32Array;
  magnitudes: Float32Array;
  /** B−V colour index, NaN when the catalogue has none. */
  colors: Float32Array;
}

const RECORD_BYTES = 10;

export function decodeStars(buffer: ArrayBuffer): StarCatalog {
  const view = new DataView(buffer);
  const count = Math.floor(buffer.byteLength / RECORD_BYTES);
  const directions = new Float32Array(count * 3);
  const magnitudes = new Float32Array(count);
  const colors = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const o = i * RECORD_BYTES;
    for (let axis = 0; axis < 3; axis++) directions[i * 3 + axis] = view.getInt16(o + axis * 2, true) / 32767;
    magnitudes[i] = view.getInt16(o + 6, true) / 100;
    const bv = view.getInt16(o + 8, true);
    colors[i] = bv === -32768 ? NaN : bv / 100;
  }
  return { count, directions, magnitudes, colors };
}

/** Stars fainter than this aren't drawn: about the naked-eye limit under a dark sky. */
export const FAINTEST_MAGNITUDE = 6.5;

/** Drawn sizes in CSS pixels, by brightness. The first group whose limit a star is brighter than holds it. */
export const STAR_SIZE_GROUPS: { brighterThan: number; sizePx: number }[] = [
  { brighterThan: 1.5, sizePx: 5 },
  { brighterThan: 3.5, sizePx: 3.5 },
  { brighterThan: FAINTEST_MAGNITUDE + 0.01, sizePx: 2.5 },
];

/** How bright a star is drawn, 0–1: linear in magnitude (which is already logarithmic, like the eye). */
export function starIntensity(magnitude: number): number {
  const t = (magnitude - -1.5) / (FAINTEST_MAGNITUDE - -1.5);
  return Math.min(1, Math.max(0.22, 1 - 0.78 * t));
}

/** Approximate colours of stars by B−V, from blue-white O and B stars to orange M stars. */
const BV_COLORS: [number, Vec3][] = [
  [-0.4, [0.62, 0.71, 1.0]],
  [0.0, [0.8, 0.85, 1.0]],
  [0.3, [0.94, 0.94, 1.0]],
  [0.6, [1.0, 0.96, 0.91]],
  [1.0, [1.0, 0.87, 0.73]],
  [1.5, [1.0, 0.77, 0.55]],
  [2.0, [1.0, 0.7, 0.45]],
];

/** A star's tint, before its intensity is applied. Stars with no colour index are drawn white. */
export function starColor(bv: number): Vec3 {
  if (Number.isNaN(bv)) return [1, 1, 1];
  if (bv <= BV_COLORS[0][0]) return BV_COLORS[0][1];
  for (let i = 1; i < BV_COLORS.length; i++) {
    const [b1, c1] = BV_COLORS[i];
    if (bv <= b1) {
      const [b0, c0] = BV_COLORS[i - 1];
      const t = (bv - b0) / (b1 - b0);
      return [0, 1, 2].map((k) => c0[k] + (c1[k] - c0[k]) * t) as Vec3;
    }
  }
  return BV_COLORS[BV_COLORS.length - 1][1];
}

/** A direction in galactic coordinates from longitude and latitude in degrees. */
export function galactic(lDeg: number, bDeg: number): Vec3 {
  const l = (lDeg * Math.PI) / 180;
  const b = (bDeg * Math.PI) / 180;
  return [Math.cos(b) * Math.cos(l), Math.cos(b) * Math.sin(l), Math.sin(b)];
}

/**
 * Where the Sun is heading in each frame, in galactic coordinates:
 * relative to nearby stars, the standard solar apex in Hercules (l 56°, b +23°,
 * near Vega); around the Galaxy, the direction of galactic rotation in Cygnus.
 */
export const SOLAR_APEX: Record<PresetId, Vec3> = {
  lsr: galactic(56, 23),
  galactic: galactic(90, 0),
};

const NORTH_GALACTIC_POLE: Vec3 = [0, 0, 1];

/**
 * The scene's x, y and z axes in galactic coordinates, so the sky can be turned
 * to match: x (the Sun's path) points at the frame's apex and y (up) as close
 * to the north galactic pole as it can.
 */
export function skyAxes(frame: PresetId): [Vec3, Vec3, Vec3] {
  const x = SOLAR_APEX[frame];
  const along = dot(NORTH_GALACTIC_POLE, x);
  const y = normalize(NORTH_GALACTIC_POLE.map((v, i) => v - along * x[i]) as Vec3);
  return [x, y, cross(x, y)];
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const normalize = (v: Vec3): Vec3 => {
  const len = Math.hypot(...v);
  return [v[0] / len, v[1] / len, v[2] / len];
};
