"use client";

import * as React from "react";
import {
  Sparkles,
  Zap,
  BookOpen,
  Eye,
  Ear,
  BrainCircuit,
  FileText,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  Upload,
  Binary,
  Maximize2,
  RefreshCw,
} from "lucide-react";
import { useAccessibilitySettings } from "@/hooks/useAccessibilitySettings";
import { AccessibilityToolbar } from "@/components/accessibility/AccessibilityToolbar";
import { DyslexiaReader } from "@/components/accessibility/DyslexiaReader";
import { LowVisionReader } from "@/components/accessibility/LowVisionReader";
import { TranscriptViewer } from "@/components/accessibility/TranscriptViewer";
import { CaptionPanel } from "@/components/accessibility/CaptionPanel";
import { QuizCard } from "@/components/practice/QuizCard";
import { FlashcardDeck } from "@/components/practice/FlashcardDeck";
import { StudyPlanTimeline } from "@/components/practice/StudyPlanTimeline";
import { UploadModal } from "@/components/upload/UploadModal";
import { StemVerbalizerPanel } from "@/components/stem/StemVerbalizerPanel";
import { TutorPanel } from "@/components/tutor/TutorPanel";
import { StudyPackExporter } from "@/components/export/StudyPackExporter";
import { translateSectionLocally, getLocalTranslatorPipeline } from "@/lib/ai/localTranslator";
import {
  sampleBiologyNote,
  sampleLectureTranscript,
  samplePracticePlan,
  SampleBiologyNote,
} from "@/lib/sampleData";
import {
  PracticeResponse,
  TranscribeResponse,
  TranslatedSimplifiedSection,
  SupportedLanguageCode,
  TranslationResult,
  OfflineStudyPack,
  GlossaryTerm,
  AccessibilityProfile,
} from "@/types/api";
import { getLanguageOption, getTextDirection } from "@/lib/i18n";

export default function HomePage() {
  const {
    settings,
    isLoaded,
    setProfile,
    updateSettings,
    updateFocusSettings,
    resetSettings,
  } = useAccessibilitySettings();

  const [activeTab, setActiveTab] = React.useState<
    "dyslexia" | "low_vision" | "hearing" | "practice" | "stem"
  >("dyslexia");

  const isDistractionFree = settings.focus?.mode === "distraction_free";

  // Dynamic mode-adaptive scrim background color
  const scrimBgColor = React.useMemo(() => {
    if (isDistractionFree) {
      return settings.highContrast || settings.profile === "low_vision"
        ? "rgba(0, 0, 0, 0.96)"
        : "rgba(253, 251, 247, 0.94)";
    }
    if (settings.highContrast || settings.profile === "low_vision") {
      return "rgba(0, 0, 0, 0.90)";
    }
    if (settings.profile === "hearing" || activeTab === "hearing") {
      return "rgba(241, 245, 249, 0.70)";
    }
    // Dyslexia & standard
    return "rgba(253, 251, 247, 0.72)";
  }, [isDistractionFree, settings.highContrast, settings.profile, activeTab]);

  // Escape key shortcut to exit distraction-free focus mode
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && settings.focus?.mode === "distraction_free") {
        updateFocusSettings({ mode: "off" });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [settings.focus?.mode, updateFocusSettings]);

  const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false);
  const [isTutorOpen, setIsTutorOpen] = React.useState(false);
  const [loadedNote, setLoadedNote] = React.useState<SampleBiologyNote | null>(null);
  const [practicePlan, setPracticePlan] = React.useState<PracticeResponse>(samplePracticePlan);
  const [transcript, setTranscript] = React.useState<TranscribeResponse>(sampleLectureTranscript);
  const [translatedSections, setTranslatedSections] = React.useState<TranslatedSimplifiedSection[] | null>(null);
  const [convertingSectionIndex, setConvertingSectionIndex] = React.useState<number | null>(null);
  const translationAbortControllerRef = React.useRef<AbortController | null>(null);
  const [isTranslating, setIsTranslating] = React.useState(false);
  const [translationFallbackUsed, setTranslationFallbackUsed] = React.useState(false);
  const [statusNotice, setStatusNotice] = React.useState<{
    message: string;
    type: "live" | "fallback";
  } | null>(null);

  const currentStudyPack = React.useMemo<OfflineStudyPack>(() => {
    const title = loadedNote?.title || "Inclusive Learning Study Pack";
    const docId = loadedNote?.documentId || "doc_sample_01";
    const language = (settings.language || "en") as SupportedLanguageCode;
    const sections = (translatedSections || loadedNote?.simplifiedSections || []) as TranslatedSimplifiedSection[];

    const glossaryMap = new Map<string, GlossaryTerm>();
    sections.forEach((sec) => {
      sec.jargon?.forEach((j) => {
        const key = j.term.trim().toLowerCase();
        if (key && !glossaryMap.has(key)) {
          glossaryMap.set(key, {
            term: j.term,
            plainMeaning: j.plainMeaning,
            language,
            source: "document",
            documentId: docId,
          });
        }
      });
    });

    transcript.keyConcepts?.forEach((kc) => {
      const key = kc.title.trim().toLowerCase();
      if (key && !glossaryMap.has(key)) {
        glossaryMap.set(key, {
          term: kc.title,
          plainMeaning: kc.explanation,
          language,
          source: "document",
          documentId: docId,
        });
      }
    });

    const flashcards = practicePlan.flashcards.map((f) => ({
      id: f.id,
      front: f.front,
      back: f.back,
      concept: f.concept,
    }));

    const quiz = practicePlan.quiz.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
    }));

    const studyPlan = practicePlan.studyPlan.map((p) => ({
      day: p.day,
      title: p.title,
      tasks: p.tasks,
      estimatedMinutes: p.estimatedMinutes,
    }));

    let transcriptObj: { format: "vtt"; content: string } | undefined = undefined;
    if (transcript?.segments && transcript.segments.length > 0) {
      const vttLines = ["WEBVTT\n"];
      transcript.segments.forEach((s) => {
        const formatTime = (sec: number) => {
          const m = Math.floor(sec / 60)
            .toString()
            .padStart(2, "0");
          const sRem = (sec % 60).toFixed(3).padStart(6, "0");
          return `00:${m}:${sRem}`;
        };
        vttLines.push(`${s.id}\n${formatTime(s.start)} --> ${formatTime(s.end)}\n${s.text}\n`);
      });
      transcriptObj = {
        format: "vtt",
        content: vttLines.join("\n"),
      };
    }

    return {
      documentId: docId,
      title,
      generatedAt: new Date().toISOString(),
      language,
      simplifiedSections: sections,
      glossary: Array.from(glossaryMap.values()),
      transcript: transcriptObj,
      flashcards,
      quiz,
      studyPlan,
    };
  }, [loadedNote, translatedSections, settings.language, practicePlan, transcript]);

  const handleNavigateToChunk = (chunkId: string) => {
    // If not in a reading tab, switch to active profile's reading tab
    if (activeTab !== "dyslexia" && activeTab !== "low_vision") {
      setActiveTab(settings.profile === "low_vision" ? "low_vision" : "dyslexia");
    }

    setTimeout(() => {
      const targetId = `chunk-${chunkId}`;
      const element =
        document.getElementById(targetId) ||
        document.querySelector(`[data-chunk-id="${chunkId}"]`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.classList.add("ring-4", "ring-indigo-500");
        setTimeout(() => {
          element.classList.remove("ring-4", "ring-indigo-500");
        }, 3000);
      }
    }, 150);
  };

  const handleNavigateToTimestamp = (startSeconds: number) => {
    setActiveTab("hearing");
    setTimeout(() => {
      const transcriptSection = document.querySelector(
        '[aria-label="Synchronized Interactive Transcript"]'
      );
      if (transcriptSection) {
        transcriptSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 150);
  };

  // On initial load only, set activeTab to match the saved profile
  const initialProfileSyncedRef = React.useRef(false);
  React.useEffect(() => {
    if (!initialProfileSyncedRef.current && isLoaded && settings.profile) {
      initialProfileSyncedRef.current = true;
      if (settings.profile === "low_vision") setActiveTab("low_vision");
      else if (settings.profile === "hearing") setActiveTab("hearing");
      else if (settings.profile === "dyslexia") setActiveTab("dyslexia");
    }
  }, [isLoaded, settings.profile]);

  // Direct tab selection handler that explicitly sets activeTab without interference
  const handleTabSelect = React.useCallback(
    (tab: "dyslexia" | "low_vision" | "hearing" | "practice" | "stem") => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setActiveTab(tab);
    },
    []
  );

  const handleProfileChange = React.useCallback(
    (newProfile: AccessibilityProfile) => {
      setProfile(newProfile);
      // When user explicitly changes profile in AccessibilityToolbar, switch reading tab to match
      if (loadedNote && (activeTab === "dyslexia" || activeTab === "low_vision" || activeTab === "hearing")) {
        if (newProfile === "dyslexia") setActiveTab("dyslexia");
        else if (newProfile === "low_vision") setActiveTab("low_vision");
        else if (newProfile === "hearing") setActiveTab("hearing");
      }
      // If activeTab is "stem" or "practice", keep activeTab unchanged!
    },
    [setProfile, loadedNote, activeTab]
  );

  const fetchTranslationForNote = React.useCallback(
    async (note: SampleBiologyNote, lang: SupportedLanguageCode) => {
      // Abort any ongoing in-flight progressive translation
      if (translationAbortControllerRef.current) {
        translationAbortControllerRef.current.abort();
        translationAbortControllerRef.current = null;
      }

      if (lang === "en") {
        setTranslatedSections(null);
        setTranslationFallbackUsed(false);
        setConvertingSectionIndex(null);
        setStatusNotice(null);
        setIsTranslating(false);
        return;
      }

      const sourceSections = note.simplifiedSections || [];
      if (sourceSections.length === 0) {
        setTranslatedSections(null);
        setIsTranslating(false);
        return;
      }

      const controller = new AbortController();
      translationAbortControllerRef.current = controller;

      setIsTranslating(true);
      setTranslationFallbackUsed(false);
      const langOption = getLanguageOption(lang);

      // Progressive array initialized with source sections
      // so the reader shell renders immediately and sections convert progressively
      const progressiveSections: TranslatedSimplifiedSection[] = sourceSections.map((sec) => ({
        ...sec,
      }));
      setTranslatedSections([...progressiveSections]);

      let hasAnyFallback = false;
      let usedLocalEngine = false;
      let localPipeInstance: any = null;

      // 1. Try preparing local client-side neural translator
      try {
        setStatusNotice({
          message: `Preparing client-side neural translator (NLLB-200) for ${langOption.nativeLabel} (${langOption.label})...`,
          type: "live",
        });

        localPipeInstance = await getLocalTranslatorPipeline((progress) => {
          if (controller.signal.aborted) return;
          setStatusNotice({
            message: progress.message || `Loading local neural translation engine...`,
            type: "live",
          });
        });
        usedLocalEngine = true;
      } catch (pipeErr) {
        console.warn("Client-side NLLB pipeline initialization failed, using universal /api/translate:", pipeErr);
        localPipeInstance = null;
        usedLocalEngine = false;
      }

      // 2. Translate section-by-section sequentially
      for (let i = 0; i < sourceSections.length; i++) {
        if (controller.signal.aborted) return;

        setConvertingSectionIndex(i);
        setStatusNotice({
          message: `Converting Section ${i + 1} of ${sourceSections.length} to ${langOption.nativeLabel} (${langOption.label}) [${
            usedLocalEngine ? "Local NLLB Engine" : "Live AI Model"
          }]...`,
          type: "live",
        });

        let sectionTranslated = false;

        // Try local neural model first
        if (localPipeInstance) {
          try {
            const localResult = await translateSectionLocally(
              sourceSections[i],
              lang,
              localPipeInstance,
              (progress) => {
                if (controller.signal.aborted) return;
                setStatusNotice({
                  message: progress.message || `Converting Section ${i + 1}...`,
                  type: "live",
                });
              }
            );

            if (controller.signal.aborted) return;

            progressiveSections[i] = localResult;
            setTranslatedSections([...progressiveSections]);
            sectionTranslated = true;
          } catch (localTransErr) {
            console.warn(`Local translation for section ${i + 1} failed, falling back to server API:`, localTransErr);
            sectionTranslated = false;
          }
        }

        // Fallback to server API (/api/translate) if local translator failed or was unavailable
        if (!sectionTranslated) {
          try {
            const res = await fetch("/api/translate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                documentId: note.documentId,
                targetLanguage: lang,
                sections: [sourceSections[i]],
              }),
              signal: controller.signal,
            });

            if (controller.signal.aborted) return;

            if (res.ok) {
              const result: TranslationResult = await res.json();
              if (result.sections && result.sections.length > 0) {
                progressiveSections[i] = result.sections[0];
                // Update state immediately as each section finishes
                setTranslatedSections([...progressiveSections]);
                if (result.fallbackUsed) {
                  hasAnyFallback = true;
                }
              }
            } else {
              hasAnyFallback = true;
            }
          } catch (err: any) {
            if (err?.name === "AbortError" || controller.signal.aborted) {
              return;
            }
            console.warn(`Translation of section ${i + 1} encountered an error:`, err);
            hasAnyFallback = true;
          }
        }
      }

      if (controller.signal.aborted) return;

      setConvertingSectionIndex(null);
      setIsTranslating(false);
      setTranslationFallbackUsed(hasAnyFallback);

      const engineBadge = usedLocalEngine ? "Client Neural Model (NLLB-200)" : "Live AI Translator";
      setStatusNotice({
        message: hasAnyFallback
          ? `Converted with safe fallback for ${langOption.nativeLabel} (${langOption.label}).`
          : `All ${sourceSections.length} sections successfully converted to ${langOption.nativeLabel} (${langOption.label}) [${engineBadge}]!`,
        type: hasAnyFallback ? "fallback" : "live",
      });
      setTimeout(() => setStatusNotice(null), 4500);
    },
    []
  );

  const handleLanguageChange = (newLang: SupportedLanguageCode) => {
    updateSettings({ language: newLang });
    if (loadedNote) {
      fetchTranslationForNote(loadedNote, newLang);
    }
  };

  // 1-Click Load Sample Note (Offline-ready fallback)
  const handleLoadSample = () => {
    setLoadedNote(sampleBiologyNote);
    setPracticePlan(samplePracticePlan);
    setTranscript(sampleLectureTranscript);
    const lang = settings.language || "en";
    if (lang !== "en") {
      fetchTranslationForNote(sampleBiologyNote, lang);
    } else {
      setTranslatedSections(null);
      setStatusNotice({
        message: "Loaded bundled sample Biology note. Zero network calls or API keys required.",
        type: "fallback",
      });
      setTimeout(() => setStatusNotice(null), 5000);
    }
  };

  const handleProcessingComplete = (data: {
    note: SampleBiologyNote;
    practice?: PracticeResponse;
    transcript?: TranscribeResponse;
  }) => {
    // 0. Reset translation state for new document
    setTranslatedSections(null);
    setConvertingSectionIndex(null);

    // 1. Fully replace current document note state
    setLoadedNote(data.note);
    const lang = settings.language || "en";
    if (lang !== "en") {
      fetchTranslationForNote(data.note, lang);
    } else {
      setTranslatedSections(null);
    }

    // 2. Fully replace practice plan
    if (data.practice) {
      setPracticePlan(data.practice);
    } else {
      // Dynamic fallback based on new note's chunks
      setPracticePlan({
        documentId: data.note.documentId,
        practiceId: `pr_${Date.now().toString(36)}`,
        quiz: data.note.chunks.slice(0, 6).map((c, i) => ({
          id: `q_dyn_${i + 1}`,
          question: `What is the key takeaway of "${c.heading}"?`,
          options: [
            c.text.slice(0, 75) + "...",
            `An unrelated historical development outside ${data.note.subject || "this topic"}`,
            `A contradictory hypothesis not supported by the lecture`,
            `None of the provided options`,
          ],
          correctIndex: 0,
          explanation: `${c.heading}: ${c.text.slice(0, 100)}...`,
          difficulty: i === 0 ? "easy" : i < 3 ? "medium" : "hard",
          concept: (c.keyTerms && c.keyTerms[0]) || c.heading,
        })),
        flashcards: data.note.chunks.slice(0, 8).map((c, i) => ({
          id: `f_dyn_${i + 1}`,
          front: `Define: ${(c.keyTerms && c.keyTerms[0]) || c.heading}`,
          back: `Essential concept discussed in section "${c.heading}".`,
          concept: (c.keyTerms && c.keyTerms[0]) || c.heading,
        })),
        studyPlan: data.note.chunks.slice(0, 5).map((c, i) => ({
          day: i + 1,
          title: `Study Session: ${c.heading}`,
          tasks: [
            `Read simplified summary for ${c.heading} (5 mins).`,
            `Review terms: ${(c.keyTerms || []).join(", ") || c.heading}.`,
            `Self-test with quiz question #${i + 1}.`,
          ],
          estimatedMinutes: 20,
        })),
        fallbackUsed: true,
      });
    }

    // 3. Fully replace transcript
    if (data.transcript) {
      setTranscript(data.transcript);
    } else {
      // Synthesize transcript from new document's chunks
      setTranscript({
        documentId: data.note.documentId,
        transcriptId: `tr_dyn_${Date.now().toString(36)}`,
        language: "en",
        durationSeconds: Math.max(60, data.note.chunks.length * 30),
        segments: data.note.chunks.map((c, i) => ({
          id: i,
          start: Math.round(i * 30.0 * 10) / 10,
          end: Math.round((i + 1) * 30.0 * 10) / 10,
          text: `${c.heading}: ${c.text}`,
        })),
        keyConcepts: data.note.chunks.slice(0, 4).map((c, i) => ({
          title: c.heading,
          explanation: (c.text || "").slice(0, 100) + "...",
          timestamps: [Math.round(i * 30.0 * 10) / 10],
        })),
        downloadUrl: `/api/transcribe?format=vtt`,
        fallbackUsed: false,
      });
    }

    if (data.note.fallbackUsed) {
      setStatusNotice({
        message: "AI pipeline returned fast fallback output (timeout or quota safeguard active).",
        type: "fallback",
      });
    } else {
      setStatusNotice({
        message: `Successfully processed live with Google Gemini for "${data.note.title}"!`,
        type: "live",
      });
    }

    // Switch view to match student profile
    if (settings.profile === "dyslexia") setActiveTab("dyslexia");
    else if (settings.profile === "low_vision") setActiveTab("low_vision");
    else if (settings.profile === "hearing") setActiveTab("hearing");
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500 font-medium">Loading accessibility preferences...</p>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen w-full flex flex-col relative transition-colors ${
        settings.highContrast
          ? "text-yellow-300"
          : "text-slate-900"
      }`}
    >
      {/* Global Fixed AVIF Wireframe Background Layer */}
      <div
        aria-hidden="true"
        className="global-wireframe-bg fixed inset-0 -z-20 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{ backgroundImage: "url('/images/wireframe-bg.avif')" }}
      />

      {/* Dynamic Mode-Adaptive Scrim Overlay */}
      <div
        aria-hidden="true"
        className={`global-scrim-overlay fixed inset-0 -z-10 pointer-events-none transition-colors duration-300 ${
          isDistractionFree || settings.highContrast || settings.profile === "low_vision"
            ? ""
            : "backdrop-blur-[2px]"
        }`}
        style={{ backgroundColor: scrimBgColor }}
      />

      {/* Distraction-Free Sticky Bar for ADHD & Neurodivergent Focus */}
      {isDistractionFree && (
        <div className="sticky top-0 z-50 bg-indigo-950 text-white shadow-md border-b border-indigo-800 w-full">
          <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Maximize2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Distraction-Free Focus Mode Active
              </span>
              <span className="text-xs text-indigo-300 hidden sm:inline">
                (Press Escape or click exit)
              </span>
            </div>
            <button
              type="button"
              onClick={() => updateFocusSettings({ mode: "off" })}
              className="px-3 py-1 bg-white text-indigo-950 hover:bg-indigo-50 font-bold text-xs rounded-lg transition-colors shadow-xs"
            >
              Exit Distraction-Free (Esc)
            </button>
          </div>
        </div>
      )}

      {/* Top Banner & Header (hidden in distraction-free mode) */}
      {!isDistractionFree && (
        <header
          className={`border-b ${
            settings.highContrast
              ? "border-yellow-400 bg-black/95 text-yellow-300"
              : "border-slate-200/80 bg-white/90 backdrop-blur-md text-slate-900 shadow-xs"
          } sticky top-0 z-40 w-full transition-colors`}
        >
          <div className="max-w-6xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-lg tracking-tight">
                    Inclusive Learning Assistant
                  </h1>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Guest Mode &bull; Offline Safe
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Accessible study companion for Dyslexic, Low-Vision &amp; Deaf learners
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Quick Profile Pill */}
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-lg capitalize flex items-center gap-1.5 ${
                settings.highContrast
                  ? "bg-zinc-900 text-yellow-300 border border-yellow-400"
                  : "bg-slate-100/90 text-slate-700 border border-slate-200/60"
              }`}>
                Profile: <strong>{settings.profile.replace("_", " ")}</strong>
              </span>
            </div>
          </div>
        </header>
      )}

      <main id="main-content" className="max-w-6xl mx-auto px-4 py-8 space-y-8 w-full flex-1">
        {/* Hero Section with 1-Click "Load Sample Note" Button (hidden in distraction-free mode) */}
        {!isDistractionFree && (
          <section
            aria-label="Demo Action Banner"
            className={`rounded-3xl p-8 shadow-md relative overflow-hidden transition-all ${
              settings.highContrast
                ? "bg-black/95 text-yellow-300 border-2 border-yellow-400"
                : "bg-gradient-to-br from-slate-950/85 via-blue-950/80 to-cyan-950/80 backdrop-blur-md text-white border border-cyan-400/25 shadow-lg"
            }`}
          >
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold mb-4 backdrop-blur-xs">
                <Zap className="w-3.5 h-3.5 text-yellow-300" /> Hackathon Demo Ready &bull; Gemini &amp; Deepgram Live
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl mb-3">
                Learn Without Barriers.
              </h2>
              <p className="text-blue-100 text-base leading-relaxed mb-6">
                Instantly transform complex lecture notes and textbooks into simplified dyslexia chunks, high-contrast reflowable text with TTS, synchronized captions, and adaptive practice quizzes.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className={`inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-base shadow-md hover:shadow-lg transition-all active:scale-[0.98] ${
                    settings.highContrast
                      ? "bg-yellow-400 text-black hover:bg-yellow-300 border-2 border-yellow-400"
                      : "bg-white/95 text-blue-950 hover:bg-white backdrop-blur-sm"
                  }`}
                >
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  ⚡ 1-Click Load Sample Biology Note
                </button>

                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(true)}
                  className={`inline-flex items-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-base transition-colors ${
                    settings.highContrast
                      ? "bg-zinc-900 text-yellow-300 hover:bg-zinc-800 border-2 border-yellow-400"
                      : "bg-blue-800/80 hover:bg-blue-800 text-white border border-blue-400/30 backdrop-blur-sm"
                  }`}
                >
                  <Upload className="w-4 h-4 text-blue-200" /> Upload or Paste Text
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("stem")}
                  className={`inline-flex items-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-base transition-colors ${
                    settings.highContrast
                      ? "bg-zinc-900 text-yellow-300 hover:bg-zinc-800 border-2 border-yellow-400"
                      : "bg-indigo-900/80 hover:bg-indigo-900 text-white border border-indigo-400/30 backdrop-blur-sm"
                  }`}
                >
                  <Binary className="w-4 h-4 text-indigo-300" /> 📐 STEM Verbalizer
                </button>
              </div>
            </div>

            {/* Decorative Background Glow */}
            <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
          </section>
        )}

        {/* Status Notice Toast / Banner (hidden in distraction-free mode) */}
        {!isDistractionFree && statusNotice && (
          <div
            role="status"
            aria-live="polite"
            className={`p-4 rounded-xl border flex items-center justify-between shadow-xs animate-in fade-in backdrop-blur-md ${
              settings.highContrast
                ? "bg-black/95 border-2 border-yellow-400 text-yellow-300"
                : statusNotice.type === "live"
                ? "bg-blue-50/90 border-blue-200/80 text-blue-950"
                : "bg-emerald-50/90 border-emerald-200/80 text-emerald-950"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {isTranslating ? (
                <RefreshCw className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
              ) : (
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              )}
              <span className="font-semibold text-sm">{statusNotice.message}</span>
            </div>
            <span className="text-xs bg-white/80 font-mono px-2.5 py-1 rounded-md border border-current opacity-80 shrink-0">
              {isTranslating
                ? "Converting..."
                : statusNotice.type === "live"
                ? "Live AI Model"
                : "Offline Fallback"}
            </span>
          </div>
        )}

        {/* Accessibility Preferences Toolbar (hidden in distraction-free mode) */}
        {!isDistractionFree && (
          <AccessibilityToolbar
            settings={settings}
            onProfileChange={handleProfileChange}
            onUpdateSettings={updateSettings}
            onReset={resetSettings}
            onLanguageChange={handleLanguageChange}
            isTranslating={isTranslating}
          />
        )}

        {/* If active tab is STEM verbalizer, render it directly even if no document is loaded */}
        {activeTab === "stem" && !loadedNote ? (
          <div className="space-y-6">
            <div className={`flex items-center justify-between pb-2 border-b ${
              settings.highContrast ? "border-yellow-400" : "border-slate-200"
            }`}>
              <h2 className={`text-xl font-bold ${
                settings.highContrast ? "text-yellow-300" : "text-slate-800"
              }`}>
                STEM &amp; Diagram Verbalizer Workspace
              </h2>
              <button
                type="button"
                onClick={handleLoadSample}
                className={`text-xs font-semibold hover:underline ${
                  settings.highContrast
                    ? "text-yellow-400 hover:text-yellow-200"
                    : "text-blue-600 hover:text-blue-800"
                }`}
              >
                &larr; Load Sample Biology Note for Reading Tabs
              </button>
            </div>
            <StemVerbalizerPanel
              settings={settings}
              highContrast={settings.highContrast}
              documentId="stem_quick_start"
            />
          </div>
        ) : !loadedNote ? (
          <div className={`rounded-2xl border-2 border-dashed p-12 text-center shadow-xs transition-all ${
            settings.highContrast
              ? "bg-black/95 border-yellow-400 text-yellow-300"
              : "bg-white/90 backdrop-blur-md border-slate-300/80 text-slate-900"
          }`}>
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${
              settings.highContrast
                ? "bg-zinc-900 text-yellow-300 border border-yellow-400"
                : "bg-blue-50 text-blue-600"
            }`}>
              <BookOpen className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold mb-2">
              No Document Loaded Yet
            </h3>
            <p className={`max-w-md mx-auto text-sm mb-6 ${
              settings.highContrast ? "text-yellow-200/80" : "text-slate-600"
            }`}>
              Click the button below to load our prepared sample note on <strong>Photosynthesis</strong>, click <strong>Upload or Paste Text</strong> to process your own materials, or test the <strong>STEM Verbalizer</strong> directly.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={handleLoadSample}
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold shadow-sm transition-all ${
                  settings.highContrast
                    ? "bg-yellow-400 text-black hover:bg-yellow-300 border-2 border-yellow-400"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-300" /> Load Sample Biology Note
              </button>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-colors ${
                  settings.highContrast
                    ? "bg-zinc-900 text-yellow-300 hover:bg-zinc-800 border-2 border-yellow-400"
                    : "border border-slate-300 bg-white/80 backdrop-blur-sm text-slate-700 hover:bg-white"
                }`}
              >
                <Upload className="w-4 h-4" /> Upload Custom Notes
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("stem")}
                className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-colors ${
                  settings.highContrast
                    ? "bg-zinc-900 text-yellow-300 hover:bg-zinc-800 border-2 border-yellow-400"
                    : "bg-indigo-50/90 border border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                }`}
              >
                <Binary className="w-4 h-4 text-indigo-600" /> Open STEM Verbalizer
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Note Meta Header */}
            <div className={`rounded-2xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4 transition-all ${
              settings.highContrast
                ? "bg-black/95 border-2 border-yellow-400 text-yellow-300"
                : "bg-white/90 backdrop-blur-md border border-slate-200/80 text-slate-900"
            }`}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                    settings.highContrast
                      ? "bg-zinc-900 text-yellow-300 border border-yellow-400"
                      : "text-blue-600 bg-blue-50"
                  }`}>
                    {loadedNote.subject || "General"} &bull; {loadedNote.gradeLevel || "Grade 10"}
                  </span>
                  <span className={`text-xs font-mono ${
                    settings.highContrast ? "text-yellow-400/80" : "text-slate-500"
                  }`}>
                    ID: {loadedNote.documentId}
                  </span>
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight">
                  {loadedNote.title}
                </h2>
                <p className={`text-sm mt-1 max-w-2xl ${
                  settings.highContrast ? "text-yellow-200/80" : "text-slate-600"
                }`}>
                  {loadedNote.sourceSummary}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <StudyPackExporter pack={currentStudyPack} />
                <span className={`text-xs px-3 py-1.5 rounded-lg font-semibold ${
                  settings.highContrast
                    ? "bg-zinc-900 text-yellow-300 border border-yellow-400"
                    : "bg-slate-100/90 text-slate-700"
                }`}>
                  {loadedNote.chunks.length} Chunks Generated
                </span>
                <span
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold border ${
                    loadedNote.fallbackUsed
                      ? settings.highContrast
                        ? "bg-amber-950 text-amber-300 border-amber-400"
                        : "bg-amber-50 text-amber-900 border-amber-200"
                      : settings.highContrast
                      ? "bg-emerald-950 text-emerald-300 border-emerald-400"
                      : "bg-emerald-50 text-emerald-900 border-emerald-200"
                  }`}
                >
                  {loadedNote.fallbackUsed ? "Fallback Safeguard" : "Live AI Model"}
                </span>
              </div>
            </div>

            {/* Navigation Tabs for Profiles & Practice */}
            <nav
              role="tablist"
              aria-label="Note View Modes"
              className="flex flex-wrap gap-2 border-b border-slate-200/80 pb-2 relative z-20"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "dyslexia"}
                onClick={() => handleTabSelect("dyslexia")}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all relative z-10 cursor-pointer ${
                  activeTab === "dyslexia"
                    ? settings.highContrast
                      ? "bg-yellow-400 text-black shadow-sm ring-2 ring-yellow-400 font-black"
                      : "bg-amber-500 text-white shadow-sm"
                    : settings.highContrast
                    ? "bg-zinc-900 text-yellow-300 hover:bg-zinc-800 border border-yellow-400"
                    : "bg-white/80 backdrop-blur-sm text-slate-700 hover:bg-white/95 border border-slate-200/60"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Dyslexia Reader
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "low_vision"}
                onClick={() => handleTabSelect("low_vision")}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all relative z-10 cursor-pointer ${
                  activeTab === "low_vision"
                    ? settings.highContrast
                      ? "bg-yellow-400 text-black shadow-sm ring-2 ring-yellow-400 font-black"
                      : "bg-indigo-600 text-white shadow-sm"
                    : settings.highContrast
                    ? "bg-zinc-900 text-yellow-300 hover:bg-zinc-800 border border-yellow-400"
                    : "bg-white/80 backdrop-blur-sm text-slate-700 hover:bg-white/95 border border-slate-200/60"
                }`}
              >
                <Eye className="w-4 h-4" />
                Low Vision &amp; TTS
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "hearing"}
                onClick={() => handleTabSelect("hearing")}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all relative z-10 cursor-pointer ${
                  activeTab === "hearing"
                    ? settings.highContrast
                      ? "bg-yellow-400 text-black shadow-sm ring-2 ring-yellow-400 font-black"
                      : "bg-emerald-600 text-white shadow-sm"
                    : settings.highContrast
                    ? "bg-zinc-900 text-yellow-300 hover:bg-zinc-800 border border-yellow-400"
                    : "bg-white/80 backdrop-blur-sm text-slate-700 hover:bg-white/95 border border-slate-200/60"
                }`}
              >
                <Ear className="w-4 h-4" />
                Hearing &amp; Captions
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "practice"}
                onClick={() => handleTabSelect("practice")}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all relative z-10 cursor-pointer ${
                  activeTab === "practice"
                    ? settings.highContrast
                      ? "bg-yellow-400 text-black shadow-sm ring-2 ring-yellow-400 font-black"
                      : "bg-purple-600 text-white shadow-sm"
                    : settings.highContrast
                    ? "bg-zinc-900 text-yellow-300 hover:bg-zinc-800 border border-yellow-400"
                    : "bg-white/80 backdrop-blur-sm text-slate-700 hover:bg-white/95 border border-slate-200/60"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Practice &amp; Quiz Deck ({practicePlan.quiz.length} Qs)
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "stem"}
                onClick={() => handleTabSelect("stem")}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all relative z-10 cursor-pointer ${
                  activeTab === "stem"
                    ? settings.highContrast
                      ? "bg-yellow-400 text-black shadow-sm ring-2 ring-yellow-400 font-black"
                      : "bg-indigo-600 text-white shadow-sm"
                    : settings.highContrast
                    ? "bg-zinc-900 text-yellow-300 hover:bg-zinc-800 border border-yellow-400"
                    : "bg-white/80 backdrop-blur-sm text-slate-700 hover:bg-white/95 border border-slate-200/60"
                }`}
              >
                <Binary className="w-4 h-4" />
                STEM &amp; Diagram Verbalizer
              </button>
            </nav>

            {/* View Mode Panels */}
            {activeTab === "dyslexia" && (
              <DyslexiaReader
                sections={translatedSections || loadedNote.simplifiedSections}
                settings={settings}
                language={settings.language || "en"}
                direction={getTextDirection(settings.language || "en")}
                onUpdateSettings={updateSettings}
                translationFallbackUsed={translationFallbackUsed}
                onRetryTranslation={() =>
                  loadedNote &&
                  fetchTranslationForNote(loadedNote, settings.language || "en")
                }
                isTranslating={isTranslating}
                convertingSectionIndex={convertingSectionIndex}
              />
            )}

            {activeTab === "low_vision" && (
              <LowVisionReader
                chunks={loadedNote.chunks}
                settings={settings}
                onUpdateSettings={updateSettings}
                translatedSections={translatedSections}
                language={settings.language || "en"}
                convertingSectionIndex={convertingSectionIndex}
              />
            )}

            {activeTab === "hearing" && (
              <div className="space-y-6">
                <CaptionPanel glossary={currentStudyPack.glossary} />
                <TranscriptViewer
                  transcript={transcript}
                  glossary={currentStudyPack.glossary}
                />
              </div>
            )}

            {activeTab === "practice" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <QuizCard questions={practicePlan.quiz} />
                  <FlashcardDeck flashcards={practicePlan.flashcards} />
                </div>
                <StudyPlanTimeline studyPlan={practicePlan.studyPlan} />
              </div>
            )}

            {activeTab === "stem" && (
              <StemVerbalizerPanel
                settings={settings}
                highContrast={settings.highContrast}
                documentId={loadedNote.documentId}
              />
            )}
          </div>
        )}
      </main>

      {/* Upload & Processing Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        activeProfile={settings.profile}
        onProcessingComplete={handleProcessingComplete}
      />

      {/* Floating Grounded Tutor Button (Hidden in distraction-free mode or when no doc loaded) */}
      {!isDistractionFree && loadedNote && (
        <aside aria-label="Grounded AI Study Tutor Action" className="fixed bottom-6 right-6 z-40">
          <button
            type="button"
            onClick={() => setIsTutorOpen(true)}
            aria-label="Ask about this material. Opens grounded AI study tutor."
            className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all border border-indigo-400/40"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Ask about this material</span>
          </button>
        </aside>
      )}

      {/* Grounded AI Study Tutor Slide-Over Panel */}
      <TutorPanel
        isOpen={isTutorOpen}
        onClose={() => setIsTutorOpen(false)}
        documentId={loadedNote?.documentId || "doc_active"}
        settings={settings}
        contextChunks={loadedNote?.chunks}
        transcriptSegments={transcript?.segments}
        onNavigateToChunk={handleNavigateToChunk}
        onNavigateToTimestamp={handleNavigateToTimestamp}
      />

      {/* Footer (hidden in distraction-free mode) */}
      {!isDistractionFree && (
        <footer className={`border-t py-6 mt-16 text-center text-xs w-full transition-colors ${
          settings.highContrast
            ? "border-yellow-400 bg-black/95 text-yellow-300"
            : "border-slate-200/80 bg-white/90 backdrop-blur-md text-slate-500"
        }`}>
          <div className="max-w-6xl mx-auto px-4">
            <p>Inclusive Learning Assistant &bull; Built for Accessibility &bull; Offline Fallback Ready</p>
          </div>
        </footer>
      )}
    </div>
  );
}
