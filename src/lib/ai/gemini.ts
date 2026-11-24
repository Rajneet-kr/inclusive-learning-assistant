import { GoogleGenerativeAI, GenerationConfig } from "@google/generative-ai";

export const PRIMARY_GEMINI_MODEL = "gemini-3.5-flash-lite";
export const SECONDARY_GEMINI_MODEL = "gemini-3.8-flash";
export const TERTIARY_GEMINI_MODEL = "gemini-flash-lite-latest";

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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Executes model.generateContent with fast 503 failover and single 300ms retry on 429/network drops.
 */
async function callWithTransientRetry(
  modelInstance: any,
  parts: Array<string | { inlineData: { data: string; mimeType: string } }>,
  modelName: string
): Promise<string> {
  try {
    const result = await modelInstance.generateContent(parts);
    return result.response.text();
  } catch (err: any) {
    const msg = String(err?.message || "");
    const is503 =
      msg.includes("503") ||
      msg.includes("high demand") ||
      msg.includes("Overloaded") ||
      msg.includes("Service Unavailable") ||
      msg.includes("UNAVAILABLE");

    // HTTP 503 ("experiencing high demand"): Fail over IMMEDIATELY to next model in chain
    if (is503) {
      console.warn(
        `Gemini model ${modelName} 503/high demand. Failing over immediately to next model in chain...`
      );
      throw err;
    }

    const is429OrNetwork =
      msg.includes("429") ||
      msg.includes("Too Many Requests") ||
      msg.includes("RESOURCE_EXHAUSTED") ||
      msg.includes("fetch failed") ||
      msg.includes("ECONNRESET") ||
      msg.includes("ETIMEDOUT");

    // 429 or transient network drop: retry once after 300ms
    if (is429OrNetwork) {
      console.warn(
        `Gemini model ${modelName} rate limit/transient drop (${msg.slice(0, 80)}...). Retrying once in 300ms...`
      );
      await sleep(300);
      const retryResult = await modelInstance.generateContent(parts);
      return retryResult.response.text();
    }
    throw err;
  }
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
 * then gemini-flash-lite-latest, capping each call at 4s for fast failover.
 */
export async function generateContentWithFallback<T>(
  parts: Array<string | { inlineData: { data: string; mimeType: string } }>,
  systemInstruction?: string,
  jsonSchema?: boolean,
  singleModelTimeoutMs = 4000
): Promise<string> {
  const genAI = getGenAI();
  const config: GenerationConfig = jsonSchema
    ? { responseMimeType: "application/json" }
    : {};

  const modelsToTry = [
    PRIMARY_GEMINI_MODEL,
    SECONDARY_GEMINI_MODEL,
    TERTIARY_GEMINI_MODEL,
  ];

  let lastError: any = null;

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction,
        generationConfig: config,
      });

      // Cap each individual model call at singleModelTimeoutMs (default 4 seconds)
      return await Promise.race([
        callWithTransientRetry(model, parts, modelName),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`MODEL_TIMEOUT_${modelName}`)),
            singleModelTimeoutMs
          )
        ),
      ]);
    } catch (err) {
      lastError = err;
      console.warn(
        `Model ${modelName} failed or timed out, trying next fallback:`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  throw lastError || new Error("All Gemini models in fallback chain failed");
}
