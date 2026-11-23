import { NextResponse } from "next/server";
import { sampleBiologyNote } from "@/lib/sampleData";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    // In Phase 1, return the bundled biology note fixture as the guaranteed fallback
    return NextResponse.json(sampleBiologyNote);
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "INGEST_FAILED",
          message: error instanceof Error ? error.message : "Internal error",
          retryable: true,
        },
      },
      { status: 500 }
    );
  }
}
