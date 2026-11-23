"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  TutorAnswer,
  TutorCitation,
  AccessibilitySettings,
  AccessibilityProfile,
  DocumentChunk,
} from "@/types/api";
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  X,
  Volume2,
  VolumeX,
  AlertCircle,
  HelpCircle,
  CheckCircle,
  BookOpen,
  Clock,
  ArrowRight,
  Loader2,
  CornerDownLeft,
} from "lucide-react";

interface TutorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  settings: AccessibilitySettings;
  contextChunks?: DocumentChunk[];
  transcriptSegments?: Array<{ id: number; start: number; end: number; text: string }>;
  onNavigateToChunk?: (chunkId: string) => void;
  onNavigateToTimestamp?: (startSeconds: number) => void;
}

export function TutorPanel({
  isOpen,
  onClose,
  documentId,
  settings,
  contextChunks = [],
  transcriptSegments = [],
  onNavigateToChunk,
  onNavigateToTimestamp,
}: TutorPanelProps) {
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<TutorAnswer[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [speakingAnswerId, setSpeakingAnswerId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Initialize Speech Recognition for Voice Questions
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setQuestion(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Escape key closes slide-over
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (history.length > 0) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [history]);

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert("Voice speech recognition is not supported in this browser (Chrome or Edge recommended).");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setQuestion("");
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn("Speech recognition start failed:", err);
      }
    }
  };

  const handleSendQuestion = async (queryToSend?: string) => {
    const q = (queryToSend || question).trim();
    if (!q || isLoading) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    setIsLoading(true);
    setQuestion("");

    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          question: q,
          accessibilityProfile: settings.profile || "dyslexia",
          language: settings.language || "en",
          voiceQuestion: false,
          contextChunks: contextChunks.map((c) => ({
            id: c.id,
            heading: c.heading,
            text: c.text,
            keyTerms: c.keyTerms,
          })),
          transcriptSegments: transcriptSegments.map((s) => ({
            id: s.id,
            start: s.start,
            end: s.end,
            text: s.text,
          })),
        }),
      });

      if (!res.ok) {
        throw new Error(`Tutor request failed with status ${res.status}`);
      }

      const answerData: TutorAnswer = await res.json();
      setHistory((prev) => [...prev, answerData]);
    } catch (err: any) {
      console.error("Tutor error:", err);
      const errorFallback: TutorAnswer = {
        answerId: `ans_err_${Date.now().toString(36)}`,
        question: q,
        answer: "I could not find enough evidence in this material to answer your question.",
        simplifiedAnswer: "This note does not have enough information to answer that question.",
        confidence: "insufficient_evidence",
        citations: [],
        followUpQuestions: [
          "What is the main topic covered in this document?",
          "Can you list the key vocabulary terms?",
        ],
        fallbackUsed: true,
      };
      setHistory((prev) => [...prev, errorFallback]);
    } finally {
      setIsLoading(false);
    }
  };

  // Text-to-Speech handler for answers
  const handleReadAnswerAloud = (ans: TutorAnswer) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (speakingAnswerId === ans.answerId) {
      window.speechSynthesis.cancel();
      setSpeakingAnswerId(null);
      return;
    }

    window.speechSynthesis.cancel();

    const text = settings.profile === "dyslexia" ? ans.simplifiedAnswer || ans.answer : ans.answer;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = settings.ttsRate || 1.0;
    utterance.pitch = settings.ttsPitch || 1.0;

    utterance.onstart = () => setSpeakingAnswerId(ans.answerId);
    utterance.onend = () => setSpeakingAnswerId(null);
    utterance.onerror = () => setSpeakingAnswerId(null);

    window.speechSynthesis.speak(utterance);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Grounded AI Study Tutor"
      className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end"
    >
      {/* Slide-over panel */}
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200 motion-reduce:transition-none">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Ask This Lecture
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Grounded &bull; Zero Hallucination
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Answers strictly locked to your active lecture notes and transcript.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close tutor panel"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conversation Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {history.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-3">
              <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-slate-800">
                What would you like to understand better?
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Ask any question about formulas, definitions, processes, or timestamps. The tutor only uses your uploaded material.
              </p>

              {/* Starter Prompt Suggestions */}
              <div className="pt-3 flex flex-col gap-1.5 max-w-sm mx-auto text-left">
                {[
                  "What is the main role of chloroplasts in photosynthesis?",
                  "How does the Calvin Cycle differ from light reactions?",
                  "Can you explain ATP in simple words?",
                ].map((prompt, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => handleSendQuestion(prompt)}
                    className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 text-xs text-slate-700 hover:text-indigo-900 font-medium text-left transition-colors flex items-center justify-between"
                  >
                    <span>&ldquo;{prompt}&rdquo;</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            history.map((item, idx) => {
              const isSpeaking = speakingAnswerId === item.answerId;
              const isInsufficient = item.confidence === "insufficient_evidence";

              return (
                <div key={item.answerId || idx} className="space-y-3">
                  {/* User Question */}
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-indigo-600 text-white px-4 py-2.5 text-xs font-semibold shadow-xs">
                      {item.question}
                    </div>
                  </div>

                  {/* Tutor Answer Card */}
                  <div className="flex justify-start">
                    <div
                      className={`max-w-[95%] rounded-2xl rounded-tl-xs p-4 border shadow-xs space-y-3 ${
                        isInsufficient
                          ? "bg-amber-50 border-amber-300 text-amber-950"
                          : settings.profile === "low_vision" && settings.highContrast
                          ? "bg-black text-yellow-300 border-yellow-400"
                          : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    >
                      {/* Confidence / Refusal Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isInsufficient
                              ? "bg-amber-200 text-amber-900"
                              : item.confidence === "high"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {isInsufficient
                            ? "Strict Refusal: Insufficient Evidence"
                            : `${item.confidence.toUpperCase()} CONFIDENCE`}
                        </span>

                        {/* Read Aloud Button */}
                        <button
                          type="button"
                          onClick={() => handleReadAnswerAloud(item)}
                          aria-label={isSpeaking ? "Stop audio" : "Read answer aloud"}
                          className={`p-1 rounded text-xs inline-flex items-center gap-1 font-semibold transition-colors ${
                            isSpeaking
                              ? "text-red-600 bg-red-100"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {isSpeaking ? (
                            <>
                              <VolumeX className="w-3.5 h-3.5" /> Stop
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5" /> Listen
                            </>
                          )}
                        </button>
                      </div>

                      {/* Main Answer Content (Adapted per profile) */}
                      {isInsufficient ? (
                        <div className="text-xs space-y-1">
                          <p className="font-bold">
                            I could not find enough evidence in this material.
                          </p>
                          <p className="opacity-90">{item.answer}</p>
                        </div>
                      ) : (
                        <div
                          className="text-xs sm:text-sm leading-relaxed"
                          style={{
                            fontFamily:
                              settings.profile === "dyslexia" && settings.fontFamily === "opendyslexic"
                                ? "OpenDyslexic, sans-serif"
                                : "inherit",
                          }}
                        >
                          {settings.profile === "dyslexia" && item.simplifiedAnswer ? (
                            <p>{item.simplifiedAnswer}</p>
                          ) : (
                            <p>{item.answer}</p>
                          )}
                        </div>
                      )}

                      {/* Clickable Grounded Citations */}
                      {item.citations && item.citations.length > 0 && (
                        <div className="pt-2 border-t border-black/10 text-xs">
                          <span className="font-bold text-[11px] uppercase tracking-wider block mb-1 text-slate-600">
                            Verified Source Evidence:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {item.citations.map((cite, cIdx) => (
                              <button
                                key={cIdx}
                                type="button"
                                onClick={() => {
                                  if (cite.chunkId && onNavigateToChunk) {
                                    onNavigateToChunk(cite.chunkId);
                                  } else if (
                                    typeof cite.startSeconds === "number" &&
                                    onNavigateToTimestamp
                                  ) {
                                    onNavigateToTimestamp(cite.startSeconds);
                                  }
                                }}
                                title={`Quote: "${cite.quotedEvidence}"`}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white border border-slate-300 hover:border-indigo-500 hover:bg-indigo-50 text-[11px] font-semibold text-slate-800 transition-colors cursor-pointer"
                              >
                                {cite.chunkId ? (
                                  <>
                                    <BookOpen className="w-3 h-3 text-indigo-600 shrink-0" />
                                    <span>Section {cite.chunkId.replace(/^chunk_?/, "")}</span>
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-3 h-3 text-emerald-600 shrink-0" />
                                    <span>
                                      {Math.floor((cite.startSeconds || 0) / 60)}:
                                      {(cite.startSeconds || 0) % 60 < 10 ? "0" : ""}
                                      {Math.floor(cite.startSeconds || 0) % 60}
                                    </span>
                                  </>
                                )}
                              </button>
                            ))}
                          </div>
                          {/* Evidence Preview */}
                          {item.citations[0]?.quotedEvidence && (
                            <p className="mt-1.5 text-[11px] italic text-slate-500 border-l-2 border-indigo-400 pl-2">
                              &ldquo;{item.citations[0].quotedEvidence}&rdquo;
                            </p>
                          )}
                        </div>
                      )}

                      {/* Clickable Follow-up Questions */}
                      {item.followUpQuestions && item.followUpQuestions.length > 0 && (
                        <div className="pt-2 border-t border-black/10">
                          <span className="font-bold text-[10px] uppercase tracking-wider block mb-1.5 text-slate-500">
                            Related Questions:
                          </span>
                          <div className="flex flex-col gap-1">
                            {item.followUpQuestions.map((fQ, fIdx) => (
                              <button
                                key={fIdx}
                                type="button"
                                onClick={() => handleSendQuestion(fQ)}
                                className="text-left text-[11px] font-medium text-indigo-700 hover:text-indigo-900 hover:underline flex items-center gap-1"
                              >
                                <span>&bull; {fQ}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {isLoading && (
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl text-xs text-slate-600 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              <span>Scanning verified lecture chunks &amp; cross-referencing citations...</span>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Input & Voice Bar */}
        <div className="p-3 border-t border-slate-200 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuestion();
            }}
            className="flex items-center gap-2"
          >
            <button
              type="button"
              onClick={toggleMic}
              aria-label={isListening ? "Stop voice listening" : "Ask question by voice"}
              className={`p-2.5 rounded-xl border transition-all ${
                isListening
                  ? "bg-red-500 text-white border-red-600 animate-pulse"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300"
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={
                  isListening
                    ? "Listening... speak now"
                    : "Ask about this material..."
                }
                disabled={isLoading}
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 pr-9 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !question.trim()}
              aria-label="Send question to tutor"
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
          {isListening && (
            <p className="text-[10px] text-red-600 font-semibold mt-1 animate-pulse">
              Microphone active &bull; Speak clearly into your mic
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
