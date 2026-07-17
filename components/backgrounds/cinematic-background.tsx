"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils/cn";
import { useIsMobile } from "@/hooks/use-is-mobile";

export function CinematicBackground({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile) return;
    const container = containerRef.current;
    if (!container) return;
    let rafId: number | null = null;
    let latestX = 0;
    let latestY = 0;

    const handleMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      latestX = (x / rect.width - 0.5) * 60;
      latestY = (y / rect.height - 0.5) * 60;

      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        container.style.setProperty("--parallax-x", `${latestX}px`);
        container.style.setProperty("--parallax-y", `${latestY}px`);
        rafId = null;
      });
    };

    const handleLeave = () => {
      container.style.setProperty("--parallax-x", "0px");
      container.style.setProperty("--parallax-y", "0px");
    };

    window.addEventListener("pointermove", handleMove, { passive: true });
    window.addEventListener("pointerleave", handleLeave, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerleave", handleLeave);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [isMobile]);

  if (isMobile) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      ref={containerRef}
      className={cn(
        "cinematic-bg pointer-events-none fixed inset-0 -z-10 overflow-hidden",
        className
      )}
    >
      {/* Deep obsidian base */}
      <div className="bg-layer-base absolute inset-0 bg-gradient-to-b from-[hsl(225,25%,4%)] via-[hsl(225,28%,2.5%)] to-[hsl(225,20%,3.5%)]" />

      {/* Subtle ambient orbs — restrained gold + violet */}
      <div className="bg-layer-bubbles absolute inset-0 opacity-70 contain-paint">
        <div className="absolute -left-[10%] bottom-[-15%] h-[600px] w-[600px] rounded-full bg-gradient-to-br from-[#F3BA2F]/[0.07] via-[#F3BA2F]/[0.04] to-transparent blur-[80px] animate-liquid-drift-1" />
        <div className="absolute -right-[8%] top-[-10%] h-[550px] w-[550px] rounded-full bg-gradient-to-br from-[#F3BA2F]/[0.05] via-[#a855f7]/[0.03] to-transparent blur-[70px] animate-liquid-drift-2" />
        <div className="absolute left-[30%] top-[25%] h-[450px] w-[450px] rounded-full bg-gradient-to-br from-[#F3BA2F]/[0.06] to-transparent blur-[60px] animate-liquid-drift-3" />
      </div>

      {/* Aura — very soft breathing glow */}
      <div className="bg-layer-aura absolute inset-0 opacity-35 animate-aura-breathe contain-paint">
        <div className="absolute -left-[15%] top-[-8%] h-[600px] w-[600px] rounded-full bg-gradient-to-br from-[#1e3a8a]/20 via-[#7c3aed]/[0.08] to-transparent blur-[140px]" />
        <div className="absolute right-[-10%] bottom-[-8%] h-[500px] w-[500px] rounded-full bg-gradient-to-br from-[#F3BA2F]/[0.1] via-[#7c3aed]/[0.06] to-transparent blur-[120px]" />
      </div>

      {/* Minimal floating orbs */}
      <div className="bg-layer-orbs absolute inset-0 opacity-40 contain-paint">
        <div className="absolute -left-32 top-[-8%] h-[400px] w-[400px] rounded-full bg-[#F3BA2F]/[0.08] blur-[100px] animate-orb-float-slower" />
        <div className="absolute left-[35%] bottom-[-10%] h-[350px] w-[350px] rounded-full bg-[#F3BA2F]/[0.06] blur-[90px] animate-orb-drift" />
      </div>

      {/* Fine particles */}
      <div className="bg-layer-particles absolute inset-0 hidden sm:block">
        <div className="absolute left-[12%] top-[18%] h-1.5 w-1.5 rounded-full bg-[#F3BA2F]/15 blur-[4px] animate-particle-float" />
        <div className="absolute right-[28%] top-[70%] h-1 w-1 rounded-full bg-[#F3BA2F]/12 blur-[4px] animate-particle-drift" />
        <div className="absolute right-[8%] top-[55%] h-1 w-1 rounded-full bg-[#F3BA2F]/12 blur-[4px] animate-particle-float" />
        <div className="absolute left-[35%] top-[25%] h-1 w-1 rounded-full bg-[#a78bfa]/10 blur-[4px] animate-particle-drift" />
        <div className="absolute left-[24%] top-[65%] h-1 w-1 rounded-full bg-white/10 blur-[4px] animate-particle-float" />
        <div className="absolute left-[48%] top-[42%] h-1 w-1 rounded-full bg-[#34d399]/10 blur-[4px] animate-particle-float" />
      </div>

      {/* Gradient pan */}
      <div className="bg-layer-gradient-pan absolute inset-0 animate-gradient-pan bg-[radial-gradient(circle_at_50%_50%,rgba(243,186,47,0.04),transparent_60%)] bg-[length:160%_160%] opacity-50" />

      {/* Gradient shift */}
      <div className="bg-layer-gradient-shift absolute inset-0 animate-gradient-shift bg-[radial-gradient(circle_at_15%_15%,rgba(243,186,47,0.06),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(124,58,237,0.04),transparent_35%)] opacity-60" />

      {/* Liquid mesh — very subtle conic */}
      <div className="bg-layer-mesh absolute inset-[-10%] animate-liquid-mesh bg-[conic-gradient(from_120deg,rgba(243,186,47,0.08),rgba(15,23,42,0.02),rgba(124,58,237,0.05),rgba(15,23,42,0.02),rgba(52,211,153,0.04),rgba(15,23,42,0.02),rgba(243,186,47,0.07))] mix-blend-screen blur-[70px] opacity-35" />

      {/* Interactive bubbles with parallax */}
      <div className="bg-layer-bubble-interactive absolute inset-0">
        <div className="bubble bubble-depth-1 left-[12%] top-[12%] h-[180px] w-[180px]">
          <div className="bubble-core animate-bubble-float-1 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.15),rgba(243,186,47,0.1),transparent_70%)]" />
        </div>
        <div className="bubble bubble-depth-2 right-[8%] top-[40%] h-[220px] w-[220px]">
          <div className="bubble-core animate-bubble-float-2 bg-[radial-gradient(circle_at_35%_35%,rgba(243,186,47,0.12),rgba(124,58,237,0.08),transparent_72%)]" />
        </div>
        <div className="bubble bubble-depth-3 left-[35%] bottom-[10%] h-[240px] w-[240px]">
          <div className="bubble-core animate-bubble-float-3 bg-[radial-gradient(circle_at_40%_40%,rgba(255,255,255,0.1),rgba(52,211,153,0.08),transparent_75%)]" />
        </div>
        <div className="bubble bubble-depth-2 left-[60%] top-[18%] h-[120px] w-[120px] opacity-70">
          <div className="bubble-core animate-bubble-float-2 bg-[radial-gradient(circle_at_35%_35%,rgba(255,255,255,0.12),rgba(243,186,47,0.08),transparent_72%)]" />
        </div>
      </div>

      {/* Noise grain overlay for depth */}
      <div className="absolute inset-0 opacity-[0.015] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMSIvPjwvc3ZnPg==')] mix-blend-overlay" />
    </div>
  );
}
