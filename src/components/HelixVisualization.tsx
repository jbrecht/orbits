"use client";

import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { BodyId } from "@/lib/orbit/bodies";
import { appShortcut, keyBelongsToTarget, SHORTCUT_KEYS, trackFocusOrigin, type AppShortcut } from "@/lib/orbit/keyboard";
import { OrbitScene } from "@/lib/orbit/scene/OrbitScene";
import { describeScene, INITIAL_VIEW, PRESETS, type PresetId, type ViewState } from "@/lib/orbit/view";
import { BodyLabels } from "./BodyLabels";
import { ControlBar, type ToggleKey } from "./ControlBar";
import { HelpDialog } from "./HelpDialog";
import { InfoPanel } from "./InfoPanel";

let webgl2Support: boolean | undefined;

/** Three.js needs WebGL 2. Probed once, then the probe context is released. */
function supportsWebGL2(): boolean {
  if (webgl2Support === undefined) {
    const gl = document.createElement("canvas").getContext("webgl2");
    webgl2Support = gl !== null;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  }
  return webgl2Support;
}

interface FitRequest {
  keepAngle: boolean;
}

const subscribeNever = () => () => {};

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const prefersReducedMotion = () => window.matchMedia(REDUCED_MOTION).matches;

export function HelixVisualization() {
  const [chosenView, setView] = useState<ViewState>(INITIAL_VIEW);
  // Playback follows the system's reduced-motion setting until Play or Pause is pressed.
  const [playChoice, setPlayChoice] = useState<boolean | null>(null);
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, () => false);
  const isPlaying = playChoice ?? !reducedMotion;
  const view = useMemo(() => ({ ...chosenView, isPlaying }), [chosenView, isPlaying]);
  // Replaced whenever the camera should refit after the view is applied.
  const [fitRequest, setFitRequest] = useState<FitRequest | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  // The prerendered page assumes support; the browser corrects it after hydration.
  const webglAvailable = useSyncExternalStore(subscribeNever, supportsWebGL2, () => true);

  const containerRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<Partial<Record<BodyId, HTMLElement | null>>>({});
  const sceneRef = useRef<OrbitScene | null>(null);
  const barRef = useRef<HTMLElement>(null);
  const elapsedRef = useRef<HTMLSpanElement>(null);
  const apexRef = useRef<HTMLDivElement>(null);
  const appliedFit = useRef<FitRequest | null>(null);

  useEffect(() => {
    if (!supportsWebGL2()) return;
    const scene = new OrbitScene(containerRef.current!, labelsRef.current, INITIAL_VIEW, {
      bottomBar: barRef.current,
      elapsed: elapsedRef.current,
      apexLabel: apexRef.current,
    });
    sceneRef.current = scene;
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.update(view);
    if (fitRequest && fitRequest !== appliedFit.current) {
      appliedFit.current = fitRequest;
      scene.fitCamera(fitRequest.keepAngle);
    }
  }, [view, fitRequest]);

  const patch = useCallback((changes: Partial<ViewState>) => setView((v) => ({ ...v, ...changes })), []);
  // Buttons and R reset the camera's angle; letting go of a slider keeps it.
  const refit = useCallback(() => setFitRequest({ keepAngle: false }), []);
  const refitKeepingAngle = useCallback(() => setFitRequest({ keepAngle: true }), []);
  const toggle = (key: ToggleKey) => setView((v) => ({ ...v, [key]: !v[key] }));

  const togglePlay = () => setPlayChoice(!isPlaying);

  const runShortcut = useEffectEvent((shortcut: AppShortcut) => {
    if (shortcut === "help") setHelpOpen(true);
    else if (!webglAvailable) return;
    else if (shortcut === "togglePlay") togglePlay();
    else refit();
  });
  useEffect(() => {
    const focus = trackFocusOrigin();
    const onKeyDown = (e: KeyboardEvent) => {
      const shortcut = appShortcut(e);
      if (!shortcut || keyBelongsToTarget(e.key, e.target, focus.focusedByKeyboard())) return;
      // Also stops a clicked button from being pressed again by Space.
      e.preventDefault();
      if (!e.repeat) runShortcut(shortcut);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      focus.dispose();
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const selectPreset = (id: PresetId) => {
    const preset = PRESETS.find((p) => p.id === id)!;
    patch({ pitchAU: preset.pitchAU, preset: id, skyFrame: id });
    refit();
  };

  return (
    <>
      <div
        ref={containerRef}
        role="img"
        aria-label={describeScene(view)}
        className="fixed inset-0 z-[1] touch-none [&>canvas]:block [&>canvas]:size-full"
      />
      <BodyLabels view={view} labelRefs={labelsRef} apexRef={apexRef} />
      <InfoPanel webglAvailable={webglAvailable} />

      <button
        type="button"
        onClick={() => setHelpOpen(true)}
        className="glass-panel fixed top-3 right-3 z-20 flex size-9 items-center justify-center rounded-full text-sm font-bold text-slate-200 transition hover:border-slate-400/50 hover:text-white sm:top-5 sm:right-5"
        title="Help (?)"
        aria-label="Help"
        aria-keyshortcuts={SHORTCUT_KEYS.help}
      >
        ?
      </button>
      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />

      <ControlBar
        ref={barRef}
        elapsedRef={elapsedRef}
        view={view}
        sceneAvailable={webglAvailable}
        onPreset={selectPreset}
        onPitch={(pitchAU) => patch({ pitchAU, preset: null })}
        onSpan={(spanYears) => patch({ spanYears })}
        onSliderCommit={refitKeepingAngle}
        onTogglePlay={togglePlay}
        onResetCamera={refit}
        onToggle={toggle}
      />
    </>
  );
}
