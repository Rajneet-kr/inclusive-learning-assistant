/**
 * Client-Side Prebuilt Translation Engine using @huggingface/transformers
 * Model: Xenova/nllb-200-distilled-600M (Quantized q8 / q4 with WebGPU -> WASM/CPU fallback)
 *
 * Translates without third-party API keys or rate-limits.
 * Strictly adheres to zero cross-file/cross-document caching.
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

// Client-side singleton pipeline handle (in-memory for active browser tab only, no disk/cross-file cache)
let translatorPipelinePromise: Promise<any> | null = null;

export interface TranslationProgressEvent {
  status: "init" | "downloading" | "loading" | "translating" | "ready" | "error";
  message: string;
  progress?: number;
}

/**
 * Initializes or returns the client-side NLLB-200 translation pipeline.
 * Tries WebGPU first for fast hardware acceleration, falling back smoothly to WASM/CPU.
 */
export async function getLocalTranslatorPipeline(
  onProgress?: (event: TranslationProgressEvent) => void
): Promise<any> {
  if (typeof window === "undefined") {
    throw new Error("Client-side translation pipeline can only be loaded in a browser environment.");
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

      // Configure transformers.js browser environment
      env.allowLocalModels = false;

      const hasWebGPU = typeof navigator !== "undefined" && "gpu" in navigator;

      let pipe: any;
      if (hasWebGPU) {
        try {
          pipe = await pipeline("translation", NLLB_MODEL_ID, {
            dtype: "q8",
            device: "webgpu",
            progress_callback: (p: any) => {
              if (p?.status === "progress" && typeof p.progress === "number") {
                onProgress?.({
                  status: "downloading",
                  message: `Loading local neural translation model (${Math.round(p.progress)}%)...`,
                  progress: p.progress,
                });
              }
            },
          });
          onProgress?.({
            status: "ready",
            message: "Local neural translation engine ready (WebGPU accelerated).",
          });
          return pipe;
        } catch (webgpuErr) {
          console.warn("WebGPU not available or failed for NLLB, falling back to CPU/WASM:", webgpuErr);
        }
      }

      // Default WASM / CPU fallback
      pipe = await pipeline("translation", NLLB_MODEL_ID, {
        dtype: "q8",
        progress_callback: (p: any) => {
          if (p?.status === "progress" && typeof p.progress === "number") {
            onProgress?.({
              status: "downloading",
              message: `Loading local neural translation model (${Math.round(p.progress)}%)...`,
              progress: p.progress,
            });
          }
        },
      });

      onProgress?.({
        status: "ready",
        message: "Local neural translation engine ready (WASM/CPU).",
      });
      return pipe;
    } catch (err) {
      translatorPipelinePromise = null;
      onProgress?.({
        status: "error",
        message: "Failed to load local neural translation engine.",
      });
      throw err;
    }
  })();

  return translatorPipelinePromise;
}

/**
 * Translates a single text string using the local NLLB pipeline.
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
 * Translates a single section locally using NLLB-200.
 * Translates title, simpleText, keyIdea, and jargon items.
 * Strictly maintains zero cross-file/cross-document caching.
 */
export async function translateSectionLocally(
  section: TranslatedSimplifiedSection,
  targetLang: SupportedLanguageCode,
  pipeInstance?: any,
  onProgress?: (event: TranslationProgressEvent) => void
): Promise<TranslatedSimplifiedSection> {
  if (targetLang === "en") return section;

  const pipe = pipeInstance || (await getLocalTranslatorPipeline(onProgress));

  // 1. Translate Title, SimpleText, and KeyIdea
  const [translatedTitle, translatedSimpleText, translatedKeyIdea] = await Promise.all([
    translateTextLocally(section.title, targetLang, pipe).catch(() => section.title),
    translateTextLocally(section.simpleText, targetLang, pipe).catch(() => section.simpleText),
    translateTextLocally(section.keyIdea, targetLang, pipe).catch(() => section.keyIdea),
  ]);

  // 2. Translate Jargon with original English terms preserved
  const translatedJargon = await Promise.all(
    (section.jargon || []).map(async (j) => {
      const rawOriginal = (j.originalTerm || j.term).trim();
      const cleanedOriginal = rawOriginal.replace(/\s*\([^)]*\)\s*$/, "").trim();

      const [translatedTerm, translatedMeaning] = await Promise.all([
        translateTextLocally(cleanedOriginal, targetLang, pipe).catch(() => cleanedOriginal),
        translateTextLocally(j.plainMeaning, targetLang, pipe).catch(() => j.plainMeaning),
      ]);

      let finalTerm = translatedTerm.trim();
      const lowerTrans = finalTerm.toLowerCase();
      const lowerOrig = cleanedOriginal.toLowerCase();

      if (lowerTrans !== lowerOrig && !finalTerm.includes(`(${cleanedOriginal})`)) {
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
    chunkId: section.chunkId,
    title: translatedTitle,
    simpleText: translatedSimpleText,
    keyIdea: translatedKeyIdea,
    jargon: translatedJargon,
    readingTimeSeconds: section.readingTimeSeconds || 15,
  };
}
