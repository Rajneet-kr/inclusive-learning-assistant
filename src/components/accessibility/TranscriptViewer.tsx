"use client";

import * as React from "react";
import {
  TranscribeResponse,
  GlossaryTerm,
  SupportedLanguageCode,
} from "@/types/api";
import {
  Ear,
  Download,
  Search,
  Clock,
  Sparkles,
  BookOpen,
  Languages,
} from "lucide-react";
import { findAllGlossaryMatches } from "@/lib/glossaryMatcher";
import { sampleBiologyNote } from "@/lib/sampleData";
import {
  getLocalTranslatorPipeline,
  translateTextLocally,
  TranslationProgressEvent,
} from "@/lib/ai/localTranslator";

interface TranscriptViewerProps {
  transcript: TranscribeResponse;
  glossary?: GlossaryTerm[];
}

const TRANSLATION_LANGUAGES: {
  code: SupportedLanguageCode;
  name: string;
}[] = [
  { code: "hi", name: "Hindi" },
  { code: "mr", name: "Marathi" },
  { code: "kn", name: "Kannada" },
  { code: "ta", name: "Tamil" },
  { code: "te", name: "Telugu" },
  { code: "bn", name: "Bengali" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
];

// Highlights matching search terms in the transcript text.
function HighlightedText({
  text,
  query,
}: {
  text: string;
  query: string;
}) {
  if (!query.trim()) return <>{text}</>;

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedQuery})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={index}
            className="bg-yellow-300 text-slate-900 rounded px-0.5"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

export function TranscriptViewer({
  transcript,
  glossary,
}: TranscriptViewerProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeSegmentTerm, setActiveSegmentTerm] =
    React.useState<GlossaryTerm | null>(null);

  // Translation state
  const [selectedLanguage, setSelectedLanguage] =
    React.useState<SupportedLanguageCode>("hi");

  const [translatedSegments, setTranslatedSegments] = React.useState<
    Record<number, string>
  >({});

  const [showTranslations, setShowTranslations] = React.useState(true);
  const [isTranslating, setIsTranslating] = React.useState(false);
  const [translationProgress, setTranslationProgress] =
    React.useState<TranslationProgressEvent | null>(null);

  const [translationError, setTranslationError] = React.useState("");

  const segmentRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  const effectiveGlossary = React.useMemo<GlossaryTerm[]>(() => {
    if (glossary && glossary.length > 0) return glossary;

    const terms: GlossaryTerm[] = [];

    sampleBiologyNote.simplifiedSections.forEach((s) => {
      s.jargon.forEach((j) => {
        terms.push({
          term: j.term,
          plainMeaning: j.plainMeaning,
          language: "en",
          source: "document",
        });
      });
    });

    return terms;
  }, [glossary]);

  // Search both the original and translated caption text.
  const filteredSegments = transcript.segments.filter((segment) => {
    const originalMatches = segment.text
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    const translatedMatches = (translatedSegments[segment.id] || "")
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    return originalMatches || translatedMatches;
  });

  // Jump to the transcript segment closest to a concept timestamp.
  const jumpToTimestamp = (timestamp: number) => {
    if (!transcript.segments.length) return;

    const closestSegment = transcript.segments.reduce(
      (closest, segment) => {
        return Math.abs(segment.start - timestamp) <
          Math.abs(closest.start - timestamp)
          ? segment
          : closest;
      },
      transcript.segments[0]
    );

    const element = segmentRefs.current[String(closestSegment.id)];

    element?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  // Generate original VTT captions.
  const downloadVtt = () => {
    let vttContent = "WEBVTT\n\n";

    transcript.segments.forEach((segment) => {
      const formatTime = (sec: number) => {
        const hours = Math.floor(sec / 3600)
          .toString()
          .padStart(2, "0");

        const minutes = Math.floor((sec % 3600) / 60)
          .toString()
          .padStart(2, "0");

        const seconds = (sec % 60).toFixed(3).padStart(6, "0");

        return `${hours}:${minutes}:${seconds}`;
      };

      vttContent += `${segment.id}\n${formatTime(
        segment.start
      )} --> ${formatTime(segment.end)}\n${segment.text}\n\n`;
    });

    downloadFile(
      vttContent,
      `lecture-${transcript.transcriptId}.vtt`,
      "text/vtt"
    );
  };

  // Generate translated VTT captions.
  const downloadTranslatedVtt = () => {
    if (!Object.keys(translatedSegments).length) return;

    let vttContent = "WEBVTT\n\n";

    transcript.segments.forEach((segment) => {
      const formatTime = (sec: number) => {
        const hours = Math.floor(sec / 3600)
          .toString()
          .padStart(2, "0");

        const minutes = Math.floor((sec % 3600) / 60)
          .toString()
          .padStart(2, "0");

        const seconds = (sec % 60).toFixed(3).padStart(6, "0");

        return `${hours}:${minutes}:${seconds}`;
      };

      const translatedText = translatedSegments[segment.id];

      if (!translatedText) return;

      vttContent += `${segment.id}\n${formatTime(
        segment.start
      )} --> ${formatTime(segment.end)}\n${translatedText}\n\n`;
    });

    downloadFile(
      vttContent,
      `lecture-${transcript.transcriptId}-${selectedLanguage}.vtt`,
      "text/vtt"
    );
  };

  // Download helper.
  const downloadFile = (
    content: string,
    filename: string,
    contentType: string
  ) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
  };

  // Translate all transcript segments sequentially.
  const translateTranscript = async () => {
    if (isTranslating) return;

    setIsTranslating(true);
    setTranslationError("");
    setTranslationProgress({
      status: "init",
      message: "Preparing translation...",
    });

    try {
      const pipe = await getLocalTranslatorPipeline((event) => {
        setTranslationProgress(event);
      });

      const results: Record<number, string> = {};

      for (let i = 0; i < transcript.segments.length; i++) {
        const segment = transcript.segments[i];

        setTranslationProgress({
          status: "translating",
          message: `Translating caption ${i + 1} of ${
            transcript.segments.length
          }...`,
          progress: ((i + 1) / transcript.segments.length) * 100,
        });

        // Translate one segment at a time to reduce memory usage.
        const translatedText = await translateTextLocally(
          segment.text,
          selectedLanguage,
          pipe,
          (event) => {
            setTranslationProgress(event);
          }
        );

        results[segment.id] = translatedText;
      }

      setTranslatedSegments(results);
      setShowTranslations(true);

      setTranslationProgress({
        status: "ready",
        message: "Transcript translation completed.",
      });
    } catch (error) {
      console.error("Transcript translation failed:", error);

      setTranslationError(
        error instanceof Error
          ? error.message
          : "Translation failed. Please try again."
      );

      setTranslationProgress({
        status: "error",
        message: "Translation failed.",
      });
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div
      aria-label="Synchronized Interactive Transcript"
      className="rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/80 p-6 shadow-sm"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-200 mb-6 gap-3">
        <div className="flex items-center gap-2">
          <Ear className="w-5 h-5 text-emerald-600" />

          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Hearing &amp; Lecture Transcript Mode
          </h2>
        </div>

        <button
          type="button"
          onClick={downloadVtt}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Download className="w-4 h-4 text-emerald-600" />
          Download Original .VTT
        </button>
      </div>

      {/* Interactive Key Concepts */}
      {transcript.keyConcepts &&
        transcript.keyConcepts.length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-emerald-700" />

              <h3 className="font-bold text-sm uppercase tracking-wider text-emerald-900">
                Key Concepts &amp; Lecture Timestamps
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {transcript.keyConcepts.map((kc, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    if (kc.timestamps.length > 0) {
                      jumpToTimestamp(kc.timestamps[0]);
                    }
                  }}
                  title="Click to jump to this concept in the transcript"
                  className="text-left p-3 rounded-lg bg-white border border-emerald-200 text-sm shadow-xs hover:border-emerald-500 hover:bg-emerald-50 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <span className="font-semibold text-emerald-950">
                      {kc.title}
                    </span>

                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 font-mono text-emerald-800 shrink-0">
                      {kc.timestamps.map((t) => `${Math.floor(t)}s`).join(", ")}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600">
                    {kc.explanation}
                  </p>

                  <span className="text-[10px] text-emerald-700 mt-2 inline-block font-medium">
                    Click to jump to lecture segment →
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

      {/* Translation controls */}
      <div className="mb-6 p-4 rounded-xl bg-indigo-50 border border-indigo-200">
        <div className="flex items-center gap-2 mb-3">
          <Languages className="w-5 h-5 text-indigo-700" />

          <h3 className="font-bold text-sm text-indigo-950">
            Multilingual Captions
          </h3>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedLanguage}
            onChange={(e) => {
              const newLanguage = e.target.value as SupportedLanguageCode;

              setSelectedLanguage(newLanguage);
              setTranslatedSegments({});
              setTranslationProgress(null);
              setTranslationError("");
            }}
            disabled={isTranslating}
            aria-label="Select caption translation language"
            className="flex-1 p-2 rounded-lg border border-indigo-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {TRANSLATION_LANGUAGES.map((language) => (
              <option key={language.code} value={language.code}>
                {language.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={translateTranscript}
            disabled={isTranslating || transcript.segments.length === 0}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isTranslating ? "Translating..." : "Translate Captions"}
          </button>

          {Object.keys(translatedSegments).length > 0 && (
            <button
              type="button"
              onClick={() => setShowTranslations((prev) => !prev)}
              className="px-4 py-2 rounded-lg border border-indigo-300 bg-white text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors"
            >
              {showTranslations ? "Hide Translation" : "Show Translation"}
            </button>
          )}
        </div>

        {/* Translation progress */}
        {translationProgress && (
          <div className="mt-3 text-xs text-indigo-800">
            <p>{translationProgress.message}</p>

            {typeof translationProgress.progress === "number" &&
              isTranslating && (
                <div className="w-full bg-indigo-100 rounded-full h-2 mt-2 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(0, translationProgress.progress)
                      )}%`,
                    }}
                  />
                </div>
              )}
          </div>
        )}

        {/* Translation errors */}
        {translationError && (
          <p
            role="alert"
            className="mt-3 text-sm text-red-700 bg-red-50 p-2 rounded-lg border border-red-200"
          >
            {translationError}
          </p>
        )}

        {/* Translated VTT download */}
        {Object.keys(translatedSegments).length > 0 && (
          <button
            type="button"
            onClick={downloadTranslatedVtt}
            className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-indigo-300 bg-white text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download {TRANSLATION_LANGUAGES.find(
              (l) => l.code === selectedLanguage
            )?.name}{" "}
            .VTT
          </button>
        )}
      </div>

      {/* Active Glossary Term */}
      {activeSegmentTerm && (
        <div
          role="status"
          className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-300 flex items-start justify-between gap-3 text-amber-950 text-xs shadow-xs animate-in fade-in"
        >
          <div className="flex items-start gap-2">
            <BookOpen className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />

            <div>
              <span className="font-bold text-amber-900">
                {activeSegmentTerm.term}:
              </span>{" "}
              <span>{activeSegmentTerm.plainMeaning}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveSegmentTerm(null)}
            className="text-amber-700 hover:text-amber-900 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-6">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search original or translated captions..."
          aria-label="Search transcript"
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />

        {searchQuery && (
          <span className="absolute right-3 top-2.5 text-xs text-slate-500">
            {filteredSegments.length} match(es)
          </span>
        )}
      </div>

      {/* Transcript Segments */}
      <div className="space-y-3 max-h-[460px] overflow-y-auto pr-2">
        {filteredSegments.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-8">
            No matching captions found.
          </p>
        )}

        {filteredSegments.map((segment) => {
          const matchedTerms = findAllGlossaryMatches(
            segment.text,
            effectiveGlossary
          );

          return (
            <div
              key={segment.id}
              ref={(element) => {
                segmentRefs.current[String(segment.id)] = element;
              }}
              className="p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex items-center gap-1 font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded shrink-0">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {segment.start.toFixed(1)}s - {segment.end.toFixed(1)}s
                </span>

                <div className="flex-1">
                  {/* Original caption */}
                  <p className="text-sm text-slate-800 leading-relaxed font-normal">
                    <HighlightedText
                      text={segment.text}
                      query={searchQuery}
                    />
                  </p>

                  {/* Translated caption */}
                  {showTranslations &&
                    translatedSegments[segment.id] && (
                      <div className="mt-2 p-2.5 rounded-lg bg-indigo-50 border border-indigo-100">
                        <div className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 mb-1">
                          {TRANSLATION_LANGUAGES.find(
                            (l) => l.code === selectedLanguage
                          )?.name}{" "}
                          Translation
                        </div>

                        <p className="text-sm text-indigo-950 leading-relaxed">
                          <HighlightedText
                            text={translatedSegments[segment.id]}
                            query={searchQuery}
                          />
                        </p>
                      </div>
                    )}

                  {/* Glossary Pills */}
                  {matchedTerms.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        Terms:
                      </span>

                      {matchedTerms.map((t, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveSegmentTerm(t)}
                          className="text-[11px] px-2 py-0.5 rounded-md bg-amber-100/70 text-amber-900 hover:bg-amber-200 font-medium transition-colors border border-amber-200"
                          title="Click to view definition"
                        >
                          {t.term}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}