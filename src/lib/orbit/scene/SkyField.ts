import * as THREE from "three";
import {
  FAINTEST_MAGNITUDE,
  STAR_SIZE_GROUPS,
  skyAxes,
  starColor,
  starIntensity,
  type StarCatalog,
} from "../sky";
import type { PresetId } from "../view";
import { roundStarTexture } from "./geometry";

/** Inside the camera's far plane. The sky is drawn before the scene, in its own pass, so this doesn't decide what it hides. */
const SKY_RADIUS = 10000;

/**
 * The real naked-eye sky, turned so the scene's x axis (the Sun's path) points
 * at the chosen frame's apex. It's centred on the camera every frame, so the
 * stars sit at infinity: no parallax, and no zooming out past them.
 */
export class SkyField {
  readonly group = new THREE.Group();
  /** Made with the first points, since it needs a canvas. */
  private texture: THREE.Texture | null = null;
  private readonly rotation = new THREE.Matrix4();

  /** Builds the points, one set per drawn size. Called once the catalogue has loaded. */
  setCatalog(catalog: StarCatalog) {
    this.texture ??= roundStarTexture();
    let start = 0;
    for (const { brighterThan, sizePx } of STAR_SIZE_GROUPS) {
      let end = start;
      // The catalogue is sorted brightest first.
      while (end < catalog.count && catalog.magnitudes[end] < brighterThan && catalog.magnitudes[end] <= FAINTEST_MAGNITUDE) {
        end++;
      }
      if (end > start) this.group.add(this.makePoints(catalog, start, end, sizePx));
      start = end;
    }
  }

  setFrame(frame: PresetId) {
    const [x, y, z] = skyAxes(frame);
    // Rows are the scene's axes in galactic coordinates, so this maps galactic directions into the scene.
    this.rotation.set(...x, 0, ...y, 0, ...z, 0, 0, 0, 0, 1);
    this.group.setRotationFromMatrix(this.rotation);
  }

  followCamera(camera: THREE.Camera) {
    this.group.position.copy(camera.position);
  }

  private makePoints(catalog: StarCatalog, start: number, end: number, sizePx: number): THREE.Points {
    const n = end - start;
    const positions = new Float32Array(n * 3);
    const colors = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const star = start + i;
      const tint = starColor(catalog.colors[star]);
      const intensity = starIntensity(catalog.magnitudes[star]);
      for (let k = 0; k < 3; k++) {
        positions[i * 3 + k] = catalog.directions[star * 3 + k] * SKY_RADIUS;
        colors[i * 3 + k] = tint[k] * intensity;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: sizePx,
        sizeAttenuation: false,
        map: this.texture,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        // Brightness comes from the magnitudes alone.
        fog: false,
      }),
    );
    // The camera is always at the centre, so the points are never all out of view.
    points.frustumCulled = false;
    return points;
  }
}
