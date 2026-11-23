"use client";

import * as React from "react";
import { X, UploadCloud, FileText, Music, Sparkles, AlertCircle } from "lucide-react";
import { AccessibilityProfile, IngestResponse, PracticeResponse, SimplifyResponse, TranscribeResponse } from "@/types/api";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProfile: AccessibilityProfile;
  onProcessingComplete: (data: {
    note: IngestResponse & { simplifiedSections: SimplifyResponse["sections"] };
    practice?: PracticeResponse;
    transcript?: TranscribeResponse;
  }) => void;
}

export function UploadModal({
  isOpen,
  onClose,
  activeProfile,
  onProcessingComplete,
}: UploadModalProps) {
  const [tab, setTab] = React.useState<"file" | "paste">("file");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [pastedText, setPastedText] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [gradeLevel, setGradeLevel] = React.useState("Grade 10");

  const [isLoading, setIsLoading] = React.useState(false);
  const [stepMessage, setStepMessage] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && !pastedText.trim()) {
      setErrorMessage("Please select a file or paste text to process.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const isAudio =
        selectedFile &&
        (selectedFile.type.startsWith("audio/") ||
          selectedFile.type.startsWith("video/") ||
          /\.(mp3|wav|mp4|m4a|webm)$/i.test(selectedFile.name));

      let liveTranscript: TranscribeResponse | undefined;

      // 1. If audio, transcribe via /api/transcribe first
      if (isAudio && selectedFile) {
        setStepMessage("Transcribing audio with Deepgram Nova-3...");
        const audioForm = new FormData();
        audioForm.append("file", selectedFile);
        audioForm.append("documentId", `doc_${Date.now()}`);

        const trRes = await fetch("/api/transcribe", {
          method: "POST",
          body: audioForm,
        });

        if (trRes.ok) {
          liveTranscript = await trRes.json();
        }
      }

      // 2. Call /api/ingest
      setStepMessage("Extracting and segmenting notes with Google Gemini...");
      const ingestForm = new FormData();
      if (selectedFile) ingestForm.append("file", selectedFile);
      if (pastedText) ingestForm.append("pastedText", pastedText);
      if (isAudio && liveTranscript) {
        // If it was audio, pass the transcript as text to ingest
        const transcriptText = liveTranscript.segments.map((s) => s.text).join(" ");
        ingestForm.append("pastedText", transcriptText);
      }
      ingestForm.append("accessibilityProfile", activeProfile);
      ingestForm.append("subject", subject || (isAudio ? "Lecture Recording" : "General"));
      ingestForm.append("gradeLevel", gradeLevel);

      const ingestRes = await fetch("/api/ingest", {
        method: "POST",
        body: ingestForm,
      });

      if (!ingestRes.ok) {
        const errJson = await ingestRes.json();
        throw new Error(errJson.error?.message || "Ingestion failed");
      }

      const ingestData: IngestResponse = await ingestRes.json();

      // 3. Call /api/simplify in parallel with /api/practice
      setStepMessage("Generating dyslexia simplifications & adaptive practice quiz...");
      const [simplifyRes, practiceRes] = await Promise.all([
        fetch("/api/simplify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentId: ingestData.documentId,
            chunks: ingestData.chunks,
            sourceText: ingestData.extractedText,
            readingLevel: gradeLevel,
          }),
        }),
        fetch("/api/practice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentId: ingestData.documentId,
            chunks: ingestData.chunks,
            sourceText: ingestData.extractedText,
            accessibilityProfile: activeProfile,
            subject: ingestData.subject || subject || "General",
            gradeLevel,
          }),
        }),
      ]);

      const simplifyData: SimplifyResponse = simplifyRes.ok
        ? await simplifyRes.json()
        : { documentId: ingestData.documentId, sections: [], fallbackUsed: true };

      const practiceData: PracticeResponse | undefined = practiceRes.ok
        ? await practiceRes.json()
        : undefined;

      onProcessingComplete({
        note: {
          ...ingestData,
          simplifiedSections: simplifyData.sections,
          fallbackUsed: ingestData.fallbackUsed || simplifyData.fallbackUsed,
        },
        practice: practiceData,
        transcript: liveTranscript,
      });

      onClose();
    } catch (err) {
      console.error(err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while processing study materials."
      );
    } finally {
      setIsLoading(false);
      setStepMessage("");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 id="upload-modal-title" className="text-xl font-extrabold text-slate-900 tracking-tight">
              Process New Study Notes
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Powered by Google Gemini &amp; Deepgram Nova-3 with 12s safe fallback
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 flex items-start gap-3 text-sm">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Processing Notice</p>
                <p className="text-xs opacity-90">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Mode Tabs */}
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "file"}
              onClick={() => setTab("file")}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                tab === "file" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <UploadCloud className="w-4 h-4 text-blue-600" />
              Upload Document or Audio
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "paste"}
              onClick={() => setTab("paste")}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                tab === "paste" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText className="w-4 h-4 text-indigo-600" />
              Paste Lecture Text
            </button>
          </div>

          {/* Tab 1: File Upload */}
          {tab === "file" && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-8 text-center cursor-pointer bg-slate-50/50 hover:bg-blue-50/30 transition-all"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.mp3,.mp4,.wav,.m4a"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3">
                {selectedFile?.type.startsWith("audio/") ? (
                  <Music className="w-6 h-6" />
                ) : (
                  <UploadCloud className="w-6 h-6" />
                )}
              </div>
              {selectedFile ? (
                <div>
                  <p className="font-bold text-slate-900 text-sm">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB &bull; Click to change
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-slate-800 text-sm">
                    Drop your PDF, whiteboard image, or lecture audio here
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    PDF, JPG, PNG, WEBP, MP3, MP4, WAV (Up to 20MB)
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Paste Text */}
          {tab === "paste" && (
            <div>
              <textarea
                rows={5}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste reading assignments, textbook passages, or raw lecture notes here..."
                className="w-full p-4 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
              />
              <div className="text-right mt-1 text-xs text-slate-400">
                {pastedText.split(/\s+/).filter(Boolean).length} words
              </div>
            </div>
          )}

          {/* Metadata Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Subject (Optional)
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. World History, Cell Biology, CS 101"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Target Level
              </label>
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="Middle School">Middle School (Grades 6–8)</option>
                <option value="Grade 10">High School (Grade 10)</option>
                <option value="College">College / Undergraduate</option>
                <option value="Advanced">Advanced / Professional</option>
              </select>
            </div>
          </div>

          {/* Progress / Submit Bar */}
          {isLoading ? (
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600 animate-spin" />
                <span className="font-bold text-sm">{stepMessage}</span>
              </div>
              <div className="w-full bg-blue-200 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full w-2/3 animate-pulse" />
              </div>
              <p className="text-[11px] text-blue-700">
                Gemini and Deepgram are analyzing content. Safe fallback activates automatically if network stalls.
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-600 font-semibold hover:bg-slate-100 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-sm transition-all text-sm flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                Process Notes with AI
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
