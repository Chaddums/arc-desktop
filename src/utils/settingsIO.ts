/**
 * Settings export/import — JSON config for sharing between devices.
 * Exports: theme, color preset, language, alert settings, OCR settings,
 * completed quests, watchlist, loadout checklist.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const EXPORT_KEYS = [
  "@arc-view/theme",
  "@arc-view/color-preset",
  "@arc-view/language",
  "@arc-view/alert-settings",
  "@arc-view/ocr-settings",
  "@arc-view/completed-quests",
  "@arc-view/watchlist",
  "@arc-view/checklist",
  "@arc-view/selected-crafts",
  "@arc-view/raid-log",
];

export interface SettingsExport {
  version: 1;
  exportedAt: number;
  data: Record<string, string>;
}

/** Export all persisted settings as a JSON string. */
export async function exportSettings(): Promise<string> {
  const pairs = await AsyncStorage.multiGet(EXPORT_KEYS);
  const data: Record<string, string> = {};
  for (const [key, value] of pairs) {
    if (value != null) data[key] = value;
  }
  const payload: SettingsExport = {
    version: 1,
    exportedAt: Date.now(),
    data,
  };
  return JSON.stringify(payload, null, 2);
}

/** Import settings from a JSON string. Returns count of keys restored. */
export async function importSettings(json: string): Promise<number> {
  const payload: SettingsExport = JSON.parse(json);
  if (payload.version !== 1) throw new Error("Unsupported settings version");
  const entries = Object.entries(payload.data);
  if (entries.length === 0) return 0;
  await AsyncStorage.multiSet(entries);
  return entries.length;
}
