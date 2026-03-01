/**
 * useMapRecommendations — Per-map item recommendations.
 * Scores items per equipment slot using enemy weaknesses, stat weights, and rarity.
 */

import { useState, useCallback, useMemo } from "react";
import type { MetaForgeItem, Bot } from "../types";
import type { EquipmentSlot } from "./useMyLoadout";

const MAP_BASE_THREAT: Record<string, number> = {
  dam: 30,
  spaceport: 50,
  buried_city: 65,
  blue_gate: 45,
  stella_montis: 70,
};

const MAPS = ["Dam", "Spaceport", "Buried City", "Blue Gate", "Stella Montis"];

const RARITY_BONUS: Record<string, number> = {
  common: 0,
  uncommon: 5,
  rare: 10,
  epic: 18,
  legendary: 25,
};

// Slot → stat weight mapping for scoring
const SLOT_STAT_WEIGHTS: Record<EquipmentSlot, Record<string, number>> = {
  weapon: { damage: 2.0, fireRate: 1.5, range: 0.8, magazineSize: 0.5 },
  armor: { stability: 2.0, weight: 1.0 },
  helmet: { stability: 1.5, stealth: 0.8 },
  backpack: { agility: 1.5, stealth: 1.0, weight: 0.5 },
  gadget: { damage: 1.0, range: 1.0, agility: 0.8 },
  consumable: { agility: 1.0, stealth: 0.8, stability: 0.5 },
};

// Map item_type to equipment slot
function itemTypeToSlot(itemType: string): EquipmentSlot | null {
  const t = itemType.toLowerCase();
  if (t.includes("weapon") || t.includes("gun") || t.includes("rifle") || t.includes("pistol") || t.includes("shotgun")) return "weapon";
  if (t.includes("armor") || t.includes("vest") || t.includes("chest")) return "armor";
  if (t.includes("helmet") || t.includes("head") || t.includes("mask")) return "helmet";
  if (t.includes("backpack") || t.includes("bag") || t.includes("rig")) return "backpack";
  if (t.includes("gadget") || t.includes("grenade") || t.includes("tool")) return "gadget";
  if (t.includes("consumable") || t.includes("med") || t.includes("stim") || t.includes("food")) return "consumable";
  return null;
}

export interface SlotRecommendation {
  item: MetaForgeItem;
  score: number;
  reasoning: string;
}

export interface ThreatSummary {
  totalEnemies: number;
  highThreatCount: number;
  dominantWeakness: string | null;
}

export function useMapRecommendations(items: MetaForgeItem[], bots: Bot[]) {
  const [selectedMap, setSelectedMap] = useState<string | null>(null);

  const mapKey = useMemo(
    () => (selectedMap ?? "").toLowerCase().replace(/\s+/g, "_"),
    [selectedMap]
  );

  // Enemies on selected map
  const mapBots = useMemo(
    () => bots.filter((b) => b.maps.includes(mapKey)),
    [bots, mapKey]
  );

  // Threat summary
  const threatSummary = useMemo((): ThreatSummary => {
    const highThreat = mapBots.filter(
      (b) => b.threat === "High" || b.threat === "Critical" || b.threat === "Extreme"
    );
    // Dominant weakness
    const weaknessCounts: Record<string, number> = {};
    for (const b of mapBots) {
      if (b.weakness) {
        weaknessCounts[b.weakness] = (weaknessCounts[b.weakness] ?? 0) + 1;
      }
    }
    let dominantWeakness: string | null = null;
    let maxCount = 0;
    for (const [w, count] of Object.entries(weaknessCounts)) {
      if (count > maxCount) {
        dominantWeakness = w;
        maxCount = count;
      }
    }
    return {
      totalEnemies: mapBots.length,
      highThreatCount: highThreat.length,
      dominantWeakness,
    };
  }, [mapBots]);

  // Score items per slot
  const recommendations = useMemo(() => {
    if (!selectedMap) return new Map<EquipmentSlot, SlotRecommendation[]>();

    const result = new Map<EquipmentSlot, SlotRecommendation[]>();

    // Group items by slot
    const slotItems = new Map<EquipmentSlot, MetaForgeItem[]>();
    for (const item of items) {
      if (!item.item_type) continue;
      const slot = itemTypeToSlot(item.item_type);
      if (!slot) continue;
      const existing = slotItems.get(slot) ?? [];
      existing.push(item);
      slotItems.set(slot, existing);
    }

    // Weaknesses on this map
    const weaknesses = new Set(mapBots.map((b) => b.weakness).filter(Boolean) as string[]);

    for (const [slot, slotItemList] of slotItems) {
      const weights = SLOT_STAT_WEIGHTS[slot];
      const scored: SlotRecommendation[] = slotItemList.map((item) => {
        let score = 0;
        const reasons: string[] = [];

        // Stat-weighted score
        const sb = item.stat_block ?? {};
        let statScore = 0;
        for (const [stat, w] of Object.entries(weights)) {
          statScore += (sb[stat] ?? 0) * w;
        }
        score += statScore;
        if (statScore > 0) reasons.push(`Strong ${slot} stats`);

        // Rarity bonus
        const rarityBonus = RARITY_BONUS[(item.rarity ?? "").toLowerCase()] ?? 0;
        score += rarityBonus;
        if (rarityBonus >= 10) reasons.push(`${item.rarity} rarity`);

        // Weakness matching (check if item name/type hints at a weakness match)
        for (const weakness of weaknesses) {
          const wl = weakness.toLowerCase();
          if (
            item.name.toLowerCase().includes(wl) ||
            (item.item_type ?? "").toLowerCase().includes(wl)
          ) {
            score += 15;
            reasons.push(`Matches ${weakness} weakness`);
            break;
          }
        }

        return {
          item,
          score: Math.round(score),
          reasoning: reasons.length > 0 ? reasons.join("; ") : "Baseline item",
        };
      });

      // Sort by score descending, take top 2
      scored.sort((a, b) => b.score - a.score);
      result.set(slot, scored.slice(0, 2));
    }

    return result;
  }, [items, selectedMap, mapBots]);

  return {
    selectedMap,
    setSelectedMap,
    maps: MAPS,
    mapKey,
    threatSummary,
    recommendations,
    mapBaseThreat: MAP_BASE_THREAT[mapKey] ?? 40,
  };
}
