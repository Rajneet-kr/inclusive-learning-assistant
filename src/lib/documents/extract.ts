import { DocumentChunk } from "@/types/api";
import { generateContentWithFallback, withTimeoutFallback } from "@/lib/ai/gemini";
import { chunkTextByHeadings } from "./chunk";

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
    fileName?: string;
    subject?: string;
    gradeLevel?: string;
  }
): Promise<ExtractedDocumentResult> {
  const defaultTitle = content.fileName
    ? content.fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ")
    : content.subject && content.subject !== "General"
    ? `${content.subject} Notes`
    : "Uploaded Study Notes";

  const primaryAI = async (): Promise<ExtractedDocumentResult> => {
    const parts: Array<string | { inlineData: { data: string; mimeType: string } }> = [];

    if (content.text) {
      // Bound text sent to Gemini to keep within token limits and avoid 429/503 timeouts
      const textForPrompt =
        content.text.length > 12000
          ? content.text.slice(0, 12000) +
            "\n\n[...Additional document content omitted for summary segmentation...]"
          : content.text;

      parts.push(
        `Study Material Text to extract and segment (Document Title: ${defaultTitle}, Subject: ${
          content.subject || "General"
        }):\n\n${textForPrompt}`
      );
    } else if (content.fileBase64 && content.mimeType) {
      parts.push({
        inlineData: {
          data: content.fileBase64,
          mimeType: content.mimeType,
        },
      });
      parts.push(
        `Extract and segment this document. Document Title: ${defaultTitle}. Subject: ${
          content.subject || "General"
        }. Target Grade: ${content.gradeLevel || "High School/College"}.`
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

    const extractedChunks: DocumentChunk[] =
      Array.isArray(parsed.chunks) && parsed.chunks.length > 0
        ? parsed.chunks.map((c: any, idx: number) => ({
            id: c.id || `chunk_${idx + 1}`,
            index: idx,
            heading: c.heading || `Section ${idx + 1}`,
            text: c.text || "",
            keyTerms: Array.isArray(c.keyTerms) ? c.keyTerms : [],
          }))
        : chunkTextByHeadings(content.text || "");

    return {
      title: parsed.title || defaultTitle,
      sourceSummary: parsed.sourceSummary || `Key concepts extracted from ${defaultTitle}.`,
      extractedText: content.text || parsed.extractedText || "",
      chunks: extractedChunks,
      fallbackUsed: false,
    };
  };

  const fallbackGenerator = (): ExtractedDocumentResult => {
    if (content.text && content.text.trim()) {
      const chunks = chunkTextByHeadings(content.text);
      const firstSentences = content.text
        .split(/(?<=[.?!])\s+/)
        .slice(0, 3)
        .join(" ")
        .slice(0, 240);

      return {
        title: defaultTitle,
        sourceSummary: firstSentences || `Overview of ${defaultTitle}.`,
        extractedText: content.text,
        chunks,
        fallbackUsed: true,
      };
    }

    // Fallback for unreadable files/images
    return {
      title: defaultTitle,
      sourceSummary: "Document processed with deterministic safe fallback.",
      extractedText: "Text extraction unavailable for this image. Please use the STEM & Diagram Verbalizer or paste text directly.",
      chunks: [
        {
          id: "chunk_1",
          index: 0,
          heading: "Overview",
          text: "The uploaded file could not be extracted as text. Please paste the lecture text directly or use the STEM Verbalizer for photo diagrams.",
          keyTerms: ["Upload", "Verification", "Notes"],
        },
      ],
      fallbackUsed: true,
    };
  };

  return withTimeoutFallback(primaryAI, fallbackGenerator, 12000);
}
