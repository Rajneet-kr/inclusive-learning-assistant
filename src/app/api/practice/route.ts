import { NextResponse } from "next/server";
import { samplePracticePlan } from "@/lib/sampleData";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    return NextResponse.json(samplePracticePlan);
  } catch (error) {
    return NextResponse.json(
      { error: { code: "PRACTICE_FAILED", message: "Failed to generate practice plan" } },
      { status: 500 }
    );
  }
}
