import { NextRequest, NextResponse } from "next/server";
import { extractDocumentWithGemini } from "@/lib/documents/extract";
import { IngestResponse, InputKind, AccessibilityProfile } from "@/types/api";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    let inputKind: InputKind = "text";
    let accessibilityProfile: AccessibilityProfile = "dyslexia";
    let subject = "General";
    let gradeLevel = "Grade 10";
    let pastedText = "";
    let fileBase64: string | undefined;
    let mimeType: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();

      inputKind = (formData.get("inputKind") as InputKind) || "text";
      accessibilityProfile =
        (formData.get("accessibilityProfile") as AccessibilityProfile) || "dyslexia";
      subject = (formData.get("subject") as string) || "General";
      gradeLevel = (formData.get("gradeLevel") as string) || "Grade 10";
      pastedText = (formData.get("pastedText") as string) || "";

      const file = formData.get("file") as File | null;
      if (file && file.size > 0) {
        const buffer = await file.arrayBuffer();
        fileBase64 = Buffer.from(buffer).toString("base64");
        mimeType = file.type || "application/pdf";

        if (mimeType.includes("pdf")) inputKind = "pdf";
        else if (mimeType.startsWith("image/")) inputKind = "image";
      }
    } else {
      const json = await request.json();
      inputKind = json.inputKind || "text";
      accessibilityProfile = json.accessibilityProfile || "dyslexia";
      subject = json.subject || "General";
      gradeLevel = json.gradeLevel || "Grade 10";
      pastedText = json.pastedText || "";
    }

    if (!pastedText && !fileBase64) {
      return NextResponse.json(
        {
          error: {
            code: "EMPTY_REQUEST",
            message: "Please upload a PDF/image or paste lecture notes.",
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    const extracted = await extractDocumentWithGemini({
      text: pastedText,
      fileBase64,
      mimeType,
      subject,
      gradeLevel,
    });

    const response: IngestResponse = {
      documentId: `doc_${Date.now().toString(36)}`,
      status: "ready",
      inputKind,
      title: extracted.title,
      sourceSummary: extracted.sourceSummary,
      extractedText: extracted.extractedText,
      chunks: extracted.chunks,
      warnings: extracted.fallbackUsed
        ? ["Showing prepared fallback output while the AI service reconnects."]
        : [],
      fallbackUsed: extracted.fallbackUsed,
      subject,
      gradeLevel,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in /api/ingest:", error);
    return NextResponse.json(
      {
        error: {
          code: "INGEST_FAILED",
          message: error instanceof Error ? error.message : "Failed to ingest document",
          retryable: true,
        },
      },
      { status: 500 }
    );
  }
}
