export function InfoPanel({ webglAvailable }: { webglAvailable: boolean }) {
  return (
    <header className="glass-panel fixed top-3 left-3 z-20 max-w-[min(20rem,calc(100%-4.5rem))] rounded-2xl p-3.5 sm:top-5 sm:left-5 sm:max-w-sm sm:p-4">
      <div className="mb-1 text-xs font-semibold tracking-wider text-sky-400 uppercase">Planetary orbits as the Sun moves</div>
      <h1 className="text-lg leading-tight font-bold text-white sm:text-2xl">Helical Trajectories</h1>
      {webglAvailable ? (
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          Drag to orbit • Scroll or pinch to zoom • Shift‑drag to pan
        </p>
      ) : (
        <p role="alert" className="mt-1 text-xs leading-relaxed text-amber-300">
          This view needs WebGL 2, which this browser doesn’t support or has turned off.
        </p>
      )}
    </header>
  );
}
