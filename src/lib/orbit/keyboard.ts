/** The parts of a `KeyboardEvent` the shortcuts read, so they can be tested without a DOM. */
export type KeyInput = Pick<KeyboardEvent, "key" | "shiftKey" | "ctrlKey" | "metaKey" | "altKey">;

export type AppShortcut = "togglePlay" | "resetView" | "help";

/** A camera movement held down: each axis is −1, 0 or 1. */
export interface CameraKey {
  orbit: [number, number];
  pan: [number, number];
  zoom: number;
}

/** Shortcuts shown next to the buttons they press, in `aria-keyshortcuts` form. */
export const SHORTCUT_KEYS: Record<AppShortcut, string> = {
  togglePlay: "Space",
  resetView: "R",
  help: "?",
};

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/** Ctrl, Cmd and Alt belong to the browser and OS (Cmd+R, Ctrl+−), so any of them turns the shortcuts off. */
const hasCommandModifier = (e: KeyInput) => e.ctrlKey || e.metaKey || e.altKey;

export function appShortcut(e: KeyInput): AppShortcut | null {
  if (hasCommandModifier(e)) return null;
  if (e.key === " ") return "togglePlay";
  if (e.key === "r" || e.key === "R") return "resetView";
  if (e.key === "?") return "help";
  return null;
}

/** Arrows orbit and Shift+arrows pan, each like dragging that way; + and − zoom. */
export function cameraKey(e: KeyInput): CameraKey | null {
  if (hasCommandModifier(e)) return null;
  const arrow = ARROWS[e.key];
  if (arrow) return e.shiftKey ? { orbit: [0, 0], pan: arrow, zoom: 0 } : { orbit: arrow, pan: [0, 0], zoom: 0 };
  if (e.key === "+" || e.key === "=") return { orbit: [0, 0], pan: [0, 0], zoom: -1 };
  if (e.key === "-" || e.key === "_") return { orbit: [0, 0], pan: [0, 0], zoom: 1 };
  return null;
}

const SLIDER_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"]);

/**
 * Whether a key pressed with focus on `target` belongs to that element instead:
 * anything inside the open help dialog or a text field, the keys that move a
 * slider, and Space or Enter on a button reached by keyboard. A button that
 * only has focus because it was clicked keeps neither, so Space still pauses
 * after clicking Moon.
 */
export function keyBelongsToTarget(key: string, target: EventTarget | null, focusedByKeyboard = true): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest("dialog, textarea, select, [contenteditable]")) return true;
  if (target instanceof HTMLInputElement) return target.type !== "range" || SLIDER_KEYS.has(key);
  if (key === " " || key === "Enter") return focusedByKeyboard && !!target.closest("button, a, summary");
  return false;
}

/**
 * Tracks whether the focused element was reached with Tab or with the pointer.
 * `:focus-visible` can't tell: the browser turns it on as soon as any key is pressed.
 */
export function trackFocusOrigin(): { focusedByKeyboard: () => boolean; dispose: () => void } {
  let tabbing = false;
  let byKeyboard = false;
  const onPointerDown = () => {
    tabbing = false;
    byKeyboard = false;
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Tab") tabbing = true;
  };
  const onFocusIn = () => {
    byKeyboard = tabbing;
  };
  window.addEventListener("pointerdown", onPointerDown, true);
  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("focusin", onFocusIn, true);
  return {
    focusedByKeyboard: () => byKeyboard,
    dispose: () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("focusin", onFocusIn, true);
    },
  };
}
