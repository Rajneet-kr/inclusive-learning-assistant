import { NextResponse } from "next/server";
import { sampleLectureTranscript } from "@/lib/sampleData";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    return NextResponse.json(sampleLectureTranscript);
  } catch (error) {
    return NextResponse.json(
      { error: { code: "TRANSCRIBE_FAILED", message: "Failed to transcribe audio" } },
      { status: 500 }
    );
  }
}
