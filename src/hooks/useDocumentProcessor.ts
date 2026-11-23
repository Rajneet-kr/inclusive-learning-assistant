"use client";

import { useState } from "react";
import { IngestResponse } from "@/types/api";
import { sampleBiologyNote } from "@/lib/sampleData";

export function useDocumentProcessor() {
  const [currentDocument, setCurrentDocument] = useState<IngestResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSampleDocument = () => {
    setIsLoading(true);
    setError(null);
    try {
      setCurrentDocument(sampleBiologyNote);
    } catch (err) {
      setError("Failed to load sample document");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    currentDocument,
    isLoading,
    error,
    loadSampleDocument,
    setCurrentDocument,
  };
}
