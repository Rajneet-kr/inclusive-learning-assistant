"use client";

import React from "react";

// Common English prefixes and suffixes for deterministic syllable chunking
const PREFIXES = [
  "photo",
  "chloro",
  "electro",
  "micro",
  "macro",
  "trans",
  "inter",
  "super",
  "under",
  "anti",
  "auto",
  "bio",
  "poly",
  "tele",
  "multi",
  "sub",
  "pre",
  "pro",
  "dis",
  "mis",
  "non",
  "con",
  "com",
  "un",
  "re",
  "in",
  "de",
  "ex",
];

const SUFFIXES = [
  "synthesis",
  "cellular",
  "tion",
  "sion",
  "ment",
  "able",
  "ible",
  "ness",
  "less",
  "ful",
  "ing",
  "ous",
  "ive",
  "ize",
  "ise",
  "ary",
  "ery",
  "ory",
  "est",
  "ist",
  "ism",
  "phy",
  "logy",
  "ly",
  "er",
  "ed",
  "es",
];

/**
 * Splits a single English word into syllables using algorithmic phonetic chunking.
 * Words <= 3 letters or single-syllable words are left untouched.
 */
export function splitWordIntoSyllables(word: string): string[] {
  if (!word || word.length <= 3) return [word];

  const clean = word.toLowerCase();

  // Known dictionary word overrides for biology/science domain
  const DICT_OVERRIDES: Record<string, string[]> = {
    photosynthesis: ["pho", "to", "syn", "the", "sis"],
    chloroplast: ["chlo", "ro", "plast"],
    chlorophyll: ["chlo", "ro", "phyll"],
    glucose: ["glu", "cose"],
    molecule: ["mol", "e", "cule"],
    molecules: ["mol", "e", "cules"],
    energy: ["en", "er", "gy"],
    cellular: ["cel", "lu", "lar"],
    respiration: ["res", "pi", "ra", "tion"],
    atmosphere: ["at", "mos", "phere"],
    calvin: ["cal", "vin"],
    stroma: ["stro", "ma"],
    thylakoid: ["thy", "la", "koid"],
    thylakoids: ["thy", "la", "koids"],
    photolysis: ["pho", "tol", "y", "sis"],
    biosphere: ["bi", "o", "sphere"],
    carbohydrates: ["car", "bo", "hy", "drates"],
    membrane: ["mem", "brane"],
    membranes: ["mem", "branes"],
    chemical: ["chem", "i", "cal"],
    reactions: ["re", "ac", "tions"],
    reaction: ["re", "ac", "tion"],
    sunlight: ["sun", "light"],
    droplets: ["drop", "lets"],
    battery: ["bat", "ter", "y"],
    batteries: ["bat", "ter", "ies"],
  };

  if (DICT_OVERRIDES[clean]) {
    // Reapply original casing
    const target = DICT_OVERRIDES[clean];
    let cursor = 0;
    return target.map((chunk) => {
      const slice = word.slice(cursor, cursor + chunk.length);
      cursor += chunk.length;
      return slice;
    });
  }

  // General heuristic hyphenation:
  // 1. Double consonant splits (hap-py, let-ter, rab-bit)
  const syllables: string[] = [];
  let current = "";
  const vowels = "aeiouy";

  for (let i = 0; i < word.length; i++) {
    current += word[i];
    const char = word[i].toLowerCase();
    const nextChar = word[i + 1]?.toLowerCase();
    const nextNextChar = word[i + 2]?.toLowerCase();

    // Check double consonant (e.g. tt, bb, pp, ll, ss, mm, nn)
    if (
      nextChar &&
      nextNextChar &&
      char === nextChar &&
      !vowels.includes(char) &&
      current.length >= 2
    ) {
      syllables.push(current);
      current = "";
      continue;
    }

    // Vowel followed by two consonants (e.g., doc-tor, bas-ket)
    if (
      vowels.includes(char) &&
      nextChar &&
      nextNextChar &&
      !vowels.includes(nextChar) &&
      !vowels.includes(nextNextChar) &&
      current.length >= 2 &&
      i < word.length - 2
    ) {
      // Don't split digraphs like th, sh, ch, ph, wh
      const digraph = nextChar + nextNextChar;
      if (!["th", "sh", "ch", "ph", "wh", "ck", "ng", "qu"].includes(digraph)) {
        current += nextChar;
        i++;
        syllables.push(current);
        current = "";
        continue;
      }
    }
  }

  if (current) {
    if (syllables.length > 0 && current.length <= 2 && !vowels.includes(current[0].toLowerCase())) {
      syllables[syllables.length - 1] += current;
    } else {
      syllables.push(current);
    }
  }

  return syllables.length > 0 ? syllables : [word];
}

interface SyllableTextProps {
  text: string;
  enabled?: boolean;
  separator?: string;
  className?: string;
}

/**
 * Renders text with syllable breaks (`·` middle dot) for students with dyslexia/ADHD,
 * preserving original punctuation, whitespace, and capitalization.
 */
export function SyllableText({
  text,
  enabled = true,
  separator = "·",
  className = "",
}: SyllableTextProps) {
  if (!enabled || !text) {
    return <span className={className}>{text}</span>;
  }

  // Tokenize by word boundaries and punctuation
  const tokens = text.split(/(\s+|[.,\/#!$%\^&\*;:{}=\-_`~()?"'’“”])/);

  return (
    <span className={className}>
      {tokens.map((token, idx) => {
        // If whitespace or punctuation, render bare
        if (!token || /^\s+$/.test(token) || /^[.,\/#!$%\^&\*;:{}=\-_`~()?"'’“”]+$/.test(token)) {
          return <React.Fragment key={idx}>{token}</React.Fragment>;
        }

        const syllables = splitWordIntoSyllables(token);
        if (syllables.length <= 1) {
          return <React.Fragment key={idx}>{token}</React.Fragment>;
        }

        return (
          <span key={idx} className="inline-block">
            {syllables.map((syl, sylIdx) => (
              <React.Fragment key={sylIdx}>
                {syl}
                {sylIdx < syllables.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="text-blue-500/70 font-bold select-none px-[0.5px]"
                  >
                    {separator}
                  </span>
                )}
              </React.Fragment>
            ))}
          </span>
        );
      })}
    </span>
  );
}
