// Shared Types and API Contracts for Inclusive Learning Assistant
// Derived directly from ARCHITECTURE.md

export type AccessibilityProfile = "dyslexia" | "low_vision" | "hearing";

export type InputKind = "pdf" | "image" | "text" | "youtube" | "audio" | "video";

export type PracticeKind = "quiz" | "flashcards" | "study_plan";

export type IngestStatus = "queued" | "extracting" | "ready" | "failed";

export type DifficultyLevel = "easy" | "medium" | "hard" | "adaptive";

// ==========================================
// 1. Ingestion Types (/api/ingest)
// ==========================================

export interface DocumentChunk {
  id: string;
  index: number;
  heading: string;
  text: string;
  keyTerms: string[];
}

export interface IngestRequest {
  inputKind: InputKind;
  accessibilityProfile: AccessibilityProfile;
  subject?: string;
  gradeLevel?: string;
  language?: string;
  file?: File | Blob;
  pastedText?: string;
  youtubeUrl?: string;
}

export interface IngestResponse {
  documentId: string;
  status: IngestStatus;
  inputKind: InputKind;
  title: string;
  sourceSummary: string;
  extractedText: string;
  chunks: DocumentChunk[];
  warnings: string[];
  fallbackUsed: boolean;
  subject?: string;
  gradeLevel?: string;
}

export interface IngestError {
  error: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

// ==========================================
// 2. Simplification Types (/api/simplify)
// ==========================================

export interface JargonTerm {
  term: string;
  plainMeaning: string;
}

export interface SimplifiedSection {
  chunkId: string;
  title: string;
  simpleText: string;
  keyIdea: string;
  jargon: JargonTerm[];
  readingTimeSeconds: number;
}

export interface SimplifyRequest {
  documentId: string;
  chunkIds: string[];
  readingLevel?: string;
  maxWordsPerChunk?: number;
  bionicReading?: boolean;
  language?: string;
}

export interface SimplifyResponse {
  documentId: string;
  sections: SimplifiedSection[];
  fallbackUsed: boolean;
}

// ==========================================
// 3. Transcription Types (/api/transcribe)
// ==========================================

export interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

export interface KeyConcept {
  title: string;
  explanation: string;
  timestamps: number[];
}

export interface TranscribeRequest {
  documentId: string;
  mediaUrl: string;
  language?: string;
  generateSummary?: boolean;
}

export interface TranscribeResponse {
  documentId: string;
  transcriptId: string;
  language: string;
  durationSeconds: number;
  segments: TranscriptSegment[];
  keyConcepts: KeyConcept[];
  downloadUrl?: string;
  fallbackUsed: boolean;
}

// ==========================================
// 4. Captions Types (/api/captions)
// ==========================================

export interface CaptionsRequest {
  documentId: string;
  language?: string;
  mode: "live";
}

export interface CaptionsResponse {
  sessionId: string;
  language: string;
  websocketless: boolean;
  status: "active" | "ended";
}

// ==========================================
// 5. Practice Types (/api/practice)
// ==========================================

export interface QuizQuestion {
  id: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  concept: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  concept: string;
}

export interface StudyDay {
  day: number;
  title: string;
  tasks: string[];
  estimatedMinutes: number;
}

export interface PracticeRequest {
  documentId: string;
  accessibilityProfile: AccessibilityProfile;
  practiceKinds: PracticeKind[];
  difficulty?: DifficultyLevel;
  questionCount?: number;
  flashcardCount?: number;
  studyDays?: number;
  minutesPerDay?: number;
  subject?: string;
  gradeLevel?: string;
  language?: string;
}

export interface PracticeResponse {
  documentId: string;
  practiceId: string;
  quiz: QuizQuestion[];
  flashcards: Flashcard[];
  studyPlan: StudyDay[];
  fallbackUsed: boolean;
}

// ==========================================
// 6. Text-to-Speech Types (/api/tts)
// ==========================================

export interface TtsRequest {
  text: string;
  voiceId?: string;
  format?: string;
}

export interface TtsResponse {
  audioUrl: string;
  durationSeconds: number;
  provider: "browser" | "elevenlabs";
}

// ==========================================
// 7. Client Accessibility Settings (localStorage)
// ==========================================

export type ColorOverlay = "none" | "cream" | "yellow" | "blue" | "peach" | "green";

export interface AccessibilitySettings {
  profile: AccessibilityProfile;
  fontSize: number; // in px, e.g. 18
  lineSpacing: number; // multiplier, e.g. 1.75
  letterSpacing: number; // in em, e.g. 0.05
  fontFamily: "opendyslexic" | "system" | "sans";
  bionicReading: boolean;
  colorOverlay: ColorOverlay;
  highContrast: boolean;
  ttsRate: number; // 0.5 to 2.0
  ttsPitch: number; // 0.5 to 1.5
  ttsVoice: string | null;
  highlightCurrentWord: boolean;
  captionsEnabled: boolean;
  captionsFontSize: number;
  language?: SupportedLanguageCode;
  focus?: Partial<FocusSettings>;
}

export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  profile: "dyslexia",
  fontSize: 18,
  lineSpacing: 1.75,
  letterSpacing: 0.04,
  fontFamily: "opendyslexic",
  bionicReading: false,
  colorOverlay: "cream",
  highContrast: false,
  ttsRate: 1.0,
  ttsPitch: 1.0,
  ttsVoice: null,
  highlightCurrentWord: true,
  captionsEnabled: false,
  captionsFontSize: 16,
  language: "en",
  focus: {
    mode: "off",
    rulerHeightPx: 48,
    rulerOpacity: 0.25,
    visibleLines: 2,
    syllableBreakdown: false,
    microSprintMinutes: 10,
    microSprintActive: false,
    reduceMotion: false,
  },
};

// ==========================================
// 8. Phase 4 Types: Multilingual, STEM, Focus, Tutor, Offline Pack
// ==========================================

export type SupportedLanguageCode =
  | "en"
  | "hi"
  | "kn"
  | "ta"
  | "te"
  | "mr"
  | "bn"
  | "es"
  | "fr"
  | "de";

export type TextDirection = "ltr" | "rtl";

export interface LanguageOption {
  code: SupportedLanguageCode;
  label: string;
  nativeLabel: string;
  direction: TextDirection;
  ttsSupported: boolean;
}

export interface TranslatedSimplifiedSection {
  chunkId: string;
  title: string;
  simpleText: string;
  keyIdea: string;
  jargon: Array<{
    term: string;
    originalTerm?: string;
    plainMeaning: string;
  }>;
  readingTimeSeconds: number;
}

export interface TranslationResult {
  documentId: string;
  targetLanguage: SupportedLanguageCode;
  sourceLanguage: SupportedLanguageCode;
  direction: TextDirection;
  sections: TranslatedSimplifiedSection[];
  ttsVoiceAvailable: boolean;
  fallbackUsed: boolean;
}

export type StemElementType =
  | "equation"
  | "graph"
  | "table"
  | "diagram"
  | "circuit"
  | "chemical_reaction"
  | "text"
  | "unknown";

export interface StemElement {
  id: string;
  type: StemElementType;
  rawText?: string;
  latex?: string;
  mathml?: string;
  accessibleMathText: string;
  description: string;
  stepByStepExplanation: string[];
  variables?: Array<{
    symbol: string;
    meaning: string;
    unit?: string;
  }>;
  chart?: {
    title?: string;
    xAxis?: string;
    yAxis?: string;
    series?: Array<{
      label: string;
      trend: string;
      notablePoints?: string[];
    }>;
  };
  confidence: "high" | "medium" | "low";
  sourceRegion?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface StemVerbalizerResult {
  documentId?: string;
  elements: StemElement[];
  overallExplanation: string;
  keyTakeaways: string[];
  warnings: string[];
  fallbackUsed: boolean;
}

export type FocusToolMode =
  | "off"
  | "ruler"
  | "line_focus"
  | "distraction_free";

export interface FocusSettings {
  mode: FocusToolMode;
  rulerHeightPx: number;
  rulerOpacity: number;
  visibleLines: 1 | 2 | 3;
  syllableBreakdown: boolean;
  microSprintMinutes: 5 | 10 | 15 | 25;
  microSprintActive: boolean;
  reduceMotion: boolean;
}

export const DEFAULT_FOCUS_SETTINGS: FocusSettings = {
  mode: "off",
  rulerHeightPx: 48,
  rulerOpacity: 0.25,
  visibleLines: 2,
  syllableBreakdown: false,
  microSprintMinutes: 10,
  microSprintActive: false,
  reduceMotion: false,
};

export interface FocusSession {
  id: string;
  documentId?: string;
  startedAt: string;
  plannedMinutes: number;
  completedMinutes: number;
  completedChunkIds: string[];
  status: "active" | "completed" | "cancelled";
}

export interface TutorCitation {
  chunkId?: string;
  transcriptSegmentId?: number;
  startSeconds?: number;
  endSeconds?: number;
  quotedEvidence: string;
}

export interface TutorAnswer {
  answerId: string;
  question: string;
  answer: string;
  simplifiedAnswer: string;
  confidence: "high" | "medium" | "low" | "insufficient_evidence";
  citations: TutorCitation[];
  followUpQuestions: string[];
  fallbackUsed: boolean;
}

export interface GlossaryTerm {
  term: string;
  plainMeaning: string;
  language: SupportedLanguageCode;
  source: "document" | "live_caption" | "user_saved";
  firstSeenAt?: string;
  documentId?: string;
}

export interface OfflineStudyPack {
  documentId: string;
  title: string;
  generatedAt: string;
  language: SupportedLanguageCode;
  simplifiedSections: TranslatedSimplifiedSection[];
  glossary: GlossaryTerm[];
  transcript?: {
    format: "vtt";
    content: string;
  };
  flashcards: Array<{
    id: string;
    front: string;
    back: string;
    concept?: string;
  }>;
  quiz: Array<{
    id: string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }>;
  studyPlan: Array<{
    day: number;
    title: string;
    tasks: string[];
    estimatedMinutes: number;
  }>;
}
