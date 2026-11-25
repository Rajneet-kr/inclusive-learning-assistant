import { NextRequest, NextResponse } from "next/server";
import { extractDocumentWithGemini } from "@/lib/documents/extract";
import { extractTextFromPdf } from "@/lib/documents/pdf";
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
    let fileName: string | undefined;

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
        fileName = file.name;
        const buffer = Buffer.from(await file.arrayBuffer());
        mimeType = file.type || "application/pdf";

        const isPdf =
          mimeType.includes("pdf") || file.name.toLowerCase().endsWith(".pdf");

        if (isPdf) {
          inputKind = "pdf";
          try {
            const pdfResult = await extractTextFromPdf(buffer);
            if (pdfResult.isScannedOrEmpty) {
              return NextResponse.json(
                {
                  error: {
                    code: "PDF_SCANNED_OR_EMPTY",
                    message: `"${file.name}" appears to be a scanned image or contains no extractable text (${pdfResult.charCount} characters found across ${pdfResult.numPages} page${pdfResult.numPages > 1 ? "s" : ""}). Please paste the lecture text directly or upload photos of specific pages to the STEM & Diagram Verbalizer.`,
                    retryable: false,
                  },
                },
                { status: 422 }
              );
            }
            pastedText = pdfResult.text;
          } catch (pdfErr: any) {
            return NextResponse.json(
              {
                error: {
                  code: "PDF_EXTRACTION_FAILED",
                  message:
                    pdfErr.message ||
                    `Unable to read PDF "${file.name}". Please ensure the file is not password-protected or corrupted.`,
                  retryable: false,
                },
              },
              { status: 422 }
            );
          }
        } else if (mimeType.startsWith("image/")) {
          inputKind = "image";
          fileBase64 = buffer.toString("base64");
        } else if (
          mimeType.startsWith("text/") ||
          file.name.endsWith(".txt") ||
          file.name.endsWith(".md")
        ) {
          inputKind = "text";
          pastedText = buffer.toString("utf-8");
        }
      }
    } else {
      const json = await request.json();
      inputKind = json.inputKind || "text";
      accessibilityProfile = json.accessibilityProfile || "dyslexia";
      subject = json.subject || "General";
      gradeLevel = json.gradeLevel || "Grade 10";
      pastedText = json.pastedText || "";
    }

    if (!pastedText.trim() && !fileBase64) {
      return NextResponse.json(
        {
          error: {
            code: "EMPTY_REQUEST",
            message: "Please upload a document file or paste your study notes.",
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    if (pastedText && pastedText.trim().length < 30) {
      return NextResponse.json(
        {
          error: {
            code: "TEXT_TOO_SHORT",
            message:
              "Provided text is too short (under 30 characters). Please paste complete study notes or upload a document with readable content.",
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
      fileName,
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
        ? ["Processed using safe offline semantic chunking."]
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
          message:
            error instanceof Error ? error.message : "Failed to ingest document",
          retryable: true,
        },
      },
      { status: 500 }
    );
  }
}
