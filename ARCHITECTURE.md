# CRITICAL HACKATHON OVERRIDES (READ FIRST)
- Skip Supabase Auth completely. Use zero-login guest mode and save accessibility preferences in localStorage.
- Skip YouTube URL scraping, ElevenLabs TTS, and Playwright E2E tests.
- Use browser SpeechSynthesis for TTS and browser Web Speech API for live captions.
- Add `export const maxDuration = 60;` at the top of all AI API routes (`/api/ingest`, `/api/simplify`, `/api/transcribe`, `/api/practice`).
- Build the 1-click "Load Sample Note" offline fallback FIRST so the app works immediately without API keys.
---


Below is a deployment-first blueprint optimized for a 4-person team and a hard demo deadline. The safest architecture is one Next.js app with API routes, browser-native accessibility features, and provider-backed AI behind a thin service layer—so every feature has a zero-network fallback.

Recommended stack



LayerExact choiceWhyFrontendNext.js 15 + React + TypeScript + Tailwind CSSOne deployable app for UI and API routes; App Router supports React Server Components and route handlers. nextjs+2State/formsReact Hook Form + ZodFast, typed forms and strict validation for uploads and accessibility preferences.UI/accessibilityRadix UI + Tailwind + next/fontAccessible primitives, predictable styling, and optimized web fonts. nextjsDyslexia fontOpenDyslexic self-hosted WOFF2Free under SIL-OFL, usable in commercial/web projects; self-hosting avoids CDN failures during judging. opendyslexic+1Bionic readingCustom React utilityNo dependency needed; bold the first 40–60% of each word client-side.OCR / PDF / visionGoogle Gemini API, multimodal modelHandles PDFs, images, diagrams, and handwritten notes in one API; Gemini supports native PDF/document and visual comprehension. google+1Primary LLMGoogle Gemini via Vercel AI SDKFast structured output, streaming, provider abstraction, and a free Gemini API key path. vercel+2Fallback LLMLocal deterministic simplifier + cached sample outputsGuarantees the demo works if the model/API is rate-limited or offline.Live captionsBrowser Web Speech APIZero-cost, immediate microphone captions; use Chrome/Edge in the live demo. developer.mozilla+2Uploaded audio/video STTDeepgram Nova-3Strong production-grade transcription; new accounts receive $200 credit, roughly 43,000 Nova transcription minutes, with no credit card required. deepgram+1Fallback STTBrowser Web Speech API + pre-transcribed sampleBrowser recognition is available in Chrome and can be used without an API key; recognition may use a remote service, so retain a local fallback. developer.mozilla+1TTSBrowser SpeechSynthesis first; ElevenLabs optionalBrowser TTS is free and reliable for the demo; ElevenLabs provides more natural voices, with a free plan of about 10 minutes/month and Flash v2.5 using half credits per character. developer.mozilla+2DatabaseSupabase Postgres + Supabase StorageFree-tier managed Postgres, auth, file storage, and row-level security; avoids running a separate backend.AuthSupabase AuthEmail OTP or Google OAuth; avoids building password flows during a hackathon.DeploymentVercelBest fit for Next.js; API routes, environment variables, previews, and public URL. vercelTestingPlaywright + axe DevTools + LighthouseAutomated browser/E2E checks plus WCAG-oriented accessibility scans. accessibility.education.gov+1

Do not use local Whisper/OCR models as the primary path. They increase deployment complexity and cold-start risk. Use Gemini for extraction and Deepgram for uploaded media, with browser-native features and cached fixtures as fallbacks.

System architecture

text

Student browser ├─ Upload PDF / image / pasted text / YouTube URL

├─ Select accessibility profile: dyslexia | low vision | hearing

└─ Request practice plan



Next.js frontend

├─ Accessible upload UI, reading controls, captions, TTS controls

├─ Client-side image compression and PDF page extraction

└─ Calls /api/* endpoints



Next.js API routes

├─ /api/ingest → classify input, extract text

├─ /api/simplify → dyslexia-friendly rewrite

├─ /api/transcribe → audio/video transcript + timestamps

├─ /api/captions → live-caption session metadata

├─ /api/practice → quiz, flashcards, study plan

└─ /api/tts → optional premium TTS proxy



AI providers

├─ Gemini: OCR, PDF/image understanding, simplification, quiz generation

└─ Deepgram: uploaded audio/video transcription



Supabase

├─ users, documents, chunks, transcripts

├─ accessibility_profiles

├─ practice_items, study_plans

└─ Storage: original uploads and generated audio



Browser fallbacks

├─ SpeechSynthesis for TTS

├─ SpeechRecognition for live captions

└─ Sample-note fixtures for offline/API-failure demo

Data flow

User uploads a file or pastes text; the browser validates type/size and sends it to /api/ingest.
The API stores the original in Supabase Storage, creates a documents row, and sends the content to Gemini.
Gemini extracts clean text, headings, and a short source summary; the backend chunks the result and saves it.
Based on the selected profile, the frontend calls /api/simplify, /api/transcribe, or /api/practice.
Dyslexia mode renders simplified chunks with OpenDyslexic, adjustable spacing, pastel overlay, and optional bionic reading.
Low-vision mode renders reflowable high-contrast text and uses browser TTS with synchronized word highlighting.
Hearing mode displays live browser captions or a Deepgram timestamped transcript, plus AI-generated key concepts.
/api/practice uses the extracted source text and accessibility profile to produce quizzes, flashcards, and a study plan.
Repository structure

text

inclusive-learning-assistant/├─ README.md

├─ package.json

├─ next.config.mjs

├─ tsconfig.json

├─ tailwind.config.ts

├─ postcss.config.mjs

├─ .env.example

├─ .github/

│ └─ workflows/

│ └─ ci.yml

├─ public/

│ ├─ fonts/

│ │ ├─ OpenDyslexic-Regular.woff2

│ │ └─ OpenDyslexic-Bold.woff2

│ ├─ icons/

│ └─ samples/

│ ├─ biology-notes.pdf

│ ├─ biology-notes.json

│ ├─ lecture-transcript.json

│ └─ practice-plan.json

├─ src/

│ ├─ app/

│ │ ├─ layout.tsx

│ │ ├─ page.tsx

│ │ ├─ globals.css

│ │ ├─ dashboard/

│ │ │ └─ page.tsx

│ │ ├─ document/[id]/

│ │ │ └─ page.tsx

│ │ ├─ practice/[documentId]/

│ │ │ └─ page.tsx

│ │ └─ api/

│ │ ├─ ingest/route.ts

│ │ ├─ simplify/route.ts

│ │ ├─ transcribe/route.ts

│ │ ├─ captions/route.ts

│ │ ├─ practice/route.ts

│ │ └─ tts/route.ts

│ ├─ components/

│ │ ├─ accessibility/

│ │ │ ├─ AccessibilityToolbar.tsx

│ │ │ ├─ DyslexiaReader.tsx

│ │ │ ├─ LowVisionReader.tsx

│ │ │ ├─ CaptionPanel.tsx

│ │ │ ├─ TranscriptViewer.tsx

│ │ │ └─ TtsPlayer.tsx

│ │ ├─ upload/

│ │ │ ├─ UploadDropzone.tsx

│ │ │ ├─ TextInput.tsx

│ │ │ └─ YouTubeInput.tsx

│ │ ├─ practice/

│ │ │ ├─ QuizCard.tsx

│ │ │ ├─ FlashcardDeck.tsx

│ │ │ └─ StudyPlanTimeline.tsx

│ │ └─ ui/

│ │ ├─ Button.tsx

│ │ ├─ Card.tsx

│ │ ├─ Dialog.tsx

│ │ ├─ Progress.tsx

│ │ └─ Toast.tsx

│ ├─ lib/

│ │ ├─ ai/

│ │ │ ├─ gemini.ts

│ │ │ ├─ prompts.ts

│ │ │ └─ schemas.ts

│ │ ├─ speech/

│ │ │ ├─ browserTts.ts

│ │ │ ├─ browserStt.ts

│ │ │ └─ deepgram.ts

│ │ ├─ documents/

│ │ │ ├─ extract.ts

│ │ │ ├─ chunk.ts

│ │ │ └─ youtube.ts

│ │ ├─ supabase/

│ │ │ ├─ client.ts

│ │ │ ├─ server.ts

│ │ │ └─ queries.ts

│ │ ├─ validation.ts

│ │ └─ sampleData.ts

│ ├─ hooks/

│ │ ├─ useAccessibilitySettings.ts

│ │ ├─ useSpeechRecognition.ts

│ │ ├─ useSpeechSynthesis.ts

│ │ └─ useDocumentProcessor.ts

│ └─ types/

│ └─ api.ts

├─ supabase/

│ ├─ migrations/

│ │ └─ 0001_init.sql

│ └─ seed.sql

└─ tests/

├─ e2e/

│ ├─ upload.spec.ts

│ ├─ accessibility.spec.ts

│ └─ practice.spec.ts

└─ unit/

├─ chunk.test.ts

└─ bionic.test.ts

API contracts

Use these contracts immediately; they let all four developers build in parallel.

Shared enums

ts

type AccessibilityProfile = "dyslexia" | "low_vision" | "hearing";type InputKind = "pdf" | "image" | "text" | "youtube" | "audio" | "video";type PracticeKind = "quiz" | "flashcards" | "study_plan";type IngestStatus = | "queued" | "extracting" | "ready" | "failed";

POST /api/ingest

Request: multipart/form-data

json

{ "inputKind": "pdf", "accessibilityProfile": "dyslexia", "subject": "Biology", "gradeLevel": "Grade 10", "language": "en", "file": "<binary file>", "pastedText": "", "youtubeUrl": ""}

Response:

json

{ "documentId": "doc_8f2a", "status": "ready", "inputKind": "pdf", "title": "Photosynthesis Notes", "sourceSummary": "Notes explaining light-dependent and light-independent reactions.", "extractedText": "Photosynthesis is the process...", "chunks": [ { "id": "chunk_1", "index": 0, "heading": "What is photosynthesis?", "text": "Photosynthesis is how plants make food using sunlight.", "keyTerms": ["photosynthesis", "chlorophyll", "glucose"] } ], "warnings": [], "fallbackUsed": false}

Error:

json

{ "error": { "code": "UNSUPPORTED_FILE_TYPE", "message": "Upload a PDF, JPG, PNG, WEBP, MP3, MP4, or paste text.", "retryable": false }}

POST /api/simplify

json

{ "documentId": "doc_8f2a", "chunkIds": ["chunk_1", "chunk_2"], "readingLevel": "grade_6", "maxWordsPerChunk": 60, "bionicReading": true, "language": "en"}

json

{ "documentId": "doc_8f2a", "sections": [ { "chunkId": "chunk_1", "title": "What is photosynthesis?", "simpleText": "Plants make their own food. They use sunlight, water, and air.", "keyIdea": "Plants use sunlight to make food.", "jargon": [ { "term": "chlorophyll", "plainMeaning": "The green part of a plant that helps it use sunlight." } ], "readingTimeSeconds": 18 } ], "fallbackUsed": false}

POST /api/transcribe

json

{ "documentId": "doc_9c1b", "mediaUrl": "https://supabase.co/storage/v1/object/public/uploads/lecture.mp3", "language": "en", "generateSummary": true}

json

{ "documentId": "doc_9c1b", "transcriptId": "tr_77d", "language": "en", "durationSeconds": 612, "segments": [ { "id": 0, "start": 0.0, "end": 7.4, "text": "Today we will learn about photosynthesis." } ], "keyConcepts": [ { "title": "Photosynthesis needs sunlight", "explanation": "Plants use light energy to make glucose.", "timestamps": [0.0, 42.5] } ], "downloadUrl": "/api/transcript/tr_77d/download?format=vtt", "fallbackUsed": false}

POST /api/captions

Used to start or persist a live-caption session; actual recognition happens in the browser.

json

{ "documentId": "doc_9c1b", "language": "en", "mode": "live"}

json

{ "sessionId": "cap_551", "language": "en", "websocketless": true, "status": "active"}

POST /api/practice

json

{ "documentId": "doc_8f2a", "accessibilityProfile": "dyslexia", "practiceKinds": ["quiz", "flashcards", "study_plan"], "difficulty": "adaptive", "questionCount": 6, "flashcardCount": 8, "studyDays": 5, "minutesPerDay": 20}

json

{ "documentId": "doc_8f2a", "practiceId": "pr_112", "quiz": [ { "id": "q1", "question": "What do plants need to make food?", "options": ["Sunlight, water, and air", "Only soil", "Only rain", "Only moonlight"], "correctIndex": 0, "explanation": "Plants use sunlight, water, and carbon dioxide to make food.", "difficulty": "easy", "concept": "photosynthesis" } ], "flashcards": [ { "id": "f1", "front": "What is photosynthesis?", "back": "How plants use sunlight to make food.", "concept": "photosynthesis" } ], "studyPlan": [ { "day": 1, "title": "Learn the basics", "tasks": [ "Read the simplified note for 5 minutes.", "Review 3 flashcards.", "Answer 2 easy quiz questions." ], "estimatedMinutes": 20 } ], "fallbackUsed": false}

POST /api/tts

Optional; use only when browser TTS quality is insufficient.

json

{ "text": "Photosynthesis is how plants make food.", "voiceId": "accessible-clear-female", "format": "mp3"}

json

{ "audioUrl": "https://.../speech.mp3", "durationSeconds": 4.8, "provider": "elevenlabs"}

Exact system prompts

Dyslexia simplification

text

You are an accessibility-focused learning assistant for students with dyslexia.

Rewrite the provided study material so it is clear, calm, and easy to read.



Rules:

Use simple, familiar words. Replace academic jargon with plain language.
Write short sentences. Aim for 8–16 words per sentence.
Break content into small chunks of no more than 60 words.
Use one main idea per chunk.
Preserve every important fact, definition, formula, date, and step.
Do not invent information. If the source is unclear, say: “This part is unclear in the original notes.”
Explain difficult terms immediately in parent-friendly language.
Use active voice and direct instructions.
Avoid idioms, metaphors, sarcasm, and long nested clauses.
Keep the same language as the source unless the user requests another language.
Format the response as valid JSON only. Do not add markdown, commentary, or code fences.


Return JSON matching this schema:

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

"plainMeaning": "string"

}

],

"readingTimeSeconds": 0

}

]

}



User context:

Reading level: {{readingLevel}}

Maximum words per chunk: {{maxWordsPerChunk}}

Language: {{language}}



Source material:

{{sourceText}}

Personalized practice plan

text

You are an inclusive AI study coach for school and university students.

Create an adaptive, accessible practice plan from the supplied learning material.



Rules:

Base every question, flashcard, and task only on the supplied material.
Do not invent facts, formulas, dates, or answers.
Make questions clear, specific, and answerable from the source.
For dyslexia profile: use short sentences, plain wording, one instruction at a time, and encouraging feedback.
For low-vision profile: avoid questions that depend on tiny visual details; emphasize verbal descriptions, recall, and reasoning.
For hearing profile: emphasize written explanations, visual structure, captions, transcripts, and reading-based practice.
Start with easy questions, then gradually increase difficulty.
Give one correct answer and three plausible but clearly incorrect options for each multiple-choice question.
Make explanations supportive and concrete; never shame the learner.
Create a realistic study plan with short, achievable tasks.
Return valid JSON only. No markdown, commentary, or code fences.


Return JSON matching this schema:

{

"quiz": [

{

"id": "string",

"question": "string",

"options": ["string", "string", "string", "string"],

"correctIndex": 0,

"explanation": "string",

"difficulty": "easy | medium | hard",

"concept": "string"

}

],

"flashcards": [

{

"id": "string",

"front": "string",

"back": "string",

"concept": "string"

}

],

"studyPlan": [

{

"day": 1,

"title": "string",

"tasks": ["string"],

"estimatedMinutes": 20

}

]

}



Student profile:

Accessibility profile: {{accessibilityProfile}}

Subject: {{subject}}

Grade level: {{gradeLevel}}

Preferred difficulty: {{difficulty}}

Requested quiz questions: {{questionCount}}

Requested flashcards: {{flashcardCount}}

Study days: {{studyDays}}

Minutes per day: {{minutesPerDay}}

Language: {{language}}



Learning material:

{{sourceText}}

48-hour roadmap

Assume a start at 6 PM on November 23 and a hard completion target of 10 PM on November 24. Freeze features at hour 40; spend the final hours only on QA, accessibility, and demo rehearsal.



TimeFrontend / Accessibility UIBackend / AI PipelinesAudio / OCR / CaptioningIntegration / Deployment / QAHour 0–1Create Next.js app, Tailwind, folder structure, design tokens, accessibility settings contextCreate repo, env template, Supabase project, database schema, shared TypeScript typesCreate Deepgram and Gemini keys; verify browser SpeechRecognition/SpeechSynthesisSet up Vercel project, GitHub repo, branch protection, CIHour 1–3Build accessible shell: header, profile selector, upload page, keyboard focus statesImplement /api/ingest contract, Zod validation, Supabase insertImplement browser STT hook and browser TTS hookConfigure env vars, deployment preview, seed sample dataHour 3–6Build upload dropzone, paste-text box, YouTube field, progress statesImplement Gemini extraction for text, image, and PDFImplement /api/transcribe with Deepgram; store segmentsCreate shared mock fixtures for all API responsesHour 6–9Build Dyslexia Reader: OpenDyslexic, spacing, pastel overlays, bionic toggleImplement /api/simplify; validate and store AI JSONExtract YouTube audio or use transcript input; handle failures gracefullyWire frontend to /api/ingest; establish error/toast patternHour 9–12Build Low-Vision Reader: contrast themes, zoom, reflow, word-highlight TTSImplement /api/practice; enforce strict JSON schemaBuild caption panel and timestamped transcript viewerAdd retry, timeout, and fallback selection logicHour 12–15Build Hearing Mode: live captions, transcript search, download buttonAdd document/chunk persistence and retrievalAdd key-concept extraction from transcriptDeploy first end-to-end flow to VercelHour 15–18Build Practice UI: quiz, flashcards, study-plan timelineGenerate quizzes, flashcards, and adaptive planAdd transcript VTT/SRT exportTest upload → simplify → practice flowHour 18–21Add profile-aware UI changes and preferences persistenceAdd fallback deterministic simplifier and cached practice generatorAdd sample audio/video and preprocessed transcriptRun Playwright smoke testsHour 21–24Polish mobile layout, empty states, loading skeletons, keyboard navigationAdd rate-limit handling and provider error mappingTest Chrome, Edge, Safari; document browser limitationsRun Lighthouse and axe scans; fix critical issuesHour 24–28Build demo journey and sample-note loaderOptimize prompts and response parsingPre-generate sample transcript and practice outputProduction deployment and custom-domain checkHour 28–32Accessibility pass: labels, landmarks, focus order, reduced motion, ARIAAdd usage logging and request-size limitsAdd caption latency indicator and transcript downloadAdd README, architecture diagram, demo scriptHour 32–36Final UI polish and judge-facing onboardingFinal prompt tuning and output validationFinal audio/video test with real lecture clipFull regression test; fix only blockersHour 36–40Feature freeze; remove unfinished togglesFeature freeze; disable unstable providersFeature freeze; ensure fallbacks workProduction smoke test from incognito browserHour 40–44Demo rehearsal, screen-reader pass, keyboard-only passMonitor API quota and error logsRehearse live captions and transcript playbackPrepare rollback and offline sample modeHour 44–48Final visual polish onlyNo risky changesNo risky changesFinal deploy, public URL verification, backup demo video

Ready-to-publish checklist

Deploy

Push the repository to GitHub with a clear README, architecture diagram, and .env.example.
Create a Supabase project; run migrations and seed sample data.
Add environment variables in Vercel: GEMINI_API_KEY, DEEPGRAM_API_KEY, optional ELEVENLABS_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
Deploy the main branch to Vercel and verify the public URL in an incognito window.
Confirm API keys are server-side only; never expose provider keys to the browser.
Add a visible “Sample note” button that loads a bundled fixture without external calls.
Accessibility verification

Run axe DevTools on every major screen; resolve all critical and serious issues. It supports WCAG 2.0, 2.1, and 2.2 checks across A, AA, and AAA levels.accessibility.education.gov+1
Test keyboard-only navigation: tab order, visible focus, Escape closes dialogs, Enter activates primary actions.
Test with a screen reader on at least one desktop browser.
Verify text resize to 200% without horizontal scrolling.
Verify color contrast for all text and interactive components in both light and high-contrast themes.
Ensure captions can be paused, resized, repositioned, and downloaded.
Ensure TTS has visible play/pause/stop controls and word highlighting.
Ensure all uploads have accessible labels, progress announcements, and non-color-only status indicators.
Five-minute judge demo

0:00–0:30 — Open the public URL and introduce the problem: inaccessible notes become a barrier for dyslexic, low-vision, and deaf/hard-of-hearing students.
0:30–1:15 — Click Load Sample Note to demonstrate the product immediately without waiting for an upload.
1:15–2:15 — Select Dyslexia Mode; show simplified chunks, OpenDyslexic, bionic reading, line-spacing slider, and pastel overlay.
2:15–3:15 — Select Low Vision Mode; show high contrast, zoom/reflow, and TTS with word-by-word highlighting.
3:15–4:15 — Select Hearing Mode; play a short lecture clip, display timestamped captions, search the transcript, and download it as VTT.
4:15–5:00 — Generate a personalized quiz, flashcards, and study plan; close by showing the deployed GitHub repository and public URL.
Demo fallback strategy

Make Load Sample Note the first visible action on the home page. It must work even if Gemini, Deepgram, ElevenLabs, Supabase, or the venue Wi-Fi fails.

Bundle these pre-processed assets in /public/samples:

biology-notes.pdf — a clean 2-page sample note.
biology-notes.json — extracted text, simplified chunks, key terms, and headings.
lecture-transcript.json — timestamped transcript segments and key concepts.
practice-plan.json — six quiz questions, eight flashcards, and a five-day plan.
sample-lecture.mp3 or .mp4 — a 60–90 second clip with a known transcript.
Implement fallback logic as follows:

ts

async function withFallback<T>( primary: () => Promise<T>, fallback: () => T | Promise<T>, onFallback?: (error: unknown) => void): Promise<T> { try { return await Promise.race([ primary(), new Promise<never>((_, reject) => setTimeout(() => reject(new Error("AI_TIMEOUT")), 12000) ), ]); } catch (error) { onFallback?.(error); return await fallback(); }}

Use a 12-second timeout for AI calls, then return the cached fixture with a non-alarming banner: “Showing prepared sample output while the AI service reconnects.” This preserves a complete, credible live demo without pretending the live model generated the result.

Non-negotiable build decisions

Use Gemini for OCR, PDF/image understanding, simplification, and structured practice generation; it supports PDFs and visual/textual comprehension natively.google+1
Use Deepgram Nova-3 for uploaded audio/video transcription; its promotional credit provides substantial prototype capacity.deepgram+1
Use browser SpeechRecognition for live captions and SpeechSynthesis for default TTS; both are part of the Web Speech API and require no per-request backend cost.developer.mozilla+1
Use OpenDyslexic as a self-hosted font; it is free under SIL-OFL for personal, educational, commercial, and web use.opendyslexic
Use Vercel AI SDK for provider abstraction and structured output; it is open-source and unifies streaming, structured data, and multi-provider calls.vercel+1
Build the sample-note fallback before the AI integrations, not after. It is the difference between a polished demo and a failed live demo.