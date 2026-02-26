/**
 * useSettings — App settings persisted to AsyncStorage.
 * Adapted from LAMA's useSettings.ts (different storage prefix + language pref).
 */

import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LANGUAGE_KEY = "@arcview/language";
const DEFAULT_LANGUAGE = "en";

export function useSettings() {
  const [language, setLanguageState] = useState(DEFAULT_LANGUAGE);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_KEY).then((stored) => {
      if (stored) setLanguageState(stored);
      setIsLoaded(true);
    }).catch(() => setIsLoaded(true));
  }, []);

  const setLanguage = useCallback((value: string) => {
    setLanguageState(value);
    AsyncStorage.setItem(LANGUAGE_KEY, value);
  }, []);

  return { language, setLanguage, isLoaded };
}
