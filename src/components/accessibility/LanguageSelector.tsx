"use client";

import React from "react";
import { SupportedLanguageCode } from "@/types/api";
import { SUPPORTED_LANGUAGES } from "@/lib/i18n";
import { Languages, Loader2 } from "lucide-react";

interface LanguageSelectorProps {
  currentLanguage: SupportedLanguageCode;
  onLanguageChange: (lang: SupportedLanguageCode) => void;
  isLoading?: boolean;
  className?: string;
  highContrast?: boolean;
}

export function LanguageSelector({
  currentLanguage = "en",
  onLanguageChange,
  isLoading = false,
  className = "",
  highContrast = false,
}: LanguageSelectorProps) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <label
        htmlFor="language-selector"
        className={`text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-1.5 ${
          highContrast ? "text-yellow-400" : "text-slate-500"
        }`}
      >
        <Languages className={`w-3.5 h-3.5 ${highContrast ? "text-yellow-400" : "text-blue-600"}`} aria-hidden="true" />
        <span>Language:</span>
      </label>

      <div className="relative inline-flex items-center">
        <select
          id="language-selector"
          aria-label="Select study language"
          value={currentLanguage}
          disabled={isLoading}
          onChange={(e) =>
            onLanguageChange(e.target.value as SupportedLanguageCode)
          }
          className={`appearance-none text-xs sm:text-sm font-medium rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-wait transition-colors ${
            highContrast
              ? "bg-zinc-950 border border-yellow-400 text-yellow-300"
              : "bg-white/90 backdrop-blur-sm border border-slate-300/80 text-slate-800 hover:bg-white"
          }`}
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option
              key={lang.code}
              value={lang.code}
              className={highContrast ? "bg-black text-yellow-300" : "bg-white text-slate-900"}
            >
              {lang.nativeLabel} ({lang.label})
            </option>
          ))}
        </select>

        {isLoading ? (
          <div className={`absolute right-2 pointer-events-none ${highContrast ? "text-yellow-400" : "text-blue-600"}`}>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          </div>
        ) : (
          <div className={`absolute right-2.5 pointer-events-none text-xs ${highContrast ? "text-yellow-400" : "text-slate-400"}`}>
            ▼
          </div>
        )}
      </div>
    </div>
  );
}
