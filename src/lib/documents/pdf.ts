/**
 * Server-side PDF Text Extractor using pdf-parse.
 * Extracts clean plain text, counts pages, and detects scanned/image-only PDFs.
 */

export interface PdfExtractionResult {
  text: string;
  pageCount: number;
  numPages: number;
  charCount: number;
  wordCount: number;
  isScannedOrEmpty: boolean;
}

export async function extractTextFromPdf(
  pdfBuffer: Buffer | Uint8Array
): Promise<PdfExtractionResult> {
  try {
    const buffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);

    // Dynamic import to prevent SSR/client bundling issues and support all export flavors
    const mod: any = await import("pdf-parse");

    // Whichever export shape is present:
    // 1. If a PDFParse class/constructor exists on mod or mod.default
    const PDFParseClass =
      typeof mod?.PDFParse === "function"
        ? mod.PDFParse
        : typeof mod?.default?.PDFParse === "function"
        ? mod.default.PDFParse
        : null;

    let rawText = "";
    let pageCount = 1;

    if (PDFParseClass) {
      const parser = new PDFParseClass({ data: buffer });
      const result = await parser.getText();
      if (typeof parser.destroy === "function") {
        await parser.destroy();
      }
      rawText = (result?.text || "").trim();
      pageCount = result?.total || result?.numPages || result?.pages?.length || 1;
    } else {
      // 2. Otherwise resolve the callable function (mod.default ?? mod)
      const parserFn =
        typeof mod?.default === "function"
          ? mod.default
          : typeof mod === "function"
          ? mod
          : null;

      if (!parserFn) {
        throw new Error("Unable to resolve PDF parser function or class");
      }

      const result = await parserFn(buffer);
      rawText = (result?.text || "").trim();
      pageCount = result?.numpages || result?.numPages || result?.total || 1;
    }

    // Clean up typical PDF extraction artifacts:
    // 1. Remove page numbering markers like "-- 1 of 12 --" or "[Page 1]"
    // 2. Normalize Windows/Unix newlines
    // 3. Remove null bytes or control characters
    // 4. Collapse 3+ consecutive newlines to 2
    const cleanText = rawText
      .replace(/--\s*\d+\s*of\s*\d+\s*--/gi, "")
      .replace(/\[\s*Page\s+\d+\s*\]/gi, "")
      .replace(/\r\n/g, "\n")
      .replace(/\u0000/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    const charCount = cleanText.length;
    const wordCount = cleanText ? cleanText.split(/\s+/).filter(Boolean).length : 0;

    // A PDF with fewer than 30 characters is almost certainly a scanned document,
    // an image-only slide, or completely blank.
    const isScannedOrEmpty = charCount < 30 || wordCount < 5;

    return {
      text: cleanText,
      pageCount,
      numPages: pageCount,
      charCount,
      wordCount,
      isScannedOrEmpty,
    };
  } catch (err: any) {
    console.error("PDF extraction error in extractTextFromPdf:", err?.message || err);
    throw new Error(
      "Unable to extract text from this PDF file. Try pasting the lecture text directly."
    );
  }
}
