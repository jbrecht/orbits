import { useEffect, useRef, type ReactNode } from "react";
import { SPAN_RANGE } from "@/lib/orbit/constants";
import { helixAngleDeg, sunSpeedKms } from "@/lib/orbit/physics";
import { PRESETS, type PresetId } from "@/lib/orbit/view";

function preset(id: PresetId) {
  const p = PRESETS.find((x) => x.id === id)!;
  return { ...p, angle: helixAngleDeg(p.pitchAU).toFixed(1), kms: sunSpeedKms(p.pitchAU) };
}

const Code = ({ children }: { children: ReactNode }) => (
  <code className="font-mono text-slate-200">{children}</code>
);

/**
 * A native modal <dialog>: the browser traps focus, closes it on Escape and
 * returns focus to the Help button. Every way of closing it goes through the
 * dialog's own `close` event, which reports back through `onClose`.
 */
export function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const pressedBackdrop = useRef(false);

  useEffect(() => {
    const dialog = ref.current!;
    if (open && !dialog.open) {
      dialog.showModal();
      // The browser would focus the scroll area first when the content overflows.
      closeRef.current!.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const galactic = preset("galactic");
  const lsr = preset("lsr");
  const tight = preset("tight");

  return (
    <dialog
      ref={ref}
      aria-labelledby="help-title"
      onClose={onClose}
      // Only presses on the backdrop land on the <dialog> itself. Checking both
      // ends keeps a drag from inside the panel (e.g. its scrollbar) open.
      onMouseDown={(e) => {
        pressedBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (pressedBackdrop.current && e.target === e.currentTarget) e.currentTarget.close();
        pressedBackdrop.current = false;
      }}
      className="glass-panel m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border-slate-700/80! p-0 text-slate-200 backdrop:bg-slate-950/75 backdrop:backdrop-blur-xs"
    >
      <div className="max-h-[85vh] overflow-y-auto p-5 sm:p-6">
        <div className="flex items-center justify-between border-b border-slate-700/70 pb-3">
          <div>
            <span className="text-[10px] font-semibold tracking-wider text-sky-400 uppercase">Controls & Concepts</span>
            <h2 id="help-title" className="text-base font-bold text-white sm:text-lg">
              How to Use This Visualization
            </h2>
          </div>
          <button
            type="button"
            ref={closeRef}
            onClick={() => ref.current!.close()}
            className="flex size-8 items-center justify-center rounded-lg bg-slate-800/90 text-sm font-bold text-slate-300 transition hover:bg-slate-700 hover:text-white"
            aria-label="Close Help"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs leading-relaxed text-slate-300">
          <section>
            <h3 className="mb-1 font-semibold text-white">Camera Navigation</h3>
            <p className="text-slate-400">
              <span className="font-medium text-slate-200">Left-drag / 1-finger drag:</span> Orbit around the solar
              system. &nbsp;•&nbsp;
              <span className="font-medium text-slate-200">Scroll / Pinch:</span> Zoom in and out. &nbsp;•&nbsp;
              <span className="font-medium text-slate-200">Right‑drag / Shift‑drag:</span> Pan the view.
            </p>
          </section>

          <section>
            <h3 className="mb-1 font-semibold text-white">Reference Frame Presets</h3>
            <ul className="space-y-1.5 text-slate-400">
              <li>
                <span className="font-semibold text-sky-300">
                  {galactic.label} ({galactic.angle}°):
                </span>{" "}
                True scale of the Sun orbiting the Milky Way center at ~{galactic.kms.toFixed(0)} km/s (
                {galactic.pitchAU} AU/yr).
              </li>
              <li>
                <span className="font-semibold text-slate-200">
                  {lsr.label} ({lsr.angle}°):
                </span>{" "}
                The Sun’s peculiar motion relative to nearby stars (~{lsr.kms.toFixed(1)} km/s, {lsr.pitchAU} AU/yr).
              </li>
              <li>
                <span className="font-semibold text-slate-200">
                  {tight.label} ({tight.angle}°):
                </span>{" "}
                Compresses the forward axis so Earth’s spiral turns are tightly stacked for geometric inspection.
              </li>
            </ul>
          </section>

          <section>
            <h3 className="mb-1 font-semibold text-white">Sliders & Playback</h3>
            <ul className="space-y-1.5 text-slate-400">
              <li>
                <span className="font-semibold text-amber-300">Sun Speed / Axial Scale:</span> Adjusts the Sun’s
                forward speed (and thus the axial stretch/compression along its path). <Code>1.00×</Code> represents
                true Galactic proportions.
              </li>
              <li>
                <span className="font-semibold text-sky-300">Time Span:</span> Sets the total duration rendered along
                the trajectory from <Code>{SPAN_RANGE.min}</Code> to <Code>{SPAN_RANGE.max}</Code> Earth years.
              </li>
              <li>
                <span className="font-semibold text-emerald-300">Pause / Play & Reset View:</span> Freezes or resumes
                motion along the path, or reframes the camera to fit the current time span.
              </li>
            </ul>
          </section>

          <section>
            <h3 className="mb-1 font-semibold text-white">Bodies & Labels</h3>
            <ul className="space-y-1.5 text-slate-400">
              <li>
                <span className="font-semibold text-slate-200">☽ Moon:</span> Toggles Earth’s Moon (27.32-day period,
                ~13.37 loops per Earth year; orbital radius slightly expanded for visibility).
              </li>
              <li>
                <span className="font-semibold text-amber-200">Inner:</span> Toggles Mercury, Venus, and Mars at their
                true orbital radii and speeds.
              </li>
              <li>
                <span className="font-semibold text-orange-200">Outer:</span> Toggles Jupiter, Saturn, Uranus, and
                Neptune at their true orbital radii and speeds.
              </li>
              <li>
                <span className="font-semibold text-slate-200">Symbols / Names:</span> Independently toggle
                astronomical glyphs (<Code>☉ ⊕ ☽ ☿ ♀ ♂ ♃ ♄ ♅ ♆</Code>) and full body names.
              </li>
            </ul>
          </section>
        </div>
      </div>
    </dialog>
  );
}
