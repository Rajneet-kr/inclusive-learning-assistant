import { NextRequest, NextResponse } from "next/server";
import { generateContentWithFallback, withTimeoutFallback } from "@/lib/ai/gemini";
import { TutorRequestSchema } from "@/lib/validation";
import { sampleBiologyNote, sampleLectureTranscript } from "@/lib/sampleData";
import { TutorAnswer, TutorCitation } from "@/types/api";

export const maxDuration = 60;

const GROUNDED_TUTOR_SYSTEM_PROMPT = `You are a grounded accessibility tutor for a student studying from their own uploaded material.

Answer only using the supplied context.

Rules:
1. Use only facts explicitly present in the supplied chunks or transcript segments.
2. Do not use outside knowledge.
3. Do not infer facts beyond what the source supports.
4. If the answer is not present, set confidence to "insufficient_evidence" and explain that the material does not contain enough information.
5. Cite every factual claim with the relevant chunkId and/or transcript timestamp.
6. Quote a short supporting phrase in 'quotedEvidence'.
7. Write 'answer' clearly and accurately.
8. Write 'simplifiedAnswer' in short sentences for a student with dyslexia.
9. Use plain language and explain technical terms immediately.
10. Suggest three useful follow-up questions based only on the material.
11. Return valid JSON only. No markdown, commentary, or code fences.

Return JSON format:
{
  "answer": "string",
  "simplifiedAnswer": "string",
  "confidence": "high",
  "citations": [
    {
      "chunkId": "string",
      "transcriptSegmentId": 0,
      "startSeconds": 0,
      "endSeconds": 0,
      "quotedEvidence": "string"
    }
  ],
  "followUpQuestions": ["string"]
}`;

const STOP_WORDS = new Set([
  "the", "and", "is", "in", "it", "to", "of", "for", "with", "on", "at", "by", "from",
  "this", "that", "these", "those", "what", "how", "why", "where", "when", "who", "which",
  "can", "you", "tell", "explain", "about", "does", "did", "are", "were", "was"
]);

function extractKeywords(query: string): string[] {
  return (query || "")
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’“”]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

export async function POST(request: NextRequest) {
  let reqQuestion = "";
  let reqDocumentId = "doc_live";

  try {
    const rawBody = await request.json().catch(() => null);
    if (!rawBody) {
      return NextResponse.json(
        { error: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    const validation = TutorRequestSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request parameters",
          details: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const {
      documentId,
      question,
      selectedChunkIds,
      accessibilityProfile,
      language,
      contextChunks,
      transcriptSegments,
    } = validation.data;

    reqQuestion = question;
    reqDocumentId = documentId;

    // 1. Gather all candidates from request or bundled sample
    let allChunks = Array.isArray(contextChunks) && contextChunks.length > 0
      ? contextChunks
      : sampleBiologyNote.chunks;

    let allSegments = Array.isArray(transcriptSegments) && transcriptSegments.length > 0
      ? transcriptSegments
      : sampleLectureTranscript.segments;

    // 2. Filter & Rank up to 8 relevant chunks/segments
    const keywords = extractKeywords(question);

    let prioritizedChunks = allChunks;
    if (selectedChunkIds && selectedChunkIds.length > 0) {
      const selectedSet = new Set(selectedChunkIds);
      prioritizedChunks = allChunks.filter((c) => selectedSet.has(c.id));
      if (prioritizedChunks.length === 0) prioritizedChunks = allChunks;
    }

    // Score chunks by keyword matches with semantic weighting (headings & key terms have higher signal)
    const scoredChunks = prioritizedChunks.map((c) => {
      const heading = (c.heading || "").toLowerCase();
      const text = (c.text || "").toLowerCase();
      const keyTerms = (c.keyTerms || []).map((t) => t.toLowerCase());
      let score = 0;
      for (const kw of keywords) {
        if (heading.includes(kw)) score += 3;
        if (keyTerms.some((t) => t.includes(kw))) score += 2;
        if (text.includes(kw)) score += 1;
      }
      return { chunk: c, score };
    });

    // Score transcript segments by keyword matches
    const scoredSegments = allSegments.map((s) => {
      const text = (s.text || "").toLowerCase();
      let score = 0;
      for (const kw of keywords) {
        if (text.includes(kw)) score += 1;
      }
      return { segment: s, score };
    });

    // Sort descending by score
    scoredChunks.sort((a, b) => b.score - a.score);
    scoredSegments.sort((a, b) => b.score - a.score);

    // Pick top items (up to 6 chunks and top 2 segments)
    const selectedChunks = scoredChunks.slice(0, 6).map((item) => ({
      chunkId: item.chunk.id,
      heading: item.chunk.heading,
      text: item.chunk.text,
      keyTerms: item.chunk.keyTerms,
    }));

    const selectedSegments = scoredSegments.slice(0, 2).map((item) => ({
      segmentId: item.segment.id,
      start: item.segment.start,
      end: item.segment.end,
      text: item.segment.text,
    }));

    const retrievedContext = {
      chunks: selectedChunks,
      transcriptSegments: selectedSegments,
    };

    const userPrompt = `Student profile: ${accessibilityProfile}
Language: ${language}
Question: ${question}

Allowed context:
${JSON.stringify(retrievedContext, null, 2)}`;

    const primaryAI = async (): Promise<TutorAnswer> => {
      const responseText = await generateContentWithFallback(
        [userPrompt],
        GROUNDED_TUTOR_SYSTEM_PROMPT,
        true
      );

      const cleanJson = responseText.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleanJson);

      const confidenceValues = ["high", "medium", "low", "insufficient_evidence"] as const;
      const confidence = confidenceValues.includes(parsed.confidence)
        ? parsed.confidence
        : "medium";

      const citations: TutorCitation[] = Array.isArray(parsed.citations)
        ? parsed.citations.map((cite: any) => ({
            chunkId: cite.chunkId ? String(cite.chunkId) : undefined,
            transcriptSegmentId: typeof cite.transcriptSegmentId === "number" ? cite.transcriptSegmentId : undefined,
            startSeconds: typeof cite.startSeconds === "number" ? cite.startSeconds : undefined,
            endSeconds: typeof cite.endSeconds === "number" ? cite.endSeconds : undefined,
            quotedEvidence: String(cite.quotedEvidence || "").slice(0, 250),
          }))
        : [];

      const followUpQuestions: string[] = Array.isArray(parsed.followUpQuestions)
        ? parsed.followUpQuestions.map(String).slice(0, 3)
        : [];

      return {
        answerId: `ans_${Date.now().toString(36)}`,
        question,
        answer: parsed.answer || "Answer derived from study context.",
        simplifiedAnswer: parsed.simplifiedAnswer || parsed.answer || "",
        confidence,
        citations,
        followUpQuestions,
        fallbackUsed: false,
      };
    };

    const fallbackGenerator = (): TutorAnswer => {
      const topChunk = scoredChunks[0];
      const topSegment = scoredSegments[0];

      // If NO meaningful keyword match exists in the document
      if (
        keywords.length === 0 ||
        ((!topChunk || topChunk.score === 0) && (!topSegment || topSegment.score === 0))
      ) {
        return {
          answerId: `ans_fb_${Date.now().toString(36)}`,
          question,
          answer:
            "I could not find enough evidence in this material to answer your question. Please retry or select a specific section from your notes.",
          simplifiedAnswer:
            "This note does not have enough information to answer that question. Try selecting a specific section.",
          confidence: "insufficient_evidence",
          citations: [],
          followUpQuestions: [
            "What are the main concepts covered in this note?",
            "Can you summarize the first section for me?",
            "What vocabulary words are defined here?",
          ],
          fallbackUsed: true,
        };
      }

      // We have meaningful keyword overlap! Assemble grounded extractive answer with real citations
      const citations: TutorCitation[] = [];
      let answerParts: string[] = [];
      let simplifiedSentence = "";

      if (topChunk && topChunk.score > 0) {
        const chunkText = topChunk.chunk.text || "";
        const sentences = chunkText
          .split(/(?<=[.?!])\s+/)
          .filter((s: string) => s.trim().length > 0);

        const matchingSentences = sentences.filter((s: string) => {
          const lower = s.toLowerCase();
          return keywords.some((kw) => lower.includes(kw));
        });

        const chosenSentences =
          matchingSentences.length > 0 ? matchingSentences : sentences.slice(0, 2);
        const excerpt = chosenSentences.join(" ");

        answerParts.push(
          `According to "${topChunk.chunk.heading}": ${excerpt}`
        );
        simplifiedSentence = chosenSentences[0] || excerpt;

        citations.push({
          chunkId: topChunk.chunk.id,
          quotedEvidence: chosenSentences[0] || excerpt.slice(0, 180),
        });
      }

      if (topSegment && topSegment.score > 0) {
        citations.push({
          transcriptSegmentId: topSegment.segment.id,
          startSeconds: topSegment.segment.start,
          endSeconds: topSegment.segment.end,
          quotedEvidence: (topSegment.segment.text || "").slice(0, 180),
        });
      }

      const fullAnswer =
        answerParts.join(" ") || "Relevant information found in your lecture material.";

      return {
        answerId: `ans_local_${Date.now().toString(36)}`,
        question,
        answer: fullAnswer,
        simplifiedAnswer: simplifiedSentence || fullAnswer,
        confidence: "medium",
        citations,
        followUpQuestions: [
          `Can you explain more about ${keywords[0] || "this topic"}?`,
          "What are the key terms in this section?",
          "How does this connect to the main idea?",
        ],
        fallbackUsed: true,
      };
    };

    const result = await withTimeoutFallback(primaryAI, fallbackGenerator, 12000);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Grounded Tutor API Error:", error);
    const safeFallback: TutorAnswer = {
      answerId: `ans_err_${Date.now().toString(36)}`,
      question: reqQuestion,
      answer:
        "I could not find enough evidence in this material to answer your question. Please retry or select a specific section from your notes.",
      simplifiedAnswer:
        "This note does not have enough information to answer that question. Try selecting a specific section.",
      confidence: "insufficient_evidence",
      citations: [],
      followUpQuestions: [
        "What are the main concepts covered in this note?",
        "Can you summarize the first section for me?",
      ],
      fallbackUsed: true,
    };
    return NextResponse.json(safeFallback);
  }
}
