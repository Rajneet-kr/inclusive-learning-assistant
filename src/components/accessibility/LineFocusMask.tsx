"use client";

import React, { useEffect, useRef, useCallback } from "react";

interface LineFocusMaskProps {
  visibleLines?: 1 | 2 | 3;
  enabled?: boolean;
}

export function LineFocusMask({
  visibleLines = 2,
  enabled = true,
}: LineFocusMaskProps) {
  // Height of the clear slit depends on visible lines
  // 1 line ~ 44px, 2 lines ~ 84px, 3 lines ~ 124px
  const bandHeight = visibleLines === 1 ? 44 : visibleLines === 2 ? 84 : 124;

  const bandYRef = useRef<number>(200);
  const rafRef = useRef<number | null>(null);
  const topCurtainRef = useRef<HTMLDivElement>(null);
  const focusBandRef = useRef<HTMLDivElement>(null);
  const bottomCurtainRef = useRef<HTMLDivElement>(null);

  const applyTransform = useCallback(
    (y: number) => {
      const clampedY = Math.max(
        0,
        typeof window !== "undefined"
          ? Math.min(window.innerHeight - bandHeight, y)
          : y
      );
      bandYRef.current = clampedY;

      if (topCurtainRef.current) {
        topCurtainRef.current.style.transform = `translate3d(0, calc(${clampedY}px - 100%), 0)`;
      }
      if (focusBandRef.current) {
        focusBandRef.current.style.transform = `translate3d(0, ${clampedY}px, 0)`;
      }
      if (bottomCurtainRef.current) {
        bottomCurtainRef.current.style.transform = `translate3d(0, ${clampedY + bandHeight}px, 0)`;
      }
    },
    [bandHeight]
  );

  // Re-apply transform immediately if visibleLines (bandHeight) changes
  useEffect(() => {
    if (!enabled) return;
    applyTransform(bandYRef.current);
  }, [enabled, applyTransform]);

  // Track pointer position at display refresh rate with zero React re-renders
  useEffect(() => {
    if (!enabled) return;

    const handlePointerMove = (e: PointerEvent) => {
      const targetY = e.clientY - bandHeight / 2;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(() => {
        applyTransform(targetY);
        rafRef.current = null;
      });
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [enabled, bandHeight, applyTransform]);

  // Keyboard adjustment (Alt + ArrowUp / ArrowDown)
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === "ArrowDown") {
        e.preventDefault();
        applyTransform(bandYRef.current + 30);
      } else if (e.altKey && e.key === "ArrowUp") {
        e.preventDefault();
        applyTransform(bandYRef.current - 30);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, applyTransform]);

  if (!enabled) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-30 pointer-events-none select-none overflow-hidden"
    >
      {/* Top Dimming Curtain (GPU-accelerated translate3d) */}
      <div
        ref={topCurtainRef}
        style={{
          height: "100vh",
          transform: `translate3d(0, calc(${bandYRef.current}px - 100%), 0)`,
          willChange: "transform",
        }}
        className="fixed left-0 right-0 top-0 bg-slate-900/60 backdrop-blur-[1px]"
      />

      {/* Clear Focus Band with Soft Accent Borders */}
      <div
        ref={focusBandRef}
        style={{
          height: `${bandHeight}px`,
          transform: `translate3d(0, ${bandYRef.current}px, 0)`,
          willChange: "transform",
        }}
        className="fixed left-0 right-0 top-0 border-y border-amber-400/80 shadow-[0_0_15px_rgba(251,191,36,0.15)] bg-transparent"
      />

      {/* Bottom Dimming Curtain (GPU-accelerated translate3d) */}
      <div
        ref={bottomCurtainRef}
        style={{
          height: "100vh",
          transform: `translate3d(0, ${bandYRef.current + bandHeight}px, 0)`,
          willChange: "transform",
        }}
        className="fixed left-0 right-0 top-0 bg-slate-900/60 backdrop-blur-[1px]"
      />
    </div>
  );
}
