import { useEffect, useEffectEvent, useRef, type ReactNode, type Ref } from "react";
import { PITCH_RANGE, SPAN_RANGE } from "@/lib/orbit/constants";
import { SHORTCUT_KEYS } from "@/lib/orbit/keyboard";
import { axialScale, sunSpeedKms } from "@/lib/orbit/physics";
import { CUSTOM_FRAME_NAME, formatKms, PRESETS, type PresetId, type ViewState } from "@/lib/orbit/view";

export type ToggleKey = "showMoon" | "showInnerPlanets" | "showOuterPlanets" | "showSymbols" | "showNames";

interface ControlBarProps {
  ref?: Ref<HTMLElement>;
  /** Filled in by the scene every frame with how far the animation has got. */
  elapsedRef?: Ref<HTMLSpanElement>;
  view: ViewState;
  /** False when there is no 3D scene for playback and camera controls to act on. */
  sceneAvailable: boolean;
  onPreset: (id: PresetId) => void;
  onPitch: (pitchAU: number) => void;
  onSpan: (spanYears: number) => void;
  /** Called once a slider's new value is let go of: on pointer release, or after each keyboard step. */
  onSliderCommit: () => void;
  onTogglePlay: () => void;
  onResetCamera: () => void;
  onToggle: (key: ToggleKey) => void;
}

const BUTTON = "rounded-lg py-1.5 text-xs transition disabled:opacity-50";
const IDLE = "border border-slate-700 bg-slate-800/90 hover:border-slate-600 hover:bg-slate-700";
/** The "on" look shared by the presets and the Show toggles. Colour is kept for the bodies. */
const ACTIVE = "border border-transparent bg-slate-200 text-slate-950 hover:bg-white";

export function ControlBar({
  ref,
  elapsedRef,
  view,
  sceneAvailable,
  onPreset,
  onPitch,
  onSpan,
  onSliderCommit,
  onTogglePlay,
  onResetCamera,
  onToggle,
}: ControlBarProps) {
  const kms = sunSpeedKms(view.pitchAU);

  return (
    <footer
      ref={ref}
      className="glass-panel fixed right-3 bottom-3 left-3 z-20 rounded-2xl p-3 sm:right-auto sm:bottom-5 sm:left-1/2 sm:w-[94%] sm:max-w-3xl sm:-translate-x-1/2 sm:p-4"
    >
      <div className="flex flex-col gap-2.5">
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <div className="flex flex-col gap-3">
            <Slider
              id="slider-pitch"
              label="Sun Speed"
              valueText={`${formatKms(kms)} · ${axialScale(view.pitchAU).toFixed(2)}×`}
              valueColor="text-slate-200"
              range={PITCH_RANGE}
              value={view.pitchAU}
              onChange={onPitch}
              onCommit={onSliderCommit}
            />
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Reference frame">
              {PRESETS.map((p) => {
                const active = view.preset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onPreset(p.id)}
                    className={`${BUTTON} px-2.5 font-semibold ${
                      active ? ACTIVE : `${IDLE} text-slate-300`
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
              {view.preset === null && (
                <span className="px-1 text-xs font-medium text-slate-400 italic">
                  {CUSTOM_FRAME_NAME}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Slider
              id="slider-span"
              label="Time Span"
              valueText={`${view.spanYears.toFixed(1)} yrs`}
              valueColor="text-slate-200"
              range={SPAN_RANGE}
              value={view.spanYears}
              onChange={onSpan}
              onCommit={onSliderCommit}
            />
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onTogglePlay}
                disabled={!sceneAvailable}
                className={`${BUTTON} ${IDLE} px-3 font-semibold text-slate-200`}
                title={`${view.isPlaying ? "Pause" : "Play"} (Space)`}
                aria-keyshortcuts={SHORTCUT_KEYS.togglePlay}
              >
                {view.isPlaying ? "Pause" : "Play"}
              </button>
              <span ref={elapsedRef} role="timer" className="ml-1.5 font-mono text-xs text-slate-300 tabular-nums" />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-700/60 pt-2.5">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Show">
            <span className="mr-1 text-xs font-semibold text-slate-400">Show:</span>
            <Toggle active={view.showMoon} onClick={() => onToggle("showMoon")}>
              Moon
            </Toggle>
            <Toggle active={view.showInnerPlanets} onClick={() => onToggle("showInnerPlanets")}>
              Inner Planets
            </Toggle>
            <Toggle active={view.showOuterPlanets} onClick={() => onToggle("showOuterPlanets")}>
              Outer Planets
            </Toggle>
            <Toggle active={view.showSymbols} onClick={() => onToggle("showSymbols")}>
              Symbols
            </Toggle>
            <Toggle active={view.showNames} onClick={() => onToggle("showNames")}>
              Names
            </Toggle>
          </div>
          <button
            type="button"
            onClick={onResetCamera}
            disabled={!sceneAvailable}
            className={`${BUTTON} ${IDLE} ml-auto px-2.5 font-medium text-slate-300`}
            title="Refit the camera to the visible orbits (R)"
            aria-keyshortcuts={SHORTCUT_KEYS.resetView}
          >
            Reset View
          </button>
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
  onCommit,
}: {
  id: string;
  label: string;
  valueText: string;
  valueColor: string;
  range: { min: number; max: number; step: number };
  value: number;
  onChange: (value: number) => void;
  onCommit: () => void;
}) {
  // React's onChange fires on every input event; the native change event fires only once the value is let go of.
  const inputRef = useRef<HTMLInputElement>(null);
  const commit = useEffectEvent(onCommit);
  useEffect(() => {
    const input = inputRef.current!;
    const onNativeChange = () => commit();
    input.addEventListener("change", onNativeChange);
    return () => input.removeEventListener("change", onNativeChange);
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between gap-2 text-xs">
        <label htmlFor={id} className="font-medium text-slate-300">
          {label}
        </label>
        <span className={`shrink-0 font-mono font-semibold tabular-nums ${valueColor}`}>{valueText}</span>
      </div>
      <input
        ref={inputRef}
        id={id}
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        aria-valuetext={valueText}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="my-1.5 w-full"
      />
    </div>
  );
}

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`${BUTTON} px-2.5 ${
        active
          ? `${ACTIVE} font-semibold`
          : `${IDLE} font-medium text-slate-300`
      }`}
    >
      {children}
    </button>
  );
}
