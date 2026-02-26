/**
 * useLoadoutChecklist — Persistent overlay checklist (LAMA watchlist pattern).
 * Items pinned from Loadout/Missions screens appear in the overlay HUD.
 */

import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@arcview/loadout-checklist";

export interface ChecklistItem {
  id: string;
  name: string;
  quantity: number;
  checked: boolean;
}

export function useLoadoutChecklist() {
  const [items, setItems] = useState<ChecklistItem[]>([]);

  // Load from storage
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            setItems(JSON.parse(raw));
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const persist = useCallback((updated: ChecklistItem[]) => {
    setItems(updated);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  }, []);

  const addItem = useCallback(
    (name: string, quantity: number = 1) => {
      // Dedupe by name
      if (items.some((it) => it.name === name)) return;
      const newItem: ChecklistItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name,
        quantity,
        checked: false,
      };
      persist([...items, newItem]);
    },
    [items, persist]
  );

  const toggleItem = useCallback(
    (id: string) => {
      persist(items.map((it) => (it.id === id ? { ...it, checked: !it.checked } : it)));
    },
    [items, persist]
  );

  const removeItem = useCallback(
    (id: string) => {
      persist(items.filter((it) => it.id !== id));
    },
    [items, persist]
  );

  const clearChecked = useCallback(() => {
    persist(items.filter((it) => !it.checked));
  }, [items, persist]);

  return { items, addItem, toggleItem, removeItem, clearChecked };
}
