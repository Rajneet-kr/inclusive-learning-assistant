import { OfflineStudyPack } from "@/types/api";

/**
 * Escapes characters for HTML output.
 */
function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Generates an Anki-compatible CSV string from flashcards.
 * Format: "Front","Back"
 */
export function generateAnkiCsv(
  flashcards: Array<{ front: string; back: string; concept?: string }>
): string {
  const rows = flashcards.map((card) => {
    const front = card.front.replace(/"/g, '""');
    const back = card.back.replace(/"/g, '""');
    const concept = card.concept ? card.concept.replace(/"/g, '""') : "";
    return `"${front}","${back}","${concept}"`;
  });

  return `#separator:Comma\n#html:false\n#tags column:3\n${rows.join("\n")}`;
}

/**
 * Generates clean, printer-friendly HTML for an offline study pack,
 * designed with dyslexia-friendly spacing, high contrast, and clean page breaks.
 */
export function generatePrintableHtml(pack: OfflineStudyPack): string {
  return generateSelfContainedHtml(pack, true);
}

/**
 * Generates a self-contained, standalone single-file HTML document
 * containing the full study pack: simplified sections, jargon glossary,
 * quiz questions, flashcards, and 5-day study plan.
 */
export function generateSelfContainedHtml(
  pack: OfflineStudyPack,
  isPrintMode = false
): string {
  const sectionsHtml = pack.simplifiedSections
    .map(
      (sec, idx) => `
    <article class="study-card">
      <header>
        <span class="badge">Section ${idx + 1}</span>
        <h2>${escapeHtml(sec.title)}</h2>
      </header>
      <div class="key-idea">
        <strong>Key Takeaway:</strong> ${escapeHtml(sec.keyIdea)}
      </div>
      <p class="simple-text">${escapeHtml(sec.simpleText)}</p>
      ${
        sec.jargon && sec.jargon.length > 0
          ? `
        <div class="jargon-box">
          <h4>Key Vocabulary in this Section:</h4>
          <ul>
            ${sec.jargon
              .map(
                (j) =>
                  `<li><strong>${escapeHtml(j.term)}${
                    j.originalTerm && j.originalTerm !== j.term
                      ? ` (${escapeHtml(j.originalTerm)})`
                      : ""
                  }:</strong> ${escapeHtml(j.plainMeaning)}</li>`
              )
              .join("")}
          </ul>
        </div>
      `
          : ""
      }
    </article>
  `
    )
    .join("\n");

  const glossaryHtml =
    pack.glossary && pack.glossary.length > 0
      ? `
    <section class="pack-section">
      <h2>Complete Vocabulary Glossary</h2>
      <div class="glossary-grid">
        ${pack.glossary
          .map(
            (g) => `
          <div class="glossary-item">
            <dt><strong>${escapeHtml(g.term)}</strong></dt>
            <dd>${escapeHtml(g.plainMeaning)}</dd>
          </div>
        `
          )
          .join("\n")}
      </div>
    </section>
  `
      : "";

  const quizHtml =
    pack.quiz && pack.quiz.length > 0
      ? `
    <section class="pack-section page-break">
      <h2>Self-Check Practice Quiz</h2>
      <div class="quiz-list">
        ${pack.quiz
          .map(
            (q, idx) => `
          <div class="quiz-item">
            <p class="question"><strong>${idx + 1}. ${escapeHtml(
              q.question
            )}</strong></p>
            <ul class="quiz-options">
              ${q.options
                .map(
                  (opt, optIdx) => `
                <li class="${optIdx === q.correctIndex ? "correct-answer" : ""}">
                  ${String.fromCharCode(65 + optIdx)}) ${escapeHtml(opt)}
                  ${optIdx === q.correctIndex ? " <em>(Correct)</em>" : ""}
                </li>
              `
                )
                .join("")}
            </ul>
            <p class="explanation"><em>Explanation:</em> ${escapeHtml(
              q.explanation
            )}</p>
          </div>
        `
          )
          .join("\n")}
      </div>
    </section>
  `
      : "";

  const flashcardsHtml =
    pack.flashcards && pack.flashcards.length > 0
      ? `
    <section class="pack-section page-break">
      <h2>Active Recall Flashcards</h2>
      <div class="flashcards-grid">
        ${pack.flashcards
          .map(
            (card, idx) => `
          <div class="flashcard">
            <div class="card-num">Card ${idx + 1}${
              card.concept ? ` &bull; ${escapeHtml(card.concept)}` : ""
            }</div>
            <div class="card-front"><strong>Front:</strong> ${escapeHtml(
              card.front
            )}</div>
            <div class="card-back"><strong>Back:</strong> ${escapeHtml(
              card.back
            )}</div>
          </div>
        `
          )
          .join("\n")}
      </div>
    </section>
  `
      : "";

  const studyPlanHtml =
    pack.studyPlan && pack.studyPlan.length > 0
      ? `
    <section class="pack-section page-break">
      <h2>5-Day Spaced Learning Schedule</h2>
      <div class="study-plan-list">
        ${pack.studyPlan
          .map(
            (day) => `
          <div class="day-card">
            <h3>Day ${day.day}: ${escapeHtml(day.title)} (${day.estimatedMinutes} mins)</h3>
            <ul>
              ${day.tasks.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}
            </ul>
          </div>
        `
          )
          .join("\n")}
      </div>
    </section>
  `
      : "";

  return `<!DOCTYPE html>
<html lang="${escapeHtml(pack.language || "en")}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(pack.title)} — Offline Study Pack</title>
  <style>
    :root {
      --bg: #FDFBF7;
      --card-bg: #FFFFFF;
      --text: #1E293B;
      --border: #E2E8F0;
      --primary: #4F46E5;
      --accent: #0284C7;
      --font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: var(--font-family);
      line-height: 1.7;
      letter-spacing: 0.02em;
      margin: 0;
      padding: 24px;
      max-width: 900px;
      margin: 0 auto;
    }
    header.main-header {
      border-bottom: 2px solid var(--border);
      padding-bottom: 16px;
      margin-bottom: 32px;
    }
    h1 {
      color: #0F172A;
      margin: 0 0 8px 0;
      font-size: 26px;
    }
    .meta-bar {
      font-size: 14px;
      color: #64748B;
    }
    .study-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    }
    .badge {
      display: inline-block;
      font-size: 12px;
      font-weight: 600;
      background: #EEF2FF;
      color: var(--primary);
      padding: 2px 8px;
      border-radius: 6px;
      margin-bottom: 8px;
    }
    .key-idea {
      background: #F0FDF4;
      border-left: 4px solid #16A34A;
      padding: 10px 14px;
      border-radius: 4px;
      margin: 12px 0 16px 0;
      font-size: 15px;
      color: #14532D;
    }
    .simple-text {
      font-size: 17px;
      margin-bottom: 16px;
    }
    .jargon-box {
      background: #F8FAFC;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 14px;
    }
    .jargon-box h4 {
      margin: 0 0 8px 0;
      color: #334155;
    }
    .pack-section {
      margin-top: 40px;
      padding-top: 24px;
      border-top: 1px solid var(--border);
    }
    .glossary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 16px;
      margin-top: 16px;
    }
    .glossary-item {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px;
    }
    .quiz-item {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .quiz-options {
      list-style: none;
      padding-left: 0;
      margin: 10px 0;
    }
    .quiz-options li {
      padding: 6px 10px;
      margin-bottom: 4px;
      border-radius: 6px;
      background: #F8FAFC;
    }
    .quiz-options li.correct-answer {
      background: #DCFCE7;
      font-weight: 600;
    }
    .explanation {
      font-size: 14px;
      color: #475569;
      margin: 8px 0 0 0;
    }
    .flashcards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 16px;
    }
    .flashcard {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
    }
    .card-num {
      font-size: 12px;
      color: #64748B;
      margin-bottom: 6px;
    }
    .day-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
    }
    footer {
      margin-top: 48px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
      font-size: 13px;
      color: #94A3B8;
      text-align: center;
    }
    @media print {
      body {
        background: #FFFFFF;
        color: #000000;
        padding: 0;
      }
      .page-break {
        page-break-before: always;
      }
      .study-card {
        box-shadow: none;
        border: 1px solid #CCC;
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <header class="main-header">
    <h1>${escapeHtml(pack.title)}</h1>
    <div class="meta-bar">
      <span>Language: <strong>${escapeHtml(pack.language.toUpperCase())}</strong></span> &bull;
      <span>Generated: ${escapeHtml(new Date(pack.generatedAt).toLocaleDateString())}</span> &bull;
      <span>Sections: ${pack.simplifiedSections.length}</span>
    </div>
  </header>

  <main>
    <section>
      <h2>Simplified Accessible Notes</h2>
      ${sectionsHtml}
    </section>

    ${glossaryHtml}
    ${quizHtml}
    ${flashcardsHtml}
    ${studyPlanHtml}
  </main>

  <footer>
    <p>Generated by <strong>Inclusive Learning Assistant v2.0</strong> &bull; Accessible Learning for All</p>
  </footer>

  ${
    isPrintMode
      ? `<script>
    window.addEventListener('load', function() {
      window.print();
    });
  </script>`
      : ""
  }
</body>
</html>`;
}

/**
 * Triggers a browser download of text data as a file.
 */
export function downloadTextFile(
  content: string,
  filename: string,
  mimeType: string = "text/plain"
): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Opens a print dialog with the printable study pack HTML.
 */
export function printStudyPack(pack: OfflineStudyPack): void {
  if (typeof window === "undefined") return;
  const html = generatePrintableHtml(pack);
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
}
