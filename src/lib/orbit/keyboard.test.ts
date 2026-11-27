import { describe, expect, it } from "vitest";
import { appShortcut, cameraKey, type KeyInput } from "./keyboard";

const press = (key: string, mods: Partial<KeyInput> = {}): KeyInput => ({
  key,
  shiftKey: false,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  ...mods,
});

describe("appShortcut", () => {
  it("maps Space, R and ? to playback, reset and help", () => {
    expect(appShortcut(press(" "))).toBe("togglePlay");
    expect(appShortcut(press("r"))).toBe("resetView");
    expect(appShortcut(press("R", { shiftKey: true }))).toBe("resetView");
    expect(appShortcut(press("?", { shiftKey: true }))).toBe("help");
    expect(appShortcut(press("x"))).toBeNull();
  });

  it("leaves Cmd, Ctrl and Alt combinations to the browser", () => {
    expect(appShortcut(press("r", { metaKey: true }))).toBeNull();
    expect(appShortcut(press("r", { ctrlKey: true }))).toBeNull();
    expect(appShortcut(press(" ", { altKey: true }))).toBeNull();
  });
});

describe("cameraKey", () => {
  it("orbits with the arrows and pans with Shift+arrows", () => {
    expect(cameraKey(press("ArrowLeft"))).toEqual({ orbit: [-1, 0], pan: [0, 0], zoom: 0 });
    expect(cameraKey(press("ArrowUp"))).toEqual({ orbit: [0, -1], pan: [0, 0], zoom: 0 });
    expect(cameraKey(press("ArrowRight", { shiftKey: true }))).toEqual({ orbit: [0, 0], pan: [1, 0], zoom: 0 });
  });

  it("zooms in with + or = and out with − or _", () => {
    expect(cameraKey(press("="))?.zoom).toBe(-1);
    expect(cameraKey(press("+", { shiftKey: true }))?.zoom).toBe(-1);
    expect(cameraKey(press("-"))?.zoom).toBe(1);
    expect(cameraKey(press("_", { shiftKey: true }))?.zoom).toBe(1);
  });

  it("leaves browser zoom (Cmd/Ctrl with + and −) alone", () => {
    expect(cameraKey(press("=", { metaKey: true }))).toBeNull();
    expect(cameraKey(press("-", { ctrlKey: true }))).toBeNull();
    expect(cameraKey(press("ArrowLeft", { altKey: true }))).toBeNull();
  });
});
