import { DocumentChunk } from "@/types/api";

export function chunkTextByHeadings(
  text: string,
  maxWordsPerChunk = 80
): DocumentChunk[] {
  // Simple deterministic chunker for fallback operation
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return paragraphs.map((para, index) => {
    const lines = para.split("\n");
    const heading = lines.length > 1 ? lines[0] : `Section ${index + 1}`;
    const body = lines.length > 1 ? lines.slice(1).join(" ") : para;

    return {
      id: `chunk_${index + 1}`,
      index,
      heading,
      text: body,
      keyTerms: body
        .split(" ")
        .filter((w) => w.length > 6)
        .slice(0, 4)
        .map((w) => w.replace(/[^a-zA-Z]/g, "")),
    };
  });
}
