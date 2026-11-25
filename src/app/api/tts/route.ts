import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const SUPPORTED_LANG_MAP: Record<string, string> = {
  en: "en",
  hi: "hi",
  kn: "kn",
  ta: "ta",
  te: "te",
  mr: "mr",
  bn: "bn",
  es: "es",
  fr: "fr",
  de: "de",
};

/**
 * Splits text into safe chunks (<= 160 chars) on sentence and clause boundaries
 * so Google Translate TTS endpoint limits (~200 chars) are never exceeded.
 */
function splitTextForGoogleTts(text: string, maxChunkLength = 160): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  if (normalized.length <= maxChunkLength) return [normalized];

  // Split on sentence punctuation (. ! ? । ; \n)
  const sentenceDelimiters = /([^.!?।;\n]+[.!?।;\n]+|\s+[^.!?।;\n]+$)/g;
  const sentenceMatches = normalized.match(sentenceDelimiters) || [normalized];

  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentenceMatches) {
    const s = sentence.trim();
    if (!s) continue;

    if (s.length > maxChunkLength) {
      // Split sentence into clauses
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = "";
      }
      const clauseDelimiters = /([^,:\-—]+[,:\-—]+|\s+[^,:\-—]+$)/g;
      const clauseMatches = s.match(clauseDelimiters) || [s];
      for (const clause of clauseMatches) {
        const c = clause.trim();
        if (!c) continue;
        if (c.length > maxChunkLength) {
          // Fallback to words
          const words = c.split(" ");
          for (const word of words) {
            if ((currentChunk + " " + word).trim().length <= maxChunkLength) {
              currentChunk = (currentChunk + " " + word).trim();
            } else {
              if (currentChunk) chunks.push(currentChunk);
              currentChunk = word;
            }
          }
        } else if ((currentChunk + " " + c).trim().length <= maxChunkLength) {
          currentChunk = (currentChunk + " " + c).trim();
        } else {
          if (currentChunk) chunks.push(currentChunk);
          currentChunk = c;
        }
      }
    } else if ((currentChunk + " " + s).trim().length <= maxChunkLength) {
      currentChunk = (currentChunk + " " + s).trim();
    } else {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = s;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Fetches an MP3 audio chunk from Google Translate TTS with timeout and headers.
 */
async function fetchTtsChunk(chunk: string, targetLang: string): Promise<Buffer> {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(
    targetLang
  )}&q=${encodeURIComponent(chunk)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9000);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Referer: "https://translate.google.com/",
        Accept: "audio/mpeg, audio/*;q=0.9",
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Google TTS endpoint returned HTTP ${res.status}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function handleTtsRequest(text: string, lang: string) {
  const cleanText = (text || "").trim();
  if (!cleanText) {
    return NextResponse.json(
      { error: { code: "INVALID_TEXT", message: "No text provided for TTS audio conversion." } },
      { status: 400 }
    );
  }

  const baseLang = (lang || "en").toLowerCase().split(/[-_]/)[0];
  const targetLang = SUPPORTED_LANG_MAP[baseLang] || "en";

  const chunks = splitTextForGoogleTts(cleanText, 160);
  if (chunks.length === 0) {
    return NextResponse.json(
      { error: { code: "EMPTY_TEXT", message: "Text contains no speakable characters." } },
      { status: 400 }
    );
  }

  try {
    // Fetch audio chunks (bounded parallelism to protect network limits)
    const audioBuffers: Buffer[] = [];
    for (const chunk of chunks) {
      const buf = await fetchTtsChunk(chunk, targetLang);
      audioBuffers.push(buf);
    }

    const concatenatedBuffer = Buffer.concat(audioBuffers);

    return new Response(concatenatedBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": concatenatedBuffer.length.toString(),
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-TTS-Language": targetLang,
        "X-TTS-Chunks": chunks.length.toString(),
      },
    });
  } catch (err: any) {
    console.error("Error in /api/tts:", err?.message || err);
    return NextResponse.json(
      {
        error: {
          code: "TTS_FETCH_FAILED",
          message: err?.message || "Failed to generate speech audio from Google TTS.",
        },
      },
      { status: 502 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const text = typeof body?.text === "string" ? body.text : "";
    const lang = typeof body?.lang === "string" ? body.lang : "en";
    return await handleTtsRequest(text, lang);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: {
          code: "TTS_REQUEST_ERROR",
          message: error?.message || "Failed to parse TTS request.",
        },
      },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get("text") || "";
  const lang = searchParams.get("lang") || "en";
  return await handleTtsRequest(text, lang);
}
