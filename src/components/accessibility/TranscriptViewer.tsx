"use client";

import * as React from "react";
import { TranscribeResponse } from "@/types/api";
import { Ear, Download, Search, Clock, Sparkles } from "lucide-react";

interface TranscriptViewerProps {
  transcript: TranscribeResponse;
}

export function TranscriptViewer({ transcript }: TranscriptViewerProps) {
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredSegments = transcript.segments.filter((s) =>
    s.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const downloadVtt = () => {
    let vttContent = "WEBVTT\n\n";
    transcript.segments.forEach((s) => {
      const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60)
          .toString()
          .padStart(2, "0");
        const sRem = (sec % 60).toFixed(3).padStart(6, "0");
        return `00:${m}:${sRem}`;
      };
      vttContent += `${s.id}\n${formatTime(s.start)} --> ${formatTime(s.end)}\n${s.text}\n\n`;
    });

    const blob = new Blob([vttContent], { type: "text/vtt" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lecture-${transcript.transcriptId}.vtt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-200 mb-6 gap-3">
        <div className="flex items-center gap-2">
          <Ear className="w-5 h-5 text-emerald-600" />
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Hearing &amp; Lecture Transcript Mode
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={downloadVtt}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            Download .VTT Captions
          </button>
        </div>
      </div>

      {/* Key Concepts Header */}
      {transcript.keyConcepts && transcript.keyConcepts.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-emerald-700" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-emerald-900">
              Key Concepts &amp; Lecture Timestamps
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {transcript.keyConcepts.map((kc, i) => (
              <div
                key={i}
                className="p-3 rounded-lg bg-white border border-emerald-200 text-sm shadow-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-emerald-950">{kc.title}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 font-mono text-emerald-800">
                    {kc.timestamps.map((t) => `${Math.floor(t)}s`).join(", ")}
                  </span>
                </div>
                <p className="text-xs text-slate-600">{kc.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search within spoken lecture transcript..."
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Timestamped Transcript Segments */}
      <div className="space-y-3 max-h-[460px] overflow-y-auto pr-2">
        {filteredSegments.map((segment) => (
          <div
            key={segment.id}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
          >
            <span className="inline-flex items-center gap-1 font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded shrink-0">
              <Clock className="w-3 h-3 text-slate-400" />
              {segment.start.toFixed(1)}s - {segment.end.toFixed(1)}s
            </span>
            <p className="text-sm text-slate-800 leading-relaxed font-normal">
              {segment.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
