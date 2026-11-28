"use client";

import React, { useState, useEffect } from "react";
import { Play, Pause, RotateCcw, Clock, CheckCircle2 } from "lucide-react";

interface MicroSprintTimerProps {
  initialMinutes?: 5 | 10 | 15 | 25;
  onSprintComplete?: (minutes: number) => void;
  className?: string;
  highContrast?: boolean;
}

export function MicroSprintTimer({
  initialMinutes = 10,
  onSprintComplete,
  className = "",
  highContrast = false,
}: MicroSprintTimerProps) {
  const [selectedMinutes, setSelectedMinutes] = useState<5 | 10 | 15 | 25>(initialMinutes);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(initialMinutes * 60);
  const [isActive, setIsActive] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const totalSeconds = selectedMinutes * 60;
  const progressPercent = Math.min(100, Math.round(((totalSeconds - secondsRemaining) / totalSeconds) * 100));

  // Timer interval
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => prev - 1);
      }, 1000);
    } else if (isActive && secondsRemaining === 0) {
      setIsActive(false);
      setIsCompleted(true);
      if (onSprintComplete) {
        onSprintComplete(selectedMinutes);
      }

      // Calm, positive browser speech chime
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(
          `Great focus session. You have completed your ${selectedMinutes} minute study sprint.`
        );
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, secondsRemaining, selectedMinutes, onSprintComplete]);

  const handleSelectMinutes = (m: 5 | 10 | 15 | 25) => {
    setSelectedMinutes(m);
    setSecondsRemaining(m * 60);
    setIsActive(false);
    setIsCompleted(false);
  };

  const handleTogglePlay = () => {
    if (isCompleted) {
      setSecondsRemaining(selectedMinutes * 60);
      setIsCompleted(false);
    }
    setIsActive(!isActive);
  };

  const handleReset = () => {
    setIsActive(false);
    setIsCompleted(false);
    setSecondsRemaining(selectedMinutes * 60);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div
      role="region"
      aria-label="ADHD Micro-Sprint Study Timer"
      className={`rounded-xl p-3.5 shadow-xs transition-colors ${
        highContrast
          ? "border-2 border-yellow-400 bg-black text-yellow-300"
          : "border border-slate-200 bg-white text-slate-800"
      } ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Title & Preset Selector */}
        <div className="flex items-center gap-2">
          <Clock
            className={`w-4 h-4 shrink-0 ${
              highContrast ? "text-yellow-400" : "text-indigo-600"
            }`}
            aria-hidden="true"
          />
          <span
            className={`text-xs font-bold ${
              highContrast ? "text-yellow-400 uppercase tracking-wider" : "text-slate-800"
            }`}
          >
            Focus Sprint:
          </span>
          <div className="flex items-center gap-1" role="radiogroup" aria-label="Sprint duration in minutes">
            {([5, 10, 15, 25] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={selectedMinutes === m}
                onClick={() => handleSelectMinutes(m)}
                className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors ${
                  selectedMinutes === m
                    ? highContrast
                      ? "bg-yellow-400 text-black font-black ring-2 ring-yellow-400"
                      : "bg-indigo-100 text-indigo-900 ring-1 ring-indigo-400"
                    : highContrast
                    ? "bg-zinc-900 text-yellow-200 border border-yellow-400/50 hover:bg-zinc-800"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {m}m
              </button>
            ))}
          </div>
        </div>

        {/* Timer Display & Controls */}
        <div className="flex items-center gap-3">
          <span
            className={`font-mono text-base font-bold tracking-tight ${
              highContrast ? "text-yellow-400" : "text-slate-900"
            }`}
            aria-live="polite"
          >
            {formatTime(secondsRemaining)}
          </span>

          <button
            type="button"
            onClick={handleTogglePlay}
            aria-label={isActive ? "Pause Sprint Timer" : "Start Sprint Timer"}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-colors ${
              highContrast
                ? isActive
                  ? "bg-amber-400 text-black hover:bg-amber-300"
                  : "bg-yellow-400 text-black hover:bg-yellow-300"
                : isActive
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
            }`}
          >
            {isActive ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" /> Pause
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> Start
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleReset}
            title="Reset timer"
            aria-label="Reset timer"
            className={`p-1.5 rounded-md transition-colors ${
              highContrast
                ? "text-yellow-400 hover:bg-zinc-800 hover:text-yellow-300"
                : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Subtle Progress Bar */}
      <div
        className={`mt-2.5 w-full h-1.5 rounded-full overflow-hidden ${
          highContrast ? "bg-zinc-900 border border-yellow-400/40" : "bg-slate-100"
        }`}
      >
        <div
          style={{ width: `${progressPercent}%` }}
          className={`h-full transition-[width] duration-300 ease-out ${
            highContrast ? "bg-yellow-400" : "bg-indigo-500"
          }`}
        />
      </div>

      {/* Completion Toast Notification */}
      {isCompleted && (
        <div
          role="status"
          aria-live="polite"
          className={`mt-2.5 p-2 rounded-lg text-xs flex items-center justify-between animate-in fade-in ${
            highContrast
              ? "bg-zinc-950 border-2 border-yellow-400 text-yellow-300"
              : "bg-emerald-50 border border-emerald-200 text-emerald-900"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <CheckCircle2
              className={`w-4 h-4 shrink-0 ${
                highContrast ? "text-yellow-400" : "text-emerald-600"
              }`}
            />
            <span>
              <strong>Sprint Complete!</strong> Take a quick 2-minute stretch or review your notes.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsCompleted(false)}
            className={`text-[11px] font-semibold ml-2 hover:underline ${
              highContrast ? "text-yellow-400" : "text-emerald-700"
            }`}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
