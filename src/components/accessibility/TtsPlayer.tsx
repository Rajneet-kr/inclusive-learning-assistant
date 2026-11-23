"use client";

import * as React from "react";
import { Volume2, Pause, Play, Square } from "lucide-react";

interface TtsPlayerProps {
  textToSpeak: string;
  rate?: number;
  pitch?: number;
}

export function TtsPlayer({ textToSpeak, rate = 1.0, pitch = 1.0 }: TtsPlayerProps) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);

  const handlePlay = () => {
    if (!("speechSynthesis" in window)) {
      alert("Browser SpeechSynthesis not available in this browser.");
      return;
    }

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = rate;
    utterance.pitch = pitch;

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handlePause = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {!isPlaying ? (
        <button
          type="button"
          onClick={handlePlay}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
        >
          <Play className="w-3.5 h-3.5" /> Listen
        </button>
      ) : (
        <button
          type="button"
          onClick={handlePause}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700"
        >
          <Pause className="w-3.5 h-3.5" /> Pause
        </button>
      )}

      {(isPlaying || isPaused) && (
        <button
          type="button"
          onClick={handleStop}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-300"
        >
          <Square className="w-3.5 h-3.5" /> Stop
        </button>
      )}
    </div>
  );
}
