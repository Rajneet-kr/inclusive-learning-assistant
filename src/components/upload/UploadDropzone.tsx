"use client";

import * as React from "react";
import { UploadCloud } from "lucide-react";

interface UploadDropzoneProps {
  onFileSelect?: (file: File) => void;
  disabled?: boolean;
}

export function UploadDropzone({ onFileSelect, disabled }: UploadDropzoneProps) {
  const [isDragOver, setIsDragOver] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect?.(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      role="button"
      tabIndex={0}
      aria-label="Upload lecture notes PDF or images"
      className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
        isDragOver
          ? "border-blue-500 bg-blue-50/70"
          : "border-slate-300 hover:border-slate-400 bg-white"
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp,.mp3,.mp4"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            onFileSelect?.(e.target.files[0]);
          }
        }}
      />
      <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
        <UploadCloud className="w-6 h-6" />
      </div>
      <p className="font-semibold text-slate-900 text-sm mb-1">
        Click or drag &amp; drop study materials here
      </p>
      <p className="text-xs text-slate-500">
        Supports PDF notes, whiteboard images, lecture audio (MP3/MP4), or diagrams
      </p>
    </div>
  );
}
