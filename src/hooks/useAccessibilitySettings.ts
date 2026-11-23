"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AccessibilitySettings,
  AccessibilityProfile,
  DEFAULT_ACCESSIBILITY_SETTINGS,
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
        setSettings((prev) => ({ ...prev, ...parsed }));
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

  return {
    settings,
    isLoaded,
    updateSettings,
    setProfile,
    resetSettings,
  };
}
