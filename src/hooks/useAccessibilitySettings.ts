"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AccessibilitySettings,
  AccessibilityProfile,
  DEFAULT_ACCESSIBILITY_SETTINGS,
  DEFAULT_FOCUS_SETTINGS,
  FocusSettings,
} from "@/types/api";

const STORAGE_KEY = "inclusive_learning_assistant_settings_v1";

export function useAccessibilitySettings() {
  const [settings, setSettings] = useState<AccessibilitySettings>(
    DEFAULT_ACCESSIBILITY_SETTINGS
  );
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize from localStorage on mount (SSR safe)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings((prev) => ({
          ...prev,
          ...parsed,
          focus: {
            ...DEFAULT_FOCUS_SETTINGS,
            ...(parsed?.focus || {}),
          },
        }));
      }
    } catch {
      // Fallback silently if storage access fails
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Update specific setting and persist
  const updateSettings = useCallback(
    (newPartial: Partial<AccessibilitySettings>) => {
      setSettings((prev) => {
        const updated = { ...prev, ...newPartial };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch {
          // Ignore write failure
        }
        return updated;
      });
    },
    []
  );

  // Switch profile with automatic preset adjustments
  const setProfile = useCallback(
    (profile: AccessibilityProfile) => {
      let preset: Partial<AccessibilitySettings> = { profile };

      if (profile === "dyslexia") {
        preset = {
          profile,
          fontFamily: "opendyslexic",
          lineSpacing: 1.85,
          letterSpacing: 0.05,
          colorOverlay: "cream",
          highContrast: false,
          bionicReading: false,
          captionsEnabled: false,
        };
      } else if (profile === "low_vision") {
        preset = {
          profile,
          fontFamily: "sans",
          fontSize: 22,
          lineSpacing: 2.0,
          colorOverlay: "none",
          highContrast: true,
          highlightCurrentWord: true,
          captionsEnabled: false,
        };
      } else if (profile === "hearing") {
        preset = {
          profile,
          captionsEnabled: true,
          captionsFontSize: 18,
          highContrast: false,
          colorOverlay: "none",
        };
      }

      updateSettings(preset);
    },
    [updateSettings]
  );

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_ACCESSIBILITY_SETTINGS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  const setLanguage = useCallback(
    (language: import("@/types/api").SupportedLanguageCode) => {
      updateSettings({ language });
    },
    [updateSettings]
  );

  const updateFocusSettings = useCallback(
    (newFocus: Partial<FocusSettings>) => {
      setSettings((prev) => {
        const updatedFocus = {
          ...DEFAULT_FOCUS_SETTINGS,
          ...(prev.focus || {}),
          ...newFocus,
        };
        const updated = { ...prev, focus: updatedFocus };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch {
          // Ignore
        }
        return updated;
      });
    },
    []
  );

  return {
    settings,
    isLoaded,
    updateSettings,
    updateFocusSettings,
    setProfile,
    setLanguage,
    resetSettings,
  };
}
