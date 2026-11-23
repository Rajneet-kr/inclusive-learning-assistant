import { z } from "zod";

export const IngestRequestSchema = z.object({
  inputKind: z.enum(["pdf", "image", "text", "youtube", "audio", "video"]),
  accessibilityProfile: z.enum(["dyslexia", "low_vision", "hearing"]),
  subject: z.string().optional(),
  gradeLevel: z.string().optional(),
  language: z.string().default("en"),
  pastedText: z.string().optional(),
  youtubeUrl: z.string().optional(),
});

export const SimplifyRequestSchema = z.object({
  documentId: z.string(),
  chunkIds: z.array(z.string()).default([]),
  readingLevel: z.string().default("grade_6"),
  maxWordsPerChunk: z.number().default(60),
  bionicReading: z.boolean().default(false),
  language: z.string().default("en"),
});

export const TranscribeRequestSchema = z.object({
  documentId: z.string(),
  mediaUrl: z.string().url(),
  language: z.string().default("en"),
  generateSummary: z.boolean().default(true),
});

export const PracticeRequestSchema = z.object({
  documentId: z.string(),
  accessibilityProfile: z.enum(["dyslexia", "low_vision", "hearing"]),
  practiceKinds: z.array(z.enum(["quiz", "flashcards", "study_plan"])),
  difficulty: z.enum(["easy", "medium", "hard", "adaptive"]).default("adaptive"),
  questionCount: z.number().default(6),
  flashcardCount: z.number().default(8),
  studyDays: z.number().default(5),
  minutesPerDay: z.number().default(20),
});
