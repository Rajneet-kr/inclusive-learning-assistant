import { NextResponse } from "next/server";
import { sampleBiologyNote } from "@/lib/sampleData";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    return NextResponse.json({
      documentId: sampleBiologyNote.documentId,
      sections: sampleBiologyNote.simplifiedSections,
      fallbackUsed: true,
    });
  } catch (error) {
    return NextResponse.json(
      { error: { code: "SIMPLIFY_FAILED", message: "Failed to simplify notes" } },
      { status: 500 }
    );
  }
}
