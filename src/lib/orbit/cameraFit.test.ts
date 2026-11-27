import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { fitBounds, sceneBounds, type Bounds, type FitOptions } from "./cameraFit";
import { RADIUS_UNITS, auToUnits } from "./constants";
import { axisOverhang, helixFrame } from "./physics";
import { INITIAL_VIEW } from "./view";

const OPTIONS: FitOptions = { theta: 0.52, phi: 1.18, fovDeg: 45, aspect: 1.6, visibleFraction: 0.8, fill: 0.92 };

/** Where each corner of `bounds` lands in normalized device coordinates, seen through a real three.js camera. */
function projectCorners(bounds: Bounds, o: FitOptions): THREE.Vector3[] {
  const { target, distance } = fitBounds(bounds, o);
  const camera = new THREE.PerspectiveCamera(o.fovDeg, o.aspect, 0.1, 100000);
  const t = new THREE.Vector3(...target);
  camera.position.set(
    t.x + distance * Math.sin(o.phi) * Math.sin(o.theta),
    t.y + distance * Math.cos(o.phi),
    t.z + distance * Math.sin(o.phi) * Math.cos(o.theta),
  );
  camera.lookAt(t);
  camera.updateMatrixWorld();
  const corners: THREE.Vector3[] = [];
  for (let c = 0; c < 8; c++) {
    const p = [0, 1, 2].map((i) => ((c >> i) & 1 ? bounds.max[i] : bounds.min[i]));
    corners.push(new THREE.Vector3(p[0], p[1], p[2]).project(camera));
  }
  return corners;
}

describe("sceneBounds", () => {
  it("covers the axis, its arrow and Earth's full orbit", () => {
    const frame = helixFrame(INITIAL_VIEW.pitchAU, INITIAL_VIEW.spanYears);
    const b = sceneBounds(INITIAL_VIEW);
    expect(b.max[0]).toBeCloseTo(frame.totalLength / 2 + axisOverhang(frame.totalLength));
    expect(b.max[1]).toBeGreaterThan(RADIUS_UNITS);
    expect(b.min[2]).toBeLessThan(-RADIUS_UNITS);
  });

  it("covers only the arc an outer planet travels in a short span", () => {
    const b = sceneBounds({ ...INITIAL_VIEW, showOuterPlanets: true });
    const neptune = auToUnits(30.047);
    const height = b.max[1] - b.min[1];
    const depth = b.max[2] - b.min[2];
    // Full circles would make the box Neptune's orbit across in both directions.
    expect(Math.min(height, depth)).toBeLessThan(2 * neptune);
  });
});

describe("fitBounds", () => {
  it.each([
    ["the opening view", INITIAL_VIEW],
    ["galactic over 100 years", { ...INITIAL_VIEW, pitchAU: 52.95, spanYears: 100 }],
    ["every planet over 2 years", { ...INITIAL_VIEW, showMoon: true, showInnerPlanets: true, showOuterPlanets: true }],
  ])("keeps every corner of %s inside the visible area, touching its edge", (_, view) => {
    const corners = projectCorners(sceneBounds(view), OPTIONS);
    const xLimit = OPTIONS.fill;
    const yLimit = OPTIONS.fill * OPTIONS.visibleFraction;
    for (const p of corners) {
      expect(Math.abs(p.x)).toBeLessThanOrEqual(xLimit + 1e-9);
      expect(Math.abs(p.y)).toBeLessThanOrEqual(yLimit + 1e-9);
      expect(p.z).toBeLessThan(1);
    }
    const tightest = Math.max(...corners.map((p) => Math.max(Math.abs(p.x) / xLimit, Math.abs(p.y) / yLimit)));
    expect(tightest).toBeCloseTo(1, 6);
  });

  it.each([
    ["end-on", Math.PI / 2, Math.PI / 2],
    ["side-on", 0, Math.PI / 2],
    ["from above, axis up the screen", Math.PI / 2, 0.12],
    ["from below, axis up the screen", Math.PI / 2, Math.PI - 0.12],
    ["past a full turn", 0.52 + 4 * Math.PI, 1.18],
    ["at a negative angle", -2.3, 0.9],
  ])("keeps every corner inside the visible area, touching its edge, seen %s", (_, theta, phi) => {
    const o = { ...OPTIONS, theta, phi };
    const corners = projectCorners(sceneBounds({ ...INITIAL_VIEW, pitchAU: 52.95, showOuterPlanets: true }), o);
    const xLimit = o.fill;
    const yLimit = o.fill * o.visibleFraction;
    for (const p of corners) {
      expect(Math.abs(p.x)).toBeLessThanOrEqual(xLimit + 1e-9);
      expect(Math.abs(p.y)).toBeLessThanOrEqual(yLimit + 1e-9);
      expect(p.z).toBeLessThan(1);
    }
    const tightest = Math.max(...corners.map((p) => Math.max(Math.abs(p.x) / xLimit, Math.abs(p.y) / yLimit)));
    expect(tightest).toBeCloseTo(1, 6);
  });

  it("backs off further when the control bar covers more of the view", () => {
    const bounds = sceneBounds({ ...INITIAL_VIEW, showOuterPlanets: true });
    const open = fitBounds(bounds, { ...OPTIONS, visibleFraction: 1 }).distance;
    const covered = fitBounds(bounds, { ...OPTIONS, visibleFraction: 0.6 }).distance;
    expect(covered).toBeGreaterThan(open);
  });
});
