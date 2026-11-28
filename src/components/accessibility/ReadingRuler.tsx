"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { GripHorizontal } from "lucide-react";

interface ReadingRulerProps {
  heightPx?: number;
  opacity?: number;
  color?: string;
  enabled?: boolean;
}

export function ReadingRuler({
  heightPx = 48,
  opacity = 0.25,
  color = "#F59E0B", // Calming amber/yellow tint
  enabled = true,
}: ReadingRulerProps) {
  const [topPos, setTopPos] = useState<number>(180);
  const [isDragging, setIsDragging] = useState(false);
  const rulerRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation for accessibility
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 48 : 24;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setTopPos((prev) => Math.min(window.innerHeight - heightPx, prev + step));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setTopPos((prev) => Math.max(0, prev - step));
    }
  }, [heightPx]);

  // Pointer drag handling (mouse and touch)
  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      setTopPos(Math.max(0, Math.min(window.innerHeight - heightPx, clientY - heightPx / 2)));
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("touchmove", handlePointerMove, { passive: true });
    window.addEventListener("mouseup", handlePointerUp);
    window.addEventListener("touchend", handlePointerUp);

    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
      window.removeEventListener("touchend", handlePointerUp);
    };
  }, [isDragging, heightPx]);

  if (!enabled) return null;

  return (
    <div
      ref={rulerRef}
      role="separator"
      tabIndex={0}
      aria-label="Reading Ruler Guide. Use Up and Down arrow keys to reposition."
      aria-valuenow={Math.round(topPos)}
      onKeyDown={handleKeyDown}
      style={{
        top: `${topPos}px`,
        height: `${heightPx}px`,
        backgroundColor: color,
        opacity,
      }}
      className="fixed left-0 right-0 z-30 pointer-events-auto cursor-grab active:cursor-grabbing border-y-2 border-amber-600/40 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-[top] duration-75 motion-reduce:transition-none"
    >
      <div
        onMouseDown={() => setIsDragging(true)}
        onTouchStart={() => setIsDragging(true)}
        title="Drag ruler up/down or press Up/Down arrow keys"
        className="absolute right-0 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-l-lg border-l border-y border-amber-700 text-[10px] font-bold select-none flex items-center gap-1 shadow-md cursor-grab active:cursor-grabbing z-40"
      >
        <GripHorizontal className="w-3.5 h-3.5 text-amber-200" />
        <span>:: RULER</span>
      </div>
    </div>
  );
}
