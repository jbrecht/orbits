import type { RefObject } from "react";
import { BODY_LABELS, type BodyId } from "@/lib/orbit/bodies";
import { formatBodyLabel, labelsVisible, type ViewState } from "@/lib/orbit/view";

const LABEL_STYLES: Record<BodyId, string> = {
  sun: "bg-yellow-950/85 text-yellow-200 border-yellow-400/40",
  earth: "bg-sky-950/85 text-sky-200 border-sky-400/40",
  moon: "bg-slate-900/85 text-slate-200 border-slate-400/40",
  mercury: "bg-stone-900/85 text-stone-200 border-stone-400/40",
  venus: "bg-amber-950/85 text-amber-200 border-amber-300/40",
  mars: "bg-red-950/85 text-red-200 border-red-400/40",
  jupiter: "bg-orange-950/85 text-orange-200 border-orange-400/40",
  saturn: "bg-yellow-950/85 text-yellow-200 border-yellow-300/40",
  uranus: "bg-teal-950/85 text-teal-200 border-teal-300/40",
  neptune: "bg-indigo-950/85 text-indigo-200 border-indigo-400/40",
};

/** HTML labels the scene moves every frame by projecting each body's position. */
export function BodyLabels({
  view,
  labelRefs,
}: {
  view: ViewState;
  labelRefs: RefObject<Partial<Record<BodyId, HTMLElement | null>>>;
}) {
  // Glyphs alone are hard to tell apart at text size.
  const symbolsOnly = view.showSymbols && !view.showNames;
  const size = symbolsOnly ? ["text-base", "text-xl"] : ["text-xs", "text-sm"];
  return (
    <div
      className={`pointer-events-none fixed inset-0 z-10 overflow-hidden ${labelsVisible(view) ? "" : "hidden"}`}
      aria-hidden
    >
      {BODY_LABELS.map((body) => (
        <div
          key={body.id}
          ref={(el) => {
            labelRefs.current[body.id] = el;
          }}
          title={body.title}
          className={`label-3d border py-0.5 opacity-0 ${body.id === "moon" ? `px-1.5 ${size[0]}` : `px-2 ${size[1]}`} ${LABEL_STYLES[body.id]}`}
        >
          {formatBodyLabel(view, body.symbol, body.name)}
        </div>
      ))}
    </div>
  );
}
