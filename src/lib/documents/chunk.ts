import { DocumentChunk } from "@/types/api";

function extractKeyTerms(text: string, count = 4): string[] {
  const words = text.split(/\s+/);
  const termScores = new Map<string, number>();

  const stopWords = new Set([
    "the", "and", "that", "this", "with", "from", "have", "were", "which",
    "their", "there", "about", "would", "these", "other", "into", "more",
    "will", "when", "some", "time", "than", "them", "only", "also", "then",
    "what", "each", "make", "like", "using", "used", "after", "before",
    "first", "section", "chapter", "example", "notes", "lecture", "student",
    "such", "both", "must", "same", "over", "such", "been"
  ]);

  for (const word of words) {
    const clean = word.replace(/^[^\w]+|[^\w]+$/g, "");
    if (clean.length < 3) continue;
    const lower = clean.toLowerCase();
    if (stopWords.has(lower)) continue;

    // Prioritize acronyms (e.g. BST, AVL, DSA) and Capitalized terms
    let score = 1;
    if (/^[A-Z]{2,6}$/.test(clean)) score += 3;
    else if (/^[A-Z][a-z]+/.test(clean)) score += 2;
    if (clean.length > 7) score += 1;

    termScores.set(clean, (termScores.get(clean) || 0) + score);
  }

  return Array.from(termScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([term]) => term);
}

/**
 * Deterministic chunker that groups text into 3 to 8 sequential, accessible sections
 * with meaningful headings and key technical terms.
 */
export function chunkTextByHeadings(
  text: string,
  targetWordsPerChunk = 120,
  maxChunks = 8
): DocumentChunk[] {
  if (!text || !text.trim()) {
    return [];
  }

  const rawBlocks = text
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunksData: Array<{ heading: string; text: string }> = [];
  let currentWords: string[] = [];
  let currentHeading = "";

  for (const block of rawBlocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    const firstLine = lines[0] || "";

    const isHeading =
      (firstLine.length < 65 && lines.length > 1) ||
      /^#{1,4}\s+/.test(firstLine) ||
      /^(chapter|unit|section|topic|part|module|\d+[\.\)])\s+/i.test(firstLine);

    if (isHeading && currentWords.length >= 60) {
      chunksData.push({
        heading: currentHeading || "Overview",
        text: currentWords.join(" "),
      });
      currentHeading = firstLine.replace(/^#{1,4}\s+/, "").trim();
      currentWords = lines.slice(1).join(" ").split(/\s+/).filter(Boolean);
    } else {
      if (!currentHeading && isHeading) {
        currentHeading = firstLine.replace(/^#{1,4}\s+/, "").trim();
        currentWords.push(...lines.slice(1).join(" ").split(/\s+/).filter(Boolean));
      } else {
        currentWords.push(...block.split(/\s+/).filter(Boolean));
      }
    }

    if (currentWords.length >= targetWordsPerChunk && chunksData.length < maxChunks - 1) {
      chunksData.push({
        heading: currentHeading || `Section ${chunksData.length + 1}`,
        text: currentWords.join(" "),
      });
      currentHeading = "";
      currentWords = [];
    }
  }

  if (currentWords.length > 0) {
    if (chunksData.length === 0 || currentWords.length > 30) {
      chunksData.push({
        heading: currentHeading || `Section ${chunksData.length + 1}`,
        text: currentWords.join(" "),
      });
    } else if (chunksData.length > 0) {
      const last = chunksData[chunksData.length - 1];
      last.text += " " + currentWords.join(" ");
    }
  }

  // If still single chunk, split by sentence groups
  if (chunksData.length <= 1 && text.split(/\s+/).length > targetWordsPerChunk) {
    const sentences = text.match(/[^.!?\n]+[.!?\n]+|\s+[^.!?\n]+$/g) || [text];
    chunksData.length = 0;
    let temp: string[] = [];
    for (const s of sentences) {
      temp.push(s.trim());
      const wordCount = temp.join(" ").split(/\s+/).length;
      if (wordCount >= targetWordsPerChunk && chunksData.length < maxChunks - 1) {
        chunksData.push({
          heading: `Section ${chunksData.length + 1}`,
          text: temp.join(" "),
        });
        temp = [];
      }
    }
    if (temp.length > 0) {
      chunksData.push({
        heading: `Section ${chunksData.length + 1}`,
        text: temp.join(" "),
      });
    }
  }

  return chunksData.slice(0, maxChunks).map((c, idx) => {
    let heading = c.heading.trim();
    if (!heading || heading === `Section ${idx + 1}`) {
      const terms = extractKeyTerms(c.text, 2);
      heading = terms.length > 0 ? `Topic: ${terms.join(" & ")}` : `Section ${idx + 1}`;
    }

    return {
      id: `chunk_${idx + 1}`,
      index: idx,
      heading,
      text: c.text.trim(),
      keyTerms: extractKeyTerms(c.text, 4),
    };
  });
}
