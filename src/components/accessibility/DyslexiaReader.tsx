"use client";

import * as React from "react";
import { SimplifiedSection, AccessibilitySettings } from "@/types/api";
import { BookOpen, HelpCircle } from "lucide-react";

interface DyslexiaReaderProps {
  sections: SimplifiedSection[];
  settings: AccessibilitySettings;
}

// Client-side Bionic Reading helper: bold the first 40-50% of each word
function renderBionicText(text: string) {
  const words = text.split(" ");
  return words.map((word, wIdx) => {
    if (word.length <= 3) {
      const splitAt = Math.ceil(word.length / 2);
      return (
        <span key={wIdx}>
          <strong className="font-extrabold">{word.slice(0, splitAt)}</strong>
          {word.slice(splitAt)}{" "}
        </span>
      );
    }
    const splitAt = Math.ceil(word.length * 0.45);
    return (
      <span key={wIdx}>
        <strong className="font-extrabold">{word.slice(0, splitAt)}</strong>
        {word.slice(splitAt)}{" "}
      </span>
    );
  });
}

export function DyslexiaReader({ sections, settings }: DyslexiaReaderProps) {
  const overlayClass = {
    none: "bg-white",
    cream: "overlay-cream",
    yellow: "overlay-yellow",
    blue: "overlay-blue",
    peach: "overlay-peach",
    green: "overlay-green",
  }[settings.colorOverlay || "cream"];

  return (
    <div
      className={`rounded-2xl p-6 transition-colors ${overlayClass}`}
      style={{
        fontFamily: settings.fontFamily === "opendyslexic" ? "OpenDyslexic, sans-serif" : "inherit",
        fontSize: `${settings.fontSize}px`,
        lineHeight: settings.lineSpacing,
        letterSpacing: `${settings.letterSpacing}em`,
      }}
    >
      <div className="flex items-center justify-between pb-4 border-b border-black/10 mb-6">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-700" />
          <h2 className="text-xl font-bold tracking-tight text-amber-950">
            Dyslexia-Optimized Reading View
          </h2>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-amber-200/60 font-semibold text-amber-900">
          OpenDyslexic &bull; Short Chunks &bull; Calming Pastel
        </span>
      </div>

      <div className="space-y-6">
        {sections.map((section, idx) => (
          <article
            key={section.chunkId || idx}
            className="p-5 rounded-xl border border-black/10 bg-white/70 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg text-slate-900">{section.title}</h3>
              <span className="text-xs font-medium text-slate-500">
                ~{section.readingTimeSeconds}s read
              </span>
            </div>

            {/* Key Idea Callout */}
            <div className="mb-3 px-3.5 py-2 rounded-lg bg-amber-100/80 border-l-4 border-amber-600">
              <p className="text-sm font-semibold text-amber-950">
                📌 Key Idea: {section.keyIdea}
              </p>
            </div>

            {/* Main Simplified Text */}
            <div className="text-slate-800">
              {settings.bionicReading
                ? renderBionicText(section.simpleText)
                : section.simpleText}
            </div>

            {/* Plain-Language Jargon Glossary */}
            {section.jargon && section.jargon.length > 0 && (
              <div className="mt-4 pt-3 border-t border-black/10">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-2">
                  Friendly Word Explanations:
                </span>
                <div className="flex flex-wrap gap-2">
                  {section.jargon.map((j, jIdx) => (
                    <span
                      key={jIdx}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white border border-slate-300 text-xs text-slate-800"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                      <strong>{j.term}:</strong> {j.plainMeaning}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
