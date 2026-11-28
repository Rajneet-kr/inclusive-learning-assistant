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

export const StudyPackRequestSchema = z.object({
  documentId: z.string().default("doc_live"),
  title: z.string().default("Study Pack"),
  language: z
    .enum(["en", "hi", "kn", "ta", "te", "mr", "bn", "es", "fr", "de"])
    .default("en"),
  simplifiedSections: z
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
        readingTimeSeconds: z.number().optional().default(60),
      })
    )
    .default([]),
  glossary: z
    .array(
      z.object({
        term: z.string(),
        plainMeaning: z.string(),
        language: z.any().default("en"),
        source: z
          .enum(["document", "live_caption", "user_saved"])
          .default("document"),
        firstSeenAt: z.string().optional(),
        documentId: z.string().optional(),
      })
    )
    .default([]),
  transcript: z
    .object({
      format: z.literal("vtt"),
      content: z.string(),
    })
    .optional(),
  flashcards: z
    .array(
      z.object({
        id: z.string(),
        front: z.string(),
        back: z.string(),
        concept: z.string().optional(),
      })
    )
    .default([]),
  quiz: z
    .array(
      z.object({
        id: z.string(),
        question: z.string(),
        options: z.array(z.string()),
        correctIndex: z.number(),
        explanation: z.string(),
      })
    )
    .default([]),
  studyPlan: z
    .array(
      z.object({
        day: z.number(),
        title: z.string(),
        tasks: z.array(z.string()),
        estimatedMinutes: z.number(),
      })
    )
    .default([]),
  missingTerms: z.array(z.string()).optional(),
  subject: z.string().optional().default("General"),
});



