import { NextRequest, NextResponse } from "next/server";
import { generateContentWithFallback, withTimeoutFallback } from "@/lib/ai/gemini";
import { DYSLEXIA_SIMPLIFICATION_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { SimplifyResponse, SimplifiedSection } from "@/types/api";
import { sampleBiologyNote } from "@/lib/sampleData";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      documentId = "doc_live",
      chunkIds = [],
      readingLevel = "grade_6",
      maxWordsPerChunk = 60,
      bionicReading = false,
      language = "en",
      sourceText = "",
      chunks = [],
    } = body;

    // Build the user context prompt as specified in ARCHITECTURE.md line 445
    const textToSimplify =
      sourceText ||
      (Array.isArray(chunks) && chunks.length > 0
        ? chunks.map((c: any) => `Heading: ${c.heading}\n${c.text}`).join("\n\n")
        : sampleBiologyNote.extractedText);

    const userPrompt = `
User context:
Reading level: ${readingLevel}
Maximum words per chunk: ${maxWordsPerChunk}
Language: ${language}

Source material:
${textToSimplify}
`;

    const primaryAI = async (): Promise<SimplifyResponse> => {
      const responseText = await generateContentWithFallback(
        [userPrompt],
        DYSLEXIA_SIMPLIFICATION_SYSTEM_PROMPT,
        true
      );

      const cleanJson = responseText.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleanJson);

      const sections: SimplifiedSection[] = Array.isArray(parsed.sections)
        ? parsed.sections.map((s: any, idx: number) => ({
            chunkId: s.chunkId || `chunk_${idx + 1}`,
            title: s.title || `Section ${idx + 1}`,
            simpleText: s.simpleText || "",
            keyIdea: s.keyIdea || "Key summary idea.",
            jargon: Array.isArray(s.jargon) ? s.jargon : [],
            readingTimeSeconds:
              typeof s.readingTimeSeconds === "number"
                ? s.readingTimeSeconds
                : Math.max(10, Math.ceil((s.simpleText || "").split(" ").length / 2.5)),
          }))
        : sampleBiologyNote.simplifiedSections;

      return {
        documentId,
        sections,
        fallbackUsed: false,
      };
    };

    const fallbackGenerator = (): SimplifyResponse => {
      // Deterministic fallback using sample or rule-based chunks
      if (Array.isArray(chunks) && chunks.length > 0) {
        const sections: SimplifiedSection[] = chunks.map((c: any, idx: number) => ({
          chunkId: c.id || `chunk_${idx + 1}`,
          title: c.heading || `Part ${idx + 1}`,
          simpleText: c.text
            ? c.text.slice(0, 200) + "..."
            : "Simplified content will appear here.",
          keyIdea: c.heading || "Key concept",
          jargon: (c.keyTerms || []).map((term: string) => ({
            term,
            plainMeaning: `Core subject term: ${term}`,
          })),
          readingTimeSeconds: 15,
        }));
        return { documentId, sections, fallbackUsed: true };
      }

      return {
        documentId,
        sections: sampleBiologyNote.simplifiedSections,
        fallbackUsed: true,
      };
    };

    const result = await withTimeoutFallback(primaryAI, fallbackGenerator, 12000);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in /api/simplify:", error);
    return NextResponse.json(
      {
        documentId: "doc_error",
        sections: sampleBiologyNote.simplifiedSections,
        fallbackUsed: true,
      },
      { status: 200 }
    );
  }
}
