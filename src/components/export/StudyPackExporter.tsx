"use client";

import * as React from "react";
import { OfflineStudyPack } from "@/types/api";
import {
  generateAnkiCsv,
  generateSelfContainedHtml,
  downloadTextFile,
  printStudyPack,
} from "@/lib/exporters";
import {
  Download,
  Printer,
  FileCode,
  Layers,
  ChevronDown,
  Check,
} from "lucide-react";

interface StudyPackExporterProps {
  pack: OfflineStudyPack;
  className?: string;
}

export function StudyPackExporter({ pack, className = "" }: StudyPackExporterProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape
  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => {
      setStatusMessage(null);
    }, 3500);
  };

  const getSafeSlug = () => {
    return (pack.title || "study-pack")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  // 1. Printable Study Sheet
  const handlePrint = () => {
    setIsOpen(false);
    showToast("Opening print / Save-as-PDF dialog...");
    printStudyPack(pack);
  };

  // 2. Anki Flashcards CSV
  const handleExportAnki = () => {
    setIsOpen(false);
    const flashcards = pack.flashcards || [];
    if (flashcards.length === 0) {
      showToast("No flashcards found in this study pack.");
      return;
    }
    const csvContent = generateAnkiCsv(flashcards);
    const filename = `${getSafeSlug()}-anki.csv`;
    downloadTextFile(csvContent, filename, "text/csv");
    showToast(`Downloaded ${filename} (${flashcards.length} cards)`);
  };

  // 3. Standalone Offline HTML
  const handleExportHtml = () => {
    setIsOpen(false);
    const htmlContent = generateSelfContainedHtml(pack, false);
    const filename = `${getSafeSlug()}-offline.html`;
    downloadTextFile(htmlContent, filename, "text/html");
    showToast(`Downloaded ${filename} (self-contained offline pack)`);
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Export Study Pack options menu"
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/90 backdrop-blur-md border border-slate-300/80 text-slate-800 text-xs font-bold hover:bg-white/95 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs transition-colors"
      >
        <Download className="w-4 h-4 text-blue-600" />
        <span>Export Study Pack</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Feedback Toast */}
      {statusMessage && (
        <div
          role="status"
          aria-live="polite"
          className="absolute right-0 top-full mt-2 w-72 p-2.5 rounded-lg bg-slate-900/95 backdrop-blur-md text-white text-xs font-medium shadow-lg z-50 flex items-center gap-2 border border-slate-700 animate-in fade-in"
        >
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 top-full mt-2 w-72 rounded-xl bg-white/95 backdrop-blur-lg border border-slate-200 shadow-2xl z-50 p-1.5 space-y-1 animate-in fade-in zoom-in-95"
        >
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Portable Offline Study Pack
            </p>
            <p className="text-xs text-slate-600 truncate mt-0.5" title={pack.title}>
              {pack.title}
            </p>
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={handlePrint}
            className="w-full text-left flex items-start gap-3 p-2.5 rounded-lg hover:bg-blue-50 focus:bg-blue-50 text-slate-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">
                Printable Study Sheet
              </div>
              <div className="text-[11px] text-slate-500">
                Formatted for print and browser Save-as-PDF.
              </div>
            </div>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={handleExportAnki}
            className="w-full text-left flex items-start gap-3 p-2.5 rounded-lg hover:bg-purple-50 focus:bg-purple-50 text-slate-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">
                Anki Flashcards (.csv)
              </div>
              <div className="text-[11px] text-slate-500">
                Front, Back, and Concept tags for spaced recall.
              </div>
            </div>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={handleExportHtml}
            className="w-full text-left flex items-start gap-3 p-2.5 rounded-lg hover:bg-emerald-50 focus:bg-emerald-50 text-slate-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">
                Self-Contained Offline HTML (.html)
              </div>
              <div className="text-[11px] text-slate-500">
                Standalone package with notes, quiz, &amp; glossary.
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
