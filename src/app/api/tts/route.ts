import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // In hackathon override mode, browser SpeechSynthesis is used directly on the client.
    // This API route provides a stub for completeness.
    return NextResponse.json({
      audioUrl: "",
      durationSeconds: 0,
      provider: "browser",
    });
  } catch (error) {
    return NextResponse.json(
      { error: { code: "TTS_FAILED", message: "Failed to generate TTS" } },
      { status: 500 }
    );
  }
}
