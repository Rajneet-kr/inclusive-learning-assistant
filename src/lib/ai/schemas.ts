import { z } from "zod";

export const SimplifiedSectionSchema = z.object({
  chunkId: z.string(),
  title: z.string(),
  simpleText: z.string(),
  keyIdea: z.string(),
  jargon: z.array(
    z.object({
      term: z.string(),
      plainMeaning: z.string(),
    })
  ),
  readingTimeSeconds: z.number(),
});

export const SimplificationResponseSchema = z.object({
  sections: z.array(SimplifiedSectionSchema),
});

export const QuizQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  options: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  correctIndex: z.number().min(0).max(3),
  explanation: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  concept: z.string(),
});

export const FlashcardSchema = z.object({
  id: z.string(),
  front: z.string(),
  back: z.string(),
  concept: z.string(),
});

export const StudyDaySchema = z.object({
  day: z.number(),
  title: z.string(),
  tasks: z.array(z.string()),
  estimatedMinutes: z.number(),
});

export const PracticePlanResponseSchema = z.object({
  quiz: z.array(QuizQuestionSchema),
  flashcards: z.array(FlashcardSchema),
  studyPlan: z.array(StudyDaySchema),
});
