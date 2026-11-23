# Inclusive Learning Assistant 🎓✨

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-blue?style=for-the-badge&logo=vercel)](https://inclusive-learning-assistant.vercel.app/)
[![Next.js 15](https://img.shields.io/badge/Next.js-15.1-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-3.5%20Flash%20Lite-orange?style=for-the-badge&logo=google)](https://ai.google.dev/)
[![Deepgram](https://img.shields.io/badge/Deepgram-Nova--3-red?style=for-the-badge)](https://deepgram.com/)
[![WCAG](https://img.shields.io/badge/Accessibility-WCAG%20AAA-success?style=for-the-badge)](https://www.w3.org/WAI/standards-guidelines/wcag/)

> **Live Deployment:** [https://inclusive-learning-assistant.vercel.app/](https://inclusive-learning-assistant.vercel.app/)

An AI-powered accessible study companion designed for students with **dyslexia**, **low vision**, and **hearing loss**. Converts dense lecture notes, PDFs, whiteboard photos, and audio recordings into multi-sensory, reflowable, and interactive study formats.

---

## 📌 Problem Statement

Over 15% of students worldwide have learning differences or sensory impairments:
- **Dyslexic students** struggle with visual crowding, dense paragraphs, and academic jargon.
- **Low-vision students** encounter fixed-layout PDFs that break when zoomed and lack synchronized auditory tracking.
- **Deaf and hard-of-hearing students** miss spoken lecture nuance when transcripts lack precise timestamps and concept segmentation.

**Inclusive Learning Assistant** closes this gap by transforming static learning materials into adaptive, multi-modal study modules in seconds.

---

## 🚀 Key Accessibility Modes

| Mode | Target Learner | Features |
| :--- | :--- | :--- |
| **📖 Dyslexia Mode** | Students with dyslexia or ADHD | Self-hosted **OpenDyslexic** font, short 60-word chunks, calming pastel color overlays (cream, yellow, blue, peach, green), optional **Bionic Reading** (bolding word prefixes), and plain-English jargon glossaries. |
| **👁️ Low-Vision Mode** | Students with visual impairments | High-contrast theme (yellow-on-black / black-on-white), zoom controls up to 36px with 100% text reflow, and active **Word-Highlighting TTS** with Play/Pause/Stop and speed controls (0.75x–1.5x). |
| **👂 Hearing Mode** | Deaf & hard-of-hearing students | Searchable timestamped lecture segments, key concept markers, one-click `.VTT` caption download, and live microphone captions powered by the browser **Web Speech API**. |
| **🎯 Adaptive Practice Deck** | All learners | AI-generated 6-question multiple-choice quizzes with instant feedback, 8 concept flashcards, and a realistic 5-day study plan (~20 mins/day). |

---

## ⚡ Zero-Failure Demo Architecture

During live hackathon judging, network hiccups or API rate limits can ruin a demo. Inclusive Learning Assistant features a **1-Click "Load Sample Note"** offline fallback built directly into the home page:
- Bundles complete pre-processed biology notes (`biology-notes.json`), lecture transcripts (`lecture-transcript.json`), and practice plans (`practice-plan.json`).
- All AI API routes (`/api/ingest`, `/api/simplify`, `/api/transcribe`, `/api/practice`) wrap model calls in a **14-second safe fallback** (`withTimeoutFallback`). If an external API is unavailable or times out, dynamic lightweight sections are generated from the submitted text so the app never crashes.

```mermaid
flowchart TD
    subgraph Client [Student Browser]
        UI[Upload PDF / Image / Audio / Paste Text]
        DEMO[1-Click Load Sample Note Button]
        PREF[Accessibility Preferences in localStorage]
    end

    subgraph API [Next.js 15 Server Routes - maxDuration=60s]
        ING[/api/ingest - Document Extraction]
        SIM[/api/simplify - Dyslexia Rewrite]
        PRAC[/api/practice - Adaptive Quiz & Plan]
        TRN[/api/transcribe - Audio Transcription]
    end

    subgraph AI [Live AI Services]
        GEM[Google Gemini 3.5 Flash Lite]
        DG[Deepgram Nova-3 Speech-to-Text]
    end

    subgraph Fallbacks [Dynamic & Bundled Fallbacks]
        FB_DYN[Dynamic Chunk-Derived Sections & Quiz]
        FB_SAM[Bundled Photosynthesis Fixtures]
    end

    UI --> ING
    ING --> GEM
    GEM -.->|Timeout / Error| FB_DYN
    ING --> SIM & PRAC
    SIM --> GEM
    PRAC --> GEM
    GEM -.->|Timeout / Error| FB_DYN
    UI -->|Audio/Video| TRN
    TRN --> DG
    DG -.->|Timeout / Error| FB_SAM

    DEMO -->|Zero-Latency Demo| FB_SAM
```

---

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript
- **Styling & Design Tokens:** Tailwind CSS, Radix UI Primitives, Lucide Icons
- **Typography:** Self-hosted OpenDyslexic (WOFF2)
- **Primary LLM & Multimodal Vision:** Google Gemini 3.5 Flash Lite (`@google/generative-ai`, Vercel AI SDK)
- **Speech-to-Text:** Deepgram Nova-3 API (`@deepgram/sdk`)
- **Browser-Native APIs:** Web Speech API (`SpeechSynthesis` for TTS, `webkitSpeechRecognition` for live captions)
- **Database / Storage Client:** Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
- **Validation:** Zod, React Hook Form

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

## 🧪 Testing Non-Biology Content

To test live multimodal extraction on any subject (e.g. Computer Science, World History):
1. Click **"Upload or Paste Text"** on the home page.
2. Paste any syllabus or lecture excerpt.
3. Select subject/grade level and click **"Process Notes with AI"**.
4. The system will extract chunks via Gemini, generate dyslexia-simplified cards with jargon explanations, and create a practice quiz strictly based on your submitted text.

---

## 👥 Hackathon Team & Acknowledgments
Built with ❤️ for accessible and inclusive education.
