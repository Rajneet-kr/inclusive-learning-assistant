"use client";

import * as React from "react";
import { Youtube } from "lucide-react";

export function YouTubeInput() {
  return (
    <div className="space-y-2 opacity-60">
      <div className="flex items-center gap-2">
        <Youtube className="w-5 h-5 text-red-600" />
        <label
          htmlFor="youtube-url-input"
          className="text-sm font-medium text-slate-700"
        >
          YouTube Video / Lecture URL (Optional Demo Add-on)
        </label>
      </div>
      <input
        id="youtube-url-input"
        type="url"
        disabled
        placeholder="https://www.youtube.com/watch?v=... (Deferred per Hackathon Override)"
        className="w-full p-3 text-sm rounded-xl border border-slate-300 bg-slate-100 cursor-not-allowed"
      />
      <p className="text-xs text-slate-500">
        Note: YouTube scraping is bypassed per Critical Hackathon Overrides in favor of direct media/transcript ingestion.
      </p>
    </div>
  );
}
