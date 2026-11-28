/**
 * Pure, deterministic PDF text layout cleaner.
 * Cleans extracted PDF text across three distinct stages:
 *  Stage 1: stripPageNoiseAndHeaders (removes page numbers and repeated headers/footers)
 *  Stage 2: resolveLineHyphenation (rejoins line-broken words while preserving genuine compounds)
 *  Stage 3: normalizeParagraphBlocks (preserves headings/lists/paragraphs, repairs accidental hard wraps)
 *
 * Adheres strictly to zero cross-file, module-level, or global caching.
 */

// Regex patterns for standalone page numbers
const PAGE_NUMBER_PATTERNS: RegExp[] = [
  /^(?:page|pg\.?)\s+\d+(?:\s*(?:of|\/)\s*\d+)?\s*$/i, // "Page 3 of 12", "Page 3", "pg. 4"
  /^\d+\s*(?:of|\/)\s*\d+\s*$/i,                        // "3 of 12", "3 / 12"
  /^[-–—_]+\s*\d+\s*[-–—_]+\s*$/,                      // "- 4 -", "-- 4 --", "— 4 —"
  /^\[\s*\d+\s*\]\s*$/,                                 // "[ 4 ]", "[4]"
  /^\(\s*\d+\s*\)\s*$/,                                 // "( 4 )", "(4)"
  /^\d+\s*$/,                                           // Lone numeric line (e.g. "4", "12")
];

// Well-known hyphenated compound prefixes to retain when broken across lines
const COMPOUND_PREFIXES: Set<string> = new Set([
  "all", "anti", "auto", "co", "cross", "ex", "extra", "full", "half", "high",
  "ill", "low", "mid", "multi", "non", "off", "on", "open", "out",
  "part", "peer", "post", "pre", "pro", "quasi", "real", "self",
  "semi", "short", "step", "sub", "ultra", "un", "under", "user",
  "well", "zero",
]);

// Well-known compound words to preserve when hyphenated across lines
const KNOWN_COMPOUND_WORDS: Set<string> = new Set([
  "end-to-end", "high-contrast", "read-aloud", "user-friendly",
  "real-time", "state-of-the-art", "built-in", "open-source",
  "peer-to-peer", "client-side", "server-side", "cross-platform",
  "case-sensitive", "zero-shot", "few-shot", "step-by-step",
  "decision-making", "problem-solving", "short-term", "long-term",
  "point-to-point", "up-to-date", "face-to-face", "side-by-side",
  "low-vision", "machine-readable", "time-consuming", "wide-range",
  "single-cell", "double-blind", "fine-tuning",
]);

/**
 * Checks if a trimmed line represents a standalone page number.
 */
function isStandalonePageNumber(line: string): boolean {
  const clean = line.trim();
  if (!clean) return false;
  return PAGE_NUMBER_PATTERNS.some((pattern) => pattern.test(clean));
}

/**
 * Stage 1: Removes standalone page numbers and repeated running headers/footers
 * that appear across page breaks in multi-page PDF extracts.
 */
export function stripPageNoiseAndHeaders(rawText: string): string {
  if (!rawText || typeof rawText !== "string") {
    return rawText || "";
  }

  // Normalize line endings
  const normalized = rawText.replace(/\r\n/g, "\n");

  // Determine pages either by form feed character (\f) or page-number markers
  const hasFormFeed = normalized.includes("\f");
  const rawPages: string[] = hasFormFeed
    ? normalized.split("\f")
    : normalized.split(/\n{3,}/);

  // If there are multiple pages/sections, detect repeated running headers & footers
  const repeatedHeadersFooters = new Set<string>();

  if (rawPages.length >= 2) {
    const candidateCounts = new Map<string, number>();

    for (const page of rawPages) {
      const pageLines = page
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !isStandalonePageNumber(l));

      if (pageLines.length === 0) continue;

      // Check first 2 non-empty lines (candidate headers)
      const topCandidates = pageLines.slice(0, Math.min(2, pageLines.length));
      // Check last 2 non-empty lines (candidate footers)
      const bottomCandidates = pageLines.slice(Math.max(0, pageLines.length - 2));

      const pageCandidates = new Set<string>([...topCandidates, ...bottomCandidates]);

      for (const candidate of pageCandidates) {
        // Disregard very long lines or lines ending in sentence punctuation
        if (candidate.length <= 120 && !/[.!?]$/.test(candidate)) {
          const count = (candidateCounts.get(candidate) || 0) + 1;
          candidateCounts.set(candidate, count);
        }
      }
    }

    // A line appearing as header/footer in at least 2 distinct pages is a running header/footer
    for (const [candidate, count] of candidateCounts.entries()) {
      if (count >= 2) {
        repeatedHeadersFooters.add(candidate);
      }
    }
  }

  // Process all lines across the document
  const lines = normalized.split("\n");
  const cleanedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Remove standalone page numbers
    if (isStandalonePageNumber(trimmed)) {
      continue;
    }

    // 2. Remove repeated running headers/footers
    if (repeatedHeadersFooters.has(trimmed)) {
      continue;
    }

    // 3. Strip stray form feed characters
    const cleanLine = rawLine.replace(/\f/g, "");
    cleanedLines.push(cleanLine);
  }

  // Rejoin and collapse excessive blank lines (more than 2 consecutive newlines)
  return cleanedLines.join("\n").replace(/\n{3,}/g, "\n\n");
}

/**
 * Stage 2: Rejoins words broken across newlines with a trailing hyphen
 * (e.g., "photo-\nsynthesis" -> "photosynthesis") while strictly preserving
 * genuine hyphenated compound words (e.g., "end-to-end", "high-contrast").
 */
export function resolveLineHyphenation(text: string): string {
  if (!text || typeof text !== "string") {
    return text || "";
  }

  // 1. Strip soft hyphens (Unicode \u00AD)
  let result = text.replace(/\u00AD\r?\n?[\t ]*/g, "");

  // 2. Match words broken across a newline by a trailing hyphen, en-dash, or em-dash
  const LINE_HYPHEN_REGEX = /([a-zA-Z\u00C0-\u024F]+)[-–—]\r?\n[\t ]*([a-zA-Z\u00C0-\u024F]+)/g;

  result = result.replace(LINE_HYPHEN_REGEX, (_match, left: string, right: string) => {
    const leftLower = left.toLowerCase();
    const rightLower = right.toLowerCase();
    const candidateCompound = `${leftLower}-${rightLower}`;

    // Preserve hyphen if it is a recognized compound word or known compound prefix
    if (
      KNOWN_COMPOUND_WORDS.has(candidateCompound) ||
      COMPOUND_PREFIXES.has(leftLower)
    ) {
      return `${left}-${right}`;
    }

    // Otherwise, rejoin cleanly without the hyphen
    return `${left}${right}`;
  });

  return result;
}

/**
 * Helper to identify whether a line represents a list item.
 */
function isListItemLine(line: string): boolean {
  const trimmed = line.trim();
  // Bullets: -, *, •, +, –, —
  if (/^[-*•+–—]\s+\S/.test(trimmed)) return true;
  // Numbered or lettered lists: 1., 1), a., a), i., I)
  if (/^(?:\d+|[a-zA-Z]|[ivxlcdmIVXLCDM]+)[\.\)]\s+\S/.test(trimmed)) return true;
  // Bracketed lists: [1], [a]
  if (/^\[(?:\d+|[a-zA-Z]+)\]\s+\S/.test(trimmed)) return true;
  return false;
}

/**
 * Helper to identify whether a line is a heading or title.
 */
function isHeadingLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  // Markdown heading (# Heading)
  if (/^#{1,6}\s+\S/.test(trimmed)) return true;

  // Explicit section label heading (e.g. Chapter 1, Section 2.3, Lecture 4, Topic A)
  if (/^(?:chapter|section|part|unit|module|lecture|topic|appendix)\s+[\dIVXLCDM\w]+/i.test(trimmed)) {
    return true;
  }

  // Short standalone heading (<= 65 characters without terminal punctuation)
  if (trimmed.length <= 65 && !/[.,;:!?]$/.test(trimmed)) {
    // ALL CAPS heading with at least 3 uppercase characters
    if (/^[A-Z0-9\s:–—\-]+$/.test(trimmed) && /[A-Z]{3,}/.test(trimmed)) {
      return true;
    }

    // Title Case heading with 1 to 7 words
    const words = trimmed.split(/\s+/);
    if (words.length >= 1 && words.length <= 7 && /^[A-Z]/.test(words[0])) {
      const isTitleCased = words.every((w) => {
        if (/^(?:a|an|the|and|but|or|for|nor|on|at|to|from|by|with|in|of)$/i.test(w)) {
          return true;
        }
        return /^[A-Z0-9]/.test(w);
      });
      if (isTitleCased) return true;
    }
  }

  return false;
}

/**
 * Stage 3: Normalizes paragraph blocks by preserving headings, blank-line paragraph
 * breaks, and bullet/numbered lists, while joining accidental mid-sentence hard line
 * wraps into clean, flowing prose.
 */
export function normalizeParagraphBlocks(text: string): string {
  if (!text || typeof text !== "string") {
    return text || "";
  }

  // Split into raw paragraph blocks using blank lines as boundaries
  const rawBlocks = text.split(/\n\s*\n+/);
  const normalizedBlocks: string[] = [];

  for (const rawBlock of rawBlocks) {
    const rawLines = rawBlock
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (rawLines.length === 0) continue;

    const blockElements: string[] = [];
    let currentProse = "";

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];

      if (isHeadingLine(line)) {
        if (currentProse) {
          blockElements.push(currentProse);
          currentProse = "";
        }
        blockElements.push(line);
      } else if (isListItemLine(line)) {
        if (currentProse) {
          blockElements.push(currentProse);
          currentProse = "";
        }
        currentProse = line;
      } else {
        // Prose line: join accidental mid-sentence hard wraps with a single space
        if (!currentProse) {
          currentProse = line;
        } else {
          // If the previous line is a list item or prose, merge the wrapped continuation line
          currentProse += " " + line;
        }
      }
    }

    if (currentProse) {
      blockElements.push(currentProse);
    }

    // Format elements within the block: consecutive list items on newlines,
    // headings and paragraphs separated by blank lines
    let blockText = "";
    for (let j = 0; j < blockElements.length; j++) {
      const current = blockElements[j];
      const prev = j > 0 ? blockElements[j - 1] : null;

      if (j === 0) {
        blockText = current;
      } else if (prev && isListItemLine(prev) && isListItemLine(current)) {
        blockText += "\n" + current;
      } else {
        blockText += "\n\n" + current;
      }
    }

    if (blockText) {
      normalizedBlocks.push(blockText);
    }
  }

  return normalizedBlocks.join("\n\n").trim();
}

/**
 * Master PDF layout cleaning pipeline.
 * Runs Stages 1 -> 2 -> 3 inside a try/catch block and safely returns rawText
 * unchanged if disabled or if any error occurs.
 */
export function cleanPdfLayoutText(
  rawText: string,
  options?: { enabled?: boolean }
): string {
  if (options?.enabled === false) {
    return rawText;
  }

  if (!rawText || typeof rawText !== "string") {
    return rawText || "";
  }

  try {
    // Stage 1: Remove page numbers and repeated running headers/footers
    const stage1 = stripPageNoiseAndHeaders(rawText);

    // Stage 2: Resolve line hyphenation while preserving genuine compounds
    const stage2 = resolveLineHyphenation(stage1);

    // Stage 3: Normalize paragraph blocks, headings, lists, and prose wraps
    const stage3 = normalizeParagraphBlocks(stage2);

    return stage3;
  } catch (error) {
    // Defensive safe fallback: never throw or lose raw user content
    console.warn("cleanPdfLayoutText encountered an error, returning rawText:", error);
    return rawText;
  }
}
