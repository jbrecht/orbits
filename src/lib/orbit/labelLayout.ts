/** A body label's on-screen box, in CSS pixels. */
export interface LabelBox {
  /** Centre of the label. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Smaller is nearer the camera. */
  depth: number;
  /** A higher priority wins an overlap whatever the depth. */
  priority?: number;
  shown: boolean;
  /** Output: the label overlaps a nearer label that is itself not faded. */
  faded: boolean;
}

const byPriorityThenDepth = (a: LabelBox, b: LabelBox) => (b.priority ?? 0) - (a.priority ?? 0) || a.depth - b.depth;

/**
 * Marks each shown label that overlaps a winning, unfaded one as faded: a
 * higher priority wins, then the nearer label. Sorts `boxes` in place, winners
 * first, so callers can stack them in that order.
 */
export function fadeOverlappingLabels(boxes: LabelBox[], gapPx = 2): void {
  boxes.sort(byPriorityThenDepth);
  for (let i = 0; i < boxes.length; i++) {
    const a = boxes[i];
    a.faded = false;
    if (!a.shown) continue;
    for (let j = 0; j < i; j++) {
      const b = boxes[j];
      if (b.shown && !b.faded && overlaps(a, b, gapPx)) {
        a.faded = true;
        break;
      }
    }
  }
}

function overlaps(a: LabelBox, b: LabelBox, gapPx: number): boolean {
  return (
    Math.abs(a.x - b.x) * 2 < a.width + b.width + 2 * gapPx &&
    Math.abs(a.y - b.y) * 2 < a.height + b.height + 2 * gapPx
  );
}
