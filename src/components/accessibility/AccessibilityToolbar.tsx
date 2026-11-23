"use client";

import { AccessibilityProfile, AccessibilitySettings } from "@/types/api";
import { Eye, BookOpen, Ear, RotateCcw } from "lucide-react";

interface AccessibilityToolbarProps {
  settings: AccessibilitySettings;
  onProfileChange: (profile: AccessibilityProfile) => void;
  onUpdateSettings: (settings: Partial<AccessibilitySettings>) => void;
  onReset: () => void;
}

export function AccessibilityToolbar({
  settings,
  onProfileChange,
  onUpdateSettings,
  onReset,
}: AccessibilityToolbarProps) {
  return (
    <div
      role="region"
      aria-label="Accessibility Profile Controls"
      className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Profile Selector */}
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-2">
            Target Accessibility Profile:
          </span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Accessibility Profiles">
            <button
              type="button"
              role="radio"
              aria-checked={settings.profile === "dyslexia"}
              onClick={() => onProfileChange("dyslexia")}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                settings.profile === "dyslexia"
                  ? "bg-amber-100 text-amber-900 ring-2 ring-amber-500 shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <BookOpen className="w-4 h-4 text-amber-600" />
              Dyslexia Mode
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={settings.profile === "low_vision"}
              onClick={() => onProfileChange("low_vision")}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                settings.profile === "low_vision"
                  ? "bg-indigo-100 text-indigo-900 ring-2 ring-indigo-500 shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Eye className="w-4 h-4 text-indigo-600" />
              Low Vision Mode
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={settings.profile === "hearing"}
              onClick={() => onProfileChange("hearing")}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                settings.profile === "hearing"
                  ? "bg-emerald-100 text-emerald-900 ring-2 ring-emerald-500 shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Ear className="w-4 h-4 text-emerald-600" />
              Hearing / Captions
            </button>
          </div>
        </div>

        {/* Quick Toggles */}
        <div className="flex items-center gap-3">
          {settings.profile === "dyslexia" && (
            <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.bionicReading}
                onChange={(e) => onUpdateSettings({ bionicReading: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="font-medium">Bionic Reading</span>
            </label>
          )}

          {settings.profile === "low_vision" && (
            <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.highContrast}
                onChange={(e) => onUpdateSettings({ highContrast: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="font-medium">High Contrast</span>
            </label>
          )}

          <button
            type="button"
            onClick={onReset}
            title="Reset preferences to default"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-100 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
