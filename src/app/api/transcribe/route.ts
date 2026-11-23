import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@deepgram/sdk";
import { generateContentWithFallback, withTimeoutFallback } from "@/lib/ai/gemini";
import { TranscribeResponse, TranscriptSegment, KeyConcept } from "@/types/api";
import { sampleLectureTranscript } from "@/lib/sampleData";

export const maxDuration = 60;

function getDeepgramClient() {
  const apiKey = process.env.DEEPGRAM_API_KEY || "";
  return createClient(apiKey);
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let documentId = "doc_audio";
    let mediaUrl = "";
    let fileBuffer: Buffer | null = null;
    let fileMimeType = "audio/mp3";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      documentId = (formData.get("documentId") as string) || `doc_${Date.now().toString(36)}`;
      mediaUrl = (formData.get("mediaUrl") as string) || "";

      const file = formData.get("file") as File | null;
      if (file && file.size > 0) {
        const arrayBuf = await file.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuf);
        fileMimeType = file.type || "audio/mp3";
      }
    } else {
      const json = await request.json();
      documentId = json.documentId || `doc_${Date.now().toString(36)}`;
      mediaUrl = json.mediaUrl || "";
    }

    const primaryAI = async (): Promise<TranscribeResponse> => {
      const deepgram = getDeepgramClient();

      let dgResult: any;

      if (fileBuffer) {
        const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
          fileBuffer,
          {
            model: "nova-3",
            smart_format: true,
            punctuate: true,
            utterances: true,
          }
        );
        if (error) throw new Error(JSON.stringify(error));
        dgResult = result;
      } else if (mediaUrl) {
        const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
          { url: mediaUrl },
          {
            model: "nova-3",
            smart_format: true,
            punctuate: true,
            utterances: true,
          }
        );
        if (error) throw new Error(JSON.stringify(error));
        dgResult = result;
      } else {
        throw new Error("No audio file or mediaUrl provided for transcription");
      }

      const durationSeconds = Math.round(dgResult.metadata?.duration || 60);
      const utterances = dgResult.results?.utterances;
      const alternative = dgResult.results?.channels?.[0]?.alternatives?.[0];
      const fullTranscript = alternative?.transcript || "";

      let segments: TranscriptSegment[] = [];

      if (Array.isArray(utterances) && utterances.length > 0) {
        segments = utterances.map((u: any, idx: number) => ({
          id: idx,
          start: Math.round(u.start * 10) / 10,
          end: Math.round(u.end * 10) / 10,
          text: u.transcript.trim(),
        }));
      } else if (alternative?.words && alternative.words.length > 0) {
        // Group words into ~10-word segments with timestamps
        const words = alternative.words;
        const chunkSize = 12;
        for (let i = 0; i < words.length; i += chunkSize) {
          const slice = words.slice(i, i + chunkSize);
          segments.push({
            id: segments.length,
            start: Math.round((slice[0]?.start || 0) * 10) / 10,
            end: Math.round((slice[slice.length - 1]?.end || 0) * 10) / 10,
            text: slice.map((w: any) => w.punctuated_word || w.word).join(" "),
          });
        }
      } else {
        segments = [
          {
            id: 0,
            start: 0.0,
            end: durationSeconds,
            text: fullTranscript || "Speech captured without segmented words.",
          },
        ];
      }

      // Use Gemini to extract key concepts with timestamps from transcript
      let keyConcepts: KeyConcept[] = [];
      try {
        const prompt = `
Extract 3 to 4 key educational concepts from this transcribed lecture.
Provide a concise title, brief explanation, and the approximate start timestamp in seconds.
Return valid JSON only matching schema:
{
  "keyConcepts": [
    {
      "title": "string",
      "explanation": "string",
      "timestamps": [0.0]
    }
  ]
}

Lecture Transcript:
${fullTranscript.slice(0, 3000)}
`;
        const geminiResp = await generateContentWithFallback([prompt], undefined, true);
        const clean = geminiResp.replace(/```json\n?|\n?```/g, "").trim();
        const parsed = JSON.parse(clean);
        if (Array.isArray(parsed.keyConcepts)) {
          keyConcepts = parsed.keyConcepts;
        }
      } catch (kcErr) {
        console.warn("Key concepts extraction fallback:", kcErr);
        keyConcepts = [
          {
            title: "Lecture Introduction",
            explanation: "Core discussion of study concepts.",
            timestamps: [0.0],
          },
        ];
      }

      return {
        documentId,
        transcriptId: `tr_${Date.now().toString(36)}`,
        language: "en",
        durationSeconds,
        segments,
        keyConcepts,
        downloadUrl: `/api/transcribe?format=vtt`,
        fallbackUsed: false,
      };
    };

    const fallbackGenerator = (): TranscribeResponse => {
      return {
        ...sampleLectureTranscript,
        documentId,
        fallbackUsed: true,
      };
    };

    const response = await withTimeoutFallback(primaryAI, fallbackGenerator, 12000);
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in /api/transcribe:", error);
    return NextResponse.json(
      {
        ...sampleLectureTranscript,
        fallbackUsed: true,
      },
      { status: 200 }
    );
  }
}
