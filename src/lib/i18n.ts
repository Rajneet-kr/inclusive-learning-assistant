import { LanguageOption, SupportedLanguageCode, TextDirection } from "@/types/api";

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  {
    code: "en",
    label: "English",
    nativeLabel: "English",
    direction: "ltr",
    ttsSupported: true,
  },
  {
    code: "hi",
    label: "Hindi",
    nativeLabel: "हिन्दी",
    direction: "ltr",
    ttsSupported: true,
  },
  {
    code: "kn",
    label: "Kannada",
    nativeLabel: "ಕನ್ನಡ",
    direction: "ltr",
    ttsSupported: true,
  },
  {
    code: "ta",
    label: "Tamil",
    nativeLabel: "தமிழ்",
    direction: "ltr",
    ttsSupported: true,
  },
  {
    code: "te",
    label: "Telugu",
    nativeLabel: "తెలుగు",
    direction: "ltr",
    ttsSupported: true,
  },
  {
    code: "mr",
    label: "Marathi",
    nativeLabel: "मराठी",
    direction: "ltr",
    ttsSupported: true,
  },
  {
    code: "bn",
    label: "Bengali",
    nativeLabel: "বাংলা",
    direction: "ltr",
    ttsSupported: true,
  },
  {
    code: "es",
    label: "Spanish",
    nativeLabel: "Español",
    direction: "ltr",
    ttsSupported: true,
  },
  {
    code: "fr",
    label: "French",
    nativeLabel: "Français",
    direction: "ltr",
    ttsSupported: true,
  },
  {
    code: "de",
    label: "German",
    nativeLabel: "Deutsch",
    direction: "ltr",
    ttsSupported: true,
  },
];

export function getLanguageOption(code: SupportedLanguageCode): LanguageOption {
  const found = SUPPORTED_LANGUAGES.find((lang) => lang.code === code);
  return (
    found || {
      code,
      label: code.toUpperCase(),
      nativeLabel: code.toUpperCase(),
      direction: "ltr",
      ttsSupported: false,
    }
  );
}

export function getTextDirection(code: SupportedLanguageCode): TextDirection {
  const lang = getLanguageOption(code);
  return lang.direction;
}

export function isTtsSupportedForLanguage(code: SupportedLanguageCode): boolean {
  const lang = getLanguageOption(code);
  return lang.ttsSupported;
}

/**
 * Checks if the browser's speech synthesis engine currently has a voice
 * installed for the given BCP-47 language tag (e.g. "hi-IN", "hi", "es-ES", "es").
 */
export function checkBrowserTtsVoiceAvailable(code: SupportedLanguageCode): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return false;
  }
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) {
    // If voices haven't loaded yet, assume supported if listed as ttsSupported
    return isTtsSupportedForLanguage(code);
  }
  const targetCode = code.toLowerCase();
  return voices.some((v) => {
    const lang = (v.lang || "").toLowerCase();
    return lang === targetCode || lang.startsWith(`${targetCode}-`) || lang.startsWith(`${targetCode}_`);
  });
}
