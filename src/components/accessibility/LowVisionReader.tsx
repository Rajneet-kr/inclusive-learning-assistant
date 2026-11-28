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
  Square,
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  Gauge,
  Sparkles,
  Globe,
  RefreshCw,
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

interface SentenceItem {
  text: string;
  start: number;
  end: number;
  isHeading: boolean;
}

function extractSentencesForChunk(heading: string, text: string): SentenceItem[] {
  const items: SentenceItem[] = [];

  const cleanHeading = (heading || "").trim();
  if (cleanHeading) {
    items.push({
      text: cleanHeading,
      start: 0,
      end: 0,
      isHeading: true,
    });
  }

  const cleanText = text || "";
  // Split on standard and Indic sentence terminators (. ! ? । \n)
  const sentenceRegex = /([^.!?।\n]+[.!?।\n]+|\s+[^.!?।\n]+$)/g;
  let match: RegExpExecArray | null;
  while ((match = sentenceRegex.exec(cleanText)) !== null) {
    const s = match[0].trim();
    if (s) {
      items.push({
        text: s,
        start: match.index,
        end: match.index + match[0].length,
        isHeading: false,
      });
    }
  }

  if (items.length === (cleanHeading ? 1 : 0) && cleanText.trim()) {
    items.push({
      text: cleanText.trim(),
      start: 0,
      end: cleanText.length,
      isHeading: false,
    });
  }

  return items;
}

interface LowVisionReaderProps {
  chunks: DocumentChunk[];
  settings: AccessibilitySettings;
  onUpdateSettings: (settings: Partial<AccessibilitySettings>) => void;
  translatedSections?: TranslatedSimplifiedSection[] | null;
  language?: SupportedLanguageCode;
  convertingSectionIndex?: number | null;
}

export function LowVisionReader({
  chunks,
  settings,
  onUpdateSettings,
  translatedSections,
  language,
  convertingSectionIndex = null,
}: LowVisionReaderProps) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);
  const [speakingChunkIndex, setSpeakingChunkIndex] = React.useState<number | null>(null);
  const [spokenCharIndex, setSpokenCharIndex] = React.useState<number>(0);
  const [playbackMode, setPlaybackMode] = React.useState<"speech_synthesis" | "api_tts">("speech_synthesis");
  const [activeSentenceRange, setActiveSentenceRange] = React.useState<{ start: number; end: number } | null>(null);

  const fallbackTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const boundaryFiredRef = React.useRef<boolean>(false);
  const isPlayingRef = React.useRef<boolean>(false);
  const isReadAllRef = React.useRef<boolean>(false);

  // HTMLAudioElement refs for /api/tts multilingual playback
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const audioAbortControllerRef = React.useRef<AbortController | null>(null);
  const currentAudioUrlRef = React.useRef<string | null>(null);
  const sentencesQueueRef = React.useRef<SentenceItem[]>([]);
  const queueIndexRef = React.useRef<number>(0);

  const utteranceRef = React.useRef<SpeechSynthesisUtterance | null>(null);

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

  /**
   * Checks whether the user's browser genuinely has an offline or online
   * speechSynthesis voice installed for the active language.
   */
  const hasLocalBrowserVoice = React.useCallback((): boolean => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return false;
    }
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) {
      return currentLang === "en";
    }
    if (currentLang === "en") return true;

    const langPrefix = currentLang.toLowerCase().split(/[-_]/)[0];
    const bcp47 = (BCP47_LANGUAGE_MAP[langPrefix] || langPrefix).toLowerCase();

    return voices.some((v) => {
      const vLang = v.lang.toLowerCase().replace(/_/g, "-");
      return vLang === bcp47 || vLang.startsWith(langPrefix);
    });
  }, [currentLang]);

  /**
   * Stops all active playback (both native SpeechSynthesis and /api/tts HTMLAudioElement)
   * and resets highlight state.
   */
  const stopAllPlayback = React.useCallback(() => {
    clearFallbackTimer();
    isPlayingRef.current = false;
    isReadAllRef.current = false;

    // 1. Cancel SpeechSynthesis
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    // 2. Abort ongoing fetch
    if (audioAbortControllerRef.current) {
      audioAbortControllerRef.current.abort();
      audioAbortControllerRef.current = null;
    }

    // 3. Pause and clean audio element
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = "";
      audioRef.current.ontimeupdate = null;
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.onplay = null;
      audioRef.current.onloadedmetadata = null;
    }

    if (currentAudioUrlRef.current) {
      URL.revokeObjectURL(currentAudioUrlRef.current);
      currentAudioUrlRef.current = null;
    }

    setIsPlaying(false);
    setIsPaused(false);
    setSpeakingChunkIndex(null);
    setSpokenCharIndex(0);
    setActiveSentenceRange(null);
    sentencesQueueRef.current = [];
    queueIndexRef.current = 0;
  }, [clearFallbackTimer]);

  // Clean up on unmount
  React.useEffect(() => {
    return () => {
      stopAllPlayback();
    };
  }, [stopAllPlayback]);

  // Stop playback when language switches to avoid speaking wrong language
  React.useEffect(() => {
    stopAllPlayback();
  }, [currentLang, stopAllPlayback]);

  // Keep audio.playbackRate in sync if settings.ttsRate changes
  React.useEffect(() => {
    if (audioRef.current && settings.ttsRate) {
      audioRef.current.playbackRate = settings.ttsRate;
      audioRef.current.defaultPlaybackRate = settings.ttsRate;
    }
  }, [settings.ttsRate]);

  /**
   * Plays sentences sequentially from /api/tts with pre-chunking and sentence highlighting.
   */
  const playNextSentence = React.useCallback(
    async (chunkIndex: number, sentenceIndex: number) => {
      clearFallbackTimer();
      const queue = sentencesQueueRef.current;
      if (sentenceIndex >= queue.length) {
        // Current section finished!
        if (isReadAllRef.current && chunkIndex + 1 < displayItems.length) {
          // Advance to next section in Read All mode
          speakChunk(chunkIndex + 1, true);
        } else {
          stopAllPlayback();
        }
        return;
      }

      const sentence = queue[sentenceIndex];
      queueIndexRef.current = sentenceIndex;

      setIsPlaying(true);
      isPlayingRef.current = true;
      setIsPaused(false);
      setSpeakingChunkIndex(chunkIndex);

      if (sentence.isHeading) {
        setActiveSentenceRange(null);
        setSpokenCharIndex(0);
      } else {
        setActiveSentenceRange({
          start: sentence.start,
          end: sentence.end,
        });
        setSpokenCharIndex(sentence.start);
      }

      // Pre-compute word offsets for this sentence to map timeupdate progress
      const wordOffsets: number[] = [];
      const wordRegex = /\S+/g;
      let m: RegExpExecArray | null;
      while ((m = wordRegex.exec(sentence.text)) !== null) {
        wordOffsets.push(sentence.start + m.index);
      }
      if (wordOffsets.length === 0) {
        wordOffsets.push(sentence.start);
      }

      try {
        if (audioAbortControllerRef.current) {
          audioAbortControllerRef.current.abort();
        }
        const controller = new AbortController();
        audioAbortControllerRef.current = controller;

        if (currentAudioUrlRef.current) {
          URL.revokeObjectURL(currentAudioUrlRef.current);
          currentAudioUrlRef.current = null;
        }

        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: sentence.text,
            lang: currentLang,
            rate: settings.ttsRate || 1.0,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`TTS API failed with HTTP ${res.status}`);
        }

        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        currentAudioUrlRef.current = objectUrl;

        if (!audioRef.current && typeof Audio !== "undefined") {
          audioRef.current = new Audio();
        }
        const audio = audioRef.current;
        if (!audio) throw new Error("Audio element unavailable");

        // Clear previous listeners
        audio.onended = null;
        audio.onerror = null;
        audio.ontimeupdate = null;
        audio.onplay = null;
        audio.onloadedmetadata = null;

        audio.src = objectUrl;

        const activeRate = settings.ttsRate || 1.0;
        audio.playbackRate = activeRate;
        audio.defaultPlaybackRate = activeRate;

        audio.onplay = () => {
          if (audioRef.current) {
            audioRef.current.playbackRate = settings.ttsRate || 1.0;
          }
        };

        audio.onloadedmetadata = () => {
          if (audioRef.current) {
            audioRef.current.playbackRate = settings.ttsRate || 1.0;
          }
        };

        // Drive marker progression strictly from actual audio playback progress
        audio.ontimeupdate = () => {
          if (!isPlayingRef.current) return;
          const dur = audio.duration;
          const cur = audio.currentTime;

          if (dur > 0 && !isNaN(dur) && isFinite(dur)) {
            // Strictly bounded progress between 0.0 and 1.0
            const progress = Math.min(1, Math.max(0, cur / dur));
            const wordIdx = Math.min(
              wordOffsets.length - 1,
              Math.floor(progress * wordOffsets.length)
            );
            const targetCharIndex = wordOffsets[wordIdx];
            setSpokenCharIndex(targetCharIndex);
          }
        };

        audio.onended = () => {
          if (isPlayingRef.current) {
            playNextSentence(chunkIndex, sentenceIndex + 1);
          }
        };

        audio.onerror = (e) => {
          console.error("Audio playback error for sentence:", e);
          if (isPlayingRef.current) {
            playNextSentence(chunkIndex, sentenceIndex + 1);
          }
        };

        await audio.play();
        audio.playbackRate = settings.ttsRate || 1.0;
      } catch (err: any) {
        if (err.name === "AbortError") return;
        console.error("TTS playback error in playNextSentence:", err);
        stopAllPlayback();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentLang, displayItems, settings.ttsRate, stopAllPlayback, clearFallbackTimer]
  );

  /**
   * Main entry point to speak a section (chunk).
   * Automatically selects native SpeechSynthesis (if English or voice genuinely exists)
   * or /api/tts HTMLAudioElement queue (if multilingual voice is missing in browser).
   */
  const speakChunk = (chunkIndex: number, startFromBeginning = false) => {
    stopAllPlayback();

    if (chunkIndex >= displayItems.length) {
      stopAllPlayback();
      return;
    }

    const item = displayItems[chunkIndex];
    const canUseNative = hasLocalBrowserVoice();

    if (!canUseNative) {
      // 1. Multilingual Cloud TTS mode (/api/tts)
      setPlaybackMode("api_tts");
      isReadAllRef.current = startFromBeginning;
      const sentences = extractSentencesForChunk(item.heading, item.text);
      sentencesQueueRef.current = sentences;
      queueIndexRef.current = 0;
      playNextSentence(chunkIndex, 0);
      return;
    }

    // 2. Native SpeechSynthesis mode
    setPlaybackMode("speech_synthesis");
    isReadAllRef.current = startFromBeginning;
    const textToSpeak = item.heading.trim() ? `${item.heading.trim()}. ${item.text}` : item.text;
    const headingPrefixLength = item.heading.trim() ? item.heading.trim().length + 2 : 0;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = settings.ttsRate || 1.0;
    utterance.pitch = settings.ttsPitch || 1.0;
    utterance.lang = bcp47Locale;

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

    const wordOffsets: number[] = [];
    const wordRegex = /\S+/g;
    let matchExec: RegExpExecArray | null;
    while ((matchExec = wordRegex.exec(item.text)) !== null) {
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
        const adjustedCharIndex = Math.max(0, event.charIndex - headingPrefixLength);
        setSpokenCharIndex(adjustedCharIndex);
      }
    };

    utterance.onend = () => {
      clearFallbackTimer();
      if (startFromBeginning && chunkIndex + 1 < displayItems.length) {
        speakChunk(chunkIndex + 1, true);
      } else {
        stopAllPlayback();
      }
    };

    utterance.onerror = () => {
      clearFallbackTimer();
      stopAllPlayback();
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const handlePlayAll = () => {
    if (isPaused) {
      if (playbackMode === "api_tts") {
        if (audioRef.current) {
          audioRef.current.playbackRate = settings.ttsRate || 1.0;
          audioRef.current.defaultPlaybackRate = settings.ttsRate || 1.0;
          audioRef.current.play().catch(console.error);
        }
      } else if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.resume();
      }
      setIsPaused(false);
      setIsPlaying(true);
      isPlayingRef.current = true;
    } else {
      speakChunk(0, true);
    }
  };

  const handlePause = () => {
    clearFallbackTimer();
    if (playbackMode === "api_tts") {
      audioRef.current?.pause();
    } else if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.pause();
    }
    setIsPaused(true);
    setIsPlaying(false);
    isPlayingRef.current = false;
  };

  const handleStop = () => {
    stopAllPlayback();
  };

  const setSpeed = (rate: number) => {
    onUpdateSettings({ ttsRate: rate });
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
      audioRef.current.defaultPlaybackRate = rate;
    }
    if (
      playbackMode === "speech_synthesis" &&
      (isPlaying || isPaused) &&
      speakingChunkIndex !== null
    ) {
      speakChunk(speakingChunkIndex, isReadAllRef.current);
    }
  };

  const stepSpeed = (delta: number) => {
    const current = settings.ttsRate || 1.0;
    const next = Math.min(2.0, Math.max(0.5, Number((current + delta).toFixed(2))));
    setSpeed(next);
  };

  /**
   * Renders text with word-level (native TTS) or sentence-level (cloud TTS) highlighting.
   */
  const renderHighlightedText = (text: string, isChunkActive: boolean) => {
    if (!isChunkActive) {
      if (focus.syllableBreakdown) {
        return <SyllableText text={text} enabled={true} />;
      }
      return <span>{text}</span>;
    }

    const renderTextContent = (str: string) => {
      if (focus.syllableBreakdown) {
        return <SyllableText text={str} enabled={true} />;
      }
      return str;
    };

    // 1. In API TTS mode: highlight active sentence container with active word marker strictly synced to audio timeupdate
    if (playbackMode === "api_tts" && activeSentenceRange) {
      const { start, end } = activeSentenceRange;
      const safeStart = Math.max(0, Math.min(start, text.length));
      const safeEnd = Math.max(safeStart, Math.min(end, text.length));

      const before = text.slice(0, safeStart);
      const activeSentence = text.slice(safeStart, safeEnd);
      const after = text.slice(safeEnd);

      // Sub-sentence active word marker at spokenCharIndex strictly synced to audio timeupdate
      const relCharIndex = Math.max(0, Math.min(spokenCharIndex - safeStart, activeSentence.length));
      const sentBeforeWord = activeSentence.slice(0, relCharIndex);
      const sentRemaining = activeSentence.slice(relCharIndex);
      const wordMatch = sentRemaining.match(/^\S+/);
      const activeWord = wordMatch ? wordMatch[0] : "";
      const sentAfterWord = wordMatch ? sentRemaining.slice(activeWord.length) : sentRemaining;

      return (
        <span>
          <span className="opacity-75">{renderTextContent(before)}</span>
          <span
            className={`inline rounded-lg px-1.5 py-0.5 transition-colors ${
              settings.highContrast
                ? "bg-zinc-900/90 border border-yellow-400/50"
                : "bg-blue-50/90 border border-blue-300/60"
            }`}
          >
            <span>{renderTextContent(sentBeforeWord)}</span>
            {activeWord ? (
              <mark
                className={`px-1.5 py-0.5 mx-0.5 rounded font-black tracking-wide inline-block shadow-sm transition-all ${
                  settings.highContrast
                    ? "bg-yellow-400 text-black ring-4 ring-yellow-400"
                    : "bg-blue-600 text-white ring-4 ring-blue-500"
                }`}
              >
                {renderTextContent(activeWord)}
              </mark>
            ) : null}
            <span>{renderTextContent(sentAfterWord)}</span>
          </span>
          <span>{renderTextContent(after)}</span>
        </span>
      );
    }

    // 2. In native SpeechSynthesis mode: highlight active word near spokenCharIndex
    const before = text.slice(0, spokenCharIndex);
    const after = text.slice(spokenCharIndex);
    const match = after.match(/^\S+/);
    const activeWord = match ? match[0] : "";
    const remaining = match ? after.slice(activeWord.length) : after;

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

  const hasBrowserVoice = hasLocalBrowserVoice();

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
              Reflowable layout &bull; Active Word &amp; Sentence Read Aloud &bull; WCAG AAA Zoom
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
          {/* Active Audio Engine Indicator */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${
              settings.highContrast
                ? "border-yellow-400/40 text-yellow-300 bg-yellow-950/40"
                : "border-slate-300 text-slate-700 bg-white"
            }`}
            title={
              hasBrowserVoice
                ? "Using local browser speech engine"
                : "Using cloud multilingual audio streaming engine"
            }
          >
            <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>
              {currentLang.toUpperCase()} &bull; {hasBrowserVoice ? "Local Voice" : "Cloud HD TTS"}
            </span>
          </div>

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
                  {convertingSectionIndex === idx && (
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold animate-pulse ${
                        settings.highContrast
                          ? "bg-yellow-400 text-black font-black"
                          : "bg-blue-100 text-blue-800 border border-blue-300"
                      }`}
                    >
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Converting...
                    </span>
                  )}
                </div>

                {/* Per-Chunk Play, Stop, and Speed Controls */}
                <div
                  role="region"
                  aria-label={`Audio controls for section ${idx + 1}`}
                  className={`flex flex-wrap items-center gap-2 p-1.5 rounded-xl border-2 border-current ${
                    settings.highContrast ? "bg-zinc-950" : "bg-slate-50"
                  }`}
                >
                  {!isChunkActive ? (
                    <button
                      type="button"
                      onClick={() => speakChunk(idx, false)}
                      className={`px-3.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 ${
                        settings.highContrast
                          ? "bg-yellow-400 text-black hover:bg-yellow-300 font-black"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                      aria-label={`Play section ${idx + 1}: ${item.heading}`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Play
                    </button>
                  ) : isPlaying ? (
                    <button
                      type="button"
                      onClick={handlePause}
                      className="px-3.5 py-1.5 rounded-lg font-black text-xs flex items-center gap-1.5 bg-amber-500 text-black hover:bg-amber-400"
                      aria-label={`Pause section ${idx + 1}`}
                    >
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      Pause
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handlePlayAll}
                      className="px-3.5 py-1.5 rounded-lg font-black text-xs flex items-center gap-1.5 bg-emerald-500 text-black hover:bg-emerald-400"
                      aria-label={`Resume section ${idx + 1}`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Resume
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleStop}
                    disabled={!isChunkActive}
                    className={`px-3 py-1.5 rounded-lg font-black text-xs flex items-center gap-1.5 transition-opacity ${
                      isChunkActive
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "border border-current opacity-40 cursor-not-allowed"
                    }`}
                    aria-label={`Stop reading section ${idx + 1}`}
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    Stop
                  </button>

                  {/* Speed Decrease / Increase Controls */}
                  <div className="flex items-center gap-1 pl-2 border-l border-current">
                    <Gauge className="w-3.5 h-3.5 opacity-70" />
                    <button
                      type="button"
                      onClick={() => stepSpeed(-0.25)}
                      disabled={(settings.ttsRate || 1.0) <= 0.5}
                      className="px-2 py-0.5 rounded border border-current text-xs font-black hover:opacity-80 disabled:opacity-35 disabled:cursor-not-allowed"
                      title="Decrease reading speed"
                      aria-label="Decrease reading speed"
                    >
                      -
                    </button>
                    <span className="font-mono text-xs font-black px-1 min-w-[3.25ch] text-center">
                      {settings.ttsRate || 1.0}x
                    </span>
                    <button
                      type="button"
                      onClick={() => stepSpeed(0.25)}
                      disabled={(settings.ttsRate || 1.0) >= 2.0}
                      className={`px-2 py-0.5 rounded text-xs font-black transition-colors disabled:opacity-35 disabled:cursor-not-allowed ${
                        settings.highContrast
                          ? "bg-yellow-400 text-black hover:bg-yellow-300"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                      title="Increase reading speed"
                      aria-label="Increase reading speed"
                    >
                      +
                    </button>
                  </div>
                </div>
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
