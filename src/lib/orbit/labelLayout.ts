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
  /** Output: the label overlaps one that wins over it (see `fadeOverlappingLabels`) and is itself not faded. */
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

/**
 * The centre for a label that sits just past the tip of an arrow on screen,
 * clear of it: `tip` and `back` are the tip and a point behind it, in CSS
 * pixels. An arrow pointing at the camera has no direction on screen, so its
 * label goes above the tip.
 */
export function beyondTip(
  tip: { x: number; y: number },
  back: { x: number; y: number },
  width: number,
  height: number,
  gapPx = 8,
): { x: number; y: number } {
  let dx = tip.x - back.x;
  let dy = tip.y - back.y;
  const len = Math.hypot(dx, dy);
  if (len < 0.5) {
    dx = 0;
    dy = -1;
  } else {
    dx /= len;
    dy /= len;
  }
  // How far the box's edge is from its centre along the arrow's direction.
  const reach = (Math.abs(dx) * width) / 2 + (Math.abs(dy) * height) / 2 + gapPx;
  return { x: tip.x + dx * reach, y: tip.y + dy * reach };
}
