"use client";

import * as React from "react";
import { DocumentChunk, AccessibilitySettings, FocusSettings, DEFAULT_FOCUS_SETTINGS } from "@/types/api";
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

interface LowVisionReaderProps {
  chunks: DocumentChunk[];
  settings: AccessibilitySettings;
  onUpdateSettings: (settings: Partial<AccessibilitySettings>) => void;
}

export function LowVisionReader({
  chunks,
  settings,
  onUpdateSettings,
}: LowVisionReaderProps) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);
  const [speakingChunkIndex, setSpeakingChunkIndex] = React.useState<number | null>(null);
  const [spokenCharIndex, setSpokenCharIndex] = React.useState<number>(0);

  const focus: FocusSettings = {
    ...DEFAULT_FOCUS_SETTINGS,
    ...(settings.focus || {}),
  };

  const handleUpdateFocus = (newFocus: Partial<FocusSettings>) => {
    onUpdateSettings({ focus: { ...focus, ...newFocus } });
  };

  const utteranceRef = React.useRef<SpeechSynthesisUtterance | null>(null);

  // Stop synthesis on unmount
  React.useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speakChunk = (chunkIndex: number, startFromBeginning = false) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Browser SpeechSynthesis not supported.");
      return;
    }

    window.speechSynthesis.cancel();

    if (chunkIndex >= chunks.length) {
      setIsPlaying(false);
      setIsPaused(false);
      setSpeakingChunkIndex(null);
      setSpokenCharIndex(0);
      return;
    }

    const chunk = chunks[chunkIndex];
    const textToSpeak = `${chunk.heading}. ${chunk.text}`;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = settings.ttsRate || 1.0;
    utterance.pitch = settings.ttsPitch || 1.0;

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
      setSpeakingChunkIndex(chunkIndex);
      setSpokenCharIndex(0);
    };

    utterance.onboundary = (event) => {
      if (event.name === "word" || event.name === "sentence") {
        setSpokenCharIndex(event.charIndex);
      }
    };

    utterance.onend = () => {
      // If reading through all chunks, continue to next chunk
      if (startFromBeginning && chunkIndex + 1 < chunks.length) {
        speakChunk(chunkIndex + 1, true);
      } else {
        setIsPlaying(false);
        setIsPaused(false);
        setSpeakingChunkIndex(null);
        setSpokenCharIndex(0);
      }
    };

    utterance.onerror = () => {
      setIsPlaying(false);
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
    } else {
      speakChunk(0, true);
    }
  };

  const handlePause = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
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
    if (!isChunkActive || spokenCharIndex <= 0) {
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

    return (
      <span>
        <span className="opacity-75">{before}</span>
        <mark
          className={`px-1 rounded font-black tracking-wide ${
            settings.highContrast
              ? "bg-yellow-400 text-black ring-4 ring-yellow-400"
              : "bg-blue-600 text-white ring-4 ring-blue-500"
          }`}
        >
          {activeWord}
        </mark>
        <span>{remaining}</span>
      </span>
    );
  };

  return (
    <div
      className={`rounded-2xl p-6 transition-all ${
        settings.highContrast
          ? "bg-black text-yellow-300 border-2 border-yellow-300"
          : "bg-white text-slate-900 border border-slate-200"
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
        />
      </div>

      {/* Chunks Display with Active Highlighting */}
      <div className="space-y-8">
        {chunks.map((chunk, idx) => {
          const isChunkActive = (isPlaying || isPaused) && speakingChunkIndex === idx;

          return (
            <article
              key={chunk.id || idx}
              className={`p-6 rounded-2xl border-2 transition-all ${
                isChunkActive
                  ? settings.highContrast
                    ? "border-yellow-400 bg-zinc-950 shadow-2xl ring-4 ring-yellow-400/30"
                    : "border-blue-600 bg-blue-50/70 shadow-lg ring-4 ring-blue-500/20"
                  : "border-current bg-transparent"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase px-2 py-0.5 rounded border border-current font-bold">
                    Chunk {idx + 1}
                  </span>
                  <h3 className="font-black text-2xl tracking-wide">
                    {chunk.heading}
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
                  aria-label={`Read chunk ${idx + 1}: ${chunk.heading}`}
                >
                  <Volume2 className="w-4 h-4" />
                  {isChunkActive ? "Reading Now..." : "Read This Section"}
                </button>
              </div>

              <div className="font-medium tracking-wide">
                {renderHighlightedText(chunk.text, isChunkActive)}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
