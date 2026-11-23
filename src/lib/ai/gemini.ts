import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";

export const genAI = new GoogleGenerativeAI(apiKey);

export function getGeminiModel(modelName = "gemini-1.5-flash") {
  return genAI.getGenerativeModel({ model: modelName });
}

// Timeout helper utility matching ARCHITECTURE.md line 623
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
    console.warn("Primary AI call failed or timed out, executing fallback:", error);
    return await fallback();
  }
}
