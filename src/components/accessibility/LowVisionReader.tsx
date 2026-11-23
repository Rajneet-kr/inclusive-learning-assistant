"use client";

import * as React from "react";
import { DocumentChunk, AccessibilitySettings } from "@/types/api";
import { Eye, Volume2, Square, ZoomIn, ZoomOut } from "lucide-react";

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
  const [speakingChunkIndex, setSpeakingChunkIndex] = React.useState<number | null>(null);

  const speakText = (text: string, chunkIndex: number) => {
    if (!("speechSynthesis" in window)) {
      alert("Browser SpeechSynthesis not supported.");
      return;
    }
    window.speechSynthesis.cancel();

    if (isPlaying && speakingChunkIndex === chunkIndex) {
      setIsPlaying(false);
      setSpeakingChunkIndex(null);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = settings.ttsRate || 1.0;
    utterance.pitch = settings.ttsPitch || 1.0;

    utterance.onstart = () => {
      setIsPlaying(true);
      setSpeakingChunkIndex(chunkIndex);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setSpeakingChunkIndex(null);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setSpeakingChunkIndex(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setSpeakingChunkIndex(null);
    }
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
      <div className="flex flex-wrap items-center justify-between pb-4 border-b border-current mb-6 gap-3">
        <div className="flex items-center gap-2">
          <Eye className="w-6 h-6" />
          <h2 className="text-2xl font-black tracking-tight">
            Low-Vision High-Contrast Reader
          </h2>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              onUpdateSettings({ fontSize: Math.max(16, settings.fontSize - 2) })
            }
            className="p-2 rounded border border-current font-bold hover:opacity-80"
            title="Decrease font size"
            aria-label="Decrease font size"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="font-mono text-sm px-2 font-bold">
            {settings.fontSize}px
          </span>
          <button
            type="button"
            onClick={() =>
              onUpdateSettings({ fontSize: Math.min(36, settings.fontSize + 2) })
            }
            className="p-2 rounded border border-current font-bold hover:opacity-80"
            title="Increase font size"
            aria-label="Increase font size"
          >
            <ZoomIn className="w-5 h-5" />
          </button>

          {isPlaying && (
            <button
              type="button"
              onClick={stopSpeaking}
              className="px-3 py-1.5 rounded border border-current flex items-center gap-1 font-bold bg-red-600 text-white"
            >
              <Square className="w-4 h-4" /> Stop TTS
            </button>
          )}
        </div>
      </div>

      <div className="space-y-8">
        {chunks.map((chunk, idx) => {
          const isChunkActive = isPlaying && speakingChunkIndex === idx;

          return (
            <article
              key={chunk.id || idx}
              className={`p-6 rounded-xl border-2 transition-all ${
                isChunkActive
                  ? settings.highContrast
                    ? "border-cyan-300 bg-zinc-900"
                    : "border-blue-600 bg-blue-50/50"
                  : "border-current bg-transparent"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-2xl tracking-wide">
                  {chunk.heading}
                </h3>
                <button
                  type="button"
                  onClick={() => speakText(chunk.text, idx)}
                  className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 border-2 border-current transition-colors ${
                    isChunkActive
                      ? "bg-yellow-400 text-black border-yellow-400"
                      : "hover:opacity-80"
                  }`}
                  aria-label={`Listen to ${chunk.heading}`}
                >
                  <Volume2 className="w-5 h-5" />
                  {isChunkActive ? "Reading Now..." : "Read Aloud"}
                </button>
              </div>

              <p className="font-medium tracking-wide">{chunk.text}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
