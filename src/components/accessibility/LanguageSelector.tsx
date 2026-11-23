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
}

export function LanguageSelector({
  currentLanguage = "en",
  onLanguageChange,
  isLoading = false,
  className = "",
}: LanguageSelectorProps) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <label
        htmlFor="language-selector"
        className="text-xs font-semibold uppercase tracking-wider text-slate-500 inline-flex items-center gap-1.5"
      >
        <Languages className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
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
          className="appearance-none bg-slate-50 border border-slate-300 text-slate-800 text-xs sm:text-sm font-medium rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-wait"
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.nativeLabel} ({lang.label})
            </option>
          ))}
        </select>

        {isLoading ? (
          <div className="absolute right-2 pointer-events-none text-blue-600">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          </div>
        ) : (
          <div className="absolute right-2.5 pointer-events-none text-slate-400 text-xs">
            ▼
          </div>
        )}
      </div>
    </div>
  );
}
