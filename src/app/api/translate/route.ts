import { NextRequest, NextResponse } from "next/server";
import { generateContentWithFallback } from "@/lib/ai/gemini";
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

/**
 * Splits text over maxLength on sentence boundaries or whitespace.
 */
function splitIntoChunks(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text];
  const chunks: string[] = [];
  const sentences = text.match(/[^.!?\n]+[.!?\n]+|\s+[^.!?\n]+$/g) || [text];
  let current = "";

  for (const s of sentences) {
    if (current.length + s.length > maxLength && current.length > 0) {
      chunks.push(current.trim());
      current = "";
    }
    if (s.length > maxLength) {
      // Force split very long single sentence
      for (let i = 0; i < s.length; i += maxLength) {
        chunks.push(s.slice(i, i + maxLength).trim());
      }
    } else {
      current += s;
    }
  }
  if (current.trim().length > 0) {
    chunks.push(current.trim());
  }
  return chunks.length > 0 ? chunks : [text];
}

/**
 * Primary HTTP Translator: Google Translate gtx endpoint
 */
async function translateViaGoogleGtx(text: string, targetLang: string): Promise<string> {
  const res = await fetch(
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `q=${encodeURIComponent(text)}`,
      signal: AbortSignal.timeout(4500),
    }
  );
  if (!res.ok) {
    throw new Error(`Google GTX returned HTTP ${res.status}`);
  }
  const data = await res.json();
  if (Array.isArray(data) && Array.isArray(data[0])) {
    const result = data[0].map((item: any) => item?.[0] || "").join("");
    if (result.trim()) return result;
  }
  throw new Error("Invalid structure from Google GTX");
}

/**
 * Secondary HTTP Backup: MyMemory translation service
 */
async function translateViaMyMemory(text: string, targetLang: string): Promise<string> {
  // MyMemory works best on chunks <= 450 characters
  const subChunks = splitIntoChunks(text, 450);
  const translatedPieces: string[] = [];

  for (const piece of subChunks) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(piece)}&langpair=en|${encodeURIComponent(targetLang)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) {
      throw new Error(`MyMemory returned HTTP ${res.status}`);
    }
    const data = await res.json();
    const trans = data?.responseData?.translatedText;
    if (trans && typeof trans === "string" && !trans.includes("MYMEMORY WARNING")) {
      translatedPieces.push(trans);
    } else {
      throw new Error("MyMemory quota exceeded or invalid response");
    }
  }

  const result = translatedPieces.join(" ");
  if (result.trim()) return result;
  throw new Error("Empty translation from MyMemory");
}

/**
 * Universal translation helper that tries Google GTX first, then MyMemory.
 * Handles strings > 1,400 chars cleanly on sentence boundaries.
 */
async function translateTextUniversal(text: string, targetLang: string): Promise<string> {
  if (!text || !text.trim() || targetLang === "en") return text;

  // Split strings > 1,400 chars on sentence boundaries
  const chunks = splitIntoChunks(text, 1400);
  const translatedChunks: string[] = [];

  for (const chunk of chunks) {
    let translatedChunk = "";
    try {
      translatedChunk = await translateViaGoogleGtx(chunk, targetLang);
    } catch (primaryErr) {
      console.warn("Google GTX translator failed, attempting MyMemory backup:", primaryErr);
      try {
        translatedChunk = await translateViaMyMemory(chunk, targetLang);
      } catch (backupErr) {
        console.warn("MyMemory backup also failed:", backupErr);
        throw backupErr;
      }
    }
    translatedChunks.push(translatedChunk || chunk);
  }

  return translatedChunks.join(" ");
}

/**
 * Tier 2: Universal Multi-Chunk Machine-Translation Fallback.
 * Translates title, simpleText, keyIdea, and jargon plainMeaning with bounded concurrency (3).
 * Deduplicates identical strings strictly within a single request using a local Map discarded after completion.
 */
async function translateSectionsWithHttpFallback(
  sections: TranslatedSimplifiedSection[],
  targetLang: SupportedLanguageCode
): Promise<TranslatedSimplifiedSection[]> {
  // Local deduplication map strictly scoped to this single request invocation (no cross-request state)
  const requestDeduplicationMap = new Map<string, string>();

  const translateDeduplicated = async (text: string): Promise<string> => {
    const trimmed = (text || "").trim();
    if (!trimmed || targetLang === "en") return text;
    if (requestDeduplicationMap.has(trimmed)) {
      return requestDeduplicationMap.get(trimmed)!;
    }
    const translated = await translateTextUniversal(trimmed, targetLang);
    requestDeduplicationMap.set(trimmed, translated);
    return translated;
  };

  const concurrency = 3;
  const results: TranslatedSimplifiedSection[] = [];

  for (let i = 0; i < sections.length; i += concurrency) {
    const batch = sections.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (sec) => {
        const [translatedTitle, translatedSimpleText, translatedKeyIdea] = await Promise.all([
          translateDeduplicated(sec.title).catch(() => sec.title),
          translateDeduplicated(sec.simpleText).catch(() => sec.simpleText),
          translateDeduplicated(sec.keyIdea).catch(() => sec.keyIdea),
        ]);

        const translatedJargon = await Promise.all(
          (sec.jargon || []).map(async (j) => {
            const rawOriginal = (j.originalTerm || j.term).trim();
            // Clean any existing parenthetical original term like "Chloroplast (Chloroplast)"
            const cleanedOriginal = rawOriginal.replace(/\s*\([^)]*\)\s*$/, "").trim();

            const [translatedTerm, translatedMeaning] = await Promise.all([
              translateDeduplicated(cleanedOriginal).catch(() => cleanedOriginal),
              translateDeduplicated(j.plainMeaning).catch(() => j.plainMeaning),
            ]);

            // Deduplicate: If translatedTerm is identical or already includes original, don't duplicate
            let finalTerm = translatedTerm.trim();
            const lowerTrans = finalTerm.toLowerCase();
            const lowerOrig = cleanedOriginal.toLowerCase();

            if (targetLang !== "en" && lowerTrans !== lowerOrig && !finalTerm.includes(`(${cleanedOriginal})`)) {
              finalTerm = `${finalTerm} (${cleanedOriginal})`;
            }

            return {
              term: finalTerm,
              originalTerm: cleanedOriginal,
              plainMeaning: translatedMeaning,
            };
          })
        );

        return {
          chunkId: sec.chunkId,
          title: translatedTitle,
          simpleText: translatedSimpleText,
          keyIdea: translatedKeyIdea,
          jargon: translatedJargon,
          readingTimeSeconds: sec.readingTimeSeconds || 15,
        };
      })
    );
    results.push(...batchResults);
  }

  return results;
}

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
        provider: "original",
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
        provider: "empty",
      };
      return NextResponse.json(response);
    }

    const userPrompt = `
Target language: ${langOption.label} (${langOption.nativeLabel}, code: ${targetLang})
Reading level: ${readingLevel}

Simplified source sections to translate:
${JSON.stringify(inputSections, null, 2)}
`;

    // Tier 1: Try Gemini with a strict 7-second timeout
    try {
      const responseText = await Promise.race([
        generateContentWithFallback(
          [userPrompt],
          TRANSLATION_SYSTEM_PROMPT,
          true
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("TIER1_GEMINI_TIMEOUT_7S")), 7000)
        ),
      ]);

      const cleanJson = responseText.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleanJson);

      if (Array.isArray(parsed.sections) && parsed.sections.length > 0) {
        const translatedSections: TranslatedSimplifiedSection[] = parsed.sections.map(
          (s: any, idx: number) => {
            const rawTitle = s.title || inputSections[idx]?.title || `Section ${idx + 1}`;
            const rawSimpleText = s.simpleText || inputSections[idx]?.simpleText || "";
            const rawKeyIdea = s.keyIdea || inputSections[idx]?.keyIdea || "";

            const jargonList = Array.isArray(s.jargon)
              ? s.jargon.map((j: any) => {
                  const orig = (j.originalTerm || j.term || "").replace(/\s*\([^)]*\)\s*$/, "").trim();
                  let term = (j.term || orig).trim();
                  if (targetLang !== "en" && orig && !term.includes(`(${orig})`) && term.toLowerCase() !== orig.toLowerCase()) {
                    term = `${term} (${orig})`;
                  }
                  return {
                    term,
                    originalTerm: orig,
                    plainMeaning: j.plainMeaning || "",
                  };
                })
              : inputSections[idx]?.jargon || [];

            return {
              chunkId: s.chunkId || inputSections[idx]?.chunkId || `chunk_${idx + 1}`,
              title: rawTitle,
              simpleText: rawSimpleText,
              keyIdea: rawKeyIdea,
              jargon: jargonList,
              readingTimeSeconds:
                typeof s.readingTimeSeconds === "number"
                  ? s.readingTimeSeconds
                  : inputSections[idx]?.readingTimeSeconds || 15,
            };
          }
        );

        return NextResponse.json({
          documentId: docId,
          targetLanguage: targetLang,
          sourceLanguage: "en",
          direction,
          sections: translatedSections,
          ttsVoiceAvailable: true,
          fallbackUsed: false,
          provider: "gemini",
        });
      }
    } catch (tier1Err) {
      console.warn(`[Tier 1 Gemini Failed (${tier1Err instanceof Error ? tier1Err.message : String(tier1Err)})]. Failing over to Tier 2 Universal Live Machine-Translation...`);
    }

    // Tier 2: Universal Live Machine-Translation Fallback
    try {
      const httpSections = await translateSectionsWithHttpFallback(inputSections, targetLang);
      return NextResponse.json({
        documentId: docId,
        targetLanguage: targetLang,
        sourceLanguage: "en",
        direction,
        sections: httpSections,
        ttsVoiceAvailable: true,
        fallbackUsed: false,
        provider: "live-translate-fallback",
      });
    } catch (tier2Err) {
      console.warn(`[Tier 2 Machine-Translation Failed]. Failing over to Tier 3 true offline fallback:`, tier2Err);
    }

    // Tier 3: True Offline Fallback (Only reached when both Tier 1 and Tier 2 fail, e.g. completely offline)
    const fallbackResponse: TranslationResult = {
      documentId: docId,
      targetLanguage: targetLang,
      sourceLanguage: "en",
      direction: "ltr",
      sections: inputSections,
      ttsVoiceAvailable: true,
      fallbackUsed: true,
      provider: "offline-fallback",
    };
    return NextResponse.json(fallbackResponse);
  } catch (error) {
    console.error("Translation route unexpected error:", error);
    const fallbackResponse: TranslationResult = {
      documentId: docId,
      targetLanguage: targetLang,
      sourceLanguage: "en",
      direction: "ltr",
      sections: inputSections,
      ttsVoiceAvailable: true,
      fallbackUsed: true,
      provider: "offline-fallback",
    };
    return NextResponse.json(fallbackResponse);
  }
}
