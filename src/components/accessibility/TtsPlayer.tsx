"use client";

import * as React from "react";
import { Volume2, Pause, Play, Square } from "lucide-react";

interface TtsPlayerProps {
  textToSpeak: string;
  lang?: string;
  rate?: number;
  pitch?: number;
}

export function TtsPlayer({
  textToSpeak,
  lang = "en",
  rate = 1.0,
  pitch = 1.0,
}: TtsPlayerProps) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);

  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = React.useRef<string | null>(null);

  const cleanUpAudio = React.useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = "";
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    return () => {
      cleanUpAudio();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [cleanUpAudio]);

  const hasBrowserVoice = React.useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
    if (lang === "en") return true;
    const voices = window.speechSynthesis.getVoices();
    const prefix = lang.toLowerCase().split(/[-_]/)[0];
    return voices.some((v) => v.lang.toLowerCase().replace(/_/g, "-").startsWith(prefix));
  }, [lang]);

  const handlePlay = async () => {
    if (isPaused) {
      if (audioRef.current && audioRef.current.src) {
        audioRef.current.play().catch(console.error);
      } else if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.resume();
      }
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    cleanUpAudio();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    const useNative = hasBrowserVoice();

    if (!useNative) {
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: textToSpeak,
            lang,
            rate,
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to fetch TTS audio");
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;

        if (!audioRef.current && typeof Audio !== "undefined") {
          audioRef.current = new Audio();
        }
        const audio = audioRef.current;
        if (!audio) return;

        audio.src = url;
        audio.playbackRate = rate;

        audio.onended = () => {
          setIsPlaying(false);
          setIsPaused(false);
        };

        audio.onerror = () => {
          setIsPlaying(false);
          setIsPaused(false);
        };

        setIsPlaying(true);
        setIsPaused(false);
        await audio.play();
      } catch (err) {
        console.error("TTS audio play failed:", err);
        setIsPlaying(false);
        setIsPaused(false);
      }
      return;
    }

    // Native SpeechSynthesis
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
    if (audioRef.current && audioRef.current.src) {
      audioRef.current.pause();
    } else if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.pause();
    }
    setIsPaused(true);
    setIsPlaying(false);
  };

  const handleStop = () => {
    cleanUpAudio();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsPaused(false);
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
