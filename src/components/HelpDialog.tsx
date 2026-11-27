import { useEffect, useRef, type ReactNode } from "react";
import { SPAN_RANGE } from "@/lib/orbit/constants";
import { sunSpeedKms } from "@/lib/orbit/physics";
import { formatKms, PRESETS, type PresetId } from "@/lib/orbit/view";

function preset(id: PresetId) {
  const p = PRESETS.find((x) => x.id === id)!;
  return { ...p, kms: sunSpeedKms(p.pitchAU) };
}

const Code = ({ children }: { children: ReactNode }) => (
  <code className="font-mono text-slate-200">{children}</code>
);

const Kbd = ({ children }: { children: ReactNode }) => (
  <kbd className="rounded border border-slate-600 bg-slate-800 px-1 font-mono text-[0.6875rem] text-slate-200">
    {children}
  </kbd>
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
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Controls & Concepts</span>
            <h2 id="help-title" className="text-base font-bold text-white sm:text-lg">
              Reading the Helices
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
            <h3 className="mb-1 font-semibold text-white">What You’re Seeing</h3>
            <p className="text-slate-400">
              The Sun moves through space and carries the planets with it. Each planet keeps circling the Sun, so its
              path through space stretches into a helix: the faster the Sun moves, the more stretched the helix.
            </p>
            <p className="mt-1.5 text-slate-400">
              The dashed yellow line and its arrow are the Sun’s straight path. The faint blue ring is Earth’s orbit
              around where the Sun is now. Dashed lines join each planet to the Sun, and a solid line joins the Moon to
              Earth.
            </p>
            <p className="mt-1.5 text-slate-400">
              The stars are the real night sky, the ones bright enough to see by eye, turned so the arrow points where
              the Sun is heading: toward Hercules, near Vega, relative to nearby stars, and toward Cygnus as it orbits
              the galaxy.
            </p>
          </section>

          <section>
            <h3 className="mb-1 font-semibold text-white">Camera & Keyboard</h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-slate-400">
              <dt className="font-medium text-slate-200">
                Drag, or <Kbd>←</Kbd> <Kbd>→</Kbd> <Kbd>↑</Kbd> <Kbd>↓</Kbd>
              </dt>
              <dd>Orbit around the Sun’s path</dd>
              <dt className="font-medium text-slate-200">
                Scroll or pinch, or <Kbd>+</Kbd> <Kbd>−</Kbd>
              </dt>
              <dd>Zoom in and out</dd>
              <dt className="font-medium text-slate-200">
                Shift‑drag or right‑drag, or <Kbd>Shift</Kbd> + arrows
              </dt>
              <dd>Pan the view</dd>
              <dt className="font-medium text-slate-200">
                <Kbd>Space</Kbd>
              </dt>
              <dd>Pause or play</dd>
              <dt className="font-medium text-slate-200">
                <Kbd>R</Kbd>
              </dt>
              <dd>Reset View</dd>
              <dt className="font-medium text-slate-200">
                <Kbd>?</Kbd>
              </dt>
              <dd>Open this help</dd>
            </dl>
          </section>

          <section>
            <h3 className="mb-1 font-semibold text-white">Reference Frames</h3>
            <ul className="space-y-1.5 text-slate-400">
              <li>
                <span className="font-semibold text-slate-200">{galactic.label}:</span>{" "}
                True scale of the Sun orbiting the Milky Way center at ~{formatKms(galactic.kms)} (
                {galactic.pitchAU} AU/yr).
              </li>
              <li>
                <span className="font-semibold text-slate-200">{lsr.label}:</span>{" "}
                The Sun’s own motion relative to the stars around it (~{formatKms(lsr.kms)}, {lsr.pitchAU} AU/yr).
              </li>
            </ul>
          </section>

          <section>
            <h3 className="mb-1 font-semibold text-white">Sliders & Playback</h3>
            <ul className="space-y-1.5 text-slate-400">
              <li>
                <span className="font-semibold text-slate-200">Sun Speed:</span> Adjusts the Sun’s forward speed,
                which stretches or compresses the helices along its path. <Code>1.00×</Code> is the true galactic
                speed.
              </li>
              <li>
                <span className="font-semibold text-slate-200">Time Span:</span> Sets the total duration rendered along
                the trajectory from <Code>{SPAN_RANGE.min}</Code> to <Code>{SPAN_RANGE.max}</Code> Earth years.
              </li>
              <li>
                <span className="font-semibold text-slate-200">Pause / Play & Reset View:</span> Freezes or resumes
                motion along the path, or reframes the camera to fit the visible orbits. The counter next to Pause shows how
                many years into the span the bodies are.
              </li>
            </ul>
          </section>

          <section>
            <h3 className="mb-1 font-semibold text-white">Bodies & Labels</h3>
            <ul className="space-y-1.5 text-slate-400">
              <li>
                <span className="font-semibold text-slate-200">Moon:</span> Toggles Earth’s Moon (27.32-day period,
                ~13.37 loops per Earth year; orbital radius slightly expanded for visibility).
              </li>
              <li>
                <span className="font-semibold text-slate-200">Inner Planets:</span> Toggles Mercury, Venus, and Mars at their
                true orbital radii and speeds.
              </li>
              <li>
                <span className="font-semibold text-slate-200">Outer Planets:</span> Toggles Jupiter, Saturn, Uranus, and
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
