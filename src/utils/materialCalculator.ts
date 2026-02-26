/**
 * Material Calculator — Recursive material total computation.
 * Cross-references hideout station requirements with bot drops and maps.
 */

import type { Bot, GameMap, CraftingStation } from "../types";

export interface MaterialSource {
  type: "bot_drop" | "map_loot" | "trade";
  name: string;
  details?: string;
}

export interface MaterialRequirement {
  itemId: string;
  itemName: string;
  quantity: number;
  sources: MaterialSource[];
}

interface SelectedCraft {
  stationId: string;
  targetLevel: number;
}

/**
 * Calculate aggregated shopping list from selected crafting station upgrades.
 * Cross-references bots for drop sources and maps for locations.
 */
export function calculateShoppingList(
  selectedCrafts: SelectedCraft[],
  stations: CraftingStation[],
  bots: Bot[],
  maps: GameMap[]
): MaterialRequirement[] {
  const totals = new Map<string, { name: string; quantity: number }>();

  for (const craft of selectedCrafts) {
    const station = stations.find((s) => s.id === craft.stationId);
    if (!station) continue;

    for (const level of station.levels) {
      if (level.level > craft.targetLevel) break;
      for (const req of level.requirements) {
        const existing = totals.get(req.itemId);
        if (existing) {
          existing.quantity += req.quantity;
        } else {
          totals.set(req.itemId, {
            name: req.itemName ?? req.itemId,
            quantity: req.quantity,
          });
        }
      }
    }
  }

  // Cross-reference with bot drops and maps
  const results: MaterialRequirement[] = [];
  for (const [itemId, info] of totals) {
    const sources: MaterialSource[] = [];

    // Check bot drops
    for (const bot of bots) {
      if (bot.drops.some((d) => normalizeId(d) === normalizeId(itemId))) {
        const botMaps = bot.maps
          .map((mId) => maps.find((m) => m.id === mId))
          .filter(Boolean)
          .map((m) => m!.name.en)
          .join(", ");

        sources.push({
          type: "bot_drop",
          name: bot.name?.en ?? bot.id,
          details: botMaps || undefined,
        });
      }
    }

    results.push({
      itemId,
      itemName: info.name,
      quantity: info.quantity,
      sources,
    });
  }

  return results.sort((a, b) => a.itemName.localeCompare(b.itemName));
}

function normalizeId(id: string): string {
  return id.replace(/-/g, "_").toLowerCase();
}
