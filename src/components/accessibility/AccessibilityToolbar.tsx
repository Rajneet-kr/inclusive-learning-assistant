"use client";

import { AccessibilityProfile, AccessibilitySettings, SupportedLanguageCode } from "@/types/api";
import { Eye, BookOpen, Ear, RotateCcw } from "lucide-react";
import { LanguageSelector } from "./LanguageSelector";

interface AccessibilityToolbarProps {
  settings: AccessibilitySettings;
  onProfileChange: (profile: AccessibilityProfile) => void;
  onUpdateSettings: (settings: Partial<AccessibilitySettings>) => void;
  onReset: () => void;
  onLanguageChange?: (lang: SupportedLanguageCode) => void;
  isTranslating?: boolean;
}

export function AccessibilityToolbar({
  settings,
  onProfileChange,
  onUpdateSettings,
  onReset,
  onLanguageChange,
  isTranslating = false,
}: AccessibilityToolbarProps) {
  const currentLang = settings.language || "en";

  const handleLanguageSelect = (lang: SupportedLanguageCode) => {
    if (onLanguageChange) {
      onLanguageChange(lang);
    } else {
      onUpdateSettings({ language: lang });
    }
  };
  return (
    <div
      role="region"
      aria-label="Accessibility Profile Controls"
      className={`rounded-xl p-4 shadow-sm transition-all border ${
        settings.highContrast
          ? "bg-black/95 border-2 border-yellow-400 text-yellow-300"
          : "bg-white/90 backdrop-blur-md border-slate-200/80 text-slate-900"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Profile Selector */}
        <div>
          <span className={`text-xs font-semibold uppercase tracking-wider block mb-2 ${
            settings.highContrast ? "text-yellow-400" : "text-slate-500"
          }`}>
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
                  ? settings.highContrast
                    ? "bg-yellow-400 text-black ring-2 ring-yellow-400 shadow-sm font-black"
                    : "bg-amber-100 text-amber-900 ring-2 ring-amber-500 shadow-sm"
                  : settings.highContrast
                  ? "bg-zinc-900 text-yellow-300 border border-yellow-400/80 hover:bg-zinc-800"
                  : "bg-slate-100/90 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <BookOpen className={`w-4 h-4 ${settings.highContrast && settings.profile !== "dyslexia" ? "text-yellow-400" : "text-amber-600"}`} />
              Dyslexia Mode
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={settings.profile === "low_vision"}
              onClick={() => onProfileChange("low_vision")}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                settings.profile === "low_vision"
                  ? settings.highContrast
                    ? "bg-yellow-400 text-black ring-2 ring-yellow-400 shadow-sm font-black"
                    : "bg-indigo-100 text-indigo-900 ring-2 ring-indigo-500 shadow-sm"
                  : settings.highContrast
                  ? "bg-zinc-900 text-yellow-300 border border-yellow-400/80 hover:bg-zinc-800"
                  : "bg-slate-100/90 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Eye className={`w-4 h-4 ${settings.highContrast && settings.profile !== "low_vision" ? "text-yellow-400" : "text-indigo-600"}`} />
              Low Vision Mode
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={settings.profile === "hearing"}
              onClick={() => onProfileChange("hearing")}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                settings.profile === "hearing"
                  ? settings.highContrast
                    ? "bg-yellow-400 text-black ring-2 ring-yellow-400 shadow-sm font-black"
                    : "bg-emerald-100 text-emerald-900 ring-2 ring-emerald-500 shadow-sm"
                  : settings.highContrast
                  ? "bg-zinc-900 text-yellow-300 border border-yellow-400/80 hover:bg-zinc-800"
                  : "bg-slate-100/90 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Ear className={`w-4 h-4 ${settings.highContrast && settings.profile !== "hearing" ? "text-yellow-400" : "text-emerald-600"}`} />
              Hearing / Captions
            </button>
          </div>
        </div>

        {/* Quick Toggles & Language Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <LanguageSelector
            currentLanguage={currentLang}
            onLanguageChange={handleLanguageSelect}
            isLoading={isTranslating}
            highContrast={settings.highContrast}
          />

          <div className={`h-5 w-px hidden sm:block ${settings.highContrast ? "bg-yellow-400/40" : "bg-slate-200"}`} aria-hidden="true" />

          {settings.profile === "dyslexia" && (
            <label className={`inline-flex items-center gap-2 text-sm cursor-pointer ${settings.highContrast ? "text-yellow-300" : "text-slate-700"}`}>
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
            <label className={`inline-flex items-center gap-2 text-sm cursor-pointer ${settings.highContrast ? "text-yellow-300" : "text-slate-700"}`}>
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
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
              settings.highContrast
                ? "text-yellow-400 hover:text-yellow-200 hover:bg-zinc-800 border border-yellow-400/40"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
