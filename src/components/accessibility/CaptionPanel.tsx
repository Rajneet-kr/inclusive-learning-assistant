"use client";

import * as React from "react";
import { Mic, MicOff, Sparkles } from "lucide-react";
import { GlossaryTerm } from "@/types/api";
import { sampleBiologyNote } from "@/lib/sampleData";
import { LiveGlossaryPopup } from "@/components/captions/LiveGlossaryPopup";

interface CaptionPanelProps {
  onCaptionChange?: (caption: string) => void;
  glossary?: GlossaryTerm[];
}

export function CaptionPanel({ onCaptionChange, glossary }: CaptionPanelProps) {
  const [isListening, setIsListening] = React.useState(false);
  const [currentCaption, setCurrentCaption] = React.useState("");
  const recognitionRef = React.useRef<any>(null);

  // Fallback glossary from sample note if none provided
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

  React.useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setCurrentCaption(transcript);
        onCaptionChange?.(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [onCaptionChange]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert(
        "Browser SpeechRecognition is not supported in this browser (Chrome/Edge recommended)."
      );
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setCurrentCaption("");
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleTestGlossary = () => {
    const sampleText =
      "Plants use chloroplasts and chlorophyll for photosynthesis to make glucose.";
    setCurrentCaption(sampleText);
    onCaptionChange?.(sampleText);
  };

  return (
    <div className="rounded-2xl border border-cyan-400/30 bg-slate-950/90 backdrop-blur-md text-white p-5 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
          Live Browser SpeechRecognition Captions
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTestGlossary}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 transition-all"
            title="Simulate speech with technical terms to test live glossary detection"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Test Live Glossary
          </button>

          <button
            type="button"
            onClick={toggleListening}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isListening
                ? "bg-red-600 text-white animate-pulse"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-3.5 h-3.5" /> Stop Captions
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5" /> Start Live Microphone Captions
              </>
            )}
          </button>
        </div>
      </div>

      <div className="min-h-[80px] p-4 rounded-lg bg-black/50 border border-slate-700 text-base leading-relaxed text-yellow-300 font-medium">
        {currentCaption || (
          <span className="text-slate-500 italic text-sm">
            {isListening
              ? "Listening to speech... Speak into your microphone."
              : "Click 'Start Live Microphone Captions' or 'Test Live Glossary' to see live real-time captions."}
          </span>
        )}
      </div>

      {/* Live Auto-Glossary Detection Popup */}
      <LiveGlossaryPopup
        activeText={currentCaption}
        glossary={effectiveGlossary}
      />
    </div>
  );
}
