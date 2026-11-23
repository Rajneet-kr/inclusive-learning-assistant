"use client";

import * as React from "react";
import { Mic, MicOff } from "lucide-react";

interface CaptionPanelProps {
  onCaptionChange?: (caption: string) => void;
}

export function CaptionPanel({ onCaptionChange }: CaptionPanelProps) {
  const [isListening, setIsListening] = React.useState(false);
  const [currentCaption, setCurrentCaption] = React.useState("");
  const recognitionRef = React.useRef<any>(null);

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
      alert("Browser SpeechRecognition is not supported in this browser (Chrome/Edge recommended).");
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

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-900 text-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
          Live Browser SpeechRecognition Captions
        </span>
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

      <div className="min-h-[80px] p-4 rounded-lg bg-black/50 border border-slate-700 text-base leading-relaxed text-yellow-300 font-medium">
        {currentCaption || (
          <span className="text-slate-500 italic text-sm">
            {isListening
              ? "Listening to speech... Speak into your microphone."
              : "Click 'Start Live Microphone Captions' to test live Web Speech API captions."}
          </span>
        )}
      </div>
    </div>
  );
}
