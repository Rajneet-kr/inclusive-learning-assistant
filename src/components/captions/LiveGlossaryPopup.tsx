"use client";

import * as React from "react";
import { GlossaryTerm } from "@/types/api";
import { matchGlossaryTerm } from "@/lib/glossaryMatcher";
import { BookOpen, Bookmark, BookmarkCheck, X, Sparkles } from "lucide-react";

interface LiveGlossaryPopupProps {
  activeText: string;
  glossary: GlossaryTerm[];
  onSaveTerm?: (term: GlossaryTerm) => void;
  className?: string;
}

const STORAGE_KEY_SAVED_TERMS = "inclusive_learning_saved_terms_v1";

export function LiveGlossaryPopup({
  activeText,
  glossary,
  onSaveTerm,
  className = "",
}: LiveGlossaryPopupProps) {
  const [matchedTerm, setMatchedTerm] = React.useState<GlossaryTerm | null>(null);
  const [dismissedTerms, setDismissedTerms] = React.useState<Set<string>>(new Set());
  const [isSaved, setIsSaved] = React.useState(false);

  // Check saved terms in localStorage to initialize state
  const isTermAlreadySaved = React.useCallback((termName: string): boolean => {
    if (typeof window === "undefined") return false;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SAVED_TERMS);
      if (!raw) return false;
      const list: GlossaryTerm[] = JSON.parse(raw);
      return list.some(
        (t) => t.term.toLowerCase() === termName.trim().toLowerCase()
      );
    } catch {
      return false;
    }
  }, []);

  // Watch activeText for matching glossary terms
  React.useEffect(() => {
    if (!activeText || !glossary || glossary.length === 0) {
      return;
    }

    const match = matchGlossaryTerm(activeText, glossary);
    if (match) {
      const termKey = match.term.toLowerCase();
      // If user dismissed this term during the session, don't re-pop immediately
      if (!dismissedTerms.has(termKey)) {
        setMatchedTerm(match);
        setIsSaved(isTermAlreadySaved(match.term));
      }
    }
  }, [activeText, glossary, dismissedTerms, isTermAlreadySaved]);

  const handleDismiss = () => {
    if (matchedTerm) {
      setDismissedTerms((prev) => new Set(prev).add(matchedTerm.term.toLowerCase()));
    }
    setMatchedTerm(null);
  };

  const handleSaveTerm = () => {
    if (!matchedTerm) return;

    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_SAVED_TERMS);
        const list: GlossaryTerm[] = raw ? JSON.parse(raw) : [];
        const exists = list.some(
          (t) => t.term.toLowerCase() === matchedTerm.term.toLowerCase()
        );
        if (!exists) {
          const updated = [
            ...list,
            {
              ...matchedTerm,
              source: "live_caption" as const,
              firstSeenAt: new Date().toISOString(),
            },
          ];
          localStorage.setItem(STORAGE_KEY_SAVED_TERMS, JSON.stringify(updated));
        }
      } catch (err) {
        console.warn("Failed to persist saved term to localStorage:", err);
      }
    }

    setIsSaved(true);
    onSaveTerm?.(matchedTerm);
  };

  if (!matchedTerm) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`relative mt-3 p-4 rounded-xl border border-amber-400/40 bg-amber-950/40 backdrop-blur-sm text-amber-100 shadow-md animate-in fade-in slide-in-from-top-2 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                Live Caption Glossary Match
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                Auto-Detected
              </span>
            </div>
            <h4 className="text-base font-extrabold text-amber-200 mt-0.5">
              {matchedTerm.term}
            </h4>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          aria-label={`Dismiss glossary definition for ${matchedTerm.term}`}
          className="p-1 rounded-lg text-amber-400/70 hover:text-amber-200 hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-amber-100/90 pl-9">
        {matchedTerm.plainMeaning}
      </p>

      <div className="mt-3 pl-9 flex items-center gap-2">
        <button
          type="button"
          onClick={handleSaveTerm}
          disabled={isSaved}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            isSaved
              ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/30"
              : "bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs"
          }`}
        >
          {isSaved ? (
            <>
              <BookmarkCheck className="w-3.5 h-3.5" />
              <span>Saved to My Terms</span>
            </>
          ) : (
            <>
              <Bookmark className="w-3.5 h-3.5" />
              <span>Save Term</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleDismiss}
          className="text-xs text-amber-300/80 hover:text-amber-200 px-2.5 py-1.5 rounded-lg hover:bg-white/5 font-medium transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
