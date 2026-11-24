import type { ReactNode } from "react";
import { PITCH_RANGE, SPAN_RANGE } from "@/lib/orbit/constants";
import { axialScale, helixAngleDeg, sunSpeedKms } from "@/lib/orbit/physics";
import { PRESETS, type PresetId, type ViewState } from "@/lib/orbit/view";

export type ToggleKey = "isPlaying" | "showMoon" | "showInnerPlanets" | "showOuterPlanets" | "showSymbols" | "showNames";

interface ControlBarProps {
  view: ViewState;
  /** False when there is no 3D scene for playback and camera controls to act on. */
  sceneAvailable: boolean;
  onPreset: (id: PresetId) => void;
  onPitch: (pitchAU: number) => void;
  onSpan: (spanYears: number) => void;
  onTogglePlay: () => void;
  onResetCamera: () => void;
  onToggle: (key: ToggleKey) => void;
}

const BUTTON = "rounded-lg py-1.5 text-xs transition disabled:opacity-50";
const IDLE = "border border-slate-700 bg-slate-800/90 hover:border-slate-600 hover:bg-slate-700";

export function ControlBar({ view, sceneAvailable, onPreset, onPitch, onSpan, onTogglePlay, onResetCamera, onToggle }: ControlBarProps) {
  const kms = sunSpeedKms(view.pitchAU);

  return (
    <footer className="glass-panel fixed right-3 bottom-3 left-3 z-20 rounded-2xl p-3 sm:right-auto sm:bottom-5 sm:left-1/2 sm:w-[94%] sm:max-w-3xl sm:-translate-x-1/2 sm:p-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Reference frame">
            <span className="mr-1 text-[11px] font-semibold text-slate-400">Reference Frame:</span>
            {PRESETS.map((p) => {
              const active = view.preset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onPreset(p.id)}
                  className={`${BUTTON} px-2.5 font-semibold ${
                    active ? "border border-transparent bg-sky-500 text-slate-950 shadow-sm" : `${IDLE} text-slate-200`
                  }`}
                >
                  {p.label} ({helixAngleDeg(p.pitchAU).toFixed(1)}°)
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={onTogglePlay}
              disabled={!sceneAvailable}
              className={`${BUTTON} border border-emerald-500/40 bg-emerald-500/20 px-3 font-semibold text-emerald-300 hover:bg-emerald-500/30`}
            >
              {view.isPlaying ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              onClick={onResetCamera}
              disabled={!sceneAvailable}
              className={`${BUTTON} ${IDLE} px-2.5 font-medium text-slate-300`}
              title="Reset Camera"
            >
              Reset View
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 items-center gap-3 border-t border-slate-700/60 pt-2 sm:grid-cols-12">
          <Slider
            id="slider-pitch"
            label="Sun Speed / Axial Scale"
            valueText={`${kms.toFixed(0)} km/s (${axialScale(view.pitchAU).toFixed(2)}×)`}
            valueColor="text-amber-300"
            range={PITCH_RANGE}
            value={view.pitchAU}
            onChange={onPitch}
          />
          <Slider
            id="slider-span"
            label="Time Span"
            valueText={`${view.spanYears.toFixed(1)} yrs`}
            valueColor="text-sky-300"
            range={SPAN_RANGE}
            value={view.spanYears}
            onChange={onSpan}
          />

          <div className="flex flex-wrap items-center gap-1.5 justify-start sm:col-span-4 sm:justify-end">
            <Toggle
              active={view.showMoon}
              activeClass="border-slate-400/50 bg-slate-500/25 text-slate-200 hover:bg-slate-500/35"
              className="px-2"
              title="Toggle Earth's Moon"
              onClick={() => onToggle("showMoon")}
            >
              ☽ Moon
            </Toggle>
            <Toggle
              active={view.showInnerPlanets}
              activeClass="border-amber-400/50 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30"
              onClick={() => onToggle("showInnerPlanets")}
            >
              Inner
            </Toggle>
            <Toggle
              active={view.showOuterPlanets}
              activeClass="border-orange-400/50 bg-orange-500/20 text-orange-200 hover:bg-orange-500/30"
              onClick={() => onToggle("showOuterPlanets")}
            >
              Outer
            </Toggle>
            <Checkbox label="Symbols" checked={view.showSymbols} onChange={() => onToggle("showSymbols")} />
            <Checkbox label="Names" checked={view.showNames} onChange={() => onToggle("showNames")} />
          </div>
        </div>
      </div>
    </footer>
  );
}

function Slider({
  id,
  label,
  valueText,
  valueColor,
  range,
  value,
  onChange,
}: {
  id: string;
  label: string;
  valueText: string;
  valueColor: string;
  range: { min: number; max: number; step: number };
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1 sm:col-span-4">
      <div className="flex justify-between gap-2 text-xs">
        <label htmlFor={id} className="font-medium text-slate-300">
          {label}
        </label>
        <span className={`shrink-0 font-mono font-semibold tabular-nums ${valueColor}`}>{valueText}</span>
      </div>
      <input
        id={id}
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        aria-valuetext={valueText}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

function Toggle({
  active,
  activeClass,
  className = "px-2.5",
  title,
  onClick,
  children,
}: {
  active: boolean;
  activeClass: string;
  className?: string;
  title?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      title={title}
      onClick={onClick}
      className={`${BUTTON} ${className} ${active ? `border font-semibold ${activeClass}` : `${IDLE} font-medium text-slate-400`}`}
    >
      {children}
    </button>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900/70 px-2 py-1.5 text-xs text-slate-300">
      <input type="checkbox" checked={checked} onChange={onChange} className="rounded-sm accent-sky-400" />
      <span>{label}</span>
    </label>
  );
}
