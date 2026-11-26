import type { ReactNode } from "react";
import { CIRCUMFERENCE_AU, ORBIT_RADIUS_AU } from "@/lib/orbit/constants";
import { axialScale, sunSpeedKms } from "@/lib/orbit/physics";
import { frameName, type ViewState } from "@/lib/orbit/view";

export function InfoPanel({ view, webglAvailable }: { view: ViewState; webglAvailable: boolean }) {
  return (
    <header className="glass-panel fixed top-3 left-3 z-20 max-w-[min(20rem,calc(100%-4.5rem))] rounded-2xl p-3.5 sm:top-5 sm:left-5 sm:max-w-sm sm:p-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold tracking-wider text-sky-400 uppercase">3D Celestial Geometry</span>
        <span className="rounded-full border border-sky-400/30 bg-sky-500/20 px-2 py-0.5 text-[10px] font-medium text-sky-300">
          {frameName(view)}
        </span>
      </div>
      <h1 className="text-base leading-tight font-bold text-white sm:text-lg sm:leading-7">Helical Trajectories</h1>
      {webglAvailable ? (
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          Drag to orbit • Scroll/Pinch to zoom • Right‑drag to pan
        </p>
      ) : (
        <p role="alert" className="mt-1 text-xs leading-relaxed text-amber-300">
          This view needs WebGL 2, which this browser doesn’t support or has turned off.
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-700/60 pt-3">
        <Metric
          title="Earth Orbit"
          value={`${(ORBIT_RADIUS_AU * 2).toFixed(2)} AU`}
          detail={`C = ${CIRCUMFERENCE_AU.toFixed(2)} AU`}
          border="border-cyan-500/25"
          titleColor="text-cyan-300/80"
          valueColor="text-cyan-300"
        />
        <Metric
          title="Sun Speed"
          value={`${sunSpeedKms(view.pitchAU).toFixed(1)} km/s`}
          detail={`${axialScale(view.pitchAU).toFixed(2)}× axial scale`}
          border="border-amber-500/25"
          titleColor="text-amber-300/80"
          valueColor="text-amber-300"
        />
      </div>
    </header>
  );
}

interface MetricProps {
  title: ReactNode;
  value: string;
  detail: string;
  border: string;
  titleColor: string;
  valueColor: string;
}

function Metric({ title, value, detail, border, titleColor, valueColor }: MetricProps) {
  return (
    <div className={`rounded-xl border bg-slate-900/70 p-2 ${border}`}>
      <div className={`text-[10px] font-semibold uppercase ${titleColor}`}>{title}</div>
      <div className={`mt-0.5 font-mono text-xs font-bold sm:text-sm ${valueColor}`}>{value}</div>
      <div className="text-[10px] text-slate-400">{detail}</div>
    </div>
  );
}
