Part C: Anti Gravity implementation spec
Paste the following into PHASE4_ROADMAP.md. Execute sub-phases sequentially; do not begin the next sub-phase until both checks pass.

md
# PHASE 4 ROADMAP — Inclusive Learning Assistant v2.0

## Global engineering rules

1. Preserve every existing v1.0 API contract, component prop, and localStorage key.
2. Add new fields as optional properties only.
3. Never remove or rename existing fields.
4. Use `export const maxDuration = 60;` in every new Next.js API route.
5. Wrap every external AI/provider call in the existing `withTimeoutFallback` utility.
6. Never expose Gemini, Deepgram, or ElevenLabs keys to the browser.
7. Use server-side API routes for provider calls.
8. Every new UI control must be keyboard accessible, labeled, and operable without color alone.
9. Every AI response must have a deterministic fallback.
10. Run these checks after every sub-phase:
   - `npx tsc --noEmit`
   - `npm run build`
   - Manual keyboard-only smoke test
   - axe DevTools scan of affected screens

## Sub-phase 4.0 — Shared types and utilities

### Goal
Add backward-compatible types and shared helpers without changing UI behavior.

### Tasks
1. Append the TypeScript interfaces below to `src/types/api.ts`.
2. Create `src/lib/i18n.ts` for supported languages and direction metadata.
3. Create `src/lib/mathVerbalizer.ts` for client-side spoken-math fallback.
4. Create `src/lib/exporters.ts` for CSV, HTML, and printable study-pack generation.
5. Create `src/lib/glossaryMatcher.ts` for local exact/fuzzy term matching.
6. Do not modify existing API route files in this sub-phase.

### Verification
- `npx tsc --noEmit`
- `npm run build`
- Confirm existing sample mode still loads.
TypeScript extensions
Append these declarations to src/types/api.ts. Do not alter existing interfaces.

ts
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
Sub-phase 4.1 — Multilingual bridge
md
### Goal
Translate simplified dyslexia chunks while preserving accessible structure.

### New API route
Create `src/app/api/translate/route.ts`.

Requirements:
- Accept POST JSON.
- Validate with Zod.
- Set `export const maxDuration = 60;`.
- Use Gemini `gemini-3.5-flash-lite` first.
- Use `gemini-3.8-flash` only if the primary call fails or returns invalid JSON.
- Use a 12-second timeout.
- On timeout or parse failure, return the original English sections unchanged with `fallbackUsed: true`.
- Cache results in Supabase using documentId, chunkId, targetLanguage, and modelVersion.

### Request schema
{
  "documentId": "string",
  "chunkIds": ["string"],
  "targetLanguage": "hi | kn | ta | te | mr | bn | es | fr | de",
  "readingLevel": "grade_6",
  "preserveTechnicalTerms": true
}

### Response schema
{
  "documentId": "string",
  "targetLanguage": "string",
  "sourceLanguage": "en",
  "direction": "ltr | rtl",
  "sections": [
    {
      "chunkId": "string",
      "title": "string",
      "simpleText": "string",
      "keyIdea": "string",
      "jargon": [
        {
          "term": "string",
          "originalTerm": "string",
          "plainMeaning": "string"
        }
      ],
      "readingTimeSeconds": 0
    }
  ],
  "ttsVoiceAvailable": true,
  "fallbackUsed": false
}

### UI changes
1. Add `LanguageSelector` to `AccessibilityToolbar`.
2. Persist selected language in the existing accessibility-settings hook.
3. Update `DyslexiaReader` to render translated sections.
4. Set `dir` dynamically based on `direction`.
5. Show a nonblocking notice if no browser TTS voice supports the selected language.
6. Add translated sample data for Hindi and Spanish in `public/samples/`.

### Verification
- `npx tsc --noEmit`
- `npm run build`
- Translate the Biology sample into Hindi and Spanish.
- Confirm chunk order, glossaries, and TTS controls remain functional.
- Confirm English remains the default and no existing user setting breaks.
Translation system prompt
text
You are an accessibility-focused educational translator for students with dyslexia and low vision.

Translate the supplied simplified learning material into {{targetLanguage}}.

Rules:
1. Preserve the meaning, order, and chunk boundaries exactly.
2. Keep language simple, direct, and suitable for a student with dyslexia.
3. Use short sentences of 8–16 words where natural in the target language.
4. Do not translate proper nouns, chemical symbols, mathematical symbols, code identifiers, or universally used technical abbreviations unless a standard translation exists.
5. For technical terms, retain the original English term in `term` and provide a clear explanation in {{targetLanguage}} in `plainMeaning`.
6. Do not add facts that are not present in the source.
7. If a phrase is unclear, write: “This part is unclear in the original notes.”
8. Return valid JSON only. No markdown, explanation, or code fences.

Return JSON:
{
  "sections": [
    {
      "chunkId": "string",
      "title": "string",
      "simpleText": "string",
      "keyIdea": "string",
      "jargon": [
        {
          "term": "string",
          "originalTerm": "string",
          "plainMeaning": "string"
        }
      ],
      "readingTimeSeconds": 0
    }
  ]
}

Target language: {{targetLanguage}}
Reading level: {{readingLevel}}

Simplified source sections:
{{simplifiedSectionsJson}}
Sub-phase 4.2 — STEM verbalizer
md
### Goal
Convert photos of equations, graphs, diagrams, and handwritten STEM notes into accessible explanations.

### New API route
Create `src/app/api/stem-verbalizer/route.ts`.

Requirements:
- Accept multipart/form-data with an image file and optional documentId.
- Validate JPG, PNG, and WEBP.
- Limit uploads to 10 MB before forwarding.
- Use Gemini multimodal extraction.
- Use a 12-second timeout.
- If Gemini fails, return a non-hallucinated fallback:
  - Set `confidence: "low"`.
  - Return the original filename and a request for clearer image/lighting.
  - Do not fabricate equations or explanations.

### Response requirements
Every returned element must include:
- `accessibleMathText`
- `description`
- `stepByStepExplanation`
- `confidence`
- Optional `latex`, `mathml`, variables, and chart metadata.

### UI changes
1. Add `StemVerbalizerPanel` to the document view.
2. Add an upload control labeled: “Upload a photo of a board, equation, graph, or diagram.”
3. Render equations using KaTeX.
4. Add `aria-label` from `accessibleMathText` for every equation.
5. Add buttons:
   - “Read explanation aloud”
   - “Explain step by step”
   - “What does this symbol mean?”
6. Add a low-confidence warning when `confidence === "low"`.

### Verification
- `npx tsc --noEmit`
- `npm run build`
- Test a clear printed equation.
- Test a handwritten equation.
- Test a bar chart.
- Test a blurry image and confirm the low-confidence fallback.
- Confirm screen-reader output does not read raw LaTeX symbols.
STEM verbalizer prompt
text
You are an accessibility specialist for students with dyslexia, low vision, and hearing impairment.

Analyze the supplied image of a whiteboard, handwritten note, textbook page, equation, graph, table, or diagram.

Rules:
1. Extract only what is visibly present. Do not invent missing values, labels, equations, or conclusions.
2. Identify each independent element: equation, graph, table, diagram, circuit, chemical reaction, or text.
3. For equations, return clean LaTeX where possible and a natural spoken version in `accessibleMathText`.
4. Never read LaTeX syntax aloud. Convert symbols into spoken mathematical language.
5. For graphs, identify title, axes, units, series, trends, intercepts, peaks, and notable points only if visible.
6. For diagrams, describe objects, labels, arrows, relationships, and the process in a logical order.
7. For handwritten or unclear content, set confidence to "low" and explain exactly what is uncertain.
8. Write explanations in short, plain-language sentences.
9. Explain each step separately. Do not combine multiple reasoning steps into one sentence.
10. Return valid JSON only. No markdown, commentary, or code fences.

Return JSON:
{
  "elements": [
    {
      "id": "string",
      "type": "equation | graph | table | diagram | circuit | chemical_reaction | text | unknown",
      "rawText": "string",
      "latex": "string",
      "mathml": "string",
      "accessibleMathText": "string",
      "description": "string",
      "stepByStepExplanation": ["string"],
      "variables": [
        {
          "symbol": "string",
          "meaning": "string",
          "unit": "string"
        }
      ],
      "chart": {
        "title": "string",
        "xAxis": "string",
        "yAxis": "string",
        "series": [
          {
            "label": "string",
            "trend": "string",
            "notablePoints": ["string"]
          }
        ]
      },
      "confidence": "high | medium | low",
      "sourceRegion": {
        "x": 0,
        "y": 0,
        "width": 0,
        "height": 0
      }
    }
  ],
  "overallExplanation": "string",
  "keyTakeaways": ["string"],
  "warnings": ["string"]
}

Student context:
Subject: {{subject}}
Grade level: {{gradeLevel}}
Preferred explanation level: {{readingLevel}}
Language: {{language}}
Sub-phase 4.3 — ADHD focus suite
md
### Goal
Add zero-cost focus tools directly inside existing readers.

### New components
Create:
- `src/components/accessibility/FocusToolbar.tsx`
- `src/components/accessibility/ReadingRuler.tsx`
- `src/components/accessibility/LineFocusMask.tsx`
- `src/components/accessibility/SyllableText.tsx`
- `src/components/accessibility/MicroSprintTimer.tsx`

Update:
- `DyslexiaReader.tsx`
- `LowVisionReader.tsx`
- `useAccessibilitySettings.ts`

### Requirements
1. Add a `FocusSettings` object to the existing settings context using optional backward-compatible fields.
2. Persist settings in localStorage without changing existing keys.
3. Reading ruler must be draggable with keyboard arrow keys and pointer drag.
4. Line-focus mask must support 1, 2, or 3 visible lines.
5. Syllable breakdown must be a client-side utility first; use Gemini only for uncertain words.
6. Micro-sprint timer must support 5, 10, 15, and 25 minutes.
7. Timer completion must use a visual toast, optional browser TTS cue, and no red alarm-like UI.
8. Respect `prefers-reduced-motion`.
9. All controls must have accessible names and keyboard shortcuts where appropriate.

### Verification
- `npx tsc --noEmit`
- `npm run build`
- Test ruler with mouse, touch, and keyboard.
- Test line focus at 200% browser zoom.
- Test timer completion without page reload.
- Run axe DevTools and resolve all critical/serious issues.
Syllable fallback prompt
text
You are a pronunciation assistant for students with dyslexia.

Break the supplied English word into pronunciation-friendly syllables.

Rules:
1. Return only valid JSON.
2. Do not provide definitions unless requested.
3. Use hyphen-separated syllables.
4. Preserve the original casing where reasonable.
5. If the word is already one syllable, return it unchanged.

Return JSON:
{
  "word": "string",
  "syllables": ["string"],
  "confidence": "high | medium | low"
}

Word: {{word}}
Sub-phase 4.4 — Grounded tutor
md
### Goal
Add a context-locked question-and-answer tutor grounded in the active document.

### New API route
Create `src/app/api/tutor/route.ts`.

Requirements:
- Accept POST JSON.
- Set `export const maxDuration = 60;`.
- Require `documentId`.
- Retrieve only chunks belonging to that document.
- Pass a maximum of 8 relevant chunks to Gemini.
- Use a 12-second timeout.
- On timeout, return:
  - `confidence: "insufficient_evidence"`
  - A message asking the student to retry or select a section.
  - No fabricated answer.

### Request schema
{
  "documentId": "string",
  "question": "string",
  "selectedChunkIds": ["string"],
  "accessibilityProfile": "dyslexia | low_vision | hearing",
  "language": "en",
  "voiceQuestion": false
}

### Response schema
{
  "answerId": "string",
  "question": "string",
  "answer": "string",
  "simplifiedAnswer": "string",
  "confidence": "high | medium | low | insufficient_evidence",
  "citations": [
    {
      "chunkId": "string",
      "transcriptSegmentId": 0,
      "startSeconds": 0,
      "endSeconds": 0,
      "quotedEvidence": "string"
    }
  ],
  "followUpQuestions": ["string"],
  "fallbackUsed": false
}

### UI changes
1. Create `src/components/tutor/TutorPanel.tsx`.
2. Add a floating accessible button labeled “Ask about this material.”
3. Support text input and microphone input using the existing SpeechRecognition hook.
4. Show citations as clickable chunk links or transcript timestamp chips.
5. If confidence is insufficient, display: “I could not find enough evidence in this material.”
6. Render answers according to the active accessibility profile.

### Verification
- `npx tsc --noEmit`
- `npm run build`
- Ask a question answerable from the document.
- Ask an unrelated question and verify refusal.
- Ask by voice and verify transcript appears before submission.
- Verify citations scroll to the correct chunk or transcript timestamp.
Grounded tutor prompt
text
You are a grounded accessibility tutor for a student studying from their own uploaded material.

Answer only using the supplied context.

Rules:
1. Use only facts explicitly present in the supplied chunks or transcript segments.
2. Do not use outside knowledge.
3. Do not infer facts beyond what the source supports.
4. If the answer is not present, set confidence to "insufficient_evidence" and explain that the material does not contain enough information.
5. Cite every factual claim with the relevant chunkId and/or transcript timestamp.
6. Quote a short supporting phrase in `quotedEvidence`.
7. Write `answer` clearly and accurately.
8. Write `simplifiedAnswer` in short sentences for a student with dyslexia.
9. Use plain language and explain technical terms immediately.
10. Suggest three useful follow-up questions based only on the material.
11. Return valid JSON only. No markdown, commentary, or code fences.

Return JSON:
{
  "answer": "string",
  "simplifiedAnswer": "string",
  "confidence": "high | medium | low | insufficient_evidence",
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
}

Student profile: {{accessibilityProfile}}
Language: {{language}}
Question: {{question}}

Allowed context:
{{retrievedContextJson}}
Sub-phase 4.5 — Offline pack and live glossary
md
### Goal
Make study material portable and make live captions immediately understandable.

### New API route
Create `src/app/api/study-pack/route.ts`.

Requirements:
- Accept POST JSON.
- Set `export const maxDuration = 60;`.
- Assemble existing simplified sections, glossary, transcript, quiz, flashcards, and study plan.
- Do not call an LLM unless a requested term lacks a glossary meaning.
- Return a JSON payload the client can convert into:
  - Printable HTML
  - PDF using client-side jsPDF or browser print
  - Anki-compatible CSV
  - Self-contained offline HTML

### New components
Create:
- `src/components/export/StudyPackExporter.tsx`
- `src/components/captions/LiveGlossaryPopup.tsx`

Update:
- `CaptionPanel.tsx`
- `TranscriptViewer.tsx`
- `useSpeechRecognition.ts`

### Live glossary requirements
1. Match caption text against the active document glossary locally.
2. Use case-insensitive exact matching first.
3. Use lightweight fuzzy matching for plural/singular and minor spelling variations.
4. Show a popup only when a matched term appears.
5. Popup must include term, plain meaning, “Save term,” and “Dismiss.”
6. Do not interrupt TTS or caption streaming.
7. Store saved terms in localStorage and optionally Supabase.

### Export requirements
1. Add an “Export Study Pack” button to the document view.
2. Offer:
   - “Download printable study sheet”
   - “Download Anki CSV”
   - “Download offline HTML”
3. Offline HTML must include inline CSS, simplified notes, glossary, transcript, flashcards, and quiz.
4. Offline HTML must work when opened directly from the file system.
5. Include a visible “Generated by Inclusive Learning Assistant” footer.

### Verification
- `npx tsc --noEmit`
- `npm run build`
- Export Biology sample as all three formats.
- Open offline HTML with networking disabled.
- Import Anki CSV into Anki.
- Test live glossary with a sample caption containing “photosynthesis.”
- Confirm the popup does not trap keyboard focus.
Live glossary fallback prompt
text
You are an accessibility glossary assistant.

Explain the supplied technical term in simple language for a student.

Rules:
1. Use only general educational knowledge.
2. Do not provide an answer to a broader question.
3. Keep the explanation under 35 words.
4. Use one or two short sentences.
5. If the term is ambiguous, provide the most common educational meaning and state that context may change its meaning.
6. Return valid JSON only.

Return JSON:
{
  "term": "string",
  "plainMeaning": "string",
  "confidence": "high | medium | low"
}

Term: {{term}}
Subject context: {{subject}}
Final acceptance criteria
Phase 4 is complete only when all of the following are true:

A guest user can upload a note, choose Hindi or Spanish, and study translated simplified chunks without creating an account.

A student can photograph a handwritten equation and receive a step-by-step, screen-reader-friendly explanation.

A student can enable reading ruler, line focus, syllable breakdown, and a micro-sprint timer without leaving the reader.

A student can ask a question by voice and receive an answer restricted to the uploaded document, with visible citations.

A student can export a self-contained offline study pack containing notes, glossary, captions, flashcards, quiz, and study plan.

During live captioning, technical terms trigger nonblocking plain-language glossary popups.

Every new AI feature has a 12-second timeout and a meaningful, non-fabricated fallback.

npx tsc --noEmit and npm run build pass after every sub-phase.

The deployed Vercel URL remains publicly accessible without login.