"use client";

import * as React from "react";
import { Flashcard } from "@/types/api";
import { RotateCw, ChevronLeft, ChevronRight } from "lucide-react";

interface FlashcardDeckProps {
  flashcards: Flashcard[];
}

export function FlashcardDeck({ flashcards }: FlashcardDeckProps) {
  const [index, setIndex] = React.useState(0);
  const [isFlipped, setIsFlipped] = React.useState(false);

  const card = flashcards[index];

  const handleNext = () => {
    setIsFlipped(false);
    setIndex((prev) => (prev + 1) % flashcards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
  };

  if (!card) return null;

  return (
    <div className="rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/80 p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 mb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-purple-600">
          Flashcard {index + 1} of {flashcards.length}
        </span>
        <span className="text-xs font-mono text-slate-500">
          Category: {card.concept}
        </span>
      </div>

      {/* Interactive Card */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsFlipped((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsFlipped((prev) => !prev);
          }
        }}
        className="min-h-[220px] cursor-pointer rounded-2xl border-2 border-dashed border-purple-300/80 bg-purple-50/70 backdrop-blur-sm hover:bg-purple-50/90 transition-all p-8 flex flex-col items-center justify-center text-center relative group select-none mb-6"
      >
        <span className="text-xs uppercase tracking-widest font-bold text-purple-500 mb-3">
          {isFlipped ? "Answer / Explanation (Click to flip)" : "Question / Term (Click to flip)"}
        </span>
        <p className="text-xl font-bold text-slate-900 leading-relaxed max-w-lg">
          {isFlipped ? card.back : card.front}
        </p>

        <span className="absolute bottom-3 right-4 inline-flex items-center gap-1 text-xs text-purple-600 font-medium opacity-70 group-hover:opacity-100">
          <RotateCw className="w-3.5 h-3.5" /> Flip Card
        </span>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handlePrev}
          className="px-4 py-2 rounded-lg border border-slate-300 font-medium text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>

        <span className="text-xs text-slate-500 font-medium">
          Spacebar or click card to flip
        </span>

        <button
          type="button"
          onClick={handleNext}
          className="px-4 py-2 rounded-lg bg-purple-600 text-white font-medium text-sm hover:bg-purple-700 flex items-center gap-1.5"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
