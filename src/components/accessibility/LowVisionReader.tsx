"use client";

import * as React from "react";
import {
  DocumentChunk,
  AccessibilitySettings,
  FocusSettings,
  DEFAULT_FOCUS_SETTINGS,
  SupportedLanguageCode,
  TranslatedSimplifiedSection,
} from "@/types/api";
import {
  Eye,
  Volume2,
  Square,
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  Gauge,
  Sparkles,
} from "lucide-react";
import { FocusToolbar } from "./FocusToolbar";
import { ReadingRuler } from "./ReadingRuler";
import { LineFocusMask } from "./LineFocusMask";
import { SyllableText } from "./SyllableText";

const BCP47_LANGUAGE_MAP: Record<string, string> = {
  hi: "hi-IN",
  kn: "kn-IN",
  ta: "ta-IN",
  te: "te-IN",
  mr: "mr-IN",
  bn: "bn-IN",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  en: "en-US",
};

interface LowVisionReaderProps {
  chunks: DocumentChunk[];
  settings: AccessibilitySettings;
  onUpdateSettings: (settings: Partial<AccessibilitySettings>) => void;
  translatedSections?: TranslatedSimplifiedSection[] | null;
  language?: SupportedLanguageCode;
}

export function LowVisionReader({
  chunks,
  settings,
  onUpdateSettings,
  translatedSections,
  language,
}: LowVisionReaderProps) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);
  const [speakingChunkIndex, setSpeakingChunkIndex] = React.useState<number | null>(null);
  const [spokenCharIndex, setSpokenCharIndex] = React.useState<number>(0);

  const fallbackTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const boundaryFiredRef = React.useRef<boolean>(false);
  const isPlayingRef = React.useRef<boolean>(false);

  const clearFallbackTimer = React.useCallback(() => {
    if (fallbackTimerRef.current) {
      clearInterval(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  const focus: FocusSettings = {
    ...DEFAULT_FOCUS_SETTINGS,
    ...(settings.focus || {}),
  };

  const handleUpdateFocus = (newFocus: Partial<FocusSettings>) => {
    onUpdateSettings({ focus: { ...focus, ...newFocus } });
  };

  const currentLang = language || settings.language || "en";
  const bcp47Locale = BCP47_LANGUAGE_MAP[currentLang] || "en-US";

  const displayItems = React.useMemo(() => {
    if (translatedSections && translatedSections.length > 0) {
      return translatedSections.map((ts, idx) => ({
        id: ts.chunkId || `chunk_${idx + 1}`,
        heading: ts.title,
        text: ts.simpleText,
        keyIdea: ts.keyIdea,
      }));
    }
    return chunks.map((c, idx) => ({
      id: c.id || `chunk_${idx + 1}`,
      heading: c.heading,
      text: c.text,
      keyIdea: undefined as string | undefined,
    }));
  }, [chunks, translatedSections]);

  const utteranceRef = React.useRef<SpeechSynthesisUtterance | null>(null);

  // Stop synthesis on unmount
  React.useEffect(() => {
    return () => {
      clearFallbackTimer();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [clearFallbackTimer]);

  const speakChunk = (chunkIndex: number, startFromBeginning = false) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Browser SpeechSynthesis not supported.");
      return;
    }

    clearFallbackTimer();
    window.speechSynthesis.cancel();

    if (chunkIndex >= displayItems.length) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      setIsPaused(false);
      setSpeakingChunkIndex(null);
      setSpokenCharIndex(0);
      return;
    }

    const item = displayItems[chunkIndex];
    const textToSpeak = `${item.heading}. ${item.text}`;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = settings.ttsRate || 1.0;
    utterance.pitch = settings.ttsPitch || 1.0;
    utterance.lang = bcp47Locale;

    // Prefer local browser voice matching language for reliable onboundary firing
    const voices = window.speechSynthesis.getVoices();
    let voice = voices.find((v) => v.name === settings.ttsVoice);
    if (!voice) {
      const langPrefix = currentLang.toLowerCase();
      voice =
        voices.find((v) => v.lang.toLowerCase() === bcp47Locale.toLowerCase()) ||
        voices.find((v) => v.lang.toLowerCase().replace(/_/g, "-").startsWith(langPrefix)) ||
        (currentLang === "en"
          ? voices.find((v) => v.localService && v.lang.toLowerCase().startsWith("en")) ||
            voices.find((v) => v.lang.toLowerCase().startsWith("en")) ||
            voices.find((v) => v.localService) ||
            voices[0]
          : voices.find((v) => v.localService) || voices[0]);
    }
    if (voice) {
      utterance.voice = voice;
    }

    // Pre-calculate word offsets in textToSpeak
    const wordOffsets: number[] = [];
    const wordRegex = /\S+/g;
    let matchExec: RegExpExecArray | null;
    while ((matchExec = wordRegex.exec(textToSpeak)) !== null) {
      wordOffsets.push(matchExec.index);
    }

    utterance.onstart = () => {
      setIsPlaying(true);
      isPlayingRef.current = true;
      setIsPaused(false);
      setSpeakingChunkIndex(chunkIndex);
      setSpokenCharIndex(0);
      boundaryFiredRef.current = false;
      clearFallbackTimer();

      // Check after 400ms if onboundary fired; if not, advance smoothly via calibrated timer
      setTimeout(() => {
        if (!boundaryFiredRef.current && isPlayingRef.current) {
          let wordIdx = 0;
          const rate = settings.ttsRate || 1.0;
          const intervalMs = Math.max(160, Math.round(360 / rate));

          clearFallbackTimer();
          fallbackTimerRef.current = setInterval(() => {
            if (boundaryFiredRef.current) {
              clearFallbackTimer();
              return;
            }
            wordIdx++;
            if (wordIdx < wordOffsets.length) {
              setSpokenCharIndex(wordOffsets[wordIdx]);
            } else {
              clearFallbackTimer();
            }
          }, intervalMs);
        }
      }, 400);
    };

    utterance.onboundary = (event) => {
      boundaryFiredRef.current = true;
      clearFallbackTimer();
      if (event.name === "word" || event.name === "sentence") {
        setSpokenCharIndex(event.charIndex);
      }
    };

    utterance.onend = () => {
      clearFallbackTimer();
      // If reading through all chunks, continue to next chunk
      if (startFromBeginning && chunkIndex + 1 < displayItems.length) {
        speakChunk(chunkIndex + 1, true);
      } else {
        setIsPlaying(false);
        isPlayingRef.current = false;
        setIsPaused(false);
        setSpeakingChunkIndex(null);
        setSpokenCharIndex(0);
      }
    };

    utterance.onerror = () => {
      clearFallbackTimer();
      setIsPlaying(false);
      isPlayingRef.current = false;
      setIsPaused(false);
      setSpeakingChunkIndex(null);
      setSpokenCharIndex(0);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const handlePlayAll = () => {
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      isPlayingRef.current = true;
    } else {
      speakChunk(0, true);
    }
  };

  const handlePause = () => {
    clearFallbackTimer();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsPlaying(false);
      isPlayingRef.current = false;
    }
  };

  const handleStop = () => {
    clearFallbackTimer();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      isPlayingRef.current = false;
      setIsPaused(false);
      setSpeakingChunkIndex(null);
      setSpokenCharIndex(0);
    }
  };

  const setSpeed = (rate: number) => {
    onUpdateSettings({ ttsRate: rate });
    // If currently speaking, restart current chunk with new rate
    if ((isPlaying || isPaused) && speakingChunkIndex !== null) {
      speakChunk(speakingChunkIndex, false);
    }
  };

  // Render text with word-level or sentence-level highlighting
  const renderHighlightedText = (text: string, isChunkActive: boolean) => {
    if (!isChunkActive) {
      if (focus.syllableBreakdown) {
        return <SyllableText text={text} enabled={true} />;
      }
      return <span>{text}</span>;
    }

    // Split text into words and highlight word near spokenCharIndex
    const before = text.slice(0, spokenCharIndex);
    const after = text.slice(spokenCharIndex);
    const match = after.match(/^\S+/);
    const activeWord = match ? match[0] : "";
    const remaining = match ? after.slice(activeWord.length) : after;

    const renderTextContent = (str: string) => {
      if (focus.syllableBreakdown) {
        return <SyllableText text={str} enabled={true} />;
      }
      return str;
    };

    return (
      <span>
        <span className="opacity-75">{renderTextContent(before)}</span>
        {activeWord ? (
          <mark
            className={`px-1.5 py-0.5 rounded font-black tracking-wide inline-block ${
              settings.highContrast
                ? "bg-yellow-400 text-black ring-4 ring-yellow-400"
                : "bg-blue-600 text-white ring-4 ring-blue-500"
            }`}
          >
            {renderTextContent(activeWord)}
          </mark>
        ) : null}
        <span>{renderTextContent(remaining)}</span>
      </span>
    );
  };

  return (
    <div
      className={`rounded-2xl p-6 transition-all ${
        settings.highContrast
          ? "bg-black/95 text-yellow-300 border-2 border-yellow-400 shadow-xl"
          : "bg-white/95 backdrop-blur-md text-slate-900 border border-slate-200 shadow-sm"
      }`}
      style={{
        fontSize: `${settings.fontSize}px`,
        lineHeight: settings.lineSpacing,
      }}
    >
      {/* Top Header & Global TTS Bar */}
      <div className="flex flex-wrap items-center justify-between pb-6 border-b-2 border-current mb-8 gap-4">
        <div className="flex items-center gap-3">
          <Eye className="w-7 h-7" />
          <div>
            <h2 className="text-2xl font-black tracking-tight">
              Low-Vision High-Contrast Reader
            </h2>
            <p className="text-xs opacity-80 mt-0.5">
              Reflowable layout &bull; Active Word TTS &bull; WCAG AAA Zoom
            </p>
          </div>
        </div>

        {/* Global TTS Controls with Play, Pause, Stop + Speed */}
        <div
          role="region"
          aria-label="Speech Controls"
          className={`flex flex-wrap items-center gap-2 p-2 rounded-xl border-2 border-current ${
            settings.highContrast ? "bg-zinc-950" : "bg-slate-50"
          }`}
        >
          {!isPlaying && !isPaused ? (
            <button
              type="button"
              onClick={handlePlayAll}
              className={`px-4 py-2 rounded-lg font-black text-sm flex items-center gap-2 transition-transform active:scale-95 ${
                settings.highContrast
                  ? "bg-yellow-400 text-black hover:bg-yellow-300"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              <Play className="w-4 h-4 fill-current" /> Read All
            </button>
          ) : isPlaying ? (
            <button
              type="button"
              onClick={handlePause}
              className="px-4 py-2 rounded-lg font-black text-sm flex items-center gap-2 bg-amber-500 text-black hover:bg-amber-400"
            >
              <Pause className="w-4 h-4 fill-current" /> Pause
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePlayAll}
              className="px-4 py-2 rounded-lg font-black text-sm flex items-center gap-2 bg-emerald-500 text-black hover:bg-emerald-400"
            >
              <Play className="w-4 h-4 fill-current" /> Resume
            </button>
          )}

          {(isPlaying || isPaused) && (
            <button
              type="button"
              onClick={handleStop}
              className="px-3.5 py-2 rounded-lg font-black text-sm flex items-center gap-1.5 bg-red-600 text-white hover:bg-red-700"
            >
              <Square className="w-4 h-4 fill-current" /> Stop
            </button>
          )}

          {/* Speed Selector */}
          <div className="flex items-center gap-1 pl-2 border-l border-current">
            <Gauge className="w-4 h-4 opacity-70" />
            <span className="text-xs font-bold mr-1">Speed:</span>
            {[0.75, 1.0, 1.25, 1.5].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => setSpeed(rate)}
                className={`px-2 py-1 rounded text-xs font-black transition-colors ${
                  settings.ttsRate === rate
                    ? settings.highContrast
                      ? "bg-yellow-400 text-black ring-2 ring-yellow-400"
                      : "bg-blue-600 text-white"
                    : "border border-current opacity-70 hover:opacity-100"
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Zoom Buttons */}
          <div className="flex items-center gap-1 pl-2 border-l border-current">
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({ fontSize: Math.max(16, settings.fontSize - 2) })
              }
              className="p-1.5 rounded border border-current font-bold hover:opacity-80"
              title="Decrease text size"
              aria-label="Decrease font size"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs px-1 font-bold">
              {settings.fontSize}px
            </span>
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({ fontSize: Math.min(36, settings.fontSize + 2) })
              }
              className="p-1.5 rounded border border-current font-bold hover:opacity-80"
              title="Increase text size"
              aria-label="Increase font size"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Overlays for Ruler and Line Focus */}
      {focus.mode === "ruler" && (
        <ReadingRuler
          heightPx={focus.rulerHeightPx}
          opacity={focus.rulerOpacity}
          enabled={true}
        />
      )}

      {focus.mode === "line_focus" && (
        <LineFocusMask
          visibleLines={focus.visibleLines}
          enabled={true}
        />
      )}

      {/* Embedded Focus Toolbar for Low Vision Reader */}
      <div className="mb-8">
        <FocusToolbar
          focus={focus}
          onUpdateFocus={handleUpdateFocus}
          highContrast={settings.highContrast}
        />
      </div>

      {/* Sections Display with Active Highlighting */}
      <div className="space-y-8">
        {displayItems.map((item, idx) => {
          const isChunkActive = (isPlaying || isPaused) && speakingChunkIndex === idx;
          const chunkIdentifier = item.id || `chunk_${idx + 1}`;

          return (
            <article
              key={chunkIdentifier}
              id={`chunk-${chunkIdentifier}`}
              data-chunk-id={chunkIdentifier}
              className={`p-6 rounded-2xl border-2 transition-all ${
                isChunkActive
                  ? settings.highContrast
                    ? "border-yellow-400 bg-zinc-950 shadow-2xl ring-4 ring-yellow-400/30"
                    : "border-blue-600 bg-blue-50/70 shadow-lg ring-4 ring-blue-500/20"
                  : settings.highContrast
                    ? "border-current bg-transparent"
                    : "border-slate-200 bg-white/95 backdrop-blur-sm"
              } target:ring-4 target:ring-yellow-400`}
            >
              <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase px-2 py-0.5 rounded border border-current font-bold">
                    Section {idx + 1}
                  </span>
                  <h3 className="font-black text-2xl tracking-wide">
                    {item.heading}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => speakChunk(idx, false)}
                  className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 border-2 border-current transition-all ${
                    isChunkActive
                      ? "bg-yellow-400 text-black border-yellow-400 font-black shadow-sm"
                      : "hover:opacity-80"
                  }`}
                  aria-label={`Read section ${idx + 1}: ${item.heading}`}
                >
                  <Volume2 className="w-4 h-4" />
                  {isChunkActive ? "Reading Now..." : "Read This Section"}
                </button>
              </div>

              {item.keyIdea && (
                <div
                  className={`mb-4 px-3.5 py-2 rounded-lg border-l-4 ${
                    settings.highContrast
                      ? "border-yellow-400 bg-zinc-900 text-yellow-200"
                      : "border-amber-500 bg-amber-50/80 text-amber-950"
                  }`}
                >
                  <p className="text-sm font-semibold">
                    📌 Key Idea: {item.keyIdea}
                  </p>
                </div>
              )}

              <div className="font-medium tracking-wide">
                {renderHighlightedText(item.text, isChunkActive)}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
