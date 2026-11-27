import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sceneBounds, type Bounds } from "../cameraFit";
import { INITIAL_VIEW } from "../view";
import { FIT_FILL, OrbitCameraController } from "./OrbitCameraController";

type Listener = (e: unknown) => void;

/** An event target that records its listeners, so a test can fire them. */
function fakeTarget() {
  const listeners = new Map<string, Listener>();
  return {
    listeners,
    addEventListener: (type: string, fn: Listener) => listeners.set(type, fn),
    removeEventListener: (type: string) => listeners.delete(type),
  };
}

const VIEWPORT = { fovDeg: 45, aspect: 1.6, visibleFraction: 0.75 };
const BOUNDS = sceneBounds(INITIAL_VIEW);

let win: ReturnType<typeof fakeTarget>;
let element: ReturnType<typeof fakeTarget>;
let camera: THREE.PerspectiveCamera;
let controls: OrbitCameraController;

beforeEach(() => {
  win = fakeTarget();
  vi.stubGlobal("window", win);
  element = fakeTarget();
  // The same far plane OrbitScene gives its camera.
  camera = new THREE.PerspectiveCamera(VIEWPORT.fovDeg, VIEWPORT.aspect, 0.1, 30000);
  controls = new OrbitCameraController(camera, element as unknown as HTMLElement);
});

afterEach(() => vi.unstubAllGlobals());

/** Orbits the camera the way a left-drag across the canvas does, or pans it as a right-drag does. */
function drag(dx: number, dy: number, button = 0) {
  element.listeners.get("mousedown")!({ button, shiftKey: false, clientX: 0, clientY: 0 });
  win.listeners.get("mousemove")!({ clientX: dx, clientY: dy });
  win.listeners.get("mouseup")!({});
}

/** Unit vector from the target to the camera. */
const viewDirection = () => camera.position.clone().sub(controls.target).normalize();

const centre = (b: Bounds) => new THREE.Vector3(...[0, 1, 2].map((i) => (b.min[i] + b.max[i]) / 2));

/**
 * Asserts every corner of `bounds` is in front of the far plane and inside the
 * fitted share of the area above the control bar, with the tightest touching its edge.
 */
function expectFramed(bounds: Bounds) {
  camera.updateMatrixWorld();
  const xLimit = FIT_FILL;
  const yLimit = FIT_FILL * VIEWPORT.visibleFraction;
  let tightest = 0;
  for (let c = 0; c < 8; c++) {
    const p = [0, 1, 2].map((i) => ((c >> i) & 1 ? bounds.max[i] : bounds.min[i]));
    const ndc = new THREE.Vector3(p[0], p[1], p[2]).project(camera);
    expect(Math.abs(ndc.x)).toBeLessThanOrEqual(xLimit + 1e-9);
    expect(Math.abs(ndc.y)).toBeLessThanOrEqual(yLimit + 1e-9);
    expect(ndc.z).toBeLessThan(1);
    tightest = Math.max(tightest, Math.abs(ndc.x) / xLimit, Math.abs(ndc.y) / yLimit);
  }
  expect(tightest).toBeCloseTo(1, 6);
}

/** The longest helix the sliders allow: top Sun Speed over the longest span. */
const LONGEST = sceneBounds({ ...INITIAL_VIEW, pitchAU: 60, spanYears: 100 });

describe("OrbitCameraController.fitTo", () => {
  it("keeps the camera's angle when asked to, re-centring and backing off only", () => {
    controls.fitTo(BOUNDS, VIEWPORT);
    const defaultDirection = viewDirection();
    drag(240, -90);
    const dragged = viewDirection();
    expect(dragged.angleTo(defaultDirection)).toBeGreaterThan(0.5);

    // The outer planets' arcs put this box's centre off the origin, where the first fit left the target.
    const galactic = sceneBounds({ ...INITIAL_VIEW, pitchAU: 52.95, showOuterPlanets: true });
    expect(centre(galactic).length()).toBeGreaterThan(1);
    controls.fitTo(galactic, VIEWPORT, true);
    expect(viewDirection().angleTo(dragged)).toBeLessThan(1e-9);
    expect(controls.target.distanceTo(centre(galactic))).toBeLessThan(1e-9);
  });

  it("returns to the default angle otherwise", () => {
    controls.fitTo(BOUNDS, VIEWPORT);
    const defaultDirection = viewDirection();
    drag(240, -90);

    controls.fitTo(BOUNDS, VIEWPORT);
    expect(viewDirection().angleTo(defaultDirection)).toBeLessThan(1e-9);
  });

  it("frames the whole box from a kept angle after a pan", () => {
    drag(300, 200, 2);
    drag(-400, 150);
    const bounds = sceneBounds({ ...INITIAL_VIEW, showOuterPlanets: true, pitchAU: 52.95 });
    controls.fitTo(bounds, VIEWPORT, true);
    expect(controls.target.distanceTo(centre(bounds))).toBeLessThan(1e-9);
    expectFramed(bounds);
  });

  it("frames the longest helix looking down from above, past the zoom-out limit", () => {
    // Turns the axis to run up the screen, where the view is narrowest, and tilts to the top of the orbit.
    drag(-(Math.PI / 2 - 0.52) / 0.0065, 400);
    controls.fitTo(LONGEST, VIEWPORT, true);
    expectFramed(LONGEST);
  });

  it("frames the longest helix from the default angle in a square window", () => {
    camera.aspect = 1;
    camera.updateProjectionMatrix();
    controls.fitTo(LONGEST, { ...VIEWPORT, aspect: 1 });
    expectFramed(LONGEST);
  });

  it("keeps the whole box in front of the far plane after orbiting and zooming out from a fit", () => {
    drag(-(Math.PI / 2 - 0.52) / 0.0065, 400);
    controls.fitTo(LONGEST, VIEWPORT, true);
    // Turns to look along the axis, so the helix's far end is as deep as it gets.
    drag(0, -(Math.PI / 2 - 0.12) / 0.0065);
    for (let i = 0; i < 200; i++) element.listeners.get("wheel")!({ deltaY: 5000, preventDefault() {} });
    camera.updateMatrixWorld();
    for (let c = 0; c < 8; c++) {
      const p = [0, 1, 2].map((i) => ((c >> i) & 1 ? LONGEST.max[i] : LONGEST.min[i]));
      expect(new THREE.Vector3(p[0], p[1], p[2]).project(camera).z).toBeLessThan(1);
    }
  });

  it("keeps zooming out from undoing a fit past the zoom-out limit, and restores the limit after a closer fit", () => {
    drag(-(Math.PI / 2 - 0.52) / 0.0065, 400);
    controls.fitTo(LONGEST, VIEWPORT, true);
    const fitted = camera.position.distanceTo(controls.target);
    expect(fitted).toBeGreaterThan(18000);
    element.listeners.get("wheel")!({ deltaY: 5000, preventDefault() {} });
    expect(camera.position.distanceTo(controls.target)).toBeCloseTo(fitted, 6);

    controls.fitTo(BOUNDS, VIEWPORT);
    for (let i = 0; i < 200; i++) element.listeners.get("wheel")!({ deltaY: 5000, preventDefault() {} });
    expect(camera.position.distanceTo(controls.target)).toBeCloseTo(18000, 6);
  });
});
