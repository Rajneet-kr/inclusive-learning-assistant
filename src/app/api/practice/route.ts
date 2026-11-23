import { NextRequest, NextResponse } from "next/server";
import { generateContentWithFallback, withTimeoutFallback } from "@/lib/ai/gemini";
import { PRACTICE_PLAN_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { PracticeResponse, QuizQuestion, Flashcard, StudyDay } from "@/types/api";
import { samplePracticePlan } from "@/lib/sampleData";

export const maxDuration = 60;

function createDynamicPracticePlan(
  chunks: any[],
  subject = "General",
  documentId = "doc_live",
  questionCount = 6,
  flashcardCount = 8,
  studyDays = 5
): PracticeResponse {
  const quiz: QuizQuestion[] = [];
  const flashcards: Flashcard[] = [];
  const studyPlan: StudyDay[] = [];

  // Generate dynamic quiz questions from chunks
  chunks.forEach((chunk: any, idx: number) => {
    if (quiz.length < questionCount) {
      const term = (chunk.keyTerms && chunk.keyTerms[0]) || chunk.heading || `Concept ${idx + 1}`;
      const firstSentence = (chunk.text || "").split(/(?<=[.?!])\s+/)[0] || `${term} is fundamental to ${subject}.`;

      quiz.push({
        id: `q_dyn_${idx + 1}`,
        question: `Based on the lecture notes on "${chunk.heading}", what is the primary role of ${term}?`,
        options: [
          firstSentence.length > 80 ? firstSentence.slice(0, 80) + "..." : firstSentence,
          `It serves as an unrelated process outside of ${subject}.`,
          `It is completely inactive during standard operations.`,
          `It acts solely as a historical reference without modern function.`,
        ],
        correctIndex: 0,
        explanation: `${chunk.heading} explains: ${firstSentence}`,
        difficulty: idx === 0 ? "easy" : idx < 3 ? "medium" : "hard",
        concept: term,
      });
    }

    // Generate flashcards from key terms
    if (Array.isArray(chunk.keyTerms)) {
      chunk.keyTerms.forEach((kTerm: string) => {
        if (flashcards.length < flashcardCount) {
          flashcards.push({
            id: `f_dyn_${flashcards.length + 1}`,
            front: `What is ${kTerm}?`,
            back: `A key concept discussed in "${chunk.heading}" under ${subject}.`,
            concept: kTerm,
          });
        }
      });
    }
  });

  // Ensure minimum flashcards
  while (flashcards.length < Math.min(flashcardCount, 4)) {
    const term = `Topic ${flashcards.length + 1}`;
    flashcards.push({
      id: `f_dyn_${flashcards.length + 1}`,
      front: `Key Concept #${flashcards.length + 1} in ${subject}`,
      back: `Core understanding required for mastering ${subject} material.`,
      concept: subject,
    });
  }

  // Generate 5-day study plan from chunks
  for (let d = 1; d <= studyDays; d++) {
    const chunkForDay = chunks[(d - 1) % chunks.length];
    studyPlan.push({
      day: d,
      title: chunkForDay ? `Mastering ${chunkForDay.heading}` : `Day ${d}: Review & Synthesis`,
      tasks: [
        chunkForDay
          ? `Read the simplified notes for "${chunkForDay.heading}" (5 mins).`
          : `Review key concepts across all sections (10 mins).`,
        `Review Flashcards #${(d * 2 - 1)} and #${(d * 2)} twice.`,
        `Answer Quiz Question #${Math.min(d, quiz.length || 1)}.`,
      ],
      estimatedMinutes: 20,
    });
  }

  return {
    documentId,
    practiceId: `pr_dyn_${Date.now().toString(36)}`,
    quiz,
    flashcards,
    studyPlan,
    fallbackUsed: true,
  };
}

export async function POST(request: NextRequest) {
  let requestChunks: any[] = [];
  let reqDocumentId = "doc_live";
  let reqSubject = "General";
  let reqQuestionCount = 6;
  let reqFlashcardCount = 8;
  let reqStudyDays = 5;

  try {
    const body = await request.json();
    const {
      documentId = "doc_live",
      accessibilityProfile = "dyslexia",
      practiceKinds = ["quiz", "flashcards", "study_plan"],
      difficulty = "adaptive",
      questionCount = 6,
      flashcardCount = 8,
      studyDays = 5,
      minutesPerDay = 20,
      subject = "General",
      gradeLevel = "Grade 10",
      language = "en",
      sourceText = "",
      chunks = [],
    } = body;

    reqDocumentId = documentId;
    requestChunks = Array.isArray(chunks) ? chunks : [];
    reqSubject = subject;
    reqQuestionCount = questionCount;
    reqFlashcardCount = flashcardCount;
    reqStudyDays = studyDays;

    let materialText = "";
    if (requestChunks.length > 0) {
      materialText = requestChunks
        .map((c, i) => `Section ${i + 1}: ${c.heading}\nSummary: ${c.text}\nTerms: ${(c.keyTerms || []).join(", ")}`)
        .join("\n\n");
    } else if (sourceText) {
      materialText = sourceText.slice(0, 4000);
    } else {
      materialText = samplePracticePlan.quiz.map((q) => q.question).join("\n");
    }

    const userPrompt = `
Student profile:
Accessibility profile: ${accessibilityProfile}
Subject: ${subject}
Grade level: ${gradeLevel}
Preferred difficulty: ${difficulty}
Requested quiz questions: ${questionCount}
Requested flashcards: ${flashcardCount}
Study days: ${studyDays}
Minutes per day: ${minutesPerDay}
Language: ${language}

Learning material to base practice questions strictly on:
${materialText}
`;

    const primaryAI = async (): Promise<PracticeResponse> => {
      const responseText = await generateContentWithFallback(
        [userPrompt],
        PRACTICE_PLAN_SYSTEM_PROMPT,
        true
      );

      const cleanJson = responseText.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleanJson);

      if (Array.isArray(parsed.quiz) && parsed.quiz.length > 0) {
        const quiz: QuizQuestion[] = parsed.quiz.slice(0, questionCount).map((q: any, idx: number) => ({
          id: q.id || `q_${idx + 1}`,
          question: q.question || "Practice question",
          options:
            Array.isArray(q.options) && q.options.length === 4
              ? (q.options as [string, string, string, string])
              : [
                  "Correct option",
                  "Distractor option 1",
                  "Distractor option 2",
                  "Distractor option 3",
                ],
          correctIndex:
            typeof q.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex < 4
              ? q.correctIndex
              : 0,
          explanation: q.explanation || "Helpful explanation for this concept.",
          difficulty:
            q.difficulty === "hard" || q.difficulty === "medium" || q.difficulty === "easy"
              ? q.difficulty
              : "easy",
          concept: q.concept || subject,
        }));

        const flashcards: Flashcard[] = Array.isArray(parsed.flashcards)
          ? parsed.flashcards.slice(0, flashcardCount).map((f: any, idx: number) => ({
              id: f.id || `f_${idx + 1}`,
              front: f.front || "Concept term",
              back: f.back || "Concept definition",
              concept: f.concept || subject,
            }))
          : [];

        const studyPlan: StudyDay[] = Array.isArray(parsed.studyPlan)
          ? parsed.studyPlan.slice(0, studyDays).map((d: any, idx: number) => ({
              day: typeof d.day === "number" ? d.day : idx + 1,
              title: d.title || `Day ${idx + 1} Study Session`,
              tasks: Array.isArray(d.tasks) ? d.tasks : ["Review notes for 15 minutes"],
              estimatedMinutes:
                typeof d.estimatedMinutes === "number" ? d.estimatedMinutes : minutesPerDay,
            }))
          : [];

        return {
          documentId,
          practiceId: `pr_${Date.now().toString(36)}`,
          quiz,
          flashcards,
          studyPlan,
          fallbackUsed: false,
        };
      }

      return fallbackGenerator();
    };

    const fallbackGenerator = (): PracticeResponse => {
      if (requestChunks.length > 0) {
        return createDynamicPracticePlan(
          requestChunks,
          subject,
          documentId,
          questionCount,
          flashcardCount,
          studyDays
        );
      }

      return {
        ...samplePracticePlan,
        documentId,
        fallbackUsed: true,
      };
    };

    const result = await withTimeoutFallback(primaryAI, fallbackGenerator, 14000);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in /api/practice:", error);

    // Fallback directly from request chunks so user never sees stale Biology questions
    if (requestChunks.length > 0) {
      return NextResponse.json(
        createDynamicPracticePlan(
          requestChunks,
          reqSubject,
          reqDocumentId,
          reqQuestionCount,
          reqFlashcardCount,
          reqStudyDays
        )
      );
    }

    return NextResponse.json({
      ...samplePracticePlan,
      documentId: reqDocumentId,
      fallbackUsed: true,
    });
  }
}
