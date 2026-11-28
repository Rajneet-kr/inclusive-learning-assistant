import { StemElement } from "@/types/api";

const GREEK_MAP: Record<string, string> = {
  "\\alpha": "alpha",
  "\\beta": "beta",
  "\\gamma": "gamma",
  "\\Gamma": "capital Gamma",
  "\\delta": "delta",
  "\\Delta": "delta",
  "\\epsilon": "epsilon",
  "\\zeta": "zeta",
  "\\eta": "eta",
  "\\theta": "theta",
  "\\Theta": "capital Theta",
  "\\iota": "iota",
  "\\kappa": "kappa",
  "\\lambda": "lambda",
  "\\Lambda": "capital Lambda",
  "\\mu": "mu",
  "\\nu": "nu",
  "\\xi": "xi",
  "\\pi": "pi",
  "\\Pi": "capital Pi",
  "\\rho": "rho",
  "\\sigma": "sigma",
  "\\Sigma": "capital Sigma",
  "\\tau": "tau",
  "\\phi": "phi",
  "\\Phi": "capital Phi",
  "\\chi": "chi",
  "\\psi": "psi",
  "\\omega": "omega",
  "\\Omega": "ohm",
};

const SYMBOL_MAP: Record<string, string> = {
  "\\pm": "plus or minus",
  "\\times": "times",
  "\\cdot": "times",
  "\\div": "divided by",
  "\\leq": "is less than or equal to",
  "\\le": "is less than or equal to",
  "\\geq": "is greater than or equal to",
  "\\ge": "is greater than or equal to",
  "\\neq": "is not equal to",
  "\\approx": "is approximately equal to",
  "\\equiv": "is equivalent to",
  "\\infty": "infinity",
  "\\rightarrow": "reacts to form",
  "\\to": "approaches",
  "\\implies": "implies",
  "\\iff": "if and only if",
  "\\partial": "partial derivative",
  "\\int": "integral of",
  "\\sum": "summation of",
  "\\prod": "product of",
  "\\lim": "limit of",
  "\\sin": "sine",
  "\\cos": "cosine",
  "\\tan": "tangent",
  "\\log": "log",
  "\\ln": "natural log",
  "\\Delta": "change in",
  "\\nabla": "del",
  "\\degree": "degrees",
  "\\circ": "degrees",
  "=": "equals",
  "+": "plus",
  "-": "minus",
  "<": "is less than",
  ">": "is greater than",
};

/**
 * Converts a raw LaTeX expression or mathematical formula string
 * into natural English speech suitable for Text-to-Speech engines.
 */
export function verbalizeMathExpression(latexOrText: string): string {
  if (!latexOrText || typeof latexOrText !== "string") {
    return "";
  }

  let text = latexOrText.trim();

  // Strip dollar signs or KaTeX delimiters if present
  text = text.replace(/^\$+|\$+$/g, "").trim();

  // Handle \sqrt[n]{x} -> nth root of x
  text = text.replace(/\\sqrt\[(.*?)\]\{(.*?)\}/g, (_, n, x) => {
    return `${verbalizeMathExpression(n)} root of ${verbalizeMathExpression(x)}`;
  });

  // Handle \sqrt{x} -> square root of x
  text = text.replace(/\\sqrt\{(.*?)\}/g, (_, x) => {
    return `square root of ${verbalizeMathExpression(x)}`;
  });

  // Handle \frac{a}{b} -> a over b
  text = text.replace(/\\frac\{(.*?)\}\{(.*?)\}/g, (_, a, b) => {
    return `${verbalizeMathExpression(a)} over ${verbalizeMathExpression(b)}`;
  });

  // Handle powers: x^{2} -> x squared, x^{3} -> x cubed, x^{n} -> x to the power of n
  text = text.replace(/([a-zA-Z0-9_\\]+)\^\{2\}/g, "$1 squared");
  text = text.replace(/([a-zA-Z0-9_\\]+)\^2(?![0-9])/g, "$1 squared");
  text = text.replace(/([a-zA-Z0-9_\\]+)\^\{3\}/g, "$1 cubed");
  text = text.replace(/([a-zA-Z0-9_\\]+)\^3(?![0-9])/g, "$1 cubed");
  text = text.replace(/([a-zA-Z0-9_\\]+)\^\{(.*?)\}/g, (_, base, exp) => {
    return `${base} to the power of ${verbalizeMathExpression(exp)}`;
  });
  text = text.replace(/([a-zA-Z0-9_\\]+)\^([a-zA-Z0-9])/g, "$1 to the power of $2");

  // Handle subscripts: x_{1} -> x sub 1, x_1 -> x sub 1
  text = text.replace(/([a-zA-Z0-9_\\]+)_\{(.*?)\}/g, "$1 sub $2");
  text = text.replace(/([a-zA-Z0-9_\\]+)_([a-zA-Z0-9])/g, "$1 sub $2");

  // Replace Greek symbols
  for (const [pattern, spoken] of Object.entries(GREEK_MAP)) {
    text = text.replaceAll(pattern, ` ${spoken} `);
  }

  // Replace specific mathematical operators
  for (const [pattern, spoken] of Object.entries(SYMBOL_MAP)) {
    if (pattern.startsWith("\\")) {
      text = text.replaceAll(pattern, ` ${spoken} `);
    }
  }

  // Common chemical formula patterns (e.g., H2O, CO2, C6H12O6)
  text = text.replace(/\bH2O\b/g, "H 2 O (water)");
  text = text.replace(/\bCO2\b/g, "C O 2 (carbon dioxide)");
  text = text.replace(/\bO2\b/g, "O 2 (oxygen gas)");
  text = text.replace(/\bC6H12O6\b/g, "C 6 H 12 O 6 (glucose)");

  // Clean up remaining LaTeX commands or formatting tokens
  text = text.replace(/\\left|\\right/g, "");
  text = text.replace(/\\text\{(.*?)\}/g, "$1");
  text = text.replace(/\\mathbf\{(.*?)\}/g, "$1");
  text = text.replace(/\\mathit\{(.*?)\}/g, "$1");
  text = text.replace(/[{}]/g, " ");
  text = text.replace(/\\/g, " ");

  // Collapse multiple whitespaces
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

/**
 * Produces a clear spoken verbalization for a full STEM element,
 * prioritizing accessibleMathText, followed by verbalizing raw LaTeX/description.
 */
export function verbalizeStemElement(element: StemElement): string {
  if (element.accessibleMathText && element.accessibleMathText.trim().length > 0) {
    return element.accessibleMathText;
  }

  const parts: string[] = [];
  if (element.description) {
    parts.push(element.description);
  }

  if (element.latex) {
    const spokenMath = verbalizeMathExpression(element.latex);
    if (spokenMath) {
      parts.push(`Formula: ${spokenMath}`);
    }
  } else if (element.rawText) {
    parts.push(verbalizeMathExpression(element.rawText));
  }

  if (element.stepByStepExplanation && element.stepByStepExplanation.length > 0) {
    parts.push(`Explanation: ${element.stepByStepExplanation.join(". ")}`);
  }

  return parts.join(". ") || "Stem element";
}
