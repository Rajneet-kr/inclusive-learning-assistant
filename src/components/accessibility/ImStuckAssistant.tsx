
"use client";

import * as React from "react";

import {
  StuckDifficultyType,
  StuckHelperRequest,
  StuckHelperResponse,
  SupportedLanguageCode,
  AccessibilityProfile,
  DifficultConcept,
} from "@/types/api";

interface ImStuckAssistantProps {
  documentId: string;
  selectedText: string;
  contextText: string;
  language?: SupportedLanguageCode;
  accessibilityProfile?: AccessibilityProfile;
  onClose?: () => void;
}

const difficultyOptions: {
  value: StuckDifficultyType;
  label: string;
  description: string;
}[] = [
  {
    value: "difficult_word",
    label: "Difficult word",
    description: "I don't understand a word or phrase.",
  },
  {
    value: "long_sentence",
    label: "Long sentence",
    description: "This sentence is too difficult to follow.",
  },
  {
    value: "unclear_concept",
    label: "Unclear concept",
    description: "I don't understand the idea.",
  },
];

export function ImStuckAssistant({
  documentId,
  selectedText,
  contextText,
  language = "en",
  accessibilityProfile,
  onClose,
}: ImStuckAssistantProps) {
  const [difficultyType, setDifficultyType] =
    React.useState<StuckDifficultyType>("unclear_concept");

  const [result, setResult] =
    React.useState<StuckHelperResponse | null>(null);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [saved, setSaved] = React.useState(false);
  const [saveError, setSaveError] = React.useState("");

  const handleExplain = async () => {
    if (!selectedText.trim()) {
      setError("Please select a sentence before asking for help.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setSaved(false);
    setSaveError("");

    const requestData: StuckHelperRequest = {
      documentId,
      selectedText,
      contextText,
      difficultyType,
      language,
      accessibilityProfile,
    };

    try {
      const response = await fetch("/api/stuck-helper", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to explain this sentence."
        );
      }

      setResult(data as StuckHelperResponse);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConcept = () => {
    if (!result) return;

    try {
      const storageKey = `my-difficult-concepts-${documentId}`;

      const existingData = localStorage.getItem(storageKey);
      const existingConcepts: DifficultConcept[] =
        existingData ? JSON.parse(existingData) : [];

      if (!Array.isArray(existingConcepts)) {
        throw new Error("Invalid saved concepts data.");
      }

      const alreadySaved = existingConcepts.some(
        (concept) =>
          concept.selectedText === selectedText &&
          concept.difficultyType === difficultyType
      );

      if (alreadySaved) {
        setSaved(true);
        setSaveError("This concept is already saved.");
        return;
      }

      const newConcept: DifficultConcept = {
        id: `concept_${Date.now()}`,
        documentId,
        selectedText,
        contextText,
        conceptTitle: selectedText.slice(0, 80),
        difficultyType,
        simplerExplanation: result.simplerExplanation,
        realWorldExample: result.realWorldExample,
        checkQuestion: result.checkQuestion,
        language,
        createdAt: new Date().toISOString(),
        understood: false,
      };

      const updatedConcepts = [
        ...existingConcepts,
        newConcept,
      ];

      localStorage.setItem(
        storageKey,
        JSON.stringify(updatedConcepts)
      );

      setSaved(true);
      setSaveError("");
    } catch (err) {
      console.error("Unable to save difficult concept:", err);
      setSaveError(
        "Unable to save this concept. Please check your browser storage."
      );
    }
  };

  return (
    <div className="w-full rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            I'm Stuck
          </h2>

          <p className="mt-1 text-sm text-gray-600">
            Let's understand this part together.
          </p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
            aria-label="Close assistant"
          >
            Close
          </button>
        )}
      </div>

      <div className="mb-4 rounded-lg bg-blue-50 p-4">
        <p className="mb-2 text-sm font-medium text-blue-900">
          Selected text
        </p>

        <p className="text-sm leading-6 text-gray-800">
          {selectedText}
        </p>
      </div>

      <div className="mb-5">
        <p className="mb-3 text-sm font-semibold text-gray-900">
          What are you finding difficult?
        </p>

        <div className="space-y-3">
          {difficultyOptions.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition ${
                difficultyType === option.value
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="difficultyType"
                value={option.value}
                checked={difficultyType === option.value}
                onChange={() => {
                  setDifficultyType(option.value);
                  setResult(null);
                  setError("");
                  setSaved(false);
                  setSaveError("");
                }}
                className="mt-1"
              />

              <span>
                <span className="block text-sm font-medium text-gray-900">
                  {option.label}
                </span>

                <span className="mt-1 block text-xs text-gray-600">
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={handleExplain}
        disabled={loading || !selectedText.trim()}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Explaining..." : "Explain this for me"}
      </button>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {loading && (
        <p
          className="mt-4 text-center text-sm text-gray-600"
          aria-live="polite"
        >
          Your learning assistant is preparing an explanation...
        </p>
      )}

      {result && (
        <div className="mt-5 space-y-4" aria-live="polite">
          <section className="rounded-lg bg-green-50 p-4">
            <h3 className="mb-2 font-semibold text-green-900">
              Simple explanation
            </h3>

            <p className="text-sm leading-6 text-gray-800">
              {result.simplerExplanation}
            </p>
          </section>

          <section className="rounded-lg bg-purple-50 p-4">
            <h3 className="mb-2 font-semibold text-purple-900">
              Real-world example
            </h3>

            <p className="text-sm leading-6 text-gray-800">
              {result.realWorldExample}
            </p>
          </section>

          <section className="rounded-lg bg-amber-50 p-4">
            <h3 className="mb-2 font-semibold text-amber-900">
              Check your understanding
            </h3>

            <p className="text-sm leading-6 text-gray-800">
              {result.checkQuestion}
            </p>
          </section>

          <button
            type="button"
            onClick={handleSaveConcept}
            disabled={saved}
            className="w-full rounded-lg border border-green-600 px-4 py-3 text-sm font-semibold text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saved ? "Saved to My Difficult Concepts" : "Save to My Difficult Concepts"}
          </button>

          {saveError && (
            <p className="text-sm text-gray-600" role="status">
              {saveError}
            </p>
          )}

          {result.fallbackUsed && (
            <p className="text-xs text-gray-500">
              The assistant could not reach the AI service. This is a fallback response.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
