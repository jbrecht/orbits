import * as THREE from "three";

/** A curve defined by a function of t in [0, 1]. */
export class ParametricCurve extends THREE.Curve<THREE.Vector3> {
  constructor(private readonly fn: (t: number, target: THREE.Vector3) => THREE.Vector3) {
    super();
  }

  override getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    return this.fn(t, target);
  }
}

export function makeLine(points: THREE.Vector3[], color: number, opacity = 1, dashed = false): THREE.Line {
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const transparent = opacity < 1;
  const mat = dashed
    ? new THREE.LineDashedMaterial({ color, dashSize: 0.5, gapSize: 0.35, transparent, opacity })
    : new THREE.LineBasicMaterial({ color, transparent, opacity });
  const line = new THREE.Line(geo, mat);
  if (dashed) line.computeLineDistances();
  return line;
}

export function makeArrowHead(pos: THREE.Vector3, dir: THREE.Vector3, color: number, size = 0.42): THREE.Mesh {
  const cone = new THREE.Mesh(new THREE.ConeGeometry(size * 0.45, size, 16), new THREE.MeshBasicMaterial({ color }));
  cone.position.copy(pos);
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return cone;
}

/**
 * A two-point line whose endpoints are rewritten every frame. It carries its
 * own dash distances so `setTether` needn't call `computeLineDistances()`,
 * which allocates a new attribute on every call.
 */
export function makeTether(material: THREE.LineBasicMaterial | THREE.LineDashedMaterial): THREE.Line {
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  geo.setAttribute("lineDistance", new THREE.Float32BufferAttribute([0, 0], 1));
  const line = new THREE.Line(geo, material);
  // Its bounding sphere is computed once and goes stale as the endpoints move.
  line.frustumCulled = false;
  return line;
}

export function setTether(line: THREE.Line, ax: number, ay: number, az: number, bx: number, by: number, bz: number) {
  const attr = line.geometry.attributes.position as THREE.BufferAttribute;
  const a = attr.array as Float32Array;
  a[0] = ax;
  a[1] = ay;
  a[2] = az;
  a[3] = bx;
  a[4] = by;
  a[5] = bz;
  attr.needsUpdate = true;
  const distances = line.geometry.attributes.lineDistance as THREE.BufferAttribute;
  distances.setX(1, Math.hypot(bx - ax, by - ay, bz - az));
  distances.needsUpdate = true;
}

export function createStarfield(count = 2800): THREE.Points {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const palette = [0xffffff, 0xbae6fd, 0xfef08a, 0xc7d2fe].map((c) => new THREE.Color(c));

  for (let i = 0; i < count; i++) {
    const r = 9000 + Math.random() * 14000;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

    const c = palette[Math.floor(Math.random() * palette.length)];
    const brightness = 0.45 + Math.random() * 0.55;
    colors[i * 3] = c.r * brightness;
    colors[i * 3 + 1] = c.g * brightness;
    colors[i * 3 + 2] = c.b * brightness;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({ size: 28, vertexColors: true, transparent: true, opacity: 0.85 }),
  );
}

/** Frees the GPU resources of an object and everything under it. */
export function disposeTree(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    mesh.geometry?.dispose();
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(material)) material.forEach((m) => m.dispose());
    else material?.dispose();
  });
}
