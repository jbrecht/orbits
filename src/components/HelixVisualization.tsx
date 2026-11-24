"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BodyId } from "@/lib/orbit/bodies";
import { OrbitScene } from "@/lib/orbit/scene/OrbitScene";
import { INITIAL_VIEW, PRESETS, type PresetId, type ViewState } from "@/lib/orbit/view";
import { BodyLabels } from "./BodyLabels";
import { ControlBar } from "./ControlBar";
import { HelpDialog } from "./HelpDialog";
import { InfoPanel } from "./InfoPanel";

export function HelixVisualization() {
  const [view, setView] = useState<ViewState>(INITIAL_VIEW);
  // Bumped whenever the camera should refit after the view is applied.
  const [fitRequest, setFitRequest] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<Partial<Record<BodyId, HTMLElement | null>>>({});
  const sceneRef = useRef<OrbitScene | null>(null);
  const appliedFit = useRef(0);

  useEffect(() => {
    const scene = new OrbitScene(containerRef.current!, labelsRef.current, INITIAL_VIEW);
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
    if (fitRequest !== appliedFit.current) {
      appliedFit.current = fitRequest;
      scene.fitCamera();
    }
  }, [view, fitRequest]);

  const patch = useCallback((changes: Partial<ViewState>) => setView((v) => ({ ...v, ...changes })), []);
  const refit = useCallback(() => setFitRequest((n) => n + 1), []);

  const selectPreset = (id: PresetId) => {
    const preset = PRESETS.find((p) => p.id === id)!;
    patch({ pitchAU: preset.pitchAU, preset: id });
    refit();
  };

  return (
    <>
      <div ref={containerRef} className="fixed inset-0 z-[1] touch-none [&>canvas]:block [&>canvas]:size-full" />
      <BodyLabels view={view} labelRefs={labelsRef} />
      <InfoPanel view={view} />

      <button
        type="button"
        onClick={() => setHelpOpen(true)}
        className="glass-panel fixed top-3 right-3 z-20 flex size-9 items-center justify-center rounded-full text-sm font-bold text-sky-300 transition hover:border-sky-400/50 hover:text-white sm:top-5 sm:right-5"
        title="Help & Controls Guide"
        aria-label="Help"
      >
        ?
      </button>
      {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}

      <ControlBar
        view={view}
        onPreset={selectPreset}
        onPitch={(pitchAU) => patch({ pitchAU, preset: null })}
        onSpan={(spanYears) => {
          patch({ spanYears });
          refit();
        }}
        onTogglePlay={() => patch({ isPlaying: !view.isPlaying })}
        onResetCamera={refit}
        onToggle={(key) => patch({ [key]: !view[key] })}
      />
    </>
  );
}
