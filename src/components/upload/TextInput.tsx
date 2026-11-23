"use client";

import * as React from "react";

interface TextInputProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
}

export function TextInput({
  value,
  onChange,
  onSubmit,
  isLoading,
}: TextInputProps) {
  return (
    <div className="space-y-3">
      <label
        htmlFor="paste-notes-input"
        className="block text-sm font-semibold text-slate-800"
      >
        Paste Lecture Notes or Syllabus Text
      </label>
      <textarea
        id="paste-notes-input"
        rows={5}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste textbook excerpts, professor's study guide, or slide contents..."
        className="w-full p-3.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex justify-end">
        <button
          type="button"
          disabled={!value.trim() || isLoading}
          onClick={onSubmit}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          {isLoading ? "Processing..." : "Process Notes"}
        </button>
      </div>
    </div>
  );
}
