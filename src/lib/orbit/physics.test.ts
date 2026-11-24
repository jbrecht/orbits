import { describe, expect, it } from "vitest";
import { GALACTIC_PITCH_AU, SWEEP_SECONDS } from "./constants";
import {
  advancePhase,
  axialScale,
  helixAngleDeg,
  helixFrame,
  orbitOffset,
  rescalePhase,
  sunSpeedKms,
  sunX,
} from "./physics";
import { PRESETS, INITIAL_VIEW, formatBodyLabel } from "./view";

describe("presets", () => {
  it.each([
    ["galactic", 83.2],
    ["lsr", 33.2],
    ["tight", 10.0],
  ])("%s has a %s° helix angle", (id, angle) => {
    const preset = PRESETS.find((p) => p.id === id)!;
    expect(helixAngleDeg(preset.pitchAU).toFixed(1)).toBe(angle.toFixed(1));
  });

  it("puts the galactic preset at ~251 km/s and 1.00× scale", () => {
    expect(sunSpeedKms(GALACTIC_PITCH_AU)).toBeCloseTo(251.0, 0);
    expect(axialScale(GALACTIC_PITCH_AU)).toBe(1);
  });
});

describe("helix geometry", () => {
  it("centres the visible helix on the origin", () => {
    const frame = helixFrame(4.11, 10);
    expect(sunX(frame, 0)).toBeCloseTo(-frame.totalLength / 2);
    expect(sunX(frame, 5)).toBeCloseTo(0);
    expect(sunX(frame, 10)).toBeCloseTo(frame.totalLength / 2);
  });

  it("uses one scale for the axis and the radius", () => {
    // Earth's pitch in world units over its circumference in world units
    // must give the same angle as the AU values.
    const frame = helixFrame(4.11, 1);
    const circumferenceUnits = 2 * Math.PI * Math.hypot(...orbitOffset(3, 0, 1));
    const angle = (Math.atan(frame.pitchUnits / circumferenceUnits) * 180) / Math.PI;
    expect(angle).toBeCloseTo(helixAngleDeg(4.11), 10);
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
