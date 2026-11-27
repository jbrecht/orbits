import { readFileSync } from "node:fs";
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { SkyField } from "./scene/SkyField";
import { decodeStars, galactic, SOLAR_APEX, skyAxes, starColor, starIntensity, type StarCatalog } from "./sky";
import type { Vec3 } from "./cameraFit";

const catalog: StarCatalog = decodeStars(new Uint8Array(readFileSync("public/stars.bin")).buffer);
const degreesBetween = (a: Vec3, b: Vec3) =>
  (Math.acos(Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])) * 180) / Math.PI;
const star = (i: number): Vec3 => [catalog.directions[i * 3], catalog.directions[i * 3 + 1], catalog.directions[i * 3 + 2]];

describe("the star catalogue", () => {
  it("holds the Yale Bright Star Catalogue, brightest first", () => {
    expect(catalog.count).toBe(9096);
    for (let i = 1; i < catalog.count; i++) expect(catalog.magnitudes[i]).toBeGreaterThanOrEqual(catalog.magnitudes[i - 1]);
  });

  it("decodes Sirius, the brightest, where it is", () => {
    expect(catalog.magnitudes[0]).toBeCloseTo(-1.46, 2);
    expect(degreesBetween(star(0), galactic(227.22, -8.88))).toBeLessThan(0.02);
    expect(catalog.colors[0]).toBeCloseTo(0.0, 2);
  });
});

describe("skyAxes", () => {
  for (const frame of ["lsr", "galactic"] as const) {
    it(`gives orthonormal, right-handed axes with x on the apex (${frame})`, () => {
      const [x, y, z] = skyAxes(frame).map((v) => new THREE.Vector3(...v));
      expect(x.toArray()).toEqual(SOLAR_APEX[frame]);
      for (const v of [x, y, z]) expect(v.length()).toBeCloseTo(1, 10);
      expect(x.dot(y)).toBeCloseTo(0, 10);
      expect(new THREE.Vector3().crossVectors(x, y).distanceTo(z)).toBeCloseTo(0, 10);
      // Up leans toward the north galactic pole.
      expect(y.z).toBeGreaterThan(0.9);
    });
  }

  it("puts the apexes where they belong: near Vega, and near Deneb in Cygnus", () => {
    const vega = galactic(67.44, 19.24);
    const deneb = galactic(84.28, 2.0);
    expect(degreesBetween(SOLAR_APEX.lsr, vega)).toBeLessThan(12);
    expect(degreesBetween(SOLAR_APEX.galactic, deneb)).toBeLessThan(7);
  });
});

describe("SkyField", () => {
  it("turns the sky so the apex lies along the scene's +x and the galactic pole is up", () => {
    const sky = new SkyField();
    for (const frame of ["lsr", "galactic"] as const) {
      sky.setFrame(frame);
      sky.group.updateMatrixWorld();
      const apex = new THREE.Vector3(...SOLAR_APEX[frame]).applyQuaternion(sky.group.quaternion);
      expect(apex.x).toBeCloseTo(1, 6);
      const pole = new THREE.Vector3(0, 0, 1).applyQuaternion(sky.group.quaternion);
      expect(pole.y).toBeGreaterThan(0.9);
    }
  });
});

describe("star appearance", () => {
  it("tints hot stars blue and cool stars orange, and leaves unknown ones white", () => {
    const [br, , bb] = starColor(-0.3);
    expect(bb).toBeGreaterThan(br);
    const [or, , ob] = starColor(1.5);
    expect(or).toBeGreaterThan(ob);
    expect(starColor(NaN)).toEqual([1, 1, 1]);
  });

  it("draws brighter stars brighter, within limits", () => {
    expect(starIntensity(-1.46)).toBeCloseTo(1, 1);
    expect(starIntensity(3)).toBeGreaterThan(starIntensity(5));
    expect(starIntensity(8)).toBeGreaterThan(0);
  });
});
