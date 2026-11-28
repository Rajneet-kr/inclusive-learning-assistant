import { NextRequest, NextResponse } from "next/server";
import { generateContentWithFallback, withTimeoutFallback } from "@/lib/ai/gemini";
import { StudyPackRequestSchema } from "@/lib/validation";
import { OfflineStudyPack, GlossaryTerm } from "@/types/api";

export const maxDuration = 60;

const LIVE_GLOSSARY_FALLBACK_PROMPT = `You are an accessibility glossary assistant.

Explain the supplied technical term in simple language for a student.

Rules:
1. Use only general educational knowledge.
2. Do not provide an answer to a broader question.
3. Keep the explanation under 35 words.
4. Use one or two short sentences.
5. If the term is ambiguous, provide the most common educational meaning and state that context may change its meaning.
6. Return valid JSON only. No markdown, commentary, or code fences.

Return JSON:
{
  "term": "string",
  "plainMeaning": "string",
  "confidence": "high"
}`;

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json().catch(() => null);
    if (!rawBody) {
      return NextResponse.json(
        { error: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    const validation = StudyPackRequestSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request parameters",
          details: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const {
      documentId,
      title,
      language,
      simplifiedSections,
      glossary: inputGlossary,
      transcript,
      flashcards,
      quiz,
      studyPlan,
      missingTerms,
      subject,
    } = validation.data;

    // Build the initial glossary: combine provided glossary with any jargon in sections
    const glossaryMap = new Map<string, GlossaryTerm>();

    for (const item of inputGlossary) {
      if (item.term && item.plainMeaning) {
        glossaryMap.set(item.term.trim().toLowerCase(), {
          term: item.term.trim(),
          plainMeaning: item.plainMeaning.trim(),
          language: (item.language as any) || language,
          source: item.source || "document",
          firstSeenAt: item.firstSeenAt || new Date().toISOString(),
          documentId,
        });
      }
    }

    // Auto-extract terms from simplifiedSections jargon if not already present
    for (const sec of simplifiedSections) {
      if (sec.jargon && Array.isArray(sec.jargon)) {
        for (const j of sec.jargon) {
          const key = (j.term || "").trim().toLowerCase();
          if (key && !glossaryMap.has(key)) {
            glossaryMap.set(key, {
              term: j.term.trim(),
              plainMeaning: j.plainMeaning.trim(),
              language,
              source: "document",
              firstSeenAt: new Date().toISOString(),
              documentId,
            });
          }
        }
      }
    }

    // If missingTerms are requested, query Gemini for definitions of any unknown terms
    if (missingTerms && Array.isArray(missingTerms) && missingTerms.length > 0) {
      const termsToDefine = missingTerms
        .map((t) => t.trim())
        .filter((t) => t.length > 0 && !glossaryMap.has(t.toLowerCase()))
        .slice(0, 5); // Limit to top 5 missing terms to respect latency constraints

      for (const term of termsToDefine) {
        const userPrompt = `Term: ${term}\nSubject context: ${subject || "General Education"}`;

        const primaryAI = async (): Promise<GlossaryTerm> => {
          const responseText = await generateContentWithFallback(
            [userPrompt],
            LIVE_GLOSSARY_FALLBACK_PROMPT,
            true
          );

          const cleanJson = responseText.replace(/```json\n?|\n?```/g, "").trim();
          const parsed = JSON.parse(cleanJson);

          return {
            term: parsed.term || term,
            plainMeaning:
              parsed.plainMeaning ||
              `A key educational concept in ${subject || "this topic"}.`,
            language,
            source: "document",
            firstSeenAt: new Date().toISOString(),
            documentId,
          };
        };

        const fallback = async (): Promise<GlossaryTerm> => {
          return {
            term,
            plainMeaning: `Key subject concept in ${subject || "this lesson"}.`,
            language,
            source: "document",
            firstSeenAt: new Date().toISOString(),
            documentId,
          };
        };

        const resolvedTerm = await withTimeoutFallback(primaryAI, fallback, 12000);
        glossaryMap.set(term.toLowerCase(), resolvedTerm);
      }
    }

    const compiledGlossary: GlossaryTerm[] = Array.from(glossaryMap.values());

    const pack: OfflineStudyPack = {
      documentId,
      title: title || "Offline Study Pack",
      generatedAt: new Date().toISOString(),
      language,
      simplifiedSections,
      glossary: compiledGlossary,
      transcript,
      flashcards,
      quiz,
      studyPlan,
    };

    return NextResponse.json(pack, { status: 200 });
  } catch (error: any) {
    console.error("API /api/study-pack error:", error);
    return NextResponse.json(
      {
        error: "Failed to assemble offline study pack",
        message: error?.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
