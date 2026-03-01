/**
 * useMyLoadout — Equipped loadout persistence + derived stat aggregation.
 * Stores item IDs per equipment slot in AsyncStorage, resolves to full items,
 * and computes damage output, survivability, mobility, and build classification.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MetaForgeItem } from "../types";

const STORAGE_KEY = "@arcview/my-loadout";

export type EquipmentSlot =
  | "weapon"
  | "armor"
  | "helmet"
  | "backpack"
  | "gadget"
  | "consumable";

export type BuildClass = "DPS" | "Tank" | "Support" | "Hybrid";

export interface LoadoutStats {
  damageOutput: number;
  survivability: number;
  mobility: number;
  overallScore: number;
}

type SlotMap = Partial<Record<EquipmentSlot, string>>;

function classifyBuild(stats: LoadoutStats): BuildClass {
  const { damageOutput, survivability, mobility } = stats;
  const max = Math.max(damageOutput, survivability, mobility);
  if (max === 0) return "Hybrid";
  // Need clear dominance (>20% lead) to avoid Hybrid
  if (damageOutput >= survivability * 1.2 && damageOutput >= mobility * 1.2) return "DPS";
  if (survivability >= damageOutput * 1.2 && survivability >= mobility * 1.2) return "Tank";
  if (mobility >= damageOutput * 1.2 && mobility >= survivability * 1.2) return "Support";
  return "Hybrid";
}

function computeStats(equippedItems: MetaForgeItem[]): LoadoutStats {
  let damage = 0;
  let fireRate = 0;
  let range = 0;
  let stability = 0;
  let weight = 0;
  let agility = 0;
  let stealth = 0;

  for (const item of equippedItems) {
    const sb = item.stat_block;
    if (!sb) continue;
    damage += sb.damage ?? 0;
    fireRate += sb.fireRate ?? 0;
    range += sb.range ?? 0;
    stability += sb.stability ?? 0;
    weight += sb.weight ?? 0;
    agility += sb.agility ?? 0;
    stealth += sb.stealth ?? 0;
  }

  const damageOutput = damage * 1.5 + fireRate * 1.0 + range * 0.5;
  const survivability = stability * 1.5 + weight * 1.0;
  const mobility = agility * 1.5 + stealth * 1.0;
  const overallScore = damageOutput * 0.4 + survivability * 0.35 + mobility * 0.25;

  return {
    damageOutput: Math.round(damageOutput),
    survivability: Math.round(survivability),
    mobility: Math.round(mobility),
    overallScore: Math.round(overallScore),
  };
}

export function useMyLoadout(items: MetaForgeItem[]) {
  const [slotMap, setSlotMap] = useState<SlotMap>({});

  // Load from storage
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            setSlotMap(JSON.parse(raw));
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const persist = useCallback((updated: SlotMap) => {
    setSlotMap(updated);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  }, []);

  const equipItem = useCallback(
    (slot: EquipmentSlot, item: MetaForgeItem) => {
      persist({ ...slotMap, [slot]: item.id });
    },
    [slotMap, persist]
  );

  const unequipItem = useCallback(
    (slot: EquipmentSlot) => {
      const next = { ...slotMap };
      delete next[slot];
      persist(next);
    },
    [slotMap, persist]
  );

  const clearLoadout = useCallback(() => {
    persist({});
  }, [persist]);

  // Resolve slot IDs → full items
  const loadout = useMemo(() => {
    const result: Partial<Record<EquipmentSlot, MetaForgeItem>> = {};
    for (const [slot, id] of Object.entries(slotMap)) {
      if (!id) continue;
      const found = items.find((it) => it.id === id);
      if (found) result[slot as EquipmentSlot] = found;
    }
    return result;
  }, [slotMap, items]);

  const equippedItems = useMemo(() => Object.values(loadout).filter(Boolean) as MetaForgeItem[], [loadout]);
  const equippedCount = equippedItems.length;
  const stats = useMemo(() => computeStats(equippedItems), [equippedItems]);
  const buildClass = useMemo(() => classifyBuild(stats), [stats]);

  return {
    loadout,
    slotMap,
    stats,
    buildClass,
    equippedCount,
    equippedItems,
    equipItem,
    unequipItem,
    clearLoadout,
  };
}
