"use client";

import * as React from "react";
import { QuizQuestion } from "@/types/api";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";

interface QuizCardProps {
  questions: QuizQuestion[];
}

export function QuizCard({ questions }: QuizCardProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [selectedOption, setSelectedOption] = React.useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = React.useState(false);

  const currentQ = questions[currentIndex];

  const handleSelect = (idx: number) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(idx);
  };

  const handleSubmit = () => {
    if (selectedOption === null) return;
    setIsAnswerSubmitted(true);
  };

  const handleNext = () => {
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setCurrentIndex((prev) => (prev + 1) % questions.length);
  };

  if (!currentQ) return null;

  return (
    <div className="rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/80 p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 mb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 block">
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold uppercase">
            Difficulty: {currentQ.difficulty}
          </span>
        </div>
        <span className="text-xs font-mono text-slate-400">
          Concept: {currentQ.concept}
        </span>
      </div>

      <h3 className="text-lg font-bold text-slate-900 mb-6">
        {currentQ.question}
      </h3>

      <div className="space-y-3 mb-6">
        {currentQ.options.map((option, optIdx) => {
          let optionStyles = "border-slate-200/80 bg-white/80 backdrop-blur-sm hover:bg-white text-slate-800";

          if (selectedOption === optIdx && !isAnswerSubmitted) {
            optionStyles = "border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500";
          }

          if (isAnswerSubmitted) {
            if (optIdx === currentQ.correctIndex) {
              optionStyles = "border-green-600 bg-green-50 text-green-900 font-bold ring-2 ring-green-500";
            } else if (selectedOption === optIdx) {
              optionStyles = "border-red-600 bg-red-50 text-red-900";
            } else {
              optionStyles = "opacity-50 border-slate-200";
            }
          }

          return (
            <button
              key={optIdx}
              type="button"
              disabled={isAnswerSubmitted}
              onClick={() => handleSelect(optIdx)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between ${optionStyles}`}
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                  {String.fromCharCode(65 + optIdx)}
                </span>
                <span className="text-sm font-medium">{option}</span>
              </div>

              {isAnswerSubmitted && optIdx === currentQ.correctIndex && (
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
              )}
              {isAnswerSubmitted &&
                selectedOption === optIdx &&
                optIdx !== currentQ.correctIndex && (
                  <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                )}
            </button>
          );
        })}
      </div>

      {isAnswerSubmitted && (
        <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm">
          <p className="font-semibold text-slate-900 mb-1">
            {selectedOption === currentQ.correctIndex ? "🎉 Correct!" : "💡 Explanation:"}
          </p>
          <p className="text-slate-700 leading-relaxed">{currentQ.explanation}</p>
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        {!isAnswerSubmitted ? (
          <button
            type="button"
            disabled={selectedOption === null}
            onClick={handleSubmit}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            Check Answer
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            className="px-5 py-2.5 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors flex items-center gap-2"
          >
            Next Question <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
