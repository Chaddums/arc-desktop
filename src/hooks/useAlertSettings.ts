/**
 * useAlertSettings — Persistent notification/audio settings.
 * Syncs to main process via window.arcDesktop.updateAlertSettings().
 */

import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@arcview/alert-settings";

export interface AlertSettings {
  notifyOnEvent: boolean;
  audioAlerts: boolean;
  audioVolume: number; // 0.25 | 0.5 | 0.75 | 1.0
}

const DEFAULTS: AlertSettings = {
  notifyOnEvent: true,
  audioAlerts: true,
  audioVolume: 0.75,
};

export function useAlertSettings() {
  const [settings, setSettings] = useState<AlertSettings>(DEFAULTS);

  // Load from storage
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            const merged = { ...DEFAULTS, ...parsed };
            setSettings(merged);
            window.arcDesktop?.updateAlertSettings(merged);
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const update = useCallback(
    (partial: Partial<AlertSettings>) => {
      const updated = { ...settings, ...partial };
      setSettings(updated);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
      window.arcDesktop?.updateAlertSettings(updated);
    },
    [settings]
  );

  return { settings, update };
}
