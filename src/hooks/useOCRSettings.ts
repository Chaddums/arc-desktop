/**
 * useOCRSettings — Persistent OCR feature settings.
 * Syncs to main process via window.arcDesktop.updateOCRSettings().
 */

import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@arcview/ocr-settings";

export interface OCRSettingsState {
  enabled: boolean;
  captureIntervalMs: number;
  matchThreshold: number;
  activeZones: string[];
}

const DEFAULTS: OCRSettingsState = {
  enabled: true,
  captureIntervalMs: 1500,
  matchThreshold: 0.7,
  activeZones: ["objectiveComplete", "itemPickup", "killFeed", "centerPopup"],
};

export function useOCRSettings() {
  const [settings, setSettings] = useState<OCRSettingsState>(DEFAULTS);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            const merged = { ...DEFAULTS, ...parsed };
            setSettings(merged);
            window.arcDesktop?.updateOCRSettings(merged);
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const update = useCallback(
    (partial: Partial<OCRSettingsState>) => {
      setSettings((prev) => {
        const updated = { ...prev, ...partial };
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
        window.arcDesktop?.updateOCRSettings(updated);
        return updated;
      });
    },
    []
  );

  return { settings, update };
}
