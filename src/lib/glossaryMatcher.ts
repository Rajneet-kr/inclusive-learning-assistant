import { GlossaryTerm } from "@/types/api";

/**
 * Normalizes text for matching by converting to lower case and removing punctuation.
 */
function normalizeForMatching(text: string): string {
  return (text || "")
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’“”]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Checks if a word or phrase stem matches a glossary term base.
 * Handles common English inflections: plurals (-s, -es, -ies), verb forms (-ing, -ed), and noun suffixes (-tion, -ation).
 */
function stemsMatch(word: string, term: string): boolean {
  if (word === term) return true;

  // Plural/singular checks
  if (word.endsWith("ies") && term.endsWith("y") && word.slice(0, -3) === term.slice(0, -1)) {
    return true;
  }
  if (term.endsWith("ies") && word.endsWith("y") && term.slice(0, -3) === word.slice(0, -1)) {
    return true;
  }
  if (word.endsWith("es") && (word.slice(0, -2) === term || word.slice(0, -1) === term)) {
    return true;
  }
  if (term.endsWith("es") && (term.slice(0, -2) === word || term.slice(0, -1) === word)) {
    return true;
  }
  if (word.endsWith("s") && word.slice(0, -1) === term) {
    return true;
  }
  if (term.endsWith("s") && term.slice(0, -1) === word) {
    return true;
  }

  // Verb forms (-ed, -ing)
  if (word.endsWith("ing") && (word.slice(0, -3) === term || `${word.slice(0, -3)}e` === term)) {
    return true;
  }
  if (word.endsWith("ed") && (word.slice(0, -2) === term || `${word.slice(0, -2)}e` === term)) {
    return true;
  }

  return false;
}

/**
 * Finds the first glossary term that matches a given query word or phrase.
 */
export function matchGlossaryTerm(
  text: string,
  glossary: GlossaryTerm[]
): GlossaryTerm | null {
  if (!text || !glossary || glossary.length === 0) return null;

  const normalizedInput = normalizeForMatching(text);
  if (!normalizedInput) return null;

  // 1. Exact match check (case-insensitive)
  const exact = glossary.find(
    (g) => normalizeForMatching(g.term) === normalizedInput
  );
  if (exact) return exact;

  // 2. Multi-word phrase check: Does the glossary term appear anywhere in the normalized input?
  const phraseMatch = glossary.find((g) => {
    const normTerm = normalizeForMatching(g.term);
    return (
      normTerm.length > 2 &&
      (normalizedInput.includes(` ${normTerm} `) ||
        normalizedInput.startsWith(`${normTerm} `) ||
        normalizedInput.endsWith(` ${normTerm}`))
    );
  });
  if (phraseMatch) return phraseMatch;

  // 3. Single-word stem/inflection match
  const inputWords = normalizedInput.split(/\s+/);
  for (const item of glossary) {
    const normTerm = normalizeForMatching(item.term);
    // If the term is single word, check against individual words in input
    if (!normTerm.includes(" ")) {
      for (const word of inputWords) {
        if (stemsMatch(word, normTerm)) {
          return item;
        }
      }
    }
  }

  return null;
}

/**
 * Finds all glossary terms that appear within a piece of text (e.g. within a caption segment or chunk).
 * Returns unique matching glossary items.
 */
export function findAllGlossaryMatches(
  text: string,
  glossary: GlossaryTerm[]
): GlossaryTerm[] {
  if (!text || !glossary || glossary.length === 0) return [];

  const normalizedInput = ` ${normalizeForMatching(text)} `;
  const inputWords = normalizeForMatching(text).split(/\s+/);
  const matchedTerms = new Map<string, GlossaryTerm>();

  for (const item of glossary) {
    const normTerm = normalizeForMatching(item.term);
    if (!normTerm) continue;

    // Multi-word exact phrase
    if (normTerm.includes(" ")) {
      if (normalizedInput.includes(` ${normTerm} `)) {
        matchedTerms.set(normTerm, item);
      }
    } else {
      // Single-word exact or stem match
      const wordMatch = inputWords.some((word) => stemsMatch(word, normTerm));
      if (wordMatch) {
        matchedTerms.set(normTerm, item);
      }
    }
  }

  return Array.from(matchedTerms.values());
}
