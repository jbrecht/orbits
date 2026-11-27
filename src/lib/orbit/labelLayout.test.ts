import { describe, expect, it } from "vitest";
import { beyondTip, fadeOverlappingLabels, type LabelBox } from "./labelLayout";

const box = (x: number, y: number, depth: number, shown = true): LabelBox => ({
  x,
  y,
  width: 60,
  height: 20,
  depth,
  shown,
  faded: false,
});

describe("fadeOverlappingLabels", () => {
  it("fades the farther of two overlapping labels and sorts nearest first", () => {
    const far = box(100, 100, 0.9);
    const near = box(110, 105, 0.5);
    const boxes = [far, near];
    fadeOverlappingLabels(boxes);
    expect(near.faded).toBe(false);
    expect(far.faded).toBe(true);
    expect(boxes).toEqual([near, far]);
  });

  it("lets a higher priority win over a nearer label", () => {
    const sun = box(100, 100, 0.5);
    const earth = { ...box(110, 105, 0.9), priority: 1 };
    const boxes = [sun, earth];
    fadeOverlappingLabels(boxes);
    expect(earth.faded).toBe(false);
    expect(sun.faded).toBe(true);
    expect(boxes).toEqual([earth, sun]);
  });

  it("leaves labels that don't overlap alone", () => {
    const a = box(100, 100, 0.5);
    const b = box(200, 100, 0.9);
    fadeOverlappingLabels([a, b]);
    expect(a.faded || b.faded).toBe(false);
  });

  it("ignores hidden labels", () => {
    const hidden = box(100, 100, 0.1, false);
    const shown = box(100, 100, 0.9);
    fadeOverlappingLabels([hidden, shown]);
    expect(shown.faded).toBe(false);
  });

  it("only lets unfaded labels fade others", () => {
    // b overlaps a and is faded; c overlaps only b, so it stays readable.
    const a = box(100, 100, 0.1);
    const b = box(150, 100, 0.5);
    const c = box(200, 100, 0.9);
    fadeOverlappingLabels([c, b, a]);
    expect([a.faded, b.faded, c.faded]).toEqual([false, true, false]);
  });
});

describe("beyondTip", () => {
  it("puts the label past the tip of an arrow pointing right, clear of it", () => {
    expect(beyondTip({ x: 100, y: 50 }, { x: 80, y: 50 }, 60, 20, 8)).toEqual({ x: 138, y: 50 });
  });

  it("uses the label's height for an arrow pointing up the screen", () => {
    expect(beyondTip({ x: 100, y: 50 }, { x: 100, y: 70 }, 60, 20, 8)).toEqual({ x: 100, y: 32 });
  });

  it("puts the label above an arrow pointing at the camera", () => {
    expect(beyondTip({ x: 100, y: 50 }, { x: 100.1, y: 50 }, 60, 20, 8)).toEqual({ x: 100, y: 32 });
  });
});
