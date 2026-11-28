
"use client";

import * as React from "react";
import { ImStuckAssistant } from "./ImStuckAssistant";

import {
  SimplifiedSection,
  TranslatedSimplifiedSection,
  AccessibilitySettings,
  SupportedLanguageCode,
  TextDirection,
  FocusSettings,
  DEFAULT_FOCUS_SETTINGS,
} from "@/types/api";

import {
  BookOpen,
  HelpCircle,
  Volume2,
  Globe,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

import {
  getLanguageOption,
  getTextDirection,
  checkBrowserTtsVoiceAvailable,
} from "@/lib/i18n";

import { FocusToolbar } from "./FocusToolbar";
import { ReadingRuler } from "./ReadingRuler";
import { LineFocusMask } from "./LineFocusMask";
import { SyllableText } from "./SyllableText";

type AnySection = SimplifiedSection | TranslatedSimplifiedSection;

interface DyslexiaReaderProps {
  sections: AnySection[];
  documentId: string;
  settings: AccessibilitySettings;
  language?: SupportedLanguageCode;
  direction?: TextDirection;
  onUpdateSettings?: (settings: Partial<AccessibilitySettings>) => void;
  translationFallbackUsed?: boolean;
  onRetryTranslation?: () => void;
  isTranslating?: boolean;
  convertingSectionIndex?: number | null;
}

// Client-side Bionic Reading helper
function renderBionicText(text: string) {
  const words = text.split(" ");

  return words.map((word, wIdx) => {
    if (word.length <= 3) {
      const splitAt = Math.ceil(word.length / 2);

      return (
        <span key={wIdx}>
          <strong className="font-extrabold">
            {word.slice(0, splitAt)}
          </strong>
          {word.slice(splitAt)}{" "}
        </span>
      );
    }

    const splitAt = Math.ceil(word.length * 0.45);

    return (
      <span key={wIdx}>
        <strong className="font-extrabold">
          {word.slice(0, splitAt)}
        </strong>
        {word.slice(splitAt)}{" "}
      </span>
    );
  });
}

export function DyslexiaReader({
  sections,
  documentId,
  settings,
  language = "en",
  direction,
  onUpdateSettings,
  translationFallbackUsed = false,
  onRetryTranslation,
  isTranslating = false,
  convertingSectionIndex = null,
}: DyslexiaReaderProps) {
  const currentLang = language || settings.language || "en";
  const currentDir = direction || getTextDirection(currentLang);
  const langOption = getLanguageOption(currentLang);

  const focus: FocusSettings = {
    ...DEFAULT_FOCUS_SETTINGS,
    ...(settings.focus || {}),
  };

  // I'm Stuck assistant state
  const [selectedText, setSelectedText] = React.useState("");
  const [selectedContext, setSelectedContext] = React.useState("");
  const [selectedSectionId, setSelectedSectionId] = React.useState("");
  const [isAssistantOpen, setIsAssistantOpen] = React.useState(false);

  // Capture the student's selected text
  const handleTextSelection = (
    contextText: string,
    sectionId: string
  ) => {
    const selection = window.getSelection()?.toString().trim();

    if (!selection) {
      return;
    }

    setSelectedText(selection);
    setSelectedContext(contextText);
    setSelectedSectionId(sectionId);
    setIsAssistantOpen(false);
  };

  const closeStuckAssistant = () => {
    setSelectedText("");
    setSelectedContext("");
    setSelectedSectionId("");
    setIsAssistantOpen(false);
    window.getSelection()?.removeAllRanges();
  };

  const handleUpdateFocus = (newFocus: Partial<FocusSettings>) => {
    if (onUpdateSettings) {
      onUpdateSettings({
        focus: { ...focus, ...newFocus },
      });
    }
  };

  // Check if browser has speech synthesis voice for this language
  const [hasTtsVoice, setHasTtsVoice] = React.useState(true);

  React.useEffect(() => {
    if (currentLang === "en") {
      setHasTtsVoice(true);
      return;
    }

    const checkVoice = () => {
      const available = checkBrowserTtsVoiceAvailable(currentLang);
      setHasTtsVoice(available);
    };

    checkVoice();

    if (
      typeof window !== "undefined" &&
      "speechSynthesis" in window
    ) {
      window.speechSynthesis.onvoiceschanged = checkVoice;
    }

    return () => {
      if (
        typeof window !== "undefined" &&
        "speechSynthesis" in window
      ) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [currentLang]);

  const overlayClass = {
    none: "bg-white/90 backdrop-blur-md",
    cream: "overlay-cream backdrop-blur-md",
    yellow: "overlay-yellow backdrop-blur-md",
    blue: "overlay-blue backdrop-blur-md",
    peach: "overlay-peach backdrop-blur-md",
    green: "overlay-green backdrop-blur-md",
  }[settings.colorOverlay || "cream"];

  return (
    <div
      dir={currentDir}
      className={`rounded-2xl p-6 transition-colors shadow-sm border border-black/10 ${overlayClass}`}
      style={{
        fontFamily:
          settings.fontFamily === "opendyslexic"
            ? "OpenDyslexic, sans-serif"
            : "inherit",
        fontSize: `${settings.fontSize}px`,
        lineHeight: settings.lineSpacing,
        letterSpacing: `${settings.letterSpacing}em`,
      }}
    >
      <div className="flex flex-wrap items-center justify-between pb-4 border-b border-black/10 mb-6 gap-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-700" />

          <h2 className="text-xl font-bold tracking-tight text-amber-950">
            Dyslexia-Optimized Reading View
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {currentLang !== "en" && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 font-semibold inline-flex items-center gap-1">
              <Globe className="w-3 h-3 text-blue-600" />
              {langOption.nativeLabel} ({langOption.label})
            </span>
          )}

          <span className="text-xs px-2.5 py-1 rounded-full bg-amber-200/60 font-semibold text-amber-900">
            OpenDyslexic &bull; Short Chunks &bull; Calming Pastel
          </span>
        </div>
      </div>

      {/* Translation fallback notice */}
      {translationFallbackUsed && currentLang !== "en" && (
        <div
          role="status"
          aria-live="polite"
          className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex flex-wrap items-center justify-between gap-3 shadow-xs animate-in fade-in"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />

            <span>
              <strong>
                Live translation server is currently busy.
              </strong>{" "}
              Showing English fallback.
            </span>
          </div>

          {onRetryTranslation && (
            <button
              type="button"
              onClick={onRetryTranslation}
              disabled={isTranslating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isTranslating ? "animate-spin" : ""
                }`}
              />

              {isTranslating ? "Retrying..." : "Retry Translation"}
            </button>
          )}
        </div>
      )}

      {/* Multilingual Read Aloud notice */}
      {!hasTtsVoice && currentLang !== "en" && (
        <div
          role="status"
          aria-live="polite"
          className="mb-5 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-2"
        >
          <Volume2 className="w-4 h-4 text-blue-600 shrink-0" />

          <span>
            <strong>Multilingual Read Aloud Enabled:</strong>{" "}
            Full spoken audio for{" "}
            <strong>
              {langOption.nativeLabel} ({langOption.label})
            </strong>{" "}
            is available in the{" "}
            <strong>Low-Vision Reader</strong> tab with active
            sentence highlighting.
          </span>
        </div>
      )}

      {/* Reading ruler */}
      {focus.mode === "ruler" && (
        <ReadingRuler
          heightPx={focus.rulerHeightPx}
          opacity={focus.rulerOpacity}
          enabled={true}
        />
      )}

      {/* Line focus */}
      {focus.mode === "line_focus" && (
        <LineFocusMask
          visibleLines={focus.visibleLines}
          enabled={true}
        />
      )}

      {/* Focus toolbar */}
      <div className="mb-6">
        <FocusToolbar
          focus={focus}
          onUpdateFocus={handleUpdateFocus}
          highContrast={settings.highContrast}
        />
      </div>

      {/* Reading sections */}
      <div className="space-y-6">
        {sections.map((section, idx) => {
          const chunkIdentifier =
            section.chunkId || `chunk_${idx + 1}`;

          return (
            <article
              key={chunkIdentifier}
              id={`chunk-${chunkIdentifier}`}
              data-chunk-id={chunkIdentifier}
              className="p-5 rounded-xl border border-black/10 bg-white/95 backdrop-blur-sm shadow-sm transition-all target:ring-4 target:ring-amber-500 target:bg-amber-50"
            >
              <div className="flex items-center justify-between mb-3 gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-slate-900">
                    {section.title}
                  </h3>

                  {convertingSectionIndex === idx && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300 animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Converting...
                    </span>
                  )}
                </div>

                <span className="text-xs font-medium text-slate-500">
                  ~{section.readingTimeSeconds}s read
                </span>
              </div>

              {/* Key Idea */}
              <div className="mb-3 px-3.5 py-2 rounded-lg bg-amber-100/80 border-l-4 border-amber-600">
                <p className="text-sm font-semibold text-amber-950">
                  📌 Key Idea:{" "}
                  {focus.syllableBreakdown ? (
                    <SyllableText
                      text={section.keyIdea}
                      enabled={true}
                    />
                  ) : (
                    section.keyIdea
                  )}
                </p>
              </div>

              {/* Main Simplified Text with sentence selection */}
              <div
                className="text-slate-800"
                onMouseUp={() =>
                  handleTextSelection(
                    section.simpleText,
                    chunkIdentifier
                  )
                }
                onTouchEnd={() =>
                  handleTextSelection(
                    section.simpleText,
                    chunkIdentifier
                  )
                }
              >
                {focus.syllableBreakdown ? (
                  <SyllableText
                    text={section.simpleText}
                    enabled={true}
                  />
                ) : settings.bionicReading ? (
                  renderBionicText(section.simpleText)
                ) : (
                  <p>{section.simpleText}</p>
                )}
              </div>

              {/* I'm Stuck button */}
              {selectedText &&
                selectedSectionId === chunkIdentifier && (
                  <div className="mt-4">
                    {!isAssistantOpen && (
                      <button
                        type="button"
                        onClick={() => setIsAssistantOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
                      >
                        <HelpCircle className="w-4 h-4" />
                        I'm Stuck
                      </button>
                    )}

                    {isAssistantOpen && (
                      <div className="mt-4">
                        <ImStuckAssistant
                          documentId={documentId}
                          selectedText={selectedText}
                          contextText={selectedContext}
                          language={currentLang}
                          accessibilityProfile={settings.profile}
                          onClose={closeStuckAssistant}
                        />
                      </div>
                    )}
                  </div>
                )}

              {/* Plain-Language Jargon Glossary */}
              {section.jargon && section.jargon.length > 0 && (
                <div className="mt-4 pt-3 border-t border-black/10">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-2">
                    Friendly Word Explanations:
                  </span>

                  <div className="flex flex-wrap gap-2">
                    {section.jargon.map((j, jIdx) => {
                      const original = (
                        "originalTerm" in j
                          ? j.originalTerm
                          : undefined
                      )?.trim();

                      const showOriginal = Boolean(
                        original &&
                          original.length > 0 &&
                          !j.term
                            .toLowerCase()
                            .includes(original.toLowerCase())
                      );

                      return (
                        <span
                          key={jIdx}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white border border-slate-300 text-xs text-slate-800"
                        >
                          <HelpCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />

                          <span>
                            <strong>
                              {j.term}
                              {showOriginal
                                ? ` (${original})`
                                : ""}
                              :
                            </strong>{" "}
                            {j.plainMeaning}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
