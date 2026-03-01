/**
 * useBuildAdvisor — Build recommendation engine.
 * Scores items by relevance to playstyle goal using stat weights, rarity,
 * item type affinity, and name keyword matching.
 */

import { useMemo } from "react";
import { loc } from "../utils/loc";
import { matchesSlot } from "../utils/itemTypes";
import type { MetaForgeItem, SkillNode } from "../types";
import type { EquipmentSlot } from "./useMyLoadout";

export type PlaystyleGoal = "Aggressive" | "Balanced" | "Survival" | "Farming";

export interface BuildRecommendation {
  itemId: string;
  itemName: string;
  score: number;
  reasoning: string;
  slot?: string;
}

export interface SkillRecommendation {
  nodeId: string;
  nodeName: string;
  points: number;
  reasoning: string;
}

export interface BuildAdvice {
  goal: PlaystyleGoal;
  itemRecommendations: Map<string, BuildRecommendation[]>;
  skillRecommendations: SkillRecommendation[];
  summary: string;
}

// ─── Stat-based scoring weights per playstyle ──────────────────
const STAT_WEIGHTS: Record<PlaystyleGoal, Record<string, number>> = {
  Aggressive: { damage: 3, fireRate: 2, range: 1, stability: 1, agility: 1, stealth: 0, weight: -1 },
  Balanced:   { damage: 1.5, fireRate: 1, range: 1, stability: 1.5, agility: 1, stealth: 0.5, weight: 0 },
  Survival:   { damage: 0.5, fireRate: 0, range: 0.5, stability: 2, agility: 1.5, stealth: 1.5, weight: 1 },
  Farming:    { damage: 0.5, fireRate: 0, range: 0, stability: 1, agility: 2, stealth: 2, weight: -0.5 },
};

// ─── Item type affinity per playstyle (how much each type matters) ─
const TYPE_AFFINITY: Record<PlaystyleGoal, Record<string, number>> = {
  Aggressive: { weapon: 25, shield: 10, augment: 10, throwable: 15, consumable: 5, gadget: 5, material: 0, key: 0 },
  Balanced:   { weapon: 15, shield: 15, augment: 15, throwable: 10, consumable: 10, gadget: 10, material: 5, key: 5 },
  Survival:   { weapon: 5, shield: 25, augment: 20, throwable: 5, consumable: 15, gadget: 10, material: 5, key: 5 },
  Farming:    { weapon: 0, shield: 5, augment: 15, throwable: 0, consumable: 10, gadget: 10, material: 25, key: 15 },
};

// ─── Name keyword bonuses per playstyle ───────────────────────
const NAME_KEYWORDS: Record<PlaystyleGoal, { keywords: string[]; bonus: number }> = {
  Aggressive: {
    keywords: ["rifle", "shotgun", "smg", "assault", "attack", "combat", "burst", "rapid", "explosive", "grenade", "ammo", "damage"],
    bonus: 15,
  },
  Balanced: {
    keywords: ["tactical", "standard", "utility", "multi", "versatile", "balanced", "adaptive"],
    bonus: 10,
  },
  Survival: {
    keywords: ["medkit", "heal", "shield", "armor", "plate", "vest", "helmet", "defense", "repair", "bandage", "stim", "protect"],
    bonus: 15,
  },
  Farming: {
    keywords: ["backpack", "bag", "container", "stealth", "quiet", "speed", "light", "scanner", "detector", "extract", "loot"],
    bonus: 15,
  },
};

// ─── Categories to group items by (matches MetaForge item_type) ─
const DISPLAY_CATEGORIES = [
  { key: "weapon", label: "Weapons", match: ["weapon"] },
  { key: "shield", label: "Shields & Protection", match: ["shield"] },
  { key: "augment", label: "Augments", match: ["augment"] },
  { key: "consumable", label: "Consumables", match: ["consumable", "quick use", "nature", "throwable"] },
  { key: "gear", label: "Gear & Equipment", match: ["gadget", "modification", "mods", "key", "quest item"] },
  { key: "material", label: "Materials", match: ["material", "recyclable"] },
];

function categorizeItem(item: MetaForgeItem): string {
  const type = item.item_type?.toLowerCase() ?? "";
  const name = item.name.toLowerCase();
  for (const cat of DISPLAY_CATEGORIES) {
    if (cat.match.some((m) => type.includes(m) || name.includes(m))) {
      return cat.key;
    }
  }
  return "gear"; // fallback
}

function scoreItem(item: MetaForgeItem, goal: PlaystyleGoal): number {
  let score = 0;

  // 1. Stat-based scoring (when available)
  if (item.stat_block) {
    const weights = STAT_WEIGHTS[goal];
    for (const [stat, value] of Object.entries(item.stat_block)) {
      if (value == null) continue;
      const w = weights[stat] ?? 0;
      score += Number(value) * w;
    }
  }

  // 2. Rarity bonus
  const rarityBonus: Record<string, number> = {
    common: 0, uncommon: 5, rare: 10, epic: 20, legendary: 30,
  };
  score += rarityBonus[item.rarity?.toLowerCase() ?? ""] ?? 0;

  // 3. Item type affinity (map item_type to slot, then look up affinity)
  const affinities = TYPE_AFFINITY[goal];
  if (item.item_type) {
    const slots: EquipmentSlot[] = ["weapon", "shield", "augment", "gadget", "consumable", "throwable"];
    for (const slot of slots) {
      if (matchesSlot(item.item_type, slot)) {
        score += affinities[slot] ?? 0;
        break;
      }
    }
    // Fallback: check material/key by substring
    const type = item.item_type.toLowerCase();
    if (type.includes("material") || type.includes("recyclable")) score += affinities["material"] ?? 0;
    else if (type.includes("key") || type.includes("quest")) score += affinities["key"] ?? 0;
  }

  // 4. Name keyword matching
  const nameLower = item.name.toLowerCase();
  const descLower = (item.description ?? "").toLowerCase();
  const kw = NAME_KEYWORDS[goal];
  for (const keyword of kw.keywords) {
    if (nameLower.includes(keyword) || descLower.includes(keyword)) {
      score += kw.bonus;
      break; // one match is enough
    }
  }

  // 5. Value-based bonus (higher value items are generally better)
  if (item.value && item.value > 0) {
    score += Math.min(Math.round(item.value / 500), 10);
  }

  return Math.round(score);
}

function generateReasoning(item: MetaForgeItem, goal: PlaystyleGoal): string {
  const parts: string[] = [];

  // Stat reasoning
  if (item.stat_block) {
    const weights = STAT_WEIGHTS[goal];
    const topStats = Object.entries(item.stat_block)
      .filter(([, v]) => v != null && Number(v) > 0)
      .map(([k, v]) => ({ stat: k, value: Number(v), weighted: Number(v) * (weights[k] ?? 0) }))
      .sort((a, b) => b.weighted - a.weighted)
      .slice(0, 2);
    if (topStats.length > 0) {
      parts.push(topStats.map((s) => `${s.stat} ${s.value}`).join(", "));
    }
  }

  // Rarity reasoning
  if (item.rarity && item.rarity.toLowerCase() !== "common") {
    parts.push(item.rarity);
  }

  // Type reasoning
  if (item.item_type) {
    const affinities = TYPE_AFFINITY[goal];
    const slots: EquipmentSlot[] = ["weapon", "shield", "augment", "gadget", "consumable", "throwable"];
    for (const slot of slots) {
      if (matchesSlot(item.item_type, slot) && (affinities[slot] ?? 0) >= 15) {
        parts.push(`${goal.toLowerCase()}-aligned type`);
        break;
      }
    }
  }

  // Name keyword match
  const nameLower = item.name.toLowerCase();
  const kw = NAME_KEYWORDS[goal];
  const matched = kw.keywords.find((k) => nameLower.includes(k));
  if (matched) {
    parts.push(`"${matched}" synergy`);
  }

  if (parts.length === 0) return "General utility item";
  return parts.join(" · ");
}

export function useBuildAdvisor(
  items: MetaForgeItem[],
  skillNodes: SkillNode[],
  skillAllocations: Record<string, number>,
) {
  const getAdvice = useMemo(() => {
    return (goal: PlaystyleGoal): BuildAdvice => {
      // Score all items
      const scored = items.map((item) => ({
        itemId: item.id,
        itemName: item.name,
        score: scoreItem(item, goal),
        reasoning: generateReasoning(item, goal),
        category: categorizeItem(item),
      }));

      // Group by display category and pick top 5 per category
      const itemsByCategory = new Map<string, BuildRecommendation[]>();

      for (const cat of DISPLAY_CATEGORIES) {
        const catItems = scored
          .filter((s) => s.category === cat.key)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
          .map(({ category, ...rest }) => ({ ...rest, slot: cat.key }));

        if (catItems.length > 0 && catItems[0].score > 0) {
          itemsByCategory.set(cat.label, catItems);
        }
      }

      // If no categorized results, show overall top items
      if (itemsByCategory.size === 0 && scored.length > 0) {
        const top = scored
          .sort((a, b) => b.score - a.score)
          .slice(0, 10)
          .map(({ category, ...rest }) => rest);
        if (top.length > 0) {
          itemsByCategory.set("Top Recommendations", top);
        }
      }

      // Skill recommendations
      const goalKeywords: Record<PlaystyleGoal, string[]> = {
        Aggressive: ["damage", "fire", "attack", "critical", "weapon", "combat", "assault"],
        Balanced: ["health", "damage", "shield", "stamina", "versatil", "adapt"],
        Survival: ["health", "shield", "armor", "heal", "defense", "resist", "repair", "protect"],
        Farming: ["speed", "stealth", "agility", "carry", "loot", "inventory", "extract", "scan"],
      };
      const keywords = goalKeywords[goal];
      const skillRecs: SkillRecommendation[] = [];

      for (const node of skillNodes) {
        const name = loc(node.name).toLowerCase();
        const matches = keywords.some((kw) => name.includes(kw));
        if (matches) {
          const current = skillAllocations[node.id] ?? 0;
          const max = node.maxPoints ?? 1;
          if (current < max) {
            skillRecs.push({
              nodeId: node.id,
              nodeName: loc(node.name) || node.id,
              points: max,
              reasoning: `Supports ${goal.toLowerCase()} playstyle`,
            });
          }
        }
      }

      const summaries: Record<PlaystyleGoal, string> = {
        Aggressive:
          "Maximize damage output and fire rate. Prioritize high-damage weapons and offensive gear.",
        Balanced:
          "Equal focus on offense and defense. Choose versatile gear with well-rounded stats.",
        Survival:
          "Focus on staying alive. Prioritize armor, healing items, and defensive abilities.",
        Farming:
          "Optimize for stealth and speed. Prioritize mobility, carry capacity, and extraction tools.",
      };

      return {
        goal,
        itemRecommendations: itemsByCategory,
        skillRecommendations: skillRecs.slice(0, 5),
        summary: summaries[goal],
      };
    };
  }, [items, skillNodes, skillAllocations]);

  return { getAdvice };
}
