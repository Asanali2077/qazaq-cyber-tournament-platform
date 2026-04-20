import type { ReactNode } from "react";
import { SiteHeader } from "./site-header";

export function PageShell({
  children,
  compact = false
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[10%] top-[10%] size-72 rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute bottom-[5%] right-[10%] size-80 rounded-full bg-indigo-500/10 blur-[140px]" />
        <div className="absolute inset-0 bg-hero-grid bg-[size:26px_26px] opacity-40" />
      </div>
      <SiteHeader />
      <main className={`container relative z-10 ${compact ? "py-10" : "py-12 md:py-16"}`}>
        {children}
      </main>
    </div>
  );
}
