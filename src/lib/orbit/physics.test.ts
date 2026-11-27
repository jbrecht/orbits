import { describe, expect, it } from "vitest";
import { CIRCUMFERENCE_AU, ORBIT_RADIUS_AU, RADIUS_UNITS, SWEEP_SECONDS } from "./constants";
import {
  advancePhase,
  axialScale,
  helixFrame,
  orbitOffset,
  rescalePhase,
  sunSpeedKms,
  sunX,
} from "./physics";
import { PRESETS, INITIAL_VIEW, describeScene, formatBodyLabel, formatElapsed, formatKms } from "./view";

describe("presets", () => {
  it.each([
    ["galactic", 251.0],
    ["lsr", 19.5],
  ])("%s moves the Sun at ~%s km/s", (id, kms) => {
    const preset = PRESETS.find((p) => p.id === id)!;
    expect(sunSpeedKms(preset.pitchAU).toFixed(1)).toBe(kms.toFixed(1));
  });

  it("starts on the LSR preset, where the coils are visible", () => {
    const lsr = PRESETS.find((p) => p.id === "lsr")!;
    expect(INITIAL_VIEW.preset).toBe("lsr");
    expect(INITIAL_VIEW.pitchAU).toBe(lsr.pitchAU);
  });

  it("puts the galactic preset at ~251 km/s and 1.00× scale", () => {
    const galactic = PRESETS.find((p) => p.id === "galactic")!;
    expect(sunSpeedKms(galactic.pitchAU)).toBeCloseTo(251.0, 0);
    expect(axialScale(galactic.pitchAU).toFixed(2)).toBe("1.00");
  });
});

describe("helix geometry", () => {
  it("centres the visible helix on the origin", () => {
    const frame = helixFrame(4.11, 10);
    expect(sunX(frame, 0)).toBeCloseTo(-frame.totalLength / 2);
    expect(sunX(frame, 5)).toBeCloseTo(0);
    expect(sunX(frame, 10)).toBeCloseTo(frame.totalLength / 2);
  });

  it("uses one scale for the axis and the radius, so the drawn angle is true", () => {
    const axisUnitsPerAU = helixFrame(1, 1).pitchUnits;
    expect(RADIUS_UNITS / ORBIT_RADIUS_AU).toBeCloseTo(axisUnitsPerAU, 12);

    const pitchAU = 4.11;
    const drawnCircumference = 2 * Math.PI * RADIUS_UNITS;
    const drawnAngle = Math.atan(helixFrame(pitchAU, 1).pitchUnits / drawnCircumference);
    expect(drawnAngle).toBeCloseTo(Math.atan(pitchAU / CIRCUMFERENCE_AU), 10);
  });

  it("returns a body to its start after one period", () => {
    const [y0, z0] = orbitOffset(5, 0, 11.862, 1.7);
    const [y1, z1] = orbitOffset(5, 11.862, 11.862, 1.7);
    expect(y1).toBeCloseTo(y0);
    expect(z1).toBeCloseTo(z0);
  });

  it("starts Earth on +Z and reaches +Y a quarter of a year later", () => {
    expect(orbitOffset(3, 0, 1)).toEqual([0, 3]);
    const [y, z] = orbitOffset(3, 0.25, 1);
    expect(y).toBeCloseTo(3);
    expect(z).toBeCloseTo(0);
  });
});

describe("playback", () => {
  it.each([1, 2, 100])("sweeps a %s-year span in SWEEP_SECONDS", (span) => {
    expect(advancePhase(0, SWEEP_SECONDS / 2, span, SWEEP_SECONDS)).toBeCloseTo(span / 2);
  });

  it("wraps back to the start of the span", () => {
    expect(advancePhase(9, SWEEP_SECONDS * 0.2, 10, SWEEP_SECONDS)).toBeCloseTo(1);
  });

  it("keeps relative progress when the span changes", () => {
    expect(rescalePhase(0.5, 2, 10)).toBe(2.5);
  });
});

describe("labels", () => {
  it.each([
    [true, false, "☉"],
    [false, true, "Sun"],
    [true, true, "☉ Sun"],
    [false, false, ""],
  ])("symbols=%s names=%s → %j", (showSymbols, showNames, expected) => {
    expect(formatBodyLabel({ ...INITIAL_VIEW, showSymbols, showNames }, "☉", "Sun")).toBe(expected);
  });
});

describe("formatElapsed", () => {
  it("shows years to one decimal", () => {
    expect(formatElapsed(0.35)).toBe("t = 0.3 yrs");
    expect(formatElapsed(12)).toBe("t = 12.0 yrs");
  });
});

describe("formatKms", () => {
  it.each([
    [251.04, "251 km/s"],
    [100, "100 km/s"],
    [94.83, "94.8 km/s"],
    [19.48, "19.5 km/s"],
  ])("%s → %s", (kms, expected) => {
    expect(formatKms(kms)).toBe(expected);
  });
});

describe("describeScene", () => {
  it("names Earth alone by default", () => {
    expect(describeScene(INITIAL_VIEW)).toBe("Helical path of Earth around the Sun’s straight path, over 2 years");
  });

  it("says year for a one-year span", () => {
    expect(describeScene({ ...INITIAL_VIEW, spanYears: 1 })).toBe(
      "Helical path of Earth around the Sun’s straight path, over 1 year",
    );
  });

  it("lists every body shown", () => {
    const view = { ...INITIAL_VIEW, showMoon: true, showInnerPlanets: true };
    expect(describeScene(view)).toBe(
      "Helical paths of Earth, the Moon, Mercury, Venus and Mars around the Sun’s straight path, over 2 years",
    );
  });
});
