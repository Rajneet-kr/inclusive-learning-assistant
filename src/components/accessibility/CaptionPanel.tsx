
"use client";

import * as React from "react";
import { Mic, MicOff, Sparkles, Search, Plus, Trash2 } from "lucide-react";
import { GlossaryTerm } from "@/types/api";
import { sampleBiologyNote } from "@/lib/sampleData";
import { LiveGlossaryPopup } from "@/components/captions/LiveGlossaryPopup";

interface CaptionPanelProps {
  onCaptionChange?: (caption: string) => void;
  glossary?: GlossaryTerm[];
}

interface CaptionCue {
  id: number;
  text: string;
  timestamp: string;
}

export function CaptionPanel({ onCaptionChange, glossary }: CaptionPanelProps) {
  const [isListening, setIsListening] = React.useState(false);
  const [currentCaption, setCurrentCaption] = React.useState("");
  const [captionHistory, setCaptionHistory] = React.useState<CaptionCue[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const recognitionRef = React.useRef<any>(null);

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
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        let transcript = "";

        for (let i = 0; i < event.results.length; i++) {
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

    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {}
    };
  }, [onCaptionChange]);

  const saveCurrentCaption = () => {
    const text = currentCaption.trim();
    if (!text) return;

    setCaptionHistory((previous) => [
      ...previous,
      {
        id: Date.now(),
        text,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);

    setCurrentCaption("");
  };

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
      saveCurrentCaption();
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

  const addTestCaption = () => {
    const sampleText =
      "Plants use chloroplasts and chlorophyll for photosynthesis to make glucose.";

    setCaptionHistory((previous) => [
      ...previous,
      {
        id: Date.now(),
        text: sampleText,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  const filteredCaptions = captionHistory.filter((cue) =>
    cue.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;

    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escaped})`, "gi"));

    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark
          key={index}
          className="rounded bg-yellow-300 text-slate-900 px-1"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="rounded-2xl border border-cyan-400/30 bg-slate-950/90 backdrop-blur-md text-white p-5 shadow-lg space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
          Live Browser SpeechRecognition Captions
        </span>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleTestGlossary}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
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
                <MicOff className="w-3.5 h-3.5" />
                Stop Captions
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5" />
                Start Live Microphone Captions
              </>
            )}
          </button>
        </div>
      </div>

      {/* Live Caption Display */}
      <div className="min-h-[80px] p-4 rounded-lg bg-black/50 border border-slate-700 text-base leading-relaxed text-yellow-300 font-medium">
        {currentCaption || (
          <span className="text-slate-500 italic text-sm">
            {isListening
              ? "Listening to speech... Speak into your microphone."
              : "Click Start Live Microphone Captions or Test Live Glossary."}
          </span>
        )}
      </div>

      {/* Save Current Caption */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={saveCurrentCaption}
          disabled={!currentCaption.trim()}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition"
        >
          <Plus className="w-4 h-4" />
          Save Caption to Transcript
        </button>

        <button
          type="button"
          onClick={addTestCaption}
          className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm transition"
        >
          Add Sample Caption
        </button>
      </div>

      {/* Searchable Caption Workspace */}
      <div className="border-t border-slate-700 pt-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-cyan-300">
            Searchable Caption Transcript
          </h3>

          <span className="text-xs text-slate-400">
            {captionHistory.length} saved cues
          </span>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keywords in your captions..."
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700 focus:border-cyan-400 focus:outline-none text-white text-sm"
          />
        </div>

        {searchQuery && (
          <p className="text-xs text-cyan-300">
            {filteredCaptions.length} matching caption(s) found
          </p>
        )}

        <div className="space-y-3 max-h-80 overflow-y-auto">
          {filteredCaptions.length === 0 ? (
            <div className="text-sm text-slate-500 text-center py-6">
              {captionHistory.length === 0
                ? "Your saved captions will appear here. Save a caption to begin searching."
                : "No captions match your search."}
            </div>
          ) : (
            filteredCaptions.map((cue) => (
              <div
                key={cue.id}
                className="p-3 rounded-xl bg-slate-900 border border-slate-700 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-cyan-400 font-medium">
                    {cue.timestamp}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setCaptionHistory((previous) =>
                        previous.filter((item) => item.id !== cue.id)
                      )
                    }
                    title="Delete caption"
                    className="text-slate-500 hover:text-red-400 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-sm leading-relaxed text-slate-200">
                  {highlightText(cue.text, searchQuery)}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Live Glossary Detection */}
      <LiveGlossaryPopup
        activeText={currentCaption}
        glossary={effectiveGlossary}
      />
    </div>
  );
}
