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
  const [loadedNote, setLoadedNote] = React.useState<SampleBiologyNote | null>(null);
  const [practicePlan, setPracticePlan] = React.useState<PracticeResponse>(samplePracticePlan);
  const [transcript, setTranscript] = React.useState<TranscribeResponse>(sampleLectureTranscript);
  const [translatedSections, setTranslatedSections] = React.useState<TranslatedSimplifiedSection[] | null>(null);
  const [isTranslating, setIsTranslating] = React.useState(false);
  const [statusNotice, setStatusNotice] = React.useState<{
    message: string;
    type: "live" | "fallback";
  } | null>(null);

  // Sync activeTab with accessibility profile selection
  React.useEffect(() => {
    if (settings.profile === "dyslexia") setActiveTab("dyslexia");
    else if (settings.profile === "low_vision") setActiveTab("low_vision");
    else if (settings.profile === "hearing") setActiveTab("hearing");
  }, [settings.profile]);

  const fetchTranslationForNote = React.useCallback(
    async (note: SampleBiologyNote, lang: SupportedLanguageCode) => {
      if (lang === "en") {
        setTranslatedSections(null);
        return;
      }

      // Check offline sample fixtures for biology note
      if (note.documentId === "doc_bio_sample_01") {
        if (lang === "hi") {
          try {
            const res = await fetch("/samples/biology-notes-hi.json");
            if (res.ok) {
              const data = await res.json();
              setTranslatedSections(data.sections);
              setStatusNotice({
                message: "Loaded pre-translated Hindi sample note (offline safe).",
                type: "fallback",
              });
              setTimeout(() => setStatusNotice(null), 5000);
              return;
            }
          } catch (err) {
            console.warn("Failed to load offline Hindi fixture:", err);
          }
        } else if (lang === "es") {
          try {
            const res = await fetch("/samples/biology-notes-es.json");
            if (res.ok) {
              const data = await res.json();
              setTranslatedSections(data.sections);
              setStatusNotice({
                message: "Loaded pre-translated Spanish sample note (offline safe).",
                type: "fallback",
              });
              setTimeout(() => setStatusNotice(null), 5000);
              return;
            }
          } catch (err) {
            console.warn("Failed to load offline Spanish fixture:", err);
          }
        }
      }

      // Live translation API call
      setIsTranslating(true);
      try {
        const langOption = getLanguageOption(lang);
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentId: note.documentId,
            targetLanguage: lang,
            sections: note.simplifiedSections,
          }),
        });

        if (res.ok) {
          const result: TranslationResult = await res.json();
          setTranslatedSections(result.sections);
          setStatusNotice({
            message: result.fallbackUsed
              ? `Translation returned fallback text (safeguard active).`
              : `Successfully translated into ${langOption.nativeLabel} (${langOption.label})!`,
            type: result.fallbackUsed ? "fallback" : "live",
          });
        } else {
          setTranslatedSections(null);
        }
      } catch (err) {
        console.error("Translation request failed:", err);
        setTranslatedSections(null);
      } finally {
        setIsTranslating(false);
        setTimeout(() => setStatusNotice(null), 5000);
      }
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
      className={`min-h-screen ${
        settings.highContrast
          ? "bg-black text-yellow-300"
          : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Distraction-Free Sticky Bar for ADHD & Neurodivergent Focus */}
      {isDistractionFree && (
        <div className="sticky top-0 z-50 bg-indigo-950 text-white px-4 py-2.5 flex items-center justify-between shadow-md border-b border-indigo-800">
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
      )}

      {/* Top Banner & Header (hidden in distraction-free mode) */}
      {!isDistractionFree && (
        <header
          className={`border-b ${
            settings.highContrast
              ? "border-yellow-300 bg-black"
              : "border-slate-200 bg-white"
          } sticky top-0 z-40`}
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
              <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 capitalize flex items-center gap-1.5">
                Profile: <strong>{settings.profile.replace("_", " ")}</strong>
              </span>
            </div>
          </div>
        </header>
      )}

      <main id="main-content" className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Hero Section with 1-Click "Load Sample Note" Button (hidden in distraction-free mode) */}
        {!isDistractionFree && (
          <section
            aria-label="Demo Action Banner"
            className="rounded-3xl bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-900 text-white p-8 shadow-md relative overflow-hidden"
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
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white text-blue-900 font-bold text-base hover:bg-blue-50 shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                >
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  ⚡ 1-Click Load Sample Biology Note
                </button>

                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-blue-800/80 hover:bg-blue-800 text-white font-semibold text-base border border-blue-400/30 transition-colors"
                >
                  <Upload className="w-4 h-4 text-blue-200" /> Upload or Paste Text
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("stem")}
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-indigo-900/80 hover:bg-indigo-900 text-white font-semibold text-base border border-indigo-400/30 transition-colors"
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
            className={`p-4 rounded-xl border flex items-center justify-between shadow-xs animate-in fade-in ${
              statusNotice.type === "live"
                ? "bg-blue-50 border-blue-200 text-blue-950"
                : "bg-emerald-50 border-emerald-200 text-emerald-950"
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-semibold text-sm">{statusNotice.message}</span>
            </div>
            <span className="text-xs bg-white/80 font-mono px-2.5 py-1 rounded-md border border-current opacity-80 shrink-0">
              {statusNotice.type === "live" ? "Gemini & Deepgram Live" : "Offline Fallback"}
            </span>
          </div>
        )}

        {/* Accessibility Preferences Toolbar (hidden in distraction-free mode) */}
        {!isDistractionFree && (
          <AccessibilityToolbar
            settings={settings}
            onProfileChange={setProfile}
            onUpdateSettings={updateSettings}
            onReset={resetSettings}
            onLanguageChange={handleLanguageChange}
            isTranslating={isTranslating}
          />
        )}

        {/* If active tab is STEM verbalizer, render it directly even if no document is loaded */}
        {activeTab === "stem" && !loadedNote ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">STEM &amp; Diagram Verbalizer Workspace</h2>
              <button
                type="button"
                onClick={handleLoadSample}
                className="text-xs text-blue-600 hover:underline font-semibold"
              >
                &larr; Load Sample Biology Note for Reading Tabs
              </button>
            </div>
            <StemVerbalizerPanel settings={settings} documentId="stem_quick_start" />
          </div>
        ) : !loadedNote ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center bg-white shadow-xs">
            <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              No Document Loaded Yet
            </h3>
            <p className="text-slate-600 max-w-md mx-auto text-sm mb-6">
              Click the button below to load our prepared sample note on <strong>Photosynthesis</strong>, click <strong>Upload or Paste Text</strong> to process your own materials, or test the <strong>STEM Verbalizer</strong> directly.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={handleLoadSample}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-sm transition-all"
              >
                <Sparkles className="w-4 h-4 text-amber-300" /> Load Sample Biology Note
              </button>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Upload className="w-4 h-4" /> Upload Custom Notes
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("stem")}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-50 border border-indigo-200 font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
              >
                <Binary className="w-4 h-4 text-indigo-600" /> Open STEM Verbalizer
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Note Meta Header */}
            <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                    {loadedNote.subject || "General"} &bull; {loadedNote.gradeLevel || "Grade 10"}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    ID: {loadedNote.documentId}
                  </span>
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  {loadedNote.title}
                </h2>
                <p className="text-sm text-slate-600 mt-1 max-w-2xl">
                  {loadedNote.sourceSummary}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-semibold">
                  {loadedNote.chunks.length} Chunks Generated
                </span>
                <span
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold border ${
                    loadedNote.fallbackUsed
                      ? "bg-amber-50 text-amber-900 border-amber-200"
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
              className="flex flex-wrap gap-2 border-b border-slate-200 pb-2"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "dyslexia"}
                onClick={() => setActiveTab("dyslexia")}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === "dyslexia"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Dyslexia Reader
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "low_vision"}
                onClick={() => setActiveTab("low_vision")}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === "low_vision"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Eye className="w-4 h-4" />
                Low Vision &amp; TTS
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "hearing"}
                onClick={() => setActiveTab("hearing")}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === "hearing"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Ear className="w-4 h-4" />
                Hearing &amp; Captions
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "practice"}
                onClick={() => setActiveTab("practice")}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === "practice"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Practice &amp; Quiz Deck ({practicePlan.quiz.length} Qs)
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "stem"}
                onClick={() => setActiveTab("stem")}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === "stem"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
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
              />
            )}

            {activeTab === "low_vision" && (
              <LowVisionReader
                chunks={loadedNote.chunks}
                settings={settings}
                onUpdateSettings={updateSettings}
              />
            )}

            {activeTab === "hearing" && (
              <div className="space-y-6">
                <CaptionPanel />
                <TranscriptViewer transcript={transcript} />
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

      {/* Footer (hidden in distraction-free mode) */}
      {!isDistractionFree && (
        <footer className="border-t border-slate-200 py-6 mt-16 text-center text-xs text-slate-500">
          <p>Inclusive Learning Assistant &bull; Built for Accessibility &bull; Offline Fallback Ready</p>
        </footer>
      )}
    </div>
  );
}
