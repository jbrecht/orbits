import { PLANETS } from "./bodies";
import { MOON_VISUAL_RADIUS_UNITS, RADIUS_UNITS, auToUnits } from "./constants";
import { axisOverhang, helixFrame, orbitOffset } from "./physics";
import { isPlanetVisible, type ViewState } from "./view";

export type Vec3 = [number, number, number];

export interface Bounds {
  min: Vec3;
  max: Vec3;
}

/** Room for the bodies' spheres (the Sun's glow is the largest) around their paths. */
const SPHERE_PAD = 1.6;
const ARC_SAMPLES = 48;

/**
 * A box around everything the helix group draws for this view: the Sun's axis
 * and arrow, and each visible path. A path shorter than one orbit only covers
 * its arc, so a short span with the outer planets isn't framed as full circles.
 */
export function sceneBounds(view: ViewState): Bounds {
  const frame = helixFrame(view.pitchAU, view.spanYears);
  const xReach = frame.totalLength / 2 + axisOverhang(frame.totalLength);
  const bounds: Bounds = { min: [-xReach, -SPHERE_PAD, -SPHERE_PAD], max: [xReach, SPHERE_PAD, SPHERE_PAD] };

  const earthPad = SPHERE_PAD + (view.showMoon ? MOON_VISUAL_RADIUS_UNITS : 0);
  addArc(bounds, RADIUS_UNITS, 1, 0, view.spanYears, earthPad);
  for (const p of PLANETS) {
    if (isPlanetVisible(view, p)) addArc(bounds, auToUnits(p.radiusAU), p.periodYr, p.phaseOffset, view.spanYears, SPHERE_PAD);
  }
  return bounds;
}

/** Grows `bounds` in Y and Z to cover a path's arc over the span, plus `pad`. */
function addArc(bounds: Bounds, radius: number, periodYr: number, phaseOffset: number, spanYears: number, pad: number) {
  const grow = (y: number, z: number) => {
    bounds.min[1] = Math.min(bounds.min[1], y - pad);
    bounds.max[1] = Math.max(bounds.max[1], y + pad);
    bounds.min[2] = Math.min(bounds.min[2], z - pad);
    bounds.max[2] = Math.max(bounds.max[2], z + pad);
  };
  if (spanYears >= periodYr) {
    grow(-radius, -radius);
    grow(radius, radius);
    return;
  }
  for (let i = 0; i <= ARC_SAMPLES; i++) {
    const [y, z] = orbitOffset(radius, (i / ARC_SAMPLES) * spanYears, periodYr, phaseOffset);
    grow(y, z);
  }
}

export interface FitOptions {
  /** The camera's angles around its target, as `OrbitCameraController` uses them. */
  theta: number;
  phi: number;
  /** Vertical field of view, in degrees. */
  fovDeg: number;
  /** Width over height of the whole canvas. */
  aspect: number;
  /** The share of the canvas's height not covered by the control bar. */
  visibleFraction: number;
  /** The share of the visible area the box may fill. */
  fill: number;
}

/**
 * The target (the box's centre) and camera distance at which every corner of
 * `bounds` falls inside the visible area, seen from the given angles.
 */
export function fitBounds(bounds: Bounds, o: FitOptions): { target: Vec3; distance: number } {
  const target: Vec3 = [0, 1, 2].map((i) => (bounds.min[i] + bounds.max[i]) / 2) as Vec3;
  // Unit vector from the target to the camera, and the camera's right and up vectors.
  const sinPhi = Math.sin(o.phi);
  const back: Vec3 = [sinPhi * Math.sin(o.theta), Math.cos(o.phi), sinPhi * Math.cos(o.theta)];
  const rightLen = Math.hypot(back[0], back[2]);
  const right: Vec3 = [back[2] / rightLen, 0, -back[0] / rightLen];
  const up = cross(back, right);

  const tanHalf = Math.tan((o.fovDeg * Math.PI) / 360) * o.fill;
  const tanV = tanHalf * o.visibleFraction;
  const tanH = tanHalf * o.aspect;

  let distance = 0;
  for (let corner = 0; corner < 8; corner++) {
    const c: Vec3 = [0, 1, 2].map((i) => ((corner >> i) & 1 ? bounds.max[i] : bounds.min[i]) - target[i]) as Vec3;
    const towardCamera = dot(c, back);
    distance = Math.max(
      distance,
      towardCamera + Math.abs(dot(c, right)) / tanH,
      towardCamera + Math.abs(dot(c, up)) / tanV,
    );
  }
  return { target, distance };
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
