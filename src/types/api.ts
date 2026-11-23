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
};
