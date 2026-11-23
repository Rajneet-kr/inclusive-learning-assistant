import { DocumentChunk } from "@/types/api";
import { generateContentWithFallback, withTimeoutFallback } from "@/lib/ai/gemini";
import { chunkTextByHeadings } from "./chunk";
import { sampleBiologyNote } from "@/lib/sampleData";

export interface ExtractedDocumentResult {
  title: string;
  extractedText: string;
  sourceSummary: string;
  chunks: DocumentChunk[];
  fallbackUsed: boolean;
}

const INGEST_EXTRACTION_PROMPT = `
You are an expert accessibility document processor.
Extract, clean, and segment the provided study material into clear, readable sections.

Rules:
1. Extract all meaningful text, headings, diagrams, definitions, and explanations.
2. Break the content into 3 to 6 logical sequential chunks.
3. For each chunk, provide a clear heading, the text content (concise, 50-120 words), and 3-5 key terms.
4. Provide a document title and a 2-3 sentence source summary.
5. Return ONLY a valid JSON object matching this schema:
{
  "title": "string",
  "sourceSummary": "string",
  "extractedText": "string",
  "chunks": [
    {
      "id": "chunk_1",
      "index": 0,
      "heading": "string",
      "text": "string",
      "keyTerms": ["string"]
    }
  ]
}
`;

export async function extractDocumentWithGemini(
  content: {
    text?: string;
    fileBase64?: string;
    mimeType?: string;
    subject?: string;
    gradeLevel?: string;
  }
): Promise<ExtractedDocumentResult> {
  const primaryAI = async (): Promise<ExtractedDocumentResult> => {
    const parts: Array<string | { inlineData: { data: string; mimeType: string } }> = [];

    if (content.fileBase64 && content.mimeType) {
      parts.push({
        inlineData: {
          data: content.fileBase64,
          mimeType: content.mimeType,
        },
      });
      parts.push(
        `Extract and segment this document. Subject: ${content.subject || "General"}. Target Grade: ${content.gradeLevel || "High School/College"}.`
      );
    } else if (content.text) {
      parts.push(
        `Study Material Text to extract and segment (Subject: ${content.subject || "General"}):\n\n${content.text}`
      );
    } else {
      throw new Error("No text or file provided for ingestion");
    }

    const responseText = await generateContentWithFallback(
      parts,
      INGEST_EXTRACTION_PROMPT,
      true
    );

    // Parse JSON safely
    const cleanJson = responseText.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleanJson);

    return {
      title: parsed.title || "Extracted Study Notes",
      sourceSummary: parsed.sourceSummary || "Summary of extracted concepts.",
      extractedText: parsed.extractedText || content.text || "",
      chunks: Array.isArray(parsed.chunks)
        ? parsed.chunks.map((c: any, idx: number) => ({
            id: c.id || `chunk_${idx + 1}`,
            index: idx,
            heading: c.heading || `Section ${idx + 1}`,
            text: c.text || "",
            keyTerms: Array.isArray(c.keyTerms) ? c.keyTerms : [],
          }))
        : chunkTextByHeadings(content.text || ""),
      fallbackUsed: false,
    };
  };

  const fallbackGenerator = (): ExtractedDocumentResult => {
    if (content.text && content.text.trim()) {
      const chunks = chunkTextByHeadings(content.text);
      return {
        title: content.subject ? `${content.subject} Notes` : "Pasted Study Notes",
        sourceSummary: content.text.slice(0, 160) + "...",
        extractedText: content.text,
        chunks,
        fallbackUsed: true,
      };
    }
    // Return bundled sample note if file processing fails or times out
    return {
      title: sampleBiologyNote.title,
      sourceSummary: sampleBiologyNote.sourceSummary,
      extractedText: sampleBiologyNote.extractedText,
      chunks: sampleBiologyNote.chunks,
      fallbackUsed: true,
    };
  };

  return withTimeoutFallback(primaryAI, fallbackGenerator, 12000);
}
