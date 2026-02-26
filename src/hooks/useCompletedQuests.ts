/**
 * useCompletedQuests — Persists quest completion state to AsyncStorage.
 * Storage key: @arcview/completed_quests
 */

import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@arcview/completed_quests";

export function useCompletedQuests() {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from storage on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const ids: string[] = JSON.parse(raw);
          setCompletedIds(new Set(ids));
        } catch {}
      }
      setIsLoaded(true);
    }).catch(() => setIsLoaded(true));
  }, []);

  // Persist to storage
  const persist = useCallback((ids: Set<string>) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  }, []);

  const markComplete = useCallback(
    (id: string) => {
      setCompletedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const markIncomplete = useCallback(
    (id: string) => {
      setCompletedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  return { completedIds, markComplete, markIncomplete, isLoaded };
}
