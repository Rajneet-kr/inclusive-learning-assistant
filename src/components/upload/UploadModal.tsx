"use client";

import * as React from "react";
import { X, UploadCloud, FileText, Music, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
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
  const [tab, setTab] = React.useState<"file" | "paste">("paste");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [pastedText, setPastedText] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [gradeLevel, setGradeLevel] = React.useState("Grade 10");

  const [isLoading, setIsLoading] = React.useState(false);
  const [stepMessage, setStepMessage] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [extractedStats, setExtractedStats] = React.useState<{
    chars: number;
    words: number;
    chunks: number;
    title: string;
  } | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const isHighContrast = activeProfile === "low_vision";

  const handleTabSwitch = (newTab: "file" | "paste") => {
    setTab(newTab);
    setErrorMessage(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setErrorMessage(null);
      setExtractedStats(null);
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
    setExtractedStats(null);

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
          liveTranscript = await trRes.json().catch(() => undefined);
        }
      }

      // 2. Call /api/ingest
      const isPdf =
        selectedFile &&
        (selectedFile.type === "application/pdf" ||
          selectedFile.name.toLowerCase().endsWith(".pdf"));

      setStepMessage(
        isPdf
          ? "Extracting text from PDF pages locally..."
          : "Extracting and segmenting notes..."
      );

      const ingestForm = new FormData();
      if (selectedFile) ingestForm.append("file", selectedFile);
      if (pastedText) ingestForm.append("pastedText", pastedText);
      if (isAudio && liveTranscript) {
        const transcriptText = liveTranscript.segments.map((s) => s.text).join(" ");
        ingestForm.append("pastedText", transcriptText);
      }
      ingestForm.append("accessibilityProfile", activeProfile);
      ingestForm.append("subject", subject || (isAudio ? "Lecture Audio" : "General"));
      ingestForm.append("gradeLevel", gradeLevel);

      const ingestRes = await fetch("/api/ingest", {
        method: "POST",
        body: ingestForm,
      });

      const ingestData = await ingestRes.json().catch(() => ({}));

      if (!ingestRes.ok) {
        const errorMsg =
          ingestData?.error?.message ||
          "Document processing failed. Please check the file or try pasting text.";
        throw new Error(errorMsg);
      }

      const extractedText = (ingestData.extractedText as string) || "";
      const charCount = extractedText.length;
      const wordCount = extractedText.trim() ? extractedText.trim().split(/\s+/).length : 0;
      const chunkCount = Array.isArray(ingestData.chunks) ? ingestData.chunks.length : 0;

      setExtractedStats({
        chars: charCount,
        words: wordCount,
        chunks: chunkCount,
        title: ingestData.title || (selectedFile?.name || "Uploaded Document"),
      });

      // 3. Call /api/simplify and /api/practice passing the newly ingested chunks
      setStepMessage(
        `Extracted ${charCount.toLocaleString()} chars (${wordCount.toLocaleString()} words). Generating dyslexia simplifications & quiz...`
      );

      const [simplifyRes, practiceRes] = await Promise.all([
        fetch("/api/simplify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentId: ingestData.documentId,
            chunks: ingestData.chunks,
            sourceText: ingestData.extractedText,
            subject: ingestData.subject || subject || "General",
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
        ? await simplifyRes.json().catch(() => ({
            documentId: ingestData.documentId,
            sections: [],
            fallbackUsed: true,
          }))
        : { documentId: ingestData.documentId, sections: [], fallbackUsed: true };

      const practiceData: PracticeResponse | undefined = practiceRes.ok
        ? await practiceRes.json().catch(() => undefined)
        : undefined;

      // 4. Ensure sections are 100% derived from the new document's chunks
      let finalSections = simplifyData.sections;
      if (!Array.isArray(finalSections) || finalSections.length === 0) {
        finalSections = (ingestData.chunks || []).map((c: any, i: number) => {
          const sentences = (c.text || "").split(/(?<=[.?!])\s+/).filter(Boolean);
          const simpleText = sentences.slice(0, 3).join(" ") || c.text || "";
          return {
            chunkId: c.id,
            title: c.heading || `Section ${i + 1}`,
            simpleText,
            keyIdea: sentences[0] || c.heading || "Key summary",
            jargon: (c.keyTerms || []).slice(0, 3).map((term: string) => ({
              term,
              plainMeaning: `Core concept in ${c.heading}: ${term}`,
            })),
            readingTimeSeconds: Math.max(10, Math.ceil(simpleText.split(" ").length / 2.5)),
          };
        });
      }

      // 5. If it wasn't audio, synthesize transcript from the new document's chunks so Hearing tab reflects new content!
      if (!liveTranscript) {
        liveTranscript = {
          documentId: ingestData.documentId,
          transcriptId: `tr_${Date.now().toString(36)}`,
          language: "en",
          durationSeconds: Math.max(60, (ingestData.chunks?.length || 1) * 25),
          segments: (ingestData.chunks || []).map((c: any, i: number) => ({
            id: i,
            start: Math.round(i * 25.0 * 10) / 10,
            end: Math.round((i + 1) * 25.0 * 10) / 10,
            text: `${c.heading}: ${c.text}`,
          })),
          keyConcepts: (ingestData.chunks || []).slice(0, 4).map((c: any, i: number) => ({
            title: c.heading,
            explanation: (c.text || "").slice(0, 100) + "...",
            timestamps: [Math.round(i * 25.0 * 10) / 10],
          })),
          downloadUrl: `/api/transcribe?format=vtt`,
          fallbackUsed: false,
        };
      }

      onProcessingComplete({
        note: {
          ...ingestData,
          simplifiedSections: finalSections,
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

  const isScannedOrEmptyError =
    Boolean(
      errorMessage &&
        (errorMessage.toLowerCase().includes("scanned") ||
          errorMessage.toLowerCase().includes("no extractable text") ||
          errorMessage.toLowerCase().includes("image-based") ||
          errorMessage.toLowerCase().includes("unable to extract text") ||
          errorMessage.toLowerCase().includes("pasting the lecture text") ||
          errorMessage.toLowerCase().includes("too short"))
    );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in"
    >
      <div
        className={`relative w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden transition-colors ${
          isHighContrast
            ? "bg-black/95 text-yellow-300 border-2 border-yellow-400 shadow-[0_0_50px_rgba(250,204,21,0.25)]"
            : "bg-white/95 backdrop-blur-xl text-slate-900 border border-slate-200/80"
        }`}
      >
        {/* Header */}
        <div
          className={`p-6 border-b flex items-center justify-between ${
            isHighContrast ? "border-yellow-400/30" : "border-slate-200"
          }`}
        >
          <div>
            <h2
              id="upload-modal-title"
              className={`text-xl font-extrabold tracking-tight ${
                isHighContrast ? "text-yellow-400" : "text-slate-900"
              }`}
            >
              Process New Study Notes
            </h2>
            <p
              className={`text-xs mt-0.5 ${
                isHighContrast ? "text-yellow-200/80" : "text-slate-500"
              }`}
            >
              PDF Text Extraction, Google Gemini &amp; Deepgram Nova-3 with 14s Safe Fallback
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className={`p-2 rounded-xl transition-colors ${
              isHighContrast
                ? "text-yellow-400 hover:text-yellow-300 hover:bg-yellow-950/60 border border-yellow-400/40"
                : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            }`}
          >
            <X className="w-5 h-5" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Actionable Error Banner */}
          {errorMessage && (
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 text-sm transition-all ${
                isHighContrast
                  ? "bg-black border-2 border-yellow-400 text-yellow-300 shadow-md"
                  : isScannedOrEmptyError
                  ? "bg-amber-500/10 border-amber-500/40 text-amber-950"
                  : "bg-red-500/10 border-red-500/40 text-red-950"
              }`}
            >
              <AlertCircle
                className={`w-5 h-5 shrink-0 mt-0.5 ${
                  isHighContrast
                    ? "text-yellow-400"
                    : isScannedOrEmptyError
                    ? "text-amber-600"
                    : "text-red-600"
                }`}
              />
              <div className="flex-1 space-y-2">
                <p className="font-bold text-sm">
                  {isScannedOrEmptyError
                    ? "Scanned or Image-Based PDF Detected"
                    : "Processing Notice"}
                </p>
                <p
                  className={`text-xs leading-relaxed ${
                    isHighContrast ? "text-yellow-200/90" : "text-slate-700"
                  }`}
                >
                  {errorMessage}
                </p>
                {isScannedOrEmptyError && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        handleTabSwitch("paste");
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-xs ${
                        isHighContrast
                          ? "bg-yellow-400 text-black hover:bg-yellow-300"
                          : "bg-amber-600 text-white hover:bg-amber-700"
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Switch to Paste Lecture Text
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mode Tabs */}
          <div
            className={`flex gap-2 p-1 rounded-xl ${
              isHighContrast ? "bg-zinc-950 border border-yellow-400/40" : "bg-slate-100"
            }`}
            role="tablist"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "paste"}
              onClick={() => handleTabSwitch("paste")}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                tab === "paste"
                  ? isHighContrast
                    ? "bg-yellow-400 text-black font-extrabold shadow-sm"
                    : "bg-white text-slate-900 shadow-xs"
                  : isHighContrast
                  ? "text-yellow-300 hover:text-yellow-200 hover:bg-yellow-950/40"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText
                className={`w-4 h-4 ${
                  tab === "paste" && isHighContrast ? "text-black" : "text-indigo-600"
                }`}
              />
              Paste Lecture Text
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "file"}
              onClick={() => handleTabSwitch("file")}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                tab === "file"
                  ? isHighContrast
                    ? "bg-yellow-400 text-black font-extrabold shadow-sm"
                    : "bg-white text-slate-900 shadow-xs"
                  : isHighContrast
                  ? "text-yellow-300 hover:text-yellow-200 hover:bg-yellow-950/40"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <UploadCloud
                className={`w-4 h-4 ${
                  tab === "file" && isHighContrast ? "text-black" : "text-blue-600"
                }`}
              />
              Upload Document or Audio
            </button>
          </div>

          {/* Tab 1: Paste Text */}
          {tab === "paste" && (
            <div>
              <textarea
                rows={7}
                value={pastedText}
                onChange={(e) => {
                  setPastedText(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Paste reading assignments, textbook passages, or raw lecture notes here..."
                className={`w-full p-4 rounded-xl text-sm focus:outline-none transition-colors ${
                  isHighContrast
                    ? "bg-black text-yellow-300 border-2 border-yellow-400 focus:ring-2 focus:ring-yellow-400 placeholder:text-yellow-400/40"
                    : "bg-white text-slate-900 border border-slate-300 focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 font-sans"
                }`}
              />
              <div
                className={`flex justify-between items-center mt-1.5 text-xs ${
                  isHighContrast ? "text-yellow-300/80" : "text-slate-500"
                }`}
              >
                <span>Tip: Paste lecture notes, syllabus content, or exam study guides.</span>
                <span className="font-semibold">
                  {pastedText.trim() ? pastedText.trim().split(/\s+/).length : 0} words &bull;{" "}
                  {pastedText.length.toLocaleString()} characters
                </span>
              </div>
            </div>
          )}

          {/* Tab 2: File Upload */}
          {tab === "file" && (
            <div>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isHighContrast
                    ? "bg-black border-yellow-400 text-yellow-300 hover:bg-yellow-950/20 hover:border-yellow-300"
                    : "bg-slate-50/50 hover:bg-blue-50/30 border-slate-300 hover:border-blue-500 text-slate-800"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.mp3,.mp4,.wav,.m4a"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                    isHighContrast
                      ? "bg-yellow-400 text-black font-bold"
                      : "bg-blue-100 text-blue-600"
                  }`}
                >
                  {selectedFile?.type.startsWith("audio/") ? (
                    <Music className="w-6 h-6" />
                  ) : (
                    <UploadCloud className="w-6 h-6" />
                  )}
                </div>
                {selectedFile ? (
                  <div>
                    <p
                      className={`font-bold text-sm ${
                        isHighContrast ? "text-yellow-400" : "text-slate-900"
                      }`}
                    >
                      {selectedFile.name}
                    </p>
                    <p
                      className={`text-xs mt-1 ${
                        isHighContrast ? "text-yellow-200/80" : "text-slate-500"
                      }`}
                    >
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB &bull; Click to change
                    </p>
                  </div>
                ) : (
                  <div>
                    <p
                      className={`font-semibold text-sm ${
                        isHighContrast ? "text-yellow-300" : "text-slate-800"
                      }`}
                    >
                      Drop your PDF, whiteboard image, or lecture audio here
                    </p>
                    <p
                      className={`text-xs mt-1 ${
                        isHighContrast ? "text-yellow-200/70" : "text-slate-500"
                      }`}
                    >
                      Multi-page Text PDF, JPG, PNG, WEBP, MP3, MP4, WAV (Up to 20MB)
                    </p>
                  </div>
                )}
              </div>

              {/* Live Extraction Confirmation Badge */}
              {extractedStats && (
                <div
                  className={`mt-3 p-3 rounded-xl border flex items-center gap-2.5 text-xs ${
                    isHighContrast
                      ? "bg-black border-yellow-400 text-yellow-300"
                      : "bg-emerald-50 border-emerald-200 text-emerald-900"
                  }`}
                >
                  <CheckCircle2
                    className={`w-4 h-4 shrink-0 ${
                      isHighContrast ? "text-yellow-400" : "text-emerald-600"
                    }`}
                  />
                  <span>
                    Successfully extracted <strong>{extractedStats.chars.toLocaleString()} characters</strong> (
                    {extractedStats.words.toLocaleString()} words across {extractedStats.chunks} sections).
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Metadata Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                className={`block text-xs font-bold uppercase tracking-wider mb-1 ${
                  isHighContrast ? "text-yellow-300" : "text-slate-600"
                }`}
              >
                Subject (Optional)
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Data Structures, Operating Systems, Biology"
                className={`w-full px-3.5 py-2 rounded-lg text-sm focus:outline-none transition-colors ${
                  isHighContrast
                    ? "bg-black text-yellow-300 border-2 border-yellow-400 focus:ring-2 focus:ring-yellow-400 placeholder:text-yellow-400/40"
                    : "bg-white text-slate-900 border border-slate-300 focus:ring-2 focus:ring-blue-500"
                }`}
              />
            </div>
            <div>
              <label
                className={`block text-xs font-bold uppercase tracking-wider mb-1 ${
                  isHighContrast ? "text-yellow-300" : "text-slate-600"
                }`}
              >
                Target Level
              </label>
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className={`w-full px-3.5 py-2 rounded-lg text-sm focus:outline-none transition-colors ${
                  isHighContrast
                    ? "bg-black text-yellow-300 border-2 border-yellow-400 focus:ring-2 focus:ring-yellow-400"
                    : "bg-white text-slate-900 border border-slate-300 focus:ring-2 focus:ring-blue-500"
                }`}
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
            <div
              className={`p-4 rounded-xl border space-y-2.5 ${
                isHighContrast
                  ? "bg-black border-2 border-yellow-400 text-yellow-300"
                  : "bg-blue-50 border border-blue-200 text-blue-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles
                  className={`w-5 h-5 animate-spin ${
                    isHighContrast ? "text-yellow-400" : "text-blue-600"
                  }`}
                />
                <span className="font-bold text-sm">{stepMessage}</span>
              </div>
              <div
                className={`w-full h-2 rounded-full overflow-hidden ${
                  isHighContrast ? "bg-yellow-950/80 border border-yellow-400/40" : "bg-blue-200"
                }`}
              >
                <div
                  className={`h-full w-2/3 animate-pulse ${
                    isHighContrast ? "bg-yellow-400" : "bg-blue-600"
                  }`}
                />
              </div>
              <p
                className={`text-[11px] ${
                  isHighContrast ? "text-yellow-200/80" : "text-blue-700"
                }`}
              >
                Extracting real content. Safe fallback activates automatically if Gemini or network stalls.
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${
                  isHighContrast
                    ? "text-yellow-400 border border-yellow-400/50 hover:bg-yellow-950/40"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-6 py-2.5 rounded-xl font-bold shadow-sm transition-all text-sm flex items-center gap-2 ${
                  isHighContrast
                    ? "bg-yellow-400 text-black hover:bg-yellow-300 border-2 border-yellow-300"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                <Sparkles
                  className={`w-4 h-4 ${
                    isHighContrast ? "text-black" : "text-amber-300"
                  }`}
                />
                Process Notes with AI
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
