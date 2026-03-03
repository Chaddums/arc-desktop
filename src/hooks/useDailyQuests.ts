/**
 * useDailyQuests — Manual daily quest tracking with AsyncStorage persistence.
 * Users add daily quests in-app; overlay shows them with toggle-to-complete.
 * Auto-resets checked items after midnight (local time).
 */

import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@arcview/daily-quests";

export interface DailyQuest {
  id: string;
  name: string;
  checked: boolean;
}

interface DailyQuestsData {
  quests: DailyQuest[];
  lastResetDate: string;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useDailyQuests() {
  const [quests, setQuests] = useState<DailyQuest[]>([]);

  // Load on mount with auto-reset
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const data: DailyQuestsData = JSON.parse(raw);
        const today = todayKey();
        if (data.lastResetDate !== today) {
          // New day: uncheck all
          const reset = data.quests.map((q) => ({ ...q, checked: false }));
          setQuests(reset);
          await AsyncStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ quests: reset, lastResetDate: today }),
          );
        } else {
          setQuests(data.quests);
        }
      } catch {}
    })();
  }, []);

  const persist = useCallback((updated: DailyQuest[]) => {
    setQuests(updated);
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ quests: updated, lastResetDate: todayKey() }),
    ).catch(() => {});
  }, []);

  const addQuest = useCallback(
    (name: string) => {
      const id = `daily_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      persist([...quests, { id, name, checked: false }]);
    },
    [quests, persist],
  );

  const toggleQuest = useCallback(
    (id: string) => {
      persist(quests.map((q) => (q.id === id ? { ...q, checked: !q.checked } : q)));
    },
    [quests, persist],
  );

  const removeQuest = useCallback(
    (id: string) => {
      persist(quests.filter((q) => q.id !== id));
    },
    [quests, persist],
  );

  const allChecked = quests.length > 0 && quests.every((q) => q.checked);

  return { quests, addQuest, toggleQuest, removeQuest, allChecked };
}
