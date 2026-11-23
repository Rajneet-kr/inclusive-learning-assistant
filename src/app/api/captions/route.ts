import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    return NextResponse.json({
      sessionId: `cap_${Date.now()}`,
      language: "en",
      websocketless: true,
      status: "active",
    });
  } catch (error) {
    return NextResponse.json(
      { error: { code: "CAPTIONS_FAILED", message: "Failed to initiate captions session" } },
      { status: 500 }
    );
  }
}
