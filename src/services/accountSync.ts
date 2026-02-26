/**
 * Account Sync — Local progress export/import.
 * Exports/imports all user data from AsyncStorage.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const USER_DATA_PREFIXES = [
  "@arcview/completed_quests",
  "@arcview/skill_allocations",
  "@arcview/routes",
  "@arcview/raid_log",
  "@arcview/watchlist",
  "@arcview/language",
];

/** Export all user data as a JSON string */
export async function exportUserData(): Promise<string> {
  const data: Record<string, string> = {};
  for (const key of USER_DATA_PREFIXES) {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value) data[key] = value;
    } catch {}
  }
  return JSON.stringify({
    version: 1,
    exportedAt: Date.now(),
    data,
  });
}

/** Import user data from a JSON string */
export async function importUserData(json: string): Promise<{ imported: number; errors: number }> {
  let imported = 0;
  let errors = 0;

  try {
    const parsed = JSON.parse(json);
    if (!parsed.data || typeof parsed.data !== "object") {
      throw new Error("Invalid export format");
    }

    for (const [key, value] of Object.entries(parsed.data)) {
      if (typeof value !== "string") continue;
      if (!USER_DATA_PREFIXES.includes(key)) continue;
      try {
        await AsyncStorage.setItem(key, value);
        imported++;
      } catch {
        errors++;
      }
    }
  } catch {
    errors++;
  }

  return { imported, errors };
}
