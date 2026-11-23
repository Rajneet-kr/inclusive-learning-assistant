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

export const TranslateRequestSchema = z.object({
  documentId: z.string().default("doc_live"),
  chunkIds: z.array(z.string()).default([]),
  targetLanguage: z.enum([
    "en",
    "hi",
    "kn",
    "ta",
    "te",
    "mr",
    "bn",
    "es",
    "fr",
    "de",
  ]),
  readingLevel: z.string().default("grade_6"),
  preserveTechnicalTerms: z.boolean().default(true),
  sections: z
    .array(
      z.object({
        chunkId: z.string(),
        title: z.string(),
        simpleText: z.string(),
        keyIdea: z.string(),
        jargon: z
          .array(
            z.object({
              term: z.string(),
              originalTerm: z.string().optional(),
              plainMeaning: z.string(),
            })
          )
          .default([]),
        readingTimeSeconds: z.number().optional(),
      })
    )
    .default([]),
});

export const TutorRequestSchema = z.object({
  documentId: z.string().min(1, "documentId is required"),
  question: z.string().min(1, "question cannot be empty"),
  selectedChunkIds: z.array(z.string()).default([]),
  accessibilityProfile: z
    .enum(["dyslexia", "low_vision", "hearing"])
    .default("dyslexia"),
  language: z.string().default("en"),
  voiceQuestion: z.boolean().default(false),
  contextChunks: z
    .array(
      z.object({
        id: z.string(),
        heading: z.string().default("Section"),
        text: z.string().default(""),
        keyTerms: z.array(z.string()).optional(),
      })
    )
    .optional(),
  transcriptSegments: z
    .array(
      z.object({
        id: z.number().optional(),
        start: z.number().optional(),
        end: z.number().optional(),
        text: z.string().default(""),
      })
    )
    .optional(),
});


