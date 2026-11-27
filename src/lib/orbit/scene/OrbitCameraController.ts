import * as THREE from "three";
import { fitBounds, type Bounds, type FitOptions } from "../cameraFit";
import { cameraKey, keyBelongsToTarget, type CameraKey } from "../keyboard";

const DEFAULT_THETA = 0.52;
const DEFAULT_PHI = 1.18;
/** The share of the visible area a fitted scene fills. */
export const FIT_FILL = 0.92;
/** The farthest the wheel, a pinch or the keys zoom out, unless a fit needed more. */
export const MAX_ZOOM_OUT = 18000;
/** How fast held keys move the camera: radians, CSS pixels (as a drag) and e-folds of distance per second. */
const KEY_ORBIT_RATE = 1.1;
const KEY_PAN_RATE = 420;
const KEY_ZOOM_RATE = 1.3;

/**
 * Orbits the camera around a target: left-drag or one finger rotates, the
 * wheel or a pinch zooms, right-drag, shift-drag or two fingers pan. Held
 * arrow keys orbit (with Shift, pan) and + and − zoom, applied in `tick`.
 */
export class OrbitCameraController {
  readonly target = new THREE.Vector3();
  private radius = 260;
  private theta = DEFAULT_THETA;
  private phi = DEFAULT_PHI;
  /** Raised by a fit that needs to be further back than `MAX_ZOOM_OUT`, so zooming can't undo it. */
  private maxRadius = MAX_ZOOM_OUT;
  /** The far plane the camera came with, kept unless a fit needs more. */
  private readonly baseFar: number;

  private isDragging = false;
  private isPanning = false;
  private prevPointer = { x: 0, y: 0 };
  private initialPinchDist: number | null = null;
  private initialRadius = this.radius;
  /** Camera keys held down, by `KeyboardEvent.code` so a key's release matches its press. */
  private readonly heldKeys = new Map<string, CameraKey>();

  private readonly right = new THREE.Vector3();
  private readonly up = new THREE.Vector3();
  private readonly forward = new THREE.Vector3();

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly element: HTMLElement,
  ) {
    this.baseFar = camera.far;
    element.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("mouseup", this.onMouseUp);
    element.addEventListener("contextmenu", this.onContextMenu);
    element.addEventListener("wheel", this.onWheel, { passive: false });
    element.addEventListener("touchstart", this.onTouchStart, { passive: true });
    element.addEventListener("touchmove", this.onTouchMove, { passive: true });
    element.addEventListener("touchend", this.onTouchEnd);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    this.update();
  }

  dispose() {
    this.element.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("mouseup", this.onMouseUp);
    this.element.removeEventListener("contextmenu", this.onContextMenu);
    this.element.removeEventListener("wheel", this.onWheel);
    this.element.removeEventListener("touchstart", this.onTouchStart);
    this.element.removeEventListener("touchmove", this.onTouchMove);
    this.element.removeEventListener("touchend", this.onTouchEnd);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
  }

  /** Moves the camera for the keys held down over the last `dt` seconds. */
  tick(dt: number) {
    if (this.heldKeys.size === 0 || dt === 0) return;
    let orbitX = 0, orbitY = 0, panX = 0, panY = 0, zoom = 0;
    for (const k of this.heldKeys.values()) {
      orbitX += k.orbit[0];
      orbitY += k.orbit[1];
      panX += k.pan[0];
      panY += k.pan[1];
      zoom += k.zoom;
    }
    // The same directions as dragging that way.
    this.theta -= orbitX * KEY_ORBIT_RATE * dt;
    this.phi -= orbitY * KEY_ORBIT_RATE * dt;
    if (panX || panY) this.pan(panX * KEY_PAN_RATE * dt, panY * KEY_PAN_RATE * dt);
    this.radius *= Math.exp(zoom * KEY_ZOOM_RATE * dt);
    this.update();
  }

  /**
   * Centres on `bounds`, far enough back to show all of it. Returns to the
   * default angles unless `keepAngle` is set, when it looks from where it is.
   * Returns the camera's distance from the box's centre.
   */
  fitTo(bounds: Bounds, view: Pick<FitOptions, "fovDeg" | "aspect" | "visibleFraction">, keepAngle = false): number {
    if (!keepAngle) {
      this.theta = DEFAULT_THETA;
      this.phi = DEFAULT_PHI;
    }
    const fit = fitBounds(bounds, { ...view, theta: this.theta, phi: this.phi, fill: FIT_FILL });
    this.target.set(...fit.target);
    this.radius = fit.distance;
    this.maxRadius = Math.max(MAX_ZOOM_OUT, fit.distance);
    // Far enough to keep the box's farthest corner in front of the far plane, even fully zoomed out.
    const halfDiagonal = Math.hypot(...[0, 1, 2].map((i) => (bounds.max[i] - bounds.min[i]) / 2));
    const far = Math.max(this.baseFar, (this.maxRadius + halfDiagonal) * 1.05);
    if (far !== this.camera.far) {
      this.camera.far = far;
      this.camera.updateProjectionMatrix();
    }
    this.update();
    return this.radius;
  }

  private update() {
    this.phi = Math.max(0.12, Math.min(Math.PI - 0.12, this.phi));
    this.radius = Math.max(6, Math.min(this.maxRadius, this.radius));
    const sinPhi = Math.sin(this.phi);
    this.camera.position.set(
      this.target.x + this.radius * sinPhi * Math.sin(this.theta),
      this.target.y + this.radius * Math.cos(this.phi),
      this.target.z + this.radius * sinPhi * Math.cos(this.theta),
    );
    this.camera.lookAt(this.target);
  }

  private onMouseDown = (e: MouseEvent) => {
    this.isDragging = true;
    this.isPanning = e.button === 2 || e.shiftKey;
    this.prevPointer = { x: e.clientX, y: e.clientY };
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.isDragging) return;
    const dx = e.clientX - this.prevPointer.x;
    const dy = e.clientY - this.prevPointer.y;
    this.prevPointer = { x: e.clientX, y: e.clientY };

    if (this.isPanning) {
      this.pan(dx, dy);
    } else {
      this.theta -= dx * 0.0065;
      this.phi -= dy * 0.0065;
    }
    this.update();
  };

  /** Moves the target with the pointer, by `dx`, `dy` CSS pixels. */
  private pan(dx: number, dy: number) {
    const panSpeed = this.radius * 0.0012;
    this.camera.getWorldDirection(this.forward);
    this.right.crossVectors(this.forward, this.camera.up).normalize();
    this.up.crossVectors(this.right, this.forward).normalize();
    this.target.addScaledVector(this.right, -dx * panSpeed);
    this.target.addScaledVector(this.up, dy * panSpeed);
  }

  private onMouseUp = () => {
    this.isDragging = false;
    this.isPanning = false;
  };

  private onContextMenu = (e: Event) => e.preventDefault();

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.radius *= e.deltaY > 0 ? 1.09 : 0.91;
    this.update();
  };

  private onKeyDown = (e: KeyboardEvent) => {
    // On macOS no keyup arrives for a key released while Cmd is down, so it would stay held.
    if (e.metaKey) this.heldKeys.clear();
    const key = cameraKey(e);
    if (!key || keyBelongsToTarget(e.key, e.target)) return;
    e.preventDefault();
    this.heldKeys.set(e.code, key);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    if (e.key === "Meta") this.heldKeys.clear();
    else this.heldKeys.delete(e.code);
  };

  /** Key releases aren't seen while the window is in the background. */
  private onBlur = () => this.heldKeys.clear();

  private onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.prevPointer = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      this.isDragging = false;
      this.initialPinchDist = touchDistance(e.touches);
      this.initialRadius = this.radius;
      this.prevPointer = touchMidpoint(e.touches);
    }
  };

  private onTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 1 && this.isDragging) {
      const dx = e.touches[0].clientX - this.prevPointer.x;
      const dy = e.touches[0].clientY - this.prevPointer.y;
      this.prevPointer = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      this.theta -= dx * 0.0075;
      this.phi -= dy * 0.0075;
      this.update();
    } else if (e.touches.length === 2 && this.initialPinchDist) {
      this.radius = this.initialRadius * (this.initialPinchDist / touchDistance(e.touches));
      const mid = touchMidpoint(e.touches);
      this.pan(mid.x - this.prevPointer.x, mid.y - this.prevPointer.y);
      this.prevPointer = mid;
      this.update();
    }
  };

  private onTouchEnd = () => {
    this.isDragging = false;
    this.initialPinchDist = null;
  };
}

function touchDistance(touches: TouchList): number {
  return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
}

function touchMidpoint(touches: TouchList): { x: number; y: number } {
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  };
}
