
import { NextRequest, NextResponse } from "next/server";

import {
  generateContentWithFallback,
  withTimeoutFallback,
} from "@/lib/ai/gemini";

import { STUCK_HELPER_SYSTEM_PROMPT } from "@/lib/ai/stuckHelperPrompt";

import {
  StuckHelperRequest,
  StuckHelperResponse,
} from "@/types/api";

export const maxDuration = 60;

const VALID_DIFFICULTY_TYPES = [
  "difficult_word",
  "long_sentence",
  "unclear_concept",
] as const;

function createFallbackResponse(
  data: StuckHelperRequest
): StuckHelperResponse {
  return {
    selectedText: data.selectedText,
    difficultyType: data.difficultyType,
    simplerExplanation:
      "I could not generate a simpler explanation right now. Please try again.",
    realWorldExample:
      "Please try again when the AI learning assistant is available.",
    checkQuestion:
      "Would you like to try understanding this sentence again?",
    fallbackUsed: true,
  };
}

export async function POST(request: NextRequest) {
  let requestData: StuckHelperRequest | null = null;

  try {
    // 1. Read the student's request
    const body = await request.json();

    // 2. Validate the required information
    if (
      typeof body.documentId !== "string" ||
      typeof body.selectedText !== "string" ||
      typeof body.contextText !== "string" ||
      !VALID_DIFFICULTY_TYPES.includes(body.difficultyType)
    ) {
      return NextResponse.json(
        { error: "Invalid request parameters." },
        { status: 400 }
      );
    }

    if (
      !body.documentId.trim() ||
      !body.selectedText.trim() ||
      !body.contextText.trim()
    ) {
      return NextResponse.json(
        { error: "Document ID, selected text and context are required." },
        { status: 400 }
      );
    }

    requestData = {
      documentId: body.documentId,
      selectedText: body.selectedText,
      contextText: body.contextText,
      conceptTitle:
        typeof body.conceptTitle === "string"
          ? body.conceptTitle
          : undefined,
      difficultyType: body.difficultyType,
      language: body.language,
      accessibilityProfile: body.accessibilityProfile,
    };

    // 3. Prepare the prompt for Gemini
    const userPrompt = `
Student's selected text:
${requestData.selectedText}

Surrounding context:
${requestData.contextText}

Difficulty type:
${requestData.difficultyType}

Concept title:
${requestData.conceptTitle || "Not provided"}

Preferred language:
${requestData.language || "en"}

Accessibility profile:
${requestData.accessibilityProfile || "Not specified"}

Explain only the selected text using the surrounding context.
Return the requested JSON response.
`;

    // 4. Generate the AI response
    const primaryAI = async (): Promise<StuckHelperResponse> => {
      const responseText = await generateContentWithFallback(
        [userPrompt],
        STUCK_HELPER_SYSTEM_PROMPT,
        true
      );

      // Remove optional Markdown code fences
      const cleanJson = responseText
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();

      const parsed = JSON.parse(cleanJson);

      // Validate the generated response
      if (
        typeof parsed.simplerExplanation !== "string" ||
        typeof parsed.realWorldExample !== "string" ||
        typeof parsed.checkQuestion !== "string"
      ) {
        throw new Error("Invalid AI response format.");
      }

      return {
        selectedText: requestData!.selectedText,
        difficultyType: requestData!.difficultyType,
        simplerExplanation: parsed.simplerExplanation,
        realWorldExample: parsed.realWorldExample,
        checkQuestion: parsed.checkQuestion,
        fallbackUsed: false,
      };
    };

    // 5. Use a safe fallback if AI fails or times out
    const fallbackGenerator = (): StuckHelperResponse =>
      createFallbackResponse(requestData!);

    const result = await withTimeoutFallback(
      primaryAI,
      fallbackGenerator,
      12000
    );

    // 6. Return the result to the frontend
    return NextResponse.json(result);
  } catch (error) {
    console.error("I'm Stuck Helper API Error:", error);

    if (requestData) {
      return NextResponse.json(
        createFallbackResponse(requestData)
      );
    }

    return NextResponse.json(
      { error: "Unable to process the learning assistance request." },
      { status: 500 }
    );
  }
}
