/**
 * Client-Side Prebuilt Translation Engine using @huggingface/transformers
 * Model: Xenova/nllb-200-distilled-600M
 *
 * Uses sequential translation to reduce browser memory pressure.
 * WebGPU -> WASM/CPU fallback.
 */

import { SupportedLanguageCode, TranslatedSimplifiedSection } from "@/types/api";

export const NLLB_LANGUAGE_MAP: Record<string, string> = {
  en: "eng_Latn",
  hi: "hin_Deva",
  kn: "kan_Knda",
  ta: "tam_Taml",
  te: "tel_Telu",
  mr: "mar_Deva",
  bn: "ben_Beng",
  es: "spa_Latn",
  fr: "fra_Latn",
  de: "deu_Latn",
};

const NLLB_MODEL_ID = "Xenova/nllb-200-distilled-600M";

// Reuse one model pipeline within the active browser session.
let translatorPipelinePromise: Promise<any> | null = null;

export interface TranslationProgressEvent {
  status: "init" | "downloading" | "loading" | "translating" | "ready" | "error";
  message: string;
  progress?: number;
}

/**
 * Initializes or returns the translation pipeline.
 * WebGPU is attempted first, with WASM/CPU fallback.
 */
export async function getLocalTranslatorPipeline(
  onProgress?: (event: TranslationProgressEvent) => void
): Promise<any> {
  if (typeof window === "undefined") {
    throw new Error("Translation pipeline can only be loaded in the browser.");
  }

  if (translatorPipelinePromise) {
    return translatorPipelinePromise;
  }

  translatorPipelinePromise = (async () => {
    try {
      onProgress?.({
        status: "downloading",
        message: "Loading client-side NLLB-200 translation engine...",
      });

      const { pipeline, env } = await import("@huggingface/transformers");

      env.allowLocalModels = false;

      const hasWebGPU =
        typeof navigator !== "undefined" && "gpu" in navigator;

      const progressCallback = (p: any) => {
        if (p?.status === "progress" && typeof p.progress === "number") {
          onProgress?.({
            status: "downloading",
            message: `Loading local neural translation model (${Math.round(
              p.progress
            )}%)...`,
            progress: p.progress,
          });
        }
      };

      // Try WebGPU first
      if (hasWebGPU) {
        try {
          const pipe = await pipeline("translation", NLLB_MODEL_ID, {
            dtype: "q8",
            device: "webgpu",
            progress_callback: progressCallback,
          });

          onProgress?.({
            status: "ready",
            message: "Local neural translation engine ready (WebGPU).",
          });

          return pipe;
        } catch (error) {
          console.warn("WebGPU translation failed. Trying WASM/CPU.", error);
        }
      }

      // Fallback to WASM/CPU
      const pipe = await pipeline("translation", NLLB_MODEL_ID, {
        dtype: "q8",
        progress_callback: progressCallback,
      });

      onProgress?.({
        status: "ready",
        message: "Local neural translation engine ready (WASM/CPU).",
      });

      return pipe;
    } catch (error) {
      // Reset so a future attempt can retry.
      translatorPipelinePromise = null;

      onProgress?.({
        status: "error",
        message: "Failed to load local neural translation engine.",
      });

      throw error;
    }
  })();

  return translatorPipelinePromise;
}

/**
 * Translates one text string.
 */
export async function translateTextLocally(
  text: string,
  targetLang: SupportedLanguageCode,
  pipeInstance?: any,
  onProgress?: (event: TranslationProgressEvent) => void
): Promise<string> {
  const clean = (text || "").trim();

  if (!clean || targetLang === "en") return text;

  const targetCode = NLLB_LANGUAGE_MAP[targetLang];

  if (!targetCode) {
    throw new Error(`Unsupported target language code: ${targetLang}`);
  }

  const pipe = pipeInstance || (await getLocalTranslatorPipeline(onProgress));

  const output = await pipe(clean, {
    src_lang: "eng_Latn",
    tgt_lang: targetCode,
  });

  const translatedText = output?.[0]?.translation_text;

  return typeof translatedText === "string" && translatedText.trim()
    ? translatedText.trim()
    : clean;
}

/**
 * Translates a section sequentially to reduce concurrent inference workload.
 */
export async function translateSectionLocally(
  section: TranslatedSimplifiedSection,
  targetLang: SupportedLanguageCode,
  pipeInstance?: any,
  onProgress?: (event: TranslationProgressEvent) => void
): Promise<TranslatedSimplifiedSection> {
  if (targetLang === "en") return section;

  const pipe = pipeInstance || (await getLocalTranslatorPipeline(onProgress));

  // Translate one field at a time instead of using Promise.all.
  let translatedTitle = section.title;
  let translatedSimpleText = section.simpleText;
  let translatedKeyIdea = section.keyIdea;

  try {
    translatedTitle = await translateTextLocally(
      section.title,
      targetLang,
      pipe,
      onProgress
    );
  } catch (error) {
    console.warn("Title translation failed.", error);
  }

  try {
    translatedSimpleText = await translateTextLocally(
      section.simpleText,
      targetLang,
      pipe,
      onProgress
    );
  } catch (error) {
    console.warn("Section text translation failed.", error);
  }

  try {
    translatedKeyIdea = await translateTextLocally(
      section.keyIdea,
      targetLang,
      pipe,
      onProgress
    );
  } catch (error) {
    console.warn("Key idea translation failed.", error);
  }

  // Translate jargon sequentially.
  const translatedJargon = [];

  for (const j of section.jargon || []) {
    const rawOriginal = (j.originalTerm || j.term).trim();

    const cleanedOriginal = rawOriginal
      .replace(/\s*\([^)]*\)\s*$/, "")
      .trim();

    let translatedTerm = cleanedOriginal;
    let translatedMeaning = j.plainMeaning;

    try {
      translatedTerm = await translateTextLocally(
        cleanedOriginal,
        targetLang,
        pipe,
        onProgress
      );
    } catch (error) {
      console.warn("Jargon term translation failed.", error);
    }

    try {
      translatedMeaning = await translateTextLocally(
        j.plainMeaning,
        targetLang,
        pipe,
        onProgress
      );
    } catch (error) {
      console.warn("Jargon meaning translation failed.", error);
    }

    let finalTerm = translatedTerm.trim();

    if (
      finalTerm.toLowerCase() !== cleanedOriginal.toLowerCase() &&
      !finalTerm.includes(`(${cleanedOriginal})`)
    ) {
      finalTerm = `${finalTerm} (${cleanedOriginal})`;
    }

    translatedJargon.push({
      term: finalTerm,
      originalTerm: cleanedOriginal,
      plainMeaning: translatedMeaning,
    });
  }

  return {
    chunkId: section.chunkId,
    title: translatedTitle,
    simpleText: translatedSimpleText,
    keyIdea: translatedKeyIdea,
    jargon: translatedJargon,
    readingTimeSeconds: section.readingTimeSeconds || 15,
  };
}