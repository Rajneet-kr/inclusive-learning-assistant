import { GoogleGenerativeAI, GenerationConfig } from "@google/generative-ai";

export const PRIMARY_GEMINI_MODEL = "gemini-3.5-flash-lite";
export const SECONDARY_GEMINI_MODEL = "gemini-3.8-flash";

function getApiKey(): string {
  return process.env.GEMINI_API_KEY || "";
}

export function getGenAI(): GoogleGenerativeAI {
  return new GoogleGenerativeAI(getApiKey());
}

export function getGeminiModel(
  modelName: string = PRIMARY_GEMINI_MODEL,
  generationConfig?: GenerationConfig
) {
  const genAI = getGenAI();
  return genAI.getGenerativeModel({
    model: modelName,
    generationConfig,
  });
}

/**
 * 12-second timeout wrapper as specified in ARCHITECTURE.md line 623
 */
export async function withTimeoutFallback<T>(
  primary: () => Promise<T>,
  fallback: () => T | Promise<T>,
  timeoutMs = 12000
): Promise<T> {
  try {
    return await Promise.race([
      primary(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("AI_TIMEOUT")), timeoutMs)
      ),
    ]);
  } catch (error) {
    console.warn("Primary AI call timed out or failed; executing fallback:", error);
    return await fallback();
  }
}

/**
 * Robust caller that tries gemini-3.5-flash-lite first, then gemini-3.8-flash,
 * then falls back to fallback generator if both fail or timeout.
 */
export async function generateContentWithFallback<T>(
  parts: Array<string | { inlineData: { data: string; mimeType: string } }>,
  systemInstruction?: string,
  jsonSchema?: boolean
): Promise<string> {
  const genAI = getGenAI();
  const config: GenerationConfig = jsonSchema
    ? { responseMimeType: "application/json" }
    : {};

  // Try primary model (gemini-3.5-flash-lite)
  try {
    const model = genAI.getGenerativeModel({
      model: PRIMARY_GEMINI_MODEL,
      systemInstruction,
      generationConfig: config,
    });
    const result = await model.generateContent(parts);
    return result.response.text();
  } catch (primaryErr) {
    console.warn(`Primary model (${PRIMARY_GEMINI_MODEL}) failed, trying secondary (${SECONDARY_GEMINI_MODEL}):`, primaryErr);
    
    // Try secondary model (gemini-3.8-flash)
    const secondaryModel = genAI.getGenerativeModel({
      model: SECONDARY_GEMINI_MODEL,
      systemInstruction,
      generationConfig: config,
    });
    const result = await secondaryModel.generateContent(parts);
    return result.response.text();
  }
}
