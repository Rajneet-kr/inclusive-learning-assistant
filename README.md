# Inclusive Learning Assistant v2.0 🎓✨

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-blue?style=for-the-badge&logo=vercel)](https://inclusive-learning-assistant.vercel.app/)
[![Next.js 15](https://img.shields.io/badge/Next.js-15.1-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-3.5%20Flash%20Lite-orange?style=for-the-badge&logo=google)](https://ai.google.dev/)
[![Deepgram](https://img.shields.io/badge/Deepgram-Nova--3-red?style=for-the-badge)](https://deepgram.com/)
[![WCAG](https://img.shields.io/badge/Accessibility-WCAG%20AAA-success?style=for-the-badge)](https://www.w3.org/WAI/standards-guidelines/wcag/)

> **Live Deployment:** [https://inclusive-learning-assistant.vercel.app/](https://inclusive-learning-assistant.vercel.app/)  
> **📖 Complete Technical & Academic Documentation:** [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md) — *Detailed system architecture, 10 IEEE/academic benchmark paper comparative analysis, Zod data contracts, and WCAG AAA compliance.*

**Inclusive Learning Assistant v2.0** is an AI-powered universal accessibility study companion engineered for students with **dyslexia**, **ADHD & executive dysfunction**, **low vision**, and **hearing impairment**. It transforms dense lecture notes, textbooks, whiteboard photos, diagrams, and audio recordings into multi-sensory, reflowable, and fully interactive learning formats in seconds.

---

## 📌 Problem Statement

Over 15% of students worldwide navigate learning differences or sensory impairments:
- **Dyslexic students** face visual crowding, dense paragraphs, and academic jargon without syllable breakdowns.
- **ADHD students** battle cognitive fatigue, visual drift, and difficulty maintaining sustained attention over lengthy documents.
- **Low-vision students** encounter fixed-layout PDFs that break under zoom and lack synchronized auditory tracking.
- **Deaf and hard-of-hearing students** miss spoken lecture nuance when captions lack real-time vocabulary definitions and concept markers.
- **STEM students with disabilities** are locked out of diagrams, circuit schematics, and equations because standard screen readers read raw LaTeX syntax verbatim.

**Inclusive Learning Assistant v2.0** eliminates these barriers with zero required logins, instant offline fixtures, and multi-modal sensory adaptation.

---

## 🚀 What's New in v2.0 (Phase 4 Upgrades)

### 1. 🌐 Multilingual Accessibility Bridge
- **10 Supported Languages:** English, Hindi (`हिन्दी`), Kannada (`ಕನ್ನಡ`), Tamil (`தமிழ்`), Telugu (`తెలుగు`), Marathi (`मराठी`), Bengali (`বাংলা`), Spanish (`Español`), French (`Français`), and German (`Deutsch`).
- **Accurate Academic Translation:** Direct Gemini translation via `/api/translate` preserving technical terms alongside local script definitions.
- **Zero-Latency Offline Fixtures:** Instant offline switching for pre-translated sample notes (`biology-notes-hi.json` & `biology-notes-es.json`).

### 2. 📐 STEM & Diagram Verbalizer
- **Multimodal Visual Scanner:** Upload whiteboard photos, textbook pages, equations, graphs, or circuits (`/api/stem-verbalizer`).
- **Screen-Reader-Safe Math:** KaTeX mathematical rendering coupled with conversational spoken audio transcripts (`accessibleMathText`) that avoid raw LaTeX code recitation.
- **Step-by-Step Reasoner:** Interactive breakdowns of equations, variable tables, chart trend analysis, and 1-click sample STEM equation fixtures.

### 3. 🧠 ADHD & Neurodivergent Focus Suite
- **Draggable Reading Ruler:** Smooth horizontal highlight guide controllable via touch, mouse, and keyboard arrow keys (`ArrowUp`/`ArrowDown`).
- **Line Focus Mask:** Soft background dimming that isolates exactly 1, 2, or 3 visible lines of text at a time.
- **Syllable Breakdown Mode:** Client-side hyphenated syllables (e.g., `pho·to·syn·the·sis`) to reduce decoding friction for dyslexic readers.
- **Micro-Sprint Timer:** Accessible 5, 10, 15, and 25-minute Pomodoro-style sprints with soft visual completion cues (zero jarring alarm sounds).
- **Distraction-Free Mode:** Fullscreen reading canvas hiding all sidebars and chrome, with an instant `Escape` key return.

### 4. 🤖 Grounded "Ask This Lecture" Tutor
- **Strictly Grounded Q&A:** `/api/tutor` answers questions strictly within the active note or lecture transcript. Refuses hallucinations with `insufficient_evidence` when topics are absent.
- **Profile-Adapted Answers:** Automatically formats explanations for Dyslexia (short punchy sentences), Low Vision, or Hearing profiles.
- **Clickable Chunk Citations:** Every claim links directly to its source chunk with smooth scroll and a visual pulse highlight.
- **Voice & Text Input:** Built-in speech recognition for voice questions.

### 5. 📦 Portable Offline Study Pack & Live Auto-Glossary
- **3-in-1 Study Pack Exporter:**
  1. *Printable Study Sheet:* High-contrast, printer-optimized layout triggering browser print / Save-as-PDF.
  2. *Anki Flashcard Deck (.csv):* Direct import into Anki with `Front,Back,Concept` tags.
  3. *Self-Contained Offline HTML (.html):* Single standalone file containing notes, glossary, flashcards, and quiz that runs without internet.
- **Live Caption Auto-Glossary:** Real-time caption text matches against the document vocabulary in `CaptionPanel`, presenting instant non-blocking definition cards with 1-click "Save Term" to `localStorage`. Includes a 1-click sample trigger for instant demo testing.

---

## ⚡ Core Accessibility Features (v1.0 + v2.0)

| Mode | Target Learner | Features |
| :--- | :--- | :--- |
| **📖 Dyslexia Mode** | Dyslexia & Reading Differences | Self-hosted **OpenDyslexic** font, short 60-word chunks, calming pastel color overlays (cream, yellow, blue, peach, green), **Bionic Reading** (bolded prefixes), syllable breakdowns, and plain-English jargon glossaries. |
| **👁️ Low-Vision Mode** | Visual Impairments & Low Vision | High-contrast themes, scalable zoom up to 36px with 100% responsive text reflow, and active **Word-Highlighting TTS** with Play/Pause/Stop and speed controls (0.75x–1.5x). |
| **👂 Hearing Mode** | Deaf & Hard-of-Hearing | Searchable timestamped lecture segments, key concept markers, one-click `.VTT` caption download, live microphone captions via Web Speech API, and real-time **Live Auto-Glossary popups**. |
| **🎯 Adaptive Practice Deck** | All Learners | AI-generated 6-question multiple-choice quizzes with instant explanations, active recall flashcards, and spaced 5-day study schedules. |
| **📐 STEM Verbalizer** | STEM & Math Students | Multimodal equation and graph analyzer with step-by-step breakdown and spoken math transcript. |
| **🤖 Grounded Tutor** | Independent Learners | Context-locked conversational study assistant with voice queries and clickable chunk evidence citations. |

---

## 🛡️ Zero-Failure Architecture & Offline Reliability

During live hackathon judging or classroom usage, network disruptions or API quotas will never block learning:
- **1-Click "Load Sample Biology Note"**: Bundles pre-processed biology notes (`biology-notes.json`), lecture transcripts (`lecture-transcript.json`), and practice plans (`practice-plan.json`).
- **12-Second AI Fallback Wrapper (`withTimeoutFallback`)**: Every AI route (`/api/ingest`, `/api/simplify`, `/api/practice`, `/api/transcribe`, `/api/translate`, `/api/stem-verbalizer`, `/api/tutor`, `/api/study-pack`) automatically falls back to deterministic chunk-derived content or offline fixtures if external APIs time out or return errors.
- **Client-Side Persistence**: Accessibility settings, focus preferences, and saved vocabulary terms persist in `localStorage` across page reloads.

```mermaid
flowchart TD
    subgraph Client [Student Browser - Next.js 15 App Router]
        UI[Upload PDF / Image / Audio / Paste Text]
        DEMO[1-Click Sample Biology Note]
        PREF[Accessibility Settings & Focus in localStorage]
        TUTOR[Grounded Tutor Panel & Voice Q&A]
        STEM_UI[STEM Verbalizer Panel]
        EXP[Offline Study Pack Exporter]
    end

    subgraph API [Next.js Server Routes - maxDuration=60s]
        ING[/api/ingest - Multimodal Ingestion]
        SIM[/api/simplify - Dyslexia Simplification]
        PRAC[/api/practice - Quizzes & Study Plans]
        TRN[/api/transcribe - Audio & Video Deepgram]
        TRN_L[/api/translate - 10-Language Bridge]
        STEM[/api/stem-verbalizer - Multimodal Math/Diagram]
        TUT[/api/tutor - Context-Locked Grounded AI]
        PACK[/api/study-pack - Offline Pack & Auto-Glossary]
    end

    subgraph AI [Live AI Services]
        GEM[Google Gemini 3.5 Flash Lite / 3.8 Flash]
        DG[Deepgram Nova-3 Speech-to-Text]
    end

    subgraph Fallbacks [Dynamic & Offline Fixtures]
        FB_DYN[Dynamic Lightweight Chunk Extraction]
        FB_SAM[Bundled Pre-rendered Sample Fixtures]
    end

    UI --> ING & SIM & PRAC & TRN_L & STEM & TUT & PACK
    ING --> GEM
    SIM --> GEM
    PRAC --> GEM
    TRN_L --> GEM
    STEM --> GEM
    TUT --> GEM
    PACK --> GEM
    UI -->|Audio| TRN --> DG

    GEM -.->|Timeout / Error| FB_DYN
    DG -.->|Timeout / Error| FB_SAM
    DEMO -->|Zero-Latency Offline| FB_SAM
    PACK --> EXP
```

---

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS, Radix UI Primitives, Lucide Icons
- **Math Rendering:** KaTeX (`katex`, `katex/dist/katex.min.css`)
- **Typography:** Self-hosted OpenDyslexic (WOFF2)
- **Primary LLM & Multimodal AI:** Google Gemini 3.5 Flash Lite (`@google/generative-ai`) with `gemini-3.8-flash` fallback
- **Speech-to-Text:** Deepgram Nova-3 API (`@deepgram/sdk`)
- **Browser-Native Web APIs:** Web Speech API (`SpeechSynthesis` for TTS, `webkitSpeechRecognition` for live captions & tutor)
- **Validation:** Zod schemas for all API payloads

---

## 💻 Local Setup & Development

### 1. Clone the repository
```bash
git clone https://github.com/your-username/inclusive-learning-assistant.git
cd inclusive-learning-assistant
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env.local` file in the root directory:
```env
# AI Providers
GEMINI_API_KEY=your_gemini_api_key_here
DEEPGRAM_API_KEY=your_deepgram_api_key_here

# Supabase (Optional storage/database)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 4. Run the development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Quick Test Checklist for Judges

1. **Zero-Click Sample Note:** Click `⚡ 1-Click Load Sample Biology Note` on the home page to immediately explore Dyslexia, Low Vision, Hearing, and Practice tabs.
2. **STEM Verbalizer:** Click `📐 STEM Verbalizer`, load the sample equation, and hear the step-by-step spoken explanation without raw LaTeX symbols.
3. **ADHD Focus Suite:** Open Dyslexia Reader, click `Focus & Ruler Tools`, and test the draggable Reading Ruler, 1/2/3 Line Focus, and Syllable Breakdown.
4. **Multilingual Bridge:** Switch the language dropdown to **Hindi** or **Spanish** to view translated simplified cards and jargon definitions.
5. **Grounded Tutor:** Click the floating `💬 Ask Tutor` button, ask *"What does RuBisCO do?"*, and verify the citation points to Section 3.
6. **Live Auto-Glossary:** In Hearing & Captions tab, click `⚡ Test Live Glossary` to see instant vocabulary detection for *"chloroplasts"* and *"photosynthesis"*.
7. **Offline Study Pack Export:** In the note header, click `Export Study Pack` and test downloading the **Printable Sheet**, **Anki CSV**, and **Offline HTML**.

---

## 👥 Hackathon Team & Acknowledgments
Built with ❤️ for accessible, inclusive, and equitable education.
