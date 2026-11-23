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
import { UploadDropzone } from "@/components/upload/UploadDropzone";
import { TextInput } from "@/components/upload/TextInput";
import {
  sampleBiologyNote,
  sampleLectureTranscript,
  samplePracticePlan,
  SampleBiologyNote,
} from "@/lib/sampleData";

export default function HomePage() {
  const { settings, isLoaded, setProfile, updateSettings, resetSettings } =
    useAccessibilitySettings();

  const [activeTab, setActiveTab] = React.useState<
    "dyslexia" | "low_vision" | "hearing" | "practice" | "upload"
  >("dyslexia");

  const [loadedNote, setLoadedNote] = React.useState<SampleBiologyNote | null>(null);
  const [pastedText, setPastedText] = React.useState("");
  const [loadNotice, setLoadNotice] = React.useState(false);

  // Sync activeTab with accessibility profile selection
  React.useEffect(() => {
    if (settings.profile === "dyslexia") setActiveTab("dyslexia");
    else if (settings.profile === "low_vision") setActiveTab("low_vision");
    else if (settings.profile === "hearing") setActiveTab("hearing");
  }, [settings.profile]);

  // 1-Click Load Sample Note (Offline-ready fallback)
  const handleLoadSample = () => {
    setLoadedNote(sampleBiologyNote);
    setLoadNotice(true);
    setTimeout(() => setLoadNotice(false), 4000);
  };

  const handleProcessPastedText = () => {
    if (!pastedText.trim()) return;
    // Create an in-memory document from the pasted text
    const customDoc: SampleBiologyNote = {
      documentId: `doc_custom_${Date.now()}`,
      status: "ready",
      inputKind: "text",
      title: "Custom Pasted Lecture Notes",
      subject: "General",
      gradeLevel: "All",
      sourceSummary: pastedText.slice(0, 120) + "...",
      extractedText: pastedText,
      chunks: [
        {
          id: "chunk_c1",
          index: 0,
          heading: "Section 1",
          text: pastedText,
          keyTerms: ["notes", "study", "concepts"],
        },
      ],
      simplifiedSections: [
        {
          chunkId: "chunk_c1",
          title: "Section 1",
          simpleText: pastedText,
          keyIdea: "Custom study material summary.",
          jargon: [],
          readingTimeSeconds: Math.ceil(pastedText.split(" ").length / 3),
        },
      ],
      warnings: [],
      fallbackUsed: true,
    };
    setLoadedNote(customDoc);
    setLoadNotice(true);
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
      {/* Top Banner & Header */}
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
                  Guest Mode &bull; Offline Ready
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

      <main id="main-content" className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Hero Section with 1-Click "Load Sample Note" Button */}
        <section
          aria-label="Demo Action Banner"
          className="rounded-3xl bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-900 text-white p-8 shadow-md relative overflow-hidden"
        >
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold mb-4 backdrop-blur-xs">
              <Zap className="w-3.5 h-3.5 text-yellow-300" /> Hackathon Demo Ready &bull; Zero Network Fallback
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
                onClick={() => setActiveTab("upload")}
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-blue-800/80 hover:bg-blue-800 text-white font-semibold text-base border border-blue-400/30 transition-colors"
              >
                <FileText className="w-4 h-4" /> Upload or Paste Text
              </button>
            </div>
          </div>

          {/* Decorative Background Glow */}
          <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        </section>

        {/* Load Notice Toast */}
        {loadNotice && (
          <div
            role="status"
            className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between shadow-xs animate-in fade-in"
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <span className="font-semibold text-sm">
                Sample Note Loaded Successfully! Showing offline bundled Biology notes.
              </span>
            </div>
            <span className="text-xs bg-emerald-200/60 font-mono px-2 py-0.5 rounded text-emerald-900">
              Zero Network Calls
            </span>
          </div>
        )}

        {/* Accessibility Preferences Toolbar */}
        <AccessibilityToolbar
          settings={settings}
          onProfileChange={setProfile}
          onUpdateSettings={updateSettings}
          onReset={resetSettings}
        />

        {/* If no note is loaded yet, show prompt banner */}
        {!loadedNote ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center bg-white shadow-xs">
            <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              No Document Loaded Yet
            </h3>
            <p className="text-slate-600 max-w-md mx-auto text-sm mb-6">
              Click the button below to immediately load our bundled sample note on <strong>Photosynthesis &amp; Cellular Energy</strong>, complete with pre-calculated chunks and practice questions.
            </p>
            <button
              type="button"
              onClick={handleLoadSample}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-sm transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-300" /> Load Sample Biology Note
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Note Meta Header */}
            <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                    {loadedNote.subject || "Biology"} &bull; {loadedNote.gradeLevel || "Grade 10"}
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
                  {loadedNote.chunks.length} Chunks Available
                </span>
                <span className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                  Offline Fallback Ready
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
                Practice &amp; Quiz Deck
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "upload"}
                onClick={() => setActiveTab("upload")}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === "upload"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <FileText className="w-4 h-4" />
                New Upload
              </button>
            </nav>

            {/* View Mode Panels */}
            {activeTab === "dyslexia" && (
              <DyslexiaReader
                sections={loadedNote.simplifiedSections}
                settings={settings}
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
                <TranscriptViewer transcript={sampleLectureTranscript} />
              </div>
            )}

            {activeTab === "practice" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <QuizCard questions={samplePracticePlan.quiz} />
                  <FlashcardDeck flashcards={samplePracticePlan.flashcards} />
                </div>
                <StudyPlanTimeline studyPlan={samplePracticePlan.studyPlan} />
              </div>
            )}

            {activeTab === "upload" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <UploadDropzone
                  onFileSelect={(file) => {
                    alert(`Selected: ${file.name}. Phase 2 will process this via /api/ingest!`);
                  }}
                />
                <TextInput
                  value={pastedText}
                  onChange={setPastedText}
                  onSubmit={handleProcessPastedText}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 mt-16 text-center text-xs text-slate-500">
        <p>Inclusive Learning Assistant &bull; Built for Accessibility &bull; Offline Fallback Ready</p>
      </footer>
    </div>
  );
}
