import * as THREE from "three";
import { fitCameraRadius } from "../physics";

const DEFAULT_THETA = 0.52;
const DEFAULT_PHI = 1.18;

/**
 * Orbits the camera around a target: left-drag or one finger rotates, the
 * wheel or a pinch zooms, right-drag or shift-drag pans.
 */
export class OrbitCameraController {
  readonly target = new THREE.Vector3();
  private radius = 260;
  private theta = DEFAULT_THETA;
  private phi = DEFAULT_PHI;

  private isDragging = false;
  private isPanning = false;
  private prevPointer = { x: 0, y: 0 };
  private initialPinchDist: number | null = null;
  private initialRadius = this.radius;

  private readonly right = new THREE.Vector3();
  private readonly up = new THREE.Vector3();
  private readonly forward = new THREE.Vector3();

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly element: HTMLElement,
  ) {
    element.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("mouseup", this.onMouseUp);
    element.addEventListener("contextmenu", this.onContextMenu);
    element.addEventListener("wheel", this.onWheel, { passive: false });
    element.addEventListener("touchstart", this.onTouchStart, { passive: true });
    element.addEventListener("touchmove", this.onTouchMove, { passive: true });
    element.addEventListener("touchend", this.onTouchEnd);
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
  }

  /** Recentres and backs off far enough to frame a helix of this length. */
  fitTo(totalLength: number) {
    this.target.set(0, 0, 0);
    this.theta = DEFAULT_THETA;
    this.phi = DEFAULT_PHI;
    this.radius = fitCameraRadius(totalLength);
    this.update();
  }

  private update() {
    this.phi = Math.max(0.12, Math.min(Math.PI - 0.12, this.phi));
    this.radius = Math.max(6, Math.min(18000, this.radius));
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
      const panSpeed = this.radius * 0.0012;
      this.camera.getWorldDirection(this.forward);
      this.right.crossVectors(this.forward, this.camera.up).normalize();
      this.up.crossVectors(this.right, this.forward).normalize();
      this.target.addScaledVector(this.right, -dx * panSpeed);
      this.target.addScaledVector(this.up, dy * panSpeed);
    } else {
      this.theta -= dx * 0.0065;
      this.phi -= dy * 0.0065;
    }
    this.update();
  };

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

  private onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.prevPointer = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      this.isDragging = false;
      this.initialPinchDist = touchDistance(e.touches);
      this.initialRadius = this.radius;
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
