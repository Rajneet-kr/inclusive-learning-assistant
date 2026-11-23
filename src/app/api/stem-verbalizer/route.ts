import { NextRequest, NextResponse } from "next/server";
import { generateContentWithFallback, withTimeoutFallback } from "@/lib/ai/gemini";
import { verbalizeMathExpression } from "@/lib/mathVerbalizer";
import {
  StemVerbalizerResult,
  StemElement,
  StemElementType,
} from "@/types/api";

export const maxDuration = 60;

const STEM_VERBALIZER_SYSTEM_PROMPT = `You are an accessibility specialist for students with dyslexia, low vision, and hearing impairment.

Analyze the supplied image of a whiteboard, handwritten note, textbook page, equation, graph, table, or diagram.

Rules:
1. Extract only what is visibly present. Do not invent missing values, labels, equations, or conclusions.
2. Identify each independent element: equation, graph, table, diagram, circuit, chemical reaction, or text.
3. For equations, return clean LaTeX where possible and a natural spoken version in 'accessibleMathText'.
4. Never read LaTeX syntax aloud. Convert symbols into spoken mathematical language.
5. For graphs, identify title, axes, units, series, trends, intercepts, peaks, and notable points only if visible.
6. For diagrams, describe objects, labels, arrows, relationships, and the process in a logical order.
7. For handwritten or unclear content, set confidence to "low" and explain exactly what is uncertain.
8. Write explanations in short, plain-language sentences.
9. Explain each step separately. Do not combine multiple reasoning steps into one sentence.
10. Return valid JSON only. No markdown, commentary, or code fences.

Return JSON format:
{
  "elements": [
    {
      "id": "string",
      "type": "equation",
      "rawText": "string",
      "latex": "string",
      "mathml": "string",
      "accessibleMathText": "string",
      "description": "string",
      "stepByStepExplanation": ["string"],
      "variables": [
        {
          "symbol": "string",
          "meaning": "string",
          "unit": "string"
        }
      ],
      "chart": {
        "title": "string",
        "xAxis": "string",
        "yAxis": "string",
        "series": [
          {
            "label": "string",
            "trend": "string",
            "notablePoints": ["string"]
          }
        ]
      },
      "confidence": "high",
      "sourceRegion": {
        "x": 0,
        "y": 0,
        "width": 0,
        "height": 0
      }
    }
  ],
  "overallExplanation": "string",
  "keyTakeaways": ["string"],
  "warnings": ["string"]
}`;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest) {
  let docId = `stem_doc_${Date.now().toString(36)}`;
  let fileName = "uploaded_image";

  try {
    const contentType = request.headers.get("content-type") || "";
    let fileBase64: string | null = null;
    let mimeType = "image/png";
    let subject = "STEM / Mathematics";
    let gradeLevel = "High School / College";
    let readingLevel = "grade_6";
    let language = "en";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      docId = (formData.get("documentId") as string) || docId;
      subject = (formData.get("subject") as string) || subject;
      gradeLevel = (formData.get("gradeLevel") as string) || gradeLevel;
      readingLevel = (formData.get("readingLevel") as string) || readingLevel;
      language = (formData.get("language") as string) || language;

      if (!file || file.size === 0) {
        return NextResponse.json(
          { error: "No image file provided in upload" },
          { status: 400 }
        );
      }

      fileName = file.name || "uploaded_image";

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            error: `File size exceeds the 10 MB limit (${Math.round(
              file.size / (1024 * 1024)
            )} MB). Please upload a smaller image.`,
          },
          { status: 400 }
        );
      }

      mimeType = file.type || "image/png";
      if (!ALLOWED_MIME_TYPES.has(mimeType.toLowerCase())) {
        return NextResponse.json(
          {
            error: `Unsupported image type (${mimeType}). Supported formats: JPG, PNG, WEBP.`,
          },
          { status: 400 }
        );
      }

      const buffer = await file.arrayBuffer();
      fileBase64 = Buffer.from(buffer).toString("base64");
    } else if (contentType.includes("application/json")) {
      const json = await request.json();
      docId = json.documentId || docId;
      subject = json.subject || subject;
      gradeLevel = json.gradeLevel || gradeLevel;
      readingLevel = json.readingLevel || readingLevel;
      language = json.language || language;
      fileName = json.fileName || fileName;

      if (json.fileBase64) {
        fileBase64 = json.fileBase64;
        mimeType = json.mimeType || "image/png";
      } else {
        return NextResponse.json(
          { error: "Missing fileBase64 in JSON body" },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Unsupported Content-Type. Please use multipart/form-data." },
        { status: 400 }
      );
    }

    if (!fileBase64) {
      return NextResponse.json(
        { error: "No image content detected in request" },
        { status: 400 }
      );
    }

    const userPrompt = `Student context:
Subject: ${subject}
Grade level: ${gradeLevel}
Preferred explanation level: ${readingLevel}
Language: ${language}
Uploaded file: ${fileName}`;

    const primaryAI = async (): Promise<StemVerbalizerResult> => {
      const parts = [
        {
          inlineData: {
            data: fileBase64!,
            mimeType,
          },
        },
        userPrompt,
      ];

      const responseText = await generateContentWithFallback(
        parts,
        STEM_VERBALIZER_SYSTEM_PROMPT,
        true
      );

      const cleanJson = responseText.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleanJson);

      if (Array.isArray(parsed.elements) && parsed.elements.length > 0) {
        const elements: StemElement[] = parsed.elements.map(
          (elem: any, idx: number) => {
            const rawType = (elem.type || "unknown").toLowerCase();
            const validTypes: StemElementType[] = [
              "equation",
              "graph",
              "table",
              "diagram",
              "circuit",
              "chemical_reaction",
              "text",
              "unknown",
            ];
            const type: StemElementType = validTypes.includes(rawType)
              ? rawType
              : "unknown";

            let accessibleMathText = elem.accessibleMathText || "";
            if (!accessibleMathText && (elem.latex || elem.rawText)) {
              accessibleMathText = verbalizeMathExpression(
                elem.latex || elem.rawText
              );
            }
            if (!accessibleMathText && elem.description) {
              accessibleMathText = elem.description;
            }

            return {
              id: elem.id || `elem_${idx + 1}`,
              type,
              rawText: elem.rawText || "",
              latex: elem.latex || undefined,
              mathml: elem.mathml || undefined,
              accessibleMathText: accessibleMathText || "STEM element",
              description:
                elem.description || "Visual STEM diagram or expression.",
              stepByStepExplanation: Array.isArray(elem.stepByStepExplanation)
                ? elem.stepByStepExplanation
                : [elem.description || "Formula breakdown."],
              variables: Array.isArray(elem.variables)
                ? elem.variables.map((v: any) => ({
                    symbol: String(v.symbol || ""),
                    meaning: String(v.meaning || ""),
                    unit: v.unit ? String(v.unit) : undefined,
                  }))
                : undefined,
              chart: elem.chart
                ? {
                    title: elem.chart.title,
                    xAxis: elem.chart.xAxis,
                    yAxis: elem.chart.yAxis,
                    series: Array.isArray(elem.chart.series)
                      ? elem.chart.series
                      : undefined,
                  }
                : undefined,
              confidence:
                elem.confidence === "high" ||
                elem.confidence === "medium" ||
                elem.confidence === "low"
                  ? elem.confidence
                  : "medium",
              sourceRegion: elem.sourceRegion || undefined,
            };
          }
        );

        return {
          documentId: docId,
          elements,
          overallExplanation:
            parsed.overallExplanation ||
            "Visual scan identified mathematical and diagrammatic elements.",
          keyTakeaways: Array.isArray(parsed.keyTakeaways)
            ? parsed.keyTakeaways
            : ["Review formula terms and step-by-step breakdown below."],
          warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
          fallbackUsed: false,
        };
      }

      throw new Error("Invalid structure returned from STEM verbalizer AI");
    };

    // Deterministic Non-hallucinated Fallback
    const fallbackGenerator = (): StemVerbalizerResult => ({
      documentId: docId,
      elements: [
        {
          id: "stem_fallback_1",
          type: "unknown",
          accessibleMathText:
            "Low-confidence scan. Please re-take photo with clearer lighting and sharp focus.",
          description: `Visual STEM scan received for "${fileName}". The automated visual reader could not resolve symbols with sufficient confidence.`,
          stepByStepExplanation: [
            "Ensure the whiteboard or page is well-lit and evenly illuminated.",
            "Hold camera parallel to the paper or board to avoid perspective distortion.",
            "Frame equations or diagrams tightly so symbols remain sharp and distinct.",
          ],
          confidence: "low",
        },
      ],
      overallExplanation: `Unable to verify clear mathematical or diagrammatic elements from "${fileName}". No equations or answers were fabricated.`,
      keyTakeaways: [
        "Image requires higher contrast, sharper focus, or better framing.",
      ],
      warnings: [
        "Low visual confidence safeguard active. Please upload a clearer photo.",
      ],
      fallbackUsed: true,
    });

    const result = await withTimeoutFallback(primaryAI, fallbackGenerator, 12000);
    return NextResponse.json(result);
  } catch (error) {
    console.error("STEM verbalizer error:", error);
    const safeFallback: StemVerbalizerResult = {
      documentId: docId,
      elements: [
        {
          id: "stem_fallback_err",
          type: "unknown",
          accessibleMathText:
            "Low-confidence scan. Please re-take photo with clearer lighting and sharp focus.",
          description: `Visual STEM scan could not complete for "${fileName}".`,
          stepByStepExplanation: [
            "Ensure the board or page is well-lit with high contrast.",
            "Make sure camera focus is sharp and glare is minimized.",
          ],
          confidence: "low",
        },
      ],
      overallExplanation:
        "An unexpected error occurred while analyzing the image. No equations were fabricated.",
      keyTakeaways: ["Please retry with a clear, well-lit photo."],
      warnings: ["Service safeguard active."],
      fallbackUsed: true,
    };
    return NextResponse.json(safeFallback);
  }
}
