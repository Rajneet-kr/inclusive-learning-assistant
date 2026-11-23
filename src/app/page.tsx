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
import {
  sampleBiologyNote,
  sampleLectureTranscript,
  samplePracticePlan,
  SampleBiologyNote,
} from "@/lib/sampleData";
import { PracticeResponse, TranscribeResponse } from "@/types/api";

export default function HomePage() {
  const { settings, isLoaded, setProfile, updateSettings, resetSettings } =
    useAccessibilitySettings();

  const [activeTab, setActiveTab] = React.useState<
    "dyslexia" | "low_vision" | "hearing" | "practice"
  >("dyslexia");

  const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false);
  const [loadedNote, setLoadedNote] = React.useState<SampleBiologyNote | null>(null);
  const [practicePlan, setPracticePlan] = React.useState<PracticeResponse>(samplePracticePlan);
  const [transcript, setTranscript] = React.useState<TranscribeResponse>(sampleLectureTranscript);
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

  // 1-Click Load Sample Note (Offline-ready fallback)
  const handleLoadSample = () => {
    setLoadedNote(sampleBiologyNote);
    setPracticePlan(samplePracticePlan);
    setTranscript(sampleLectureTranscript);
    setStatusNotice({
      message: "Loaded bundled sample Biology note. Zero network calls or API keys required.",
      type: "fallback",
    });
    setTimeout(() => setStatusNotice(null), 5000);
  };

  const handleProcessingComplete = (data: {
    note: SampleBiologyNote;
    practice?: PracticeResponse;
    transcript?: TranscribeResponse;
  }) => {
    setLoadedNote(data.note);
    if (data.practice) setPracticePlan(data.practice);
    if (data.transcript) setTranscript(data.transcript);

    if (data.note.fallbackUsed) {
      setStatusNotice({
        message: "AI pipeline returned fast fallback output (timeout or quota safeguard active).",
        type: "fallback",
      });
    } else {
      setStatusNotice({
        message: "Successfully processed live with Google Gemini & Deepgram Nova-3!",
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

      <main id="main-content" className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Hero Section with 1-Click "Load Sample Note" Button */}
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
            </div>
          </div>

          {/* Decorative Background Glow */}
          <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        </section>

        {/* Status Notice Toast / Banner */}
        {statusNotice && (
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
              Click the button below to load our prepared sample note on <strong>Photosynthesis</strong>, or click <strong>Upload or Paste Text</strong> to process your own materials.
            </p>
            <div className="flex justify-center gap-3">
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

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 mt-16 text-center text-xs text-slate-500">
        <p>Inclusive Learning Assistant &bull; Built for Accessibility &bull; Offline Fallback Ready</p>
      </footer>
    </div>
  );
}
