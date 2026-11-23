import { NextRequest, NextResponse } from "next/server";
import { generateContentWithFallback, withTimeoutFallback } from "@/lib/ai/gemini";
import { TranslateRequestSchema } from "@/lib/validation";
import { getLanguageOption, getTextDirection } from "@/lib/i18n";
import { TranslatedSimplifiedSection, TranslationResult, SupportedLanguageCode } from "@/types/api";

export const maxDuration = 60;

const TRANSLATION_SYSTEM_PROMPT = `You are an accessibility-focused educational translator for students with dyslexia and low vision.

Translate the supplied simplified learning material into the target language.

Rules:
1. Preserve the meaning, order, and chunk boundaries exactly.
2. Keep language simple, direct, and suitable for a student with dyslexia.
3. Use short sentences of 8–16 words where natural in the target language.
4. Do not translate proper nouns, chemical symbols, mathematical symbols, code identifiers, or universally used technical abbreviations unless a standard translation exists.
5. For technical terms, retain the original English term in 'originalTerm', use the translated/transliterated term in 'term', and provide a clear explanation in the target language in 'plainMeaning'.
6. Do not add facts that are not present in the source.
7. If a phrase is unclear, write: "This part is unclear in the original notes."
8. Return valid JSON only. No markdown, explanation, or code fences.

Return JSON format:
{
  "sections": [
    {
      "chunkId": "string",
      "title": "string",
      "simpleText": "string",
      "keyIdea": "string",
      "jargon": [
        {
          "term": "string",
          "originalTerm": "string",
          "plainMeaning": "string"
        }
      ],
      "readingTimeSeconds": 0
    }
  ]
}`;

export async function POST(request: NextRequest) {
  let docId = "doc_live";
  let targetLang: SupportedLanguageCode = "en";
  let inputSections: TranslatedSimplifiedSection[] = [];

  try {
    const rawBody = await request.json();
    const validation = TranslateRequestSchema.safeParse(rawBody);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid translation request parameters", details: validation.error.format() },
        { status: 400 }
      );
    }

    const {
      documentId,
      targetLanguage,
      readingLevel,
      sections,
    } = validation.data;

    docId = documentId;
    targetLang = targetLanguage as SupportedLanguageCode;
    inputSections = sections.map((s) => ({
      chunkId: s.chunkId,
      title: s.title,
      simpleText: s.simpleText,
      keyIdea: s.keyIdea,
      jargon: s.jargon || [],
      readingTimeSeconds: s.readingTimeSeconds || 15,
    }));

    const langOption = getLanguageOption(targetLang);
    const direction = getTextDirection(targetLang);

    // If target language is English, return directly without calling AI
    if (targetLang === "en") {
      const response: TranslationResult = {
        documentId: docId,
        targetLanguage: "en",
        sourceLanguage: "en",
        direction: "ltr",
        sections: inputSections,
        ttsVoiceAvailable: true,
        fallbackUsed: false,
      };
      return NextResponse.json(response);
    }

    // If no sections were provided, return empty success
    if (inputSections.length === 0) {
      const response: TranslationResult = {
        documentId: docId,
        targetLanguage: targetLang,
        sourceLanguage: "en",
        direction,
        sections: [],
        ttsVoiceAvailable: true,
        fallbackUsed: false,
      };
      return NextResponse.json(response);
    }

    const userPrompt = `
Target language: ${langOption.label} (${langOption.nativeLabel}, code: ${targetLang})
Reading level: ${readingLevel}

Simplified source sections to translate:
${JSON.stringify(inputSections, null, 2)}
`;

    const primaryAI = async (): Promise<TranslationResult> => {
      const responseText = await generateContentWithFallback(
        [userPrompt],
        TRANSLATION_SYSTEM_PROMPT,
        true
      );

      const cleanJson = responseText.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleanJson);

      if (Array.isArray(parsed.sections) && parsed.sections.length > 0) {
        const translatedSections: TranslatedSimplifiedSection[] = parsed.sections.map(
          (s: any, idx: number) => ({
            chunkId: s.chunkId || inputSections[idx]?.chunkId || `chunk_${idx + 1}`,
            title: s.title || inputSections[idx]?.title || `Section ${idx + 1}`,
            simpleText: s.simpleText || inputSections[idx]?.simpleText || "",
            keyIdea: s.keyIdea || inputSections[idx]?.keyIdea || "",
            jargon: Array.isArray(s.jargon)
              ? s.jargon.map((j: any) => ({
                  term: j.term || "",
                  originalTerm: j.originalTerm || j.term || "",
                  plainMeaning: j.plainMeaning || "",
                }))
              : inputSections[idx]?.jargon || [],
            readingTimeSeconds:
              typeof s.readingTimeSeconds === "number"
                ? s.readingTimeSeconds
                : inputSections[idx]?.readingTimeSeconds || 15,
          })
        );

        return {
          documentId: docId,
          targetLanguage: targetLang,
          sourceLanguage: "en",
          direction,
          sections: translatedSections,
          ttsVoiceAvailable: true,
          fallbackUsed: false,
        };
      }

      throw new Error("Invalid structure returned from translation AI");
    };

    const fallbackGenerator = (): TranslationResult => ({
      documentId: docId,
      targetLanguage: targetLang,
      sourceLanguage: "en",
      direction: "ltr",
      sections: inputSections,
      ttsVoiceAvailable: true,
      fallbackUsed: true,
    });

    const result = await withTimeoutFallback(primaryAI, fallbackGenerator, 12000);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Translation route error:", error);
    const fallbackResponse: TranslationResult = {
      documentId: docId,
      targetLanguage: targetLang,
      sourceLanguage: "en",
      direction: "ltr",
      sections: inputSections,
      ttsVoiceAvailable: true,
      fallbackUsed: true,
    };
    return NextResponse.json(fallbackResponse);
  }
}
