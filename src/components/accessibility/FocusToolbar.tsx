"use client";

import React from "react";
import {
  FocusSettings,
  FocusToolMode,
} from "@/types/api";
import {
  Sparkles,
  Maximize2,
  Sliders,
  AlignJustify,
  Split,
  EyeOff,
  Crosshair,
  Minus,
} from "lucide-react";
import { MicroSprintTimer } from "./MicroSprintTimer";

interface FocusToolbarProps {
  focus: FocusSettings;
  onUpdateFocus: (newFocus: Partial<FocusSettings>) => void;
  className?: string;
  showTimer?: boolean;
}

export function FocusToolbar({
  focus,
  onUpdateFocus,
  className = "",
  showTimer = true,
}: FocusToolbarProps) {
  const mode = focus.mode || "off";

  const handleModeChange = (newMode: FocusToolMode) => {
    onUpdateFocus({ mode: newMode });
  };

  return (
    <section
      aria-label="ADHD & Neurodivergent Focus Tools"
      className={`rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 shadow-xs space-y-3.5 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Mode Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 inline-flex items-center gap-1.5">
            <Crosshair className="w-3.5 h-3.5 text-indigo-600" aria-hidden="true" />
            Focus Tool:
          </span>

          <div
            className="flex flex-wrap gap-1.5"
            role="radiogroup"
            aria-label="Reading Focus Guide Mode"
          >
            <button
              type="button"
              role="radio"
              aria-checked={mode === "off"}
              onClick={() => handleModeChange("off")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mode === "off"
                  ? "bg-white text-slate-900 shadow-xs ring-1 ring-slate-300"
                  : "bg-white/60 text-slate-600 hover:bg-white"
              }`}
            >
              Off
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={mode === "ruler"}
              onClick={() => handleModeChange("ruler")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
                mode === "ruler"
                  ? "bg-amber-100 text-amber-900 ring-2 ring-amber-500 shadow-xs"
                  : "bg-white/60 text-slate-700 hover:bg-white"
              }`}
            >
              <Minus className="w-3.5 h-3.5 text-amber-600 stroke-[3]" />
              Reading Ruler
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={mode === "line_focus"}
              onClick={() => handleModeChange("line_focus")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
                mode === "line_focus"
                  ? "bg-indigo-100 text-indigo-900 ring-2 ring-indigo-500 shadow-xs"
                  : "bg-white/60 text-slate-700 hover:bg-white"
              }`}
            >
              <AlignJustify className="w-3.5 h-3.5 text-indigo-600" />
              Line Focus Mask
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={mode === "distraction_free"}
              onClick={() => handleModeChange("distraction_free")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
                mode === "distraction_free"
                  ? "bg-emerald-100 text-emerald-900 ring-2 ring-emerald-500 shadow-xs"
                  : "bg-white/60 text-slate-700 hover:bg-white"
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5 text-emerald-600" />
              Distraction-Free
            </button>
          </div>
        </div>

        {/* Quick Toggles: Syllable Breakdown */}
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-indigo-100 shadow-xs">
            <input
              type="checkbox"
              checked={!!focus.syllableBreakdown}
              onChange={(e) => onUpdateFocus({ syllableBreakdown: e.target.checked })}
              className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500"
            />
            <Split className="w-3.5 h-3.5 text-blue-600" />
            <span>Syllables (pho·to)</span>
          </label>
        </div>
      </div>

      {/* Dynamic Sub-Controls for Ruler & Line Focus */}
      {mode === "line_focus" && (
        <div className="flex items-center gap-3 pt-2 border-t border-indigo-100/70 text-xs">
          <span className="font-semibold text-slate-600">Visible Lines:</span>
          <div className="inline-flex gap-1" role="radiogroup" aria-label="Visible focus lines">
            {([1, 2, 3] as const).map((lines) => (
              <button
                key={lines}
                type="button"
                role="radio"
                aria-checked={focus.visibleLines === lines}
                onClick={() => onUpdateFocus({ visibleLines: lines })}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                  focus.visibleLines === lines
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {lines} {lines === 1 ? "Line" : "Lines"}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-slate-500 ml-auto hidden sm:inline">
            Mask tracks pointer &bull; Alt + Up/Down to nudge
          </span>
        </div>
      )}

      {mode === "ruler" && (
        <div className="flex items-center gap-3 pt-2 border-t border-indigo-100/70 text-xs">
          <span className="font-semibold text-slate-600">Ruler Height:</span>
          <div className="inline-flex gap-1" role="radiogroup" aria-label="Reading ruler thickness">
            {[36, 48, 64].map((px) => (
              <button
                key={px}
                type="button"
                role="radio"
                aria-checked={focus.rulerHeightPx === px}
                onClick={() => onUpdateFocus({ rulerHeightPx: px })}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                  focus.rulerHeightPx === px
                    ? "bg-amber-600 text-white"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {px}px
              </button>
            ))}
          </div>
          <span className="text-[11px] text-slate-500 ml-auto hidden sm:inline">
            Drag ruler handle or use Up / Down arrow keys
          </span>
        </div>
      )}

      {/* Embedded Micro-Sprint Timer */}
      {showTimer && (
        <div className="pt-2 border-t border-indigo-100/70">
          <MicroSprintTimer
            initialMinutes={focus.microSprintMinutes || 10}
            onSprintComplete={(mins) => {
              // Can record sprint or celebrate
            }}
          />
        </div>
      )}
    </section>
  );
}
