import { NextRequest, NextResponse } from "next/server";
import { generateContentWithFallback, withTimeoutFallback } from "@/lib/ai/gemini";
import { PRACTICE_PLAN_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { PracticeResponse, QuizQuestion, Flashcard, StudyDay } from "@/types/api";
import { samplePracticePlan } from "@/lib/sampleData";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
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

    const materialText =
      sourceText ||
      (Array.isArray(chunks) && chunks.length > 0
        ? chunks.map((c: any) => `${c.heading}: ${c.text}`).join("\n\n")
        : samplePracticePlan.quiz.map((q) => q.question).join("\n"));

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

Learning material:
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

      const quiz: QuizQuestion[] = Array.isArray(parsed.quiz)
        ? parsed.quiz.slice(0, questionCount).map((q: any, idx: number) => ({
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
          }))
        : samplePracticePlan.quiz;

      const flashcards: Flashcard[] = Array.isArray(parsed.flashcards)
        ? parsed.flashcards.slice(0, flashcardCount).map((f: any, idx: number) => ({
            id: f.id || `f_${idx + 1}`,
            front: f.front || "Concept term",
            back: f.back || "Concept definition",
            concept: f.concept || subject,
          }))
        : samplePracticePlan.flashcards;

      const studyPlan: StudyDay[] = Array.isArray(parsed.studyPlan)
        ? parsed.studyPlan.slice(0, studyDays).map((d: any, idx: number) => ({
            day: typeof d.day === "number" ? d.day : idx + 1,
            title: d.title || `Day ${idx + 1} Study Session`,
            tasks: Array.isArray(d.tasks) ? d.tasks : ["Review notes for 15 minutes"],
            estimatedMinutes:
              typeof d.estimatedMinutes === "number" ? d.estimatedMinutes : minutesPerDay,
          }))
        : samplePracticePlan.studyPlan;

      return {
        documentId,
        practiceId: `pr_${Date.now().toString(36)}`,
        quiz,
        flashcards,
        studyPlan,
        fallbackUsed: false,
      };
    };

    const fallbackGenerator = (): PracticeResponse => {
      return {
        documentId,
        practiceId: `pr_sample_${Date.now().toString(36)}`,
        quiz: samplePracticePlan.quiz,
        flashcards: samplePracticePlan.flashcards,
        studyPlan: samplePracticePlan.studyPlan,
        fallbackUsed: true,
      };
    };

    const result = await withTimeoutFallback(primaryAI, fallbackGenerator, 12000);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in /api/practice:", error);
    return NextResponse.json(
      {
        ...samplePracticePlan,
        fallbackUsed: true,
      },
      { status: 200 }
    );
  }
}
