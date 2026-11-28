"use client";

import React, { useEffect, useState, useCallback } from "react";

interface LineFocusMaskProps {
  visibleLines?: 1 | 2 | 3;
  enabled?: boolean;
}

export function LineFocusMask({
  visibleLines = 2,
  enabled = true,
}: LineFocusMaskProps) {
  // Height of the clear slit depends on visible lines
  // 1 line ~ 40px, 2 lines ~ 80px, 3 lines ~ 120px
  const bandHeight = visibleLines === 1 ? 44 : visibleLines === 2 ? 84 : 124;

  const [bandY, setBandY] = useState<number>(200);

  // Track mouse position smoothly across the window
  useEffect(() => {
    if (!enabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      setBandY(Math.max(0, e.clientY - bandHeight / 2));
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [enabled, bandHeight]);

  // Keyboard adjustment
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === "ArrowDown") {
        e.preventDefault();
        setBandY((prev) => Math.min(window.innerHeight - bandHeight, prev + 30));
      } else if (e.altKey && e.key === "ArrowUp") {
        e.preventDefault();
        setBandY((prev) => Math.max(0, prev - 30));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, bandHeight]);

  if (!enabled) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-30 pointer-events-none select-none overflow-hidden"
    >
      {/* Top Dimming Curtain */}
      <div
        style={{ height: `${Math.max(0, bandY)}px` }}
        className="w-full bg-slate-900/60 backdrop-blur-[1px] transition-[height] duration-75 motion-reduce:transition-none"
      />

      {/* Clear Focus Band with Soft Accent Borders */}
      <div
        style={{ height: `${bandHeight}px` }}
        className="w-full border-y border-amber-400/80 shadow-[0_0_15px_rgba(251,191,36,0.15)] bg-transparent"
      />

      {/* Bottom Dimming Curtain */}
      <div className="w-full flex-1 bg-slate-900/60 backdrop-blur-[1px] h-screen" />
    </div>
  );
}
