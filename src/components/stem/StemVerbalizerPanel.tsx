"use client";

import * as React from "react";
import katex from "katex";
import {
  StemElement,
  StemVerbalizerResult,
  AccessibilitySettings,
} from "@/types/api";
import {
  Upload,
  Sparkles,
  Volume2,
  VolumeX,
  AlertTriangle,
  HelpCircle,
  ListOrdered,
  ChevronDown,
  ChevronUp,
  FileImage,
  Loader2,
  CheckCircle,
  Binary,
  LineChart,
} from "lucide-react";
import { useAccessibilitySettings } from "@/hooks/useAccessibilitySettings";

interface StemVerbalizerPanelProps {
  settings?: AccessibilitySettings;
  documentId?: string;
  highContrast?: boolean;
}

export function StemVerbalizerPanel({
  settings: propSettings,
  documentId = "stem_doc_current",
  highContrast: propHighContrast,
}: StemVerbalizerPanelProps) {
  const { settings: hookSettings } = useAccessibilitySettings();
  const settings = propSettings || hookSettings;
  const isHighContrast =
    propHighContrast !== undefined
      ? propHighContrast
      : (settings?.highContrast || settings?.profile === "low_vision");
  const [result, setResult] = React.useState<StemVerbalizerResult | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  // Expanded toggles for each element
  const [expandedSteps, setExpandedSteps] = React.useState<Record<string, boolean>>({});
  const [expandedVariables, setExpandedVariables] = React.useState<Record<string, boolean>>({});

  // TTS Speech State
  const [speakingElementId, setSpeakingElementId] = React.useState<string | null>(null);
  const [isPaused, setIsPaused] = React.useState(false);

  // Cleanup speech synthesis on unmount
  React.useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const toggleSteps = (id: string) => {
    setExpandedSteps((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleVariables = (id: string) => {
    setExpandedVariables((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // 1-Click Load Sample STEM fixture
  const handleLoadSample = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setSelectedFile(null);
    setPreviewUrl(null);

    try {
      const res = await fetch("/samples/stem-sample.json");
      if (!res.ok) throw new Error("Could not load sample STEM data");
      const sampleData: StemVerbalizerResult = await res.json();
      setResult(sampleData);

      // Auto-expand first element's steps
      if (sampleData.elements.length > 0) {
        setExpandedSteps({ [sampleData.elements[0].id]: true });
        setExpandedVariables({ [sampleData.elements[0].id]: true });
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load sample STEM data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("Image size exceeds 10 MB limit. Please select a smaller photo.");
      return;
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setErrorMsg("Please select a JPG, PNG, or WEBP image.");
      return;
    }

    setErrorMsg(null);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUploadAndAnalyze = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("documentId", documentId);
      formData.append("subject", "STEM / Mathematics");
      formData.append("readingLevel", "grade_6");
      formData.append("language", settings?.language || "en");

      const res = await fetch("/api/stem-verbalizer", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Upload failed with HTTP ${res.status}`);
      }

      const data: StemVerbalizerResult = await res.json();
      setResult(data);

      if (data.elements.length > 0) {
        setExpandedSteps({ [data.elements[0].id]: true });
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to analyze STEM image");
    } finally {
      setIsLoading(false);
    }
  };

  // Text-To-Speech handler for spoken mathematical audio
  const handleReadAloud = (element: StemElement) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Speech synthesis is not supported in this browser.");
      return;
    }

    // If currently speaking this element, toggle stop
    if (speakingElementId === element.id) {
      window.speechSynthesis.cancel();
      setSpeakingElementId(null);
      setIsPaused(false);
      return;
    }

    window.speechSynthesis.cancel();

    // Prepare speech text: verbalized formula + step by step explanation
    const spokenParts: string[] = [];
    spokenParts.push(`Identified ${element.type}.`);
    spokenParts.push(`Spoken formula: ${element.accessibleMathText}.`);

    if (element.description) {
      spokenParts.push(element.description);
    }

    if (element.stepByStepExplanation && element.stepByStepExplanation.length > 0) {
      spokenParts.push("Step-by-step breakdown: " + element.stepByStepExplanation.join(". "));
    }

    if (element.variables && element.variables.length > 0) {
      spokenParts.push(
        "Variable symbols: " +
          element.variables
            .map((v) => `${v.symbol} represents ${v.meaning}${v.unit ? ` in ${v.unit}` : ""}`)
            .join(". ")
      );
    }

    const fullText = spokenParts.join(" ");
    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.rate = settings?.ttsRate || 1.0;
    utterance.pitch = settings?.ttsPitch || 1.0;

    utterance.onstart = () => {
      setSpeakingElementId(element.id);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setSpeakingElementId(null);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setSpeakingElementId(null);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const renderKatex = (latex: string) => {
    try {
      const html = katex.renderToString(latex, {
        throwOnError: false,
        displayMode: true,
      });
      return (
        <div
          className={isHighContrast ? "text-yellow-300" : "text-slate-900"}
          style={{ color: isHighContrast ? "#fde047" : "#0f172a" }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    } catch {
      return (
        <code
          className={`block p-3 rounded text-sm font-mono ${
            isHighContrast
              ? "bg-zinc-900 text-yellow-300 border border-yellow-400"
              : "bg-slate-100 text-slate-800"
          }`}
        >
          {latex}
        </code>
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload & Action Card */}
      <section
        aria-label="STEM & Math Diagram Verbalizer"
        className={`rounded-2xl p-6 transition-all ${
          isHighContrast
            ? "bg-black/95 text-yellow-300 border-2 border-yellow-400 shadow-xl"
            : "bg-white/95 backdrop-blur-md text-slate-900 border border-slate-200 shadow-sm"
        }`}
      >
        <div className={`flex flex-wrap items-center justify-between gap-4 pb-4 border-b mb-6 ${
          isHighContrast ? "border-yellow-400/40" : "border-slate-100"
        }`}>
          <div>
            <div className="flex items-center gap-2">
              <Binary className={`w-5 h-5 ${isHighContrast ? "text-yellow-400" : "text-indigo-600"}`} />
              <h2 className={`text-xl font-bold tracking-tight ${isHighContrast ? "text-yellow-300" : "text-slate-900"}`}>
                STEM &amp; Diagram Verbalizer
              </h2>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                isHighContrast
                  ? "bg-zinc-900 text-yellow-300 border border-yellow-400"
                  : "bg-indigo-50 text-indigo-700"
              }`}>
                KaTeX &bull; Screen Reader Safe &bull; Multimodal
              </span>
            </div>
            <p className={`text-sm mt-1 ${isHighContrast ? "text-yellow-200/80" : "text-slate-600"}`}>
              Transforms whiteboard photos, textbook equations, diagrams, and handwriting into spoken math that screen readers read aloud naturally without confusing raw LaTeX.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLoadSample}
            disabled={isLoading}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-colors disabled:opacity-50 ${
              isHighContrast
                ? "bg-yellow-400 text-black hover:bg-yellow-300 border-2 border-yellow-400"
                : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${isHighContrast ? "text-black" : "text-amber-500"}`} />
            ⚡ 1-Click Load Sample STEM Board
          </button>
        </div>

        {/* Upload Control */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div>
            <label
              htmlFor="stem-file-upload"
              className={`block text-sm font-semibold mb-2 ${
                isHighContrast ? "text-yellow-300" : "text-slate-800"
              }`}
            >
              Upload a photo of a board, equation, graph, or diagram:
            </label>
            <div className="flex items-center gap-3">
              <input
                id="stem-file-upload"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                disabled={isLoading}
                className={`text-xs file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold cursor-pointer ${
                  isHighContrast
                    ? "text-yellow-200 file:bg-yellow-400 file:text-black hover:file:bg-yellow-300"
                    : "text-slate-600 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                }`}
              />
              {selectedFile && (
                <button
                  type="button"
                  onClick={handleUploadAndAnalyze}
                  disabled={isLoading}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs shadow-xs transition-all disabled:opacity-50 ${
                    isHighContrast
                      ? "bg-yellow-400 text-black hover:bg-yellow-300 border-2 border-yellow-400"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      Analyze Photo
                    </>
                  )}
                </button>
              )}
            </div>
            <span className={`text-[11px] block mt-1 ${isHighContrast ? "text-yellow-400/80" : "text-slate-400"}`}>
              Supported formats: JPG, PNG, WEBP (up to 10 MB).
            </span>
          </div>

          {previewUrl && (
            <div className={`flex items-center gap-3 p-3 rounded-xl border ${
              isHighContrast
                ? "bg-zinc-950 border-2 border-yellow-400 text-yellow-300"
                : "bg-slate-50 border-slate-200 text-slate-800"
            }`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Uploaded STEM reference preview"
                className={`w-16 h-16 object-cover rounded-lg border ${
                  isHighContrast ? "border-yellow-400" : "border-slate-300"
                }`}
              />
              <div className="text-xs">
                <span className={`font-semibold block truncate max-w-[200px] ${
                  isHighContrast ? "text-yellow-300" : "text-slate-800"
                }`}>
                  {selectedFile?.name}
                </span>
                <span className={isHighContrast ? "text-yellow-400/80" : "text-slate-500"}>
                  {selectedFile ? Math.round(selectedFile.size / 1024) : 0} KB
                </span>
              </div>
            </div>
          )}
        </div>

        {errorMsg && (
          <div
            role="alert"
            className={`mt-4 p-3 rounded-lg border text-xs flex items-center gap-2 ${
              isHighContrast
                ? "bg-zinc-950 border-2 border-red-500 text-red-300"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            <AlertTriangle className={`w-4 h-4 shrink-0 ${isHighContrast ? "text-red-400" : "text-red-600"}`} />
            <span>{errorMsg}</span>
          </div>
        )}
      </section>

      {/* Loading state skeleton */}
      {isLoading && (
        <div className={`rounded-2xl p-12 text-center shadow-xs animate-pulse border ${
          isHighContrast
            ? "border-2 border-yellow-400 bg-black/95 text-yellow-300"
            : "border-slate-200 bg-white/95 text-slate-800"
        }`}>
          <Loader2 className={`w-8 h-8 animate-spin mx-auto mb-3 ${
            isHighContrast ? "text-yellow-400" : "text-indigo-600"
          }`} />
          <h3 className={`text-base font-bold ${isHighContrast ? "text-yellow-300" : "text-slate-800"}`}>
            Analyzing STEM Image with Gemini Multimodal...
          </h3>
          <p className={`text-xs mt-1 ${isHighContrast ? "text-yellow-400/80" : "text-slate-500"}`}>
            Detecting equations, graphing axes, and converting symbols to spoken speech.
          </p>
        </div>
      )}
      {/* Results Workspace */}
      {result && !isLoading && (
        <div className="space-y-6">
          {/* Header Summary */}
          <div className={`rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-3 border ${
            isHighContrast
              ? "bg-black/95 border-2 border-yellow-400 text-yellow-300"
              : "bg-white/95 border-slate-200 text-slate-800"
          }`}>
            <div>
              <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                isHighContrast
                  ? "bg-zinc-900 text-yellow-300 border border-yellow-400"
                  : "bg-indigo-50 text-indigo-600"
              }`}>
                {result.elements.length} STEM Elements Detected
              </span>
              <p className={`text-sm font-semibold mt-2 ${
                isHighContrast ? "text-yellow-200" : "text-slate-800"
              }`}>
                {result.overallExplanation}
              </p>
            </div>

            {result.fallbackUsed && (
              <span className={`text-xs px-2.5 py-1 rounded-md font-semibold border ${
                isHighContrast
                  ? "bg-amber-950 text-amber-300 border-amber-400"
                  : "bg-amber-100 text-amber-900 border-amber-300"
              }`}>
                Fallback Safeguard Active
              </span>
            )}
          </div>

          {/* Elements List */}
          <div className="space-y-5">
            {result.elements.map((elem, idx) => {
              const isSpeaking = speakingElementId === elem.id;
              const stepsOpen = !!expandedSteps[elem.id];
              const varsOpen = !!expandedVariables[elem.id];

              return (
                <article
                  key={elem.id || idx}
                  className={`rounded-2xl p-6 transition-all border ${
                    isHighContrast
                      ? "bg-black/95 border-2 border-yellow-400 text-yellow-300 shadow-xl"
                      : "bg-white/95 backdrop-blur-sm border-slate-200 text-slate-900 shadow-sm hover:border-slate-300"
                  }`}
                >
                  {/* Element Header */}
                  <div className={`flex flex-wrap items-center justify-between gap-3 pb-3 border-b mb-4 ${
                    isHighContrast ? "border-yellow-400/40" : "border-slate-100"
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-md capitalize ${
                        isHighContrast
                          ? "bg-zinc-900 text-yellow-300 border border-yellow-400"
                          : "bg-slate-100 text-slate-800"
                      }`}>
                        {elem.type.replace("_", " ")}
                      </span>
                      <span className={`text-xs font-mono ${isHighContrast ? "text-yellow-400/80" : "text-slate-400"}`}>
                        #{idx + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-semibold ${
                          isHighContrast
                            ? "bg-zinc-900 text-yellow-300 border border-yellow-400"
                            : elem.confidence === "high"
                            ? "bg-emerald-100 text-emerald-800"
                            : elem.confidence === "medium"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {elem.confidence.toUpperCase()} CONFIDENCE
                      </span>
                    </div>
                  </div>

                  {/* Low Confidence Warning Banner */}
                  {elem.confidence === "low" && (
                    <div
                      role="status"
                      className={`mb-4 p-3 rounded-xl text-xs flex items-start gap-2.5 border ${
                        isHighContrast
                          ? "bg-zinc-950 border-2 border-yellow-400 text-yellow-200"
                          : "bg-amber-50 border-amber-300 text-amber-950"
                      }`}
                    >
                      <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${
                        isHighContrast ? "text-yellow-400" : "text-amber-600"
                      }`} />
                      <div>
                        <strong>Low Visual Confidence:</strong> Some symbols or labels in this
                        region were difficult to resolve clearly. No equations were fabricated.
                        Please verify visually or retake photo with clearer lighting.
                      </div>
                    </div>
                  )}

                  {/* KaTeX Mathematical Formula Presentation */}
                  {elem.latex && (
                    <div
                      role="math"
                      aria-label={elem.accessibleMathText}
                      className={`my-4 p-4 rounded-xl overflow-x-auto text-center border ${
                        isHighContrast
                          ? "bg-black/95 border-2 border-yellow-400 text-yellow-300"
                          : "bg-slate-50 border-slate-200 text-slate-900"
                      }`}
                    >
                      {renderKatex(elem.latex)}
                    </div>
                  )}

                  {/* Spoken Accessible Math Audio Text */}
                  <div className={`mb-4 p-3.5 rounded-xl text-sm border ${
                    isHighContrast
                      ? "bg-zinc-950 border-2 border-yellow-400 text-yellow-300"
                      : "bg-indigo-50/70 border-indigo-100 text-indigo-950"
                  }`}>
                    <span className={`text-xs font-bold uppercase tracking-wider block mb-1 ${
                      isHighContrast ? "text-yellow-400 font-black" : "text-indigo-700"
                    }`}>
                      🗣️ Spoken Mathematical Description (Screen-Reader Safe):
                    </span>
                    <p className={`italic font-medium ${isHighContrast ? "text-yellow-200" : "text-slate-800"}`}>
                      &ldquo;{elem.accessibleMathText}&rdquo;
                    </p>
                  </div>

                  {/* Description */}
                  <p className={`text-sm mb-4 ${isHighContrast ? "text-yellow-200" : "text-slate-700"}`}>
                    {elem.description}
                  </p>

                  {/* Chart / Graph breakdown if present */}
                  {elem.chart && (
                    <div className={`mb-4 p-4 rounded-xl border ${
                      isHighContrast
                        ? "bg-zinc-950 border-2 border-yellow-400 text-yellow-300"
                        : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <LineChart className={`w-4 h-4 ${isHighContrast ? "text-yellow-400" : "text-indigo-600"}`} />
                        <h4 className={`font-bold text-sm ${isHighContrast ? "text-yellow-300" : "text-slate-900"}`}>
                          {elem.chart.title || "Graph Breakdown"}
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-3">
                        {elem.chart.xAxis && (
                          <div className={`p-2 rounded border ${
                            isHighContrast
                              ? "bg-zinc-900 border-yellow-400 text-yellow-200"
                              : "bg-white border-slate-200 text-slate-800"
                          }`}>
                            <strong>X-Axis (Horizontal):</strong> {elem.chart.xAxis}
                          </div>
                        )}
                        {elem.chart.yAxis && (
                          <div className={`p-2 rounded border ${
                            isHighContrast
                              ? "bg-zinc-900 border-yellow-400 text-yellow-200"
                              : "bg-white border-slate-200 text-slate-800"
                          }`}>
                            <strong>Y-Axis (Vertical):</strong> {elem.chart.yAxis}
                          </div>
                        )}
                      </div>
                      {elem.chart.series && (
                        <div className="space-y-2">
                          {elem.chart.series.map((s, sIdx) => (
                            <div key={sIdx} className={`text-xs p-2.5 rounded border ${
                              isHighContrast
                                ? "bg-zinc-900 border-yellow-400 text-yellow-200"
                                : "bg-white border-slate-200 text-slate-800"
                            }`}>
                              <span className={`font-bold ${isHighContrast ? "text-yellow-400" : "text-indigo-900"}`}>
                                {s.label}:{" "}
                              </span>
                              <span className={isHighContrast ? "text-yellow-200" : "text-slate-700"}>{s.trend}</span>
                              {s.notablePoints && s.notablePoints.length > 0 && (
                                <ul className={`list-disc list-inside mt-1 ${isHighContrast ? "text-yellow-300/80" : "text-slate-600"}`}>
                                  {s.notablePoints.map((pt, ptIdx) => (
                                    <li key={ptIdx}>{pt}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Interactive Control Buttons */}
                  <div className={`flex flex-wrap items-center gap-2.5 pt-3 border-t ${
                    isHighContrast ? "border-yellow-400/40" : "border-slate-100"
                  }`}>
                    <button
                      type="button"
                      onClick={() => handleReadAloud(elem)}
                      aria-label={
                        isSpeaking
                          ? "Stop reading explanation aloud"
                          : `Read explanation aloud for ${elem.type}`
                      }
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                        isSpeaking
                          ? "bg-red-600 text-white shadow-sm"
                          : isHighContrast
                          ? "bg-yellow-400 text-black hover:bg-yellow-300 border-2 border-yellow-400"
                          : "bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                      }`}
                    >
                      {isSpeaking ? (
                        <>
                          <VolumeX className="w-3.5 h-3.5" />
                          Stop Audio
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          Read Explanation Aloud
                        </>
                      )}
                    </button>

                    {elem.stepByStepExplanation && elem.stepByStepExplanation.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleSteps(elem.id)}
                        aria-expanded={stepsOpen}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors border ${
                          isHighContrast
                            ? "bg-zinc-900 border-2 border-yellow-400 text-yellow-300 hover:bg-zinc-800"
                            : "border-slate-300 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <ListOrdered className={`w-3.5 h-3.5 ${isHighContrast ? "text-yellow-400" : "text-slate-500"}`} />
                        Explain Step by Step
                        {stepsOpen ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}

                    {elem.variables && elem.variables.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleVariables(elem.id)}
                        aria-expanded={varsOpen}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors border ${
                          isHighContrast
                            ? "bg-zinc-900 border-2 border-yellow-400 text-yellow-300 hover:bg-zinc-800"
                            : "border-slate-300 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <HelpCircle className={`w-3.5 h-3.5 ${isHighContrast ? "text-yellow-400" : "text-blue-600"}`} />
                        What does this symbol mean? ({elem.variables.length})
                        {varsOpen ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Step By Step Accordion */}
                  {stepsOpen && elem.stepByStepExplanation && (
                    <div className={`mt-4 p-4 rounded-xl animate-in fade-in border ${
                      isHighContrast
                        ? "bg-zinc-950 border-2 border-yellow-400 text-yellow-300"
                        : "bg-amber-50/60 border-amber-200/80 text-amber-950"
                    }`}>
                      <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${
                        isHighContrast ? "text-yellow-400 font-black" : "text-amber-900"
                      }`}>
                        <ListOrdered className={`w-3.5 h-3.5 ${isHighContrast ? "text-yellow-400" : "text-amber-700"}`} />
                        Step-by-Step Reasoning:
                      </h4>
                      <ol className={`space-y-1.5 list-decimal list-inside text-sm ${
                        isHighContrast ? "text-yellow-200" : "text-slate-800"
                      }`}>
                        {elem.stepByStepExplanation.map((step, sIdx) => (
                          <li key={sIdx} className="leading-relaxed">
                            {step.replace(/^Step\s*\d+:\s*/i, "")}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Variables & Symbols Breakdown Accordion */}
                  {varsOpen && elem.variables && (
                    <div className={`mt-4 p-4 rounded-xl animate-in fade-in border ${
                      isHighContrast
                        ? "bg-zinc-950 border-2 border-yellow-400 text-yellow-300"
                        : "bg-blue-50/60 border-blue-200/80 text-blue-950"
                    }`}>
                      <h4 className={`text-xs font-bold uppercase tracking-wider mb-2.5 flex items-center gap-1.5 ${
                        isHighContrast ? "text-yellow-400 font-black" : "text-blue-900"
                      }`}>
                        <HelpCircle className={`w-3.5 h-3.5 ${isHighContrast ? "text-yellow-400" : "text-blue-700"}`} />
                        Symbol &amp; Variable Meanings:
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {elem.variables.map((v, vIdx) => (
                          <div
                            key={vIdx}
                            className={`p-2.5 rounded-lg text-xs border ${
                              isHighContrast
                                ? "bg-zinc-900 border-yellow-400/60 text-yellow-200"
                                : "bg-white border-blue-100 text-slate-800"
                            }`}
                          >
                            <span className={`font-mono font-bold text-sm ${
                              isHighContrast ? "text-yellow-400 font-black" : "text-blue-700"
                            }`}>
                              {v.symbol}
                            </span>
                            <span className={`mx-1.5 ${isHighContrast ? "text-yellow-400" : "text-slate-500"}`}>&rarr;</span>
                            <span className="font-medium">{v.meaning}</span>
                            {v.unit && (
                              <span className={`block text-[11px] mt-0.5 ${
                                isHighContrast ? "text-yellow-300/80" : "text-slate-500"
                              }`}>
                                Unit: {v.unit}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {/* Key Takeaways & Warnings */}
          {result.keyTakeaways && result.keyTakeaways.length > 0 && (
            <div className={`rounded-2xl p-5 border ${
              isHighContrast
                ? "bg-zinc-950 border-2 border-yellow-400 text-yellow-300"
                : "bg-emerald-50 border-emerald-200 text-emerald-950"
            }`}>
              <h3 className={`font-bold text-sm mb-2 flex items-center gap-1.5 ${
                isHighContrast ? "text-yellow-400 font-black" : "text-emerald-950"
              }`}>
                <CheckCircle className={`w-4 h-4 ${isHighContrast ? "text-yellow-400" : "text-emerald-600"}`} />
                Key STEM Takeaways:
              </h3>
              <ul className={`space-y-1 text-xs list-disc list-inside ${
                isHighContrast ? "text-yellow-200" : "text-emerald-900"
              }`}>
                {result.keyTakeaways.map((t, idx) => (
                  <li key={idx}>{t}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { StemVerbalizerPanel as StemVerbalizer };
