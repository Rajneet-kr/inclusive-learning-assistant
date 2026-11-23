import { chunkTextByHeadings } from "./chunk";
import { DocumentChunk } from "@/types/api";

export async function extractTextContent(
  rawText: string,
  title = "Uploaded Notes"
): Promise<{
  title: string;
  extractedText: string;
  sourceSummary: string;
  chunks: DocumentChunk[];
}> {
  const chunks = chunkTextByHeadings(rawText);
  return {
    title,
    extractedText: rawText,
    sourceSummary: rawText.slice(0, 160) + "...",
    chunks,
  };
}
