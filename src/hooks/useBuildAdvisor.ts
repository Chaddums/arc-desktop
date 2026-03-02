/**
 * useBuildAdvisor — Build recommendation engine.
 * Scores items by relevance to playstyle goal using stat weights, rarity,
 * item type affinity, and name keyword matching.
 * Scores skills using attribute-based semantic mapping (not keyword matching).
 * Detects dead/wasted perks by cross-referencing allocated skills with equipped gear.
 */

import { useMemo } from "react";
import { loc } from "../utils/loc";
import { matchesSlot } from "../utils/itemTypes";
import { SKILL_NODE_ATTRIBUTES, getNodeAttributes, getBranchLabel } from "../data/skillNodeAttributes";
import type { SkillTag } from "../data/skillNodeAttributes";
import type { MetaForgeItem, SkillNode } from "../types";
import type { EquipmentSlot, BuildClass } from "./useMyLoadout";

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
  branch: string;
  score: number;
}

export interface DeadPerkWarning {
  nodeId: string;
  nodeName: string;
  allocatedPoints: number;
  severity: "wasted" | "suboptimal";
  reason: string;
}

export interface BuildAdvice {
  goal: PlaystyleGoal;
  itemRecommendations: Map<string, BuildRecommendation[]>;
  skillRecommendations: SkillRecommendation[];
  deadPerks: DeadPerkWarning[];
  summary: string;
}

// ─── Skill archetype weights per playstyle/build class ──────────

interface ArchetypeWeights {
  dps: number;
  tank: number;
  support: number;
  stealth: number;
}

const PLAYSTYLE_WEIGHTS: Record<PlaystyleGoal, ArchetypeWeights> = {
  Aggressive: { dps: 3, tank: 0.5, support: 0.5, stealth: 0 },
  Survival:   { dps: 0.5, tank: 3, support: 0.5, stealth: 0 },
  Balanced:   { dps: 1, tank: 1, support: 1, stealth: 0.5 },
  Farming:    { dps: 0, tank: 0.5, support: 1, stealth: 3 },
};

const BUILD_CLASS_WEIGHTS: Record<BuildClass, ArchetypeWeights> = {
  DPS:     { dps: 3, tank: 0.5, support: 0.5, stealth: 0 },
  Tank:    { dps: 0.5, tank: 3, support: 0.5, stealth: 0 },
  Support: { dps: 0.5, tank: 0.5, support: 3, stealth: 1 },
  Hybrid:  { dps: 1, tank: 1, support: 1, stealth: 0.5 },
};

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
  return parts.join(" \u00B7 ");
}

// ─── Attribute-based skill scoring ─────────────────────────────

function scoreSkillNode(
  node: SkillNode,
  weights: ArchetypeWeights,
  allocations: Record<string, number>,
  allNodes: SkillNode[],
): { score: number; reasoning: string } {
  const attrs = getNodeAttributes(node.id);
  if (!attrs) return { score: 0, reasoning: "Unknown skill" };

  // Base score from archetype weights
  let score = (attrs.dps * weights.dps)
    + (attrs.tank * weights.tank)
    + (attrs.support * weights.support)
    + (attrs.stealth * weights.stealth);

  const parts: string[] = [];

  // Major node bonus (×1.3)
  if (node.isMajor) {
    score *= 1.3;
    parts.push("Major node");
  }

  // "Finish what you started" bonus — partially allocated nodes get ×1.1
  const current = allocations[node.id] ?? 0;
  const max = node.maxPoints ?? 1;
  if (current > 0 && current < max) {
    score *= 1.1;
    parts.push(`${current}/${max} allocated`);
  }

  // Prerequisite penalty — if prereqs not met, ×0.3
  if (node.prerequisiteNodeIds && node.prerequisiteNodeIds.length > 0) {
    const prereqsMet = node.prerequisiteNodeIds.every((pid) => {
      const prereqNode = allNodes.find((n) => n.id === pid);
      const prereqMax = prereqNode?.maxPoints ?? 1;
      return (allocations[pid] ?? 0) >= prereqMax;
    });
    if (!prereqsMet) {
      score *= 0.3;
      parts.push("Prereqs not met");
    }
  }

  // Build the reasoning from the attribute note
  parts.unshift(attrs.buildNote);

  return { score: Math.round(score * 10) / 10, reasoning: parts.join(" \u00B7 ") };
}

// ─── Dead perk detection ────────────────────────────────────────

interface LoadoutContext {
  hasShield: boolean;
  hasMelee: boolean;
  hasRangedOnly: boolean;
  buildClass: BuildClass;
  isSolo: boolean;
  survivability: number;
}

function detectDeadPerks(
  skillNodes: SkillNode[],
  allocations: Record<string, number>,
  context: LoadoutContext,
): DeadPerkWarning[] {
  const warnings: DeadPerkWarning[] = [];

  for (const node of skillNodes) {
    const current = allocations[node.id] ?? 0;
    if (current === 0) continue; // only check allocated nodes

    const attrs = getNodeAttributes(node.id);
    if (!attrs) continue;

    const nodeName = loc(node.name) || node.id;

    for (const tag of attrs.tags) {
      const warning = checkTag(tag, nodeName, node.id, current, context);
      if (warning) {
        warnings.push(warning);
        break; // one warning per node
      }
    }
  }

  return warnings;
}

function checkTag(
  tag: SkillTag,
  nodeName: string,
  nodeId: string,
  allocatedPoints: number,
  ctx: LoadoutContext,
): DeadPerkWarning | null {
  switch (tag) {
    case "shield_synergy":
      if (!ctx.hasShield) {
        return {
          nodeId, nodeName, allocatedPoints,
          severity: "wasted",
          reason: "No shield equipped \u2014 bonus inactive",
        };
      }
      break;

    case "stealth":
      if (ctx.buildClass === "DPS" || ctx.buildClass === "Tank") {
        return {
          nodeId, nodeName, allocatedPoints,
          severity: "suboptimal",
          reason: "Stealth perks conflict with heavy loadout",
        };
      }
      break;

    case "melee":
      if (!ctx.hasMelee && ctx.hasRangedOnly) {
        return {
          nodeId, nodeName, allocatedPoints,
          severity: "suboptimal",
          reason: "Melee perks unused with ranged weapons",
        };
      }
      break;

    case "looting":
      if (ctx.buildClass === "DPS") {
        return {
          nodeId, nodeName, allocatedPoints,
          severity: "suboptimal",
          reason: "Low-value for combat-first builds",
        };
      }
      break;

    case "team_support":
      if (ctx.isSolo) {
        return {
          nodeId, nodeName, allocatedPoints,
          severity: "suboptimal",
          reason: "Team perks have no value solo",
        };
      }
      break;

    case "downed":
      if (ctx.survivability < 30) {
        return {
          nodeId, nodeName, allocatedPoints,
          severity: "suboptimal",
          reason: "Consider defensive perks instead",
        };
      }
      break;
  }
  return null;
}

// ─── Hook ───────────────────────────────────────────────────────

export function useBuildAdvisor(
  items: MetaForgeItem[],
  skillNodes: SkillNode[],
  skillAllocations: Record<string, number>,
  buildClass?: BuildClass,
  loadout?: Partial<Record<EquipmentSlot, MetaForgeItem | null>>,
  survivability?: number,
  isSolo?: boolean,
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

      // Skill recommendations — attribute-based scoring
      const weights = PLAYSTYLE_WEIGHTS[goal];
      const skillRecs: SkillRecommendation[] = [];

      for (const node of skillNodes) {
        const current = skillAllocations[node.id] ?? 0;
        const max = node.maxPoints ?? 1;
        if (current >= max) continue; // already maxed

        const { score, reasoning } = scoreSkillNode(node, weights, skillAllocations, skillNodes);
        if (score <= 0) continue;

        skillRecs.push({
          nodeId: node.id,
          nodeName: loc(node.name) || node.id,
          points: max,
          reasoning,
          branch: getBranchLabel(node.id),
          score,
        });
      }

      // Sort by score descending, take top 8
      skillRecs.sort((a, b) => b.score - a.score);

      // Dead perk detection
      const effectiveBuildClass = buildClass ?? "Hybrid";
      const context: LoadoutContext = {
        hasShield: loadout?.shield != null,
        hasMelee: false, // TODO: detect from weapon type when melee data available
        hasRangedOnly: loadout?.weapon != null,
        buildClass: effectiveBuildClass,
        isSolo: isSolo ?? true,
        survivability: survivability ?? 50,
      };
      const deadPerks = detectDeadPerks(skillNodes, skillAllocations, context);

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
        skillRecommendations: skillRecs.slice(0, 8),
        deadPerks,
        summary: summaries[goal],
      };
    };
  }, [items, skillNodes, skillAllocations, buildClass, loadout, survivability, isSolo]);

  /** Get skill recommendations using auto-detected build class instead of manual playstyle */
  const getAutoAdvice = useMemo(() => {
    if (!buildClass) return null;
    const weights = BUILD_CLASS_WEIGHTS[buildClass];

    const skillRecs: SkillRecommendation[] = [];
    for (const node of skillNodes) {
      const current = skillAllocations[node.id] ?? 0;
      const max = node.maxPoints ?? 1;
      if (current >= max) continue;

      const { score, reasoning } = scoreSkillNode(node, weights, skillAllocations, skillNodes);
      if (score <= 0) continue;

      skillRecs.push({
        nodeId: node.id,
        nodeName: loc(node.name) || node.id,
        points: max,
        reasoning,
        branch: getBranchLabel(node.id),
        score,
      });
    }
    skillRecs.sort((a, b) => b.score - a.score);

    const context: LoadoutContext = {
      hasShield: loadout?.shield != null,
      hasMelee: false,
      hasRangedOnly: loadout?.weapon != null,
      buildClass,
      isSolo: isSolo ?? true,
      survivability: survivability ?? 50,
    };
    const deadPerks = detectDeadPerks(skillNodes, skillAllocations, context);

    return { skillRecommendations: skillRecs.slice(0, 8), deadPerks, buildClass };
  }, [skillNodes, skillAllocations, buildClass, loadout, survivability, isSolo]);

  return { getAdvice, getAutoAdvice };
}
