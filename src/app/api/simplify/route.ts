import { NextRequest, NextResponse } from "next/server";
import { generateContentWithFallback, withTimeoutFallback } from "@/lib/ai/gemini";
import { DYSLEXIA_SIMPLIFICATION_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { SimplifyResponse, SimplifiedSection } from "@/types/api";
import { sampleBiologyNote } from "@/lib/sampleData";

export const maxDuration = 60;

function createDynamicSimplifiedSections(chunks: any[], subject = "Study Material"): SimplifiedSection[] {
  return chunks.map((c: any, idx: number) => {
    const rawText = c.text || "";
    const sentences = rawText.split(/(?<=[.?!])\s+/).filter(Boolean);
    const simpleText = sentences.slice(0, 3).join(" ") || rawText.slice(0, 220) || "Summary content.";
    const keyIdea = sentences[0] || c.heading || "Key concept summary.";
    
    const terms = Array.isArray(c.keyTerms) && c.keyTerms.length > 0
      ? c.keyTerms.slice(0, 3)
      : [c.heading || `Topic ${idx + 1}`];

    const jargon = terms.map((term: string) => ({
      term,
      plainMeaning: `Core subject concept in ${c.heading || subject}: ${term}`,
    }));

    const wordCount = simpleText.split(/\s+/).filter(Boolean).length;
    return {
      chunkId: c.id || `chunk_${idx + 1}`,
      title: c.heading || `Section ${idx + 1}`,
      simpleText,
      keyIdea,
      jargon,
      readingTimeSeconds: Math.max(10, Math.ceil(wordCount / 2.5)),
    };
  });
}

export async function POST(request: NextRequest) {
  let requestChunks: any[] = [];
  let reqDocumentId = "doc_live";
  let reqSubject = "General";

  try {
    const body = await request.json();
    const {
      documentId = "doc_live",
      readingLevel = "grade_6",
      maxWordsPerChunk = 60,
      language = "en",
      sourceText = "",
      chunks = [],
      subject = "General",
    } = body;

    reqDocumentId = documentId;
    requestChunks = Array.isArray(chunks) ? chunks : [];
    reqSubject = subject;

    // Build concise, structured input from chunks for faster Gemini processing
    let textToSimplify = "";
    if (requestChunks.length > 0) {
      const chunksForAI = requestChunks.slice(0, 8);
      textToSimplify = chunksForAI
        .map(
          (c, i) =>
            `[Chunk ${i + 1}] Heading: ${c.heading}\nText: ${(c.text || "").slice(0, 260)}\nKey Terms: ${(
              c.keyTerms || []
            ).join(", ")}`
        )
        .join("\n\n");
    } else if (sourceText) {
      textToSimplify = sourceText.slice(0, 3000);
    } else {
      textToSimplify = sampleBiologyNote.extractedText;
    }

    const userPrompt = `
User context:
Reading level: ${readingLevel}
Maximum words per chunk: ${maxWordsPerChunk}
Language: ${language}
Subject: ${subject}

Source material to simplify into chunks:
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

      if (Array.isArray(parsed.sections) && parsed.sections.length > 0) {
        const sections: SimplifiedSection[] = parsed.sections.map((s: any, idx: number) => ({
          chunkId: s.chunkId || (requestChunks[idx]?.id) || `chunk_${idx + 1}`,
          title: s.title || (requestChunks[idx]?.heading) || `Section ${idx + 1}`,
          simpleText: s.simpleText || "",
          keyIdea: s.keyIdea || "Key summary idea.",
          jargon: Array.isArray(s.jargon) ? s.jargon : [],
          readingTimeSeconds:
            typeof s.readingTimeSeconds === "number"
              ? s.readingTimeSeconds
              : Math.max(10, Math.ceil((s.simpleText || "").split(" ").length / 2.5)),
        }));

        // If there were more than 8 chunks in the input, append dynamic simplifications for the rest
        if (requestChunks.length > sections.length) {
          const remainingSections = createDynamicSimplifiedSections(
            requestChunks.slice(sections.length),
            subject
          );
          sections.push(...remainingSections);
        }

        return {
          documentId,
          sections,
          fallbackUsed: false,
        };
      }

      // If AI returned empty sections array, use dynamic fallback
      return fallbackGenerator();
    };

    const fallbackGenerator = (): SimplifyResponse => {
      if (requestChunks.length > 0) {
        const sections = createDynamicSimplifiedSections(requestChunks, subject);
        return { documentId, sections, fallbackUsed: true };
      }

      return {
        documentId,
        sections: sampleBiologyNote.simplifiedSections,
        fallbackUsed: true,
      };
    };

    const result = await withTimeoutFallback(primaryAI, fallbackGenerator, 10000);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in /api/simplify:", error);
    
    // Fallback directly from request chunks so user never sees stale Biology data
    if (requestChunks.length > 0) {
      const sections = createDynamicSimplifiedSections(requestChunks, reqSubject);
      return NextResponse.json({
        documentId: reqDocumentId,
        sections,
        fallbackUsed: true,
      });
    }

    return NextResponse.json({
      documentId: reqDocumentId,
      sections: sampleBiologyNote.simplifiedSections,
      fallbackUsed: true,
    });
  }
}
