import type { ReactNode } from "react";

export const Kbd = ({ children }: { children: ReactNode }) => (
  <kbd className="rounded border border-slate-600 bg-slate-800 px-1 font-mono text-[0.6875rem] text-slate-200">
    {children}
  </kbd>
);
