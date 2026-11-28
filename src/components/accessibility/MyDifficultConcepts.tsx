

"use client";

import * as React from "react";
import { DifficultConcept } from "@/types/api";

interface MyDifficultConceptsProps {
  documentId: string;
}

export function MyDifficultConcepts({
  documentId,
}: MyDifficultConceptsProps) {
  const [concepts, setConcepts] = React.useState<DifficultConcept[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  const storageKey = `my-difficult-concepts-${documentId}`;

  // Load saved concepts from browser storage
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);

      if (saved) {
        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          setConcepts(parsed);
        }
      }
    } catch (error) {
      console.error("Unable to load saved concepts:", error);
    } finally {
      setLoaded(true);
    }
  }, [storageKey]);

  // Save changes to browser storage
  React.useEffect(() => {
    if (!loaded) return;

    try {
      localStorage.setItem(storageKey, JSON.stringify(concepts));
    } catch (error) {
      console.error("Unable to save concepts:", error);
    }
  }, [concepts, loaded, storageKey]);

  const toggleUnderstood = (id: string) => {
    setConcepts((previous) =>
      previous.map((concept) =>
        concept.id === id
          ? { ...concept, understood: !concept.understood }
          : concept
      )
    );
  };

  const deleteConcept = (id: string) => {
    setConcepts((previous) =>
      previous.filter((concept) => concept.id !== id)
    );
  };

  if (!loaded) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-sm text-gray-500">
          Loading your saved concepts...
        </p>
      </div>
    );
  }

  return (
    <section className="w-full rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          My Difficult Concepts
        </h2>

        <p className="mt-1 text-sm text-gray-600">
          Revisit the concepts you want to understand better.
        </p>
      </div>

      {concepts.length === 0 ? (
        <div className="rounded-lg bg-gray-50 p-5 text-center">
          <p className="font-medium text-gray-700">
            No saved concepts yet.
          </p>

          <p className="mt-1 text-sm text-gray-500">
            Use the I'm Stuck assistant and save a difficult concept
            to see it here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {concepts.map((concept) => (
            <article
              key={concept.id}
              className="rounded-lg border border-gray-200 p-4"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  {concept.difficultyType.replace(/_/g, " ")}
                </span>

                <span className="text-xs text-gray-500">
                  {new Date(concept.createdAt).toLocaleDateString()}
                </span>
              </div>

              <h3 className="font-semibold text-gray-900">
                {concept.conceptTitle || "Saved concept"}
              </h3>

              <p className="mt-2 text-sm text-gray-700">
                {concept.selectedText}
              </p>

              <div className="mt-3 rounded-lg bg-green-50 p-3">
                <p className="mb-1 text-sm font-semibold text-green-900">
                  Simple explanation
                </p>

                <p className="text-sm leading-6 text-gray-800">
                  {concept.simplerExplanation}
                </p>
              </div>

              <div className="mt-3 rounded-lg bg-purple-50 p-3">
                <p className="mb-1 text-sm font-semibold text-purple-900">
                  Real-world example
                </p>

                <p className="text-sm leading-6 text-gray-800">
                  {concept.realWorldExample}
                </p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => toggleUnderstood(concept.id)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {concept.understood
                    ? "Mark as not understood"
                    : "Mark as understood"}
                </button>

                <button
                  type="button"
                  onClick={() => deleteConcept(concept.id)}
                  className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>

              {concept.understood && (
                <p className="mt-2 text-sm text-green-700">
                  You have marked this concept as understood.
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
