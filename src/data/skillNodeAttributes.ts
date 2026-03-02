/**
 * skillNodeAttributes — Hand-authored build relevance mapping for all skill nodes.
 * Replaces keyword matching with semantic scoring for accurate build recommendations.
 *
 * Scores: 0-10 per archetype (dps/tank/support/stealth).
 * Tags: enable dead perk detection by cross-referencing equipped items.
 */

export type SkillTag =
  | "shield_synergy"
  | "encumbrance"
  | "explosive"
  | "melee"
  | "stealth"
  | "looting"
  | "crafting"
  | "downed"
  | "team_support"
  | "stamina"
  | "mobility"
  | "health"
  | "combat"
  | "vaulting"
  | "climbing"
  | "sliding"
  | "crouch"
  | "recycling";

export interface SkillNodeAttributes {
  dps: number;      // 0-10: how much this helps DPS builds
  tank: number;     // 0-10: how much this helps Tank builds
  support: number;  // 0-10: how much this helps Support/mobility builds
  stealth: number;  // 0-10: how much this helps stealth/farming builds
  tags: SkillTag[];
  buildNote: string;
}

// ─── CONDITIONING Branch ──────────────────────────────────────

const CONDITIONING: Record<string, SkillNodeAttributes> = {
  cond_1: {
    // Used To The Weight — shield doesn't slow you
    dps: 6, tank: 9, support: 2, stealth: 0,
    tags: ["shield_synergy", "encumbrance"],
    buildNote: "Essential for shield users — eliminates shield move penalty",
  },
  cond_2l: {
    // Blast-Born — reduced explosive self-damage
    dps: 5, tank: 7, support: 1, stealth: 0,
    tags: ["explosive", "combat"],
    buildNote: "Lets you use explosives aggressively without self-harm",
  },
  cond_2r: {
    // Gentle Pressure — interact faster while crouched
    dps: 1, tank: 2, support: 4, stealth: 7,
    tags: ["stealth", "looting", "crouch"],
    buildNote: "Faster looting while staying hidden — great for stealth runs",
  },
  cond_3l: {
    // Fight Or Flight — stamina regen boost after taking damage
    dps: 7, tank: 6, support: 3, stealth: 0,
    tags: ["stamina", "combat"],
    buildNote: "Keeps you mobile in firefights — synergizes with aggressive play",
  },
  cond_3r: {
    // Proficient Pryer — faster door/container opening
    dps: 1, tank: 1, support: 3, stealth: 6,
    tags: ["looting", "stealth"],
    buildNote: "Speed up looting interactions — valuable for farming runs",
  },
  cond_4l: {
    // Survivor's Stamina — increased max stamina
    dps: 6, tank: 5, support: 7, stealth: 4,
    tags: ["stamina", "mobility"],
    buildNote: "More stamina for sprinting, dodging, and vaulting — universally useful",
  },
  cond_4r: {
    // Unburdened Roll — dodge roll costs less stamina
    dps: 5, tank: 4, support: 7, stealth: 3,
    tags: ["stamina", "mobility"],
    buildNote: "Cheaper dodge rolls — great for mobile combat and evasion",
  },
  cond_5c: {
    // A Little Extra — increased carry capacity
    dps: 1, tank: 2, support: 3, stealth: 8,
    tags: ["looting", "encumbrance"],
    buildNote: "More carry capacity for extended farming runs",
  },
};

// ─── MOBILITY Branch ──────────────────────────────────────────

const MOBILITY: Record<string, SkillNodeAttributes> = {
  mob_1: {
    // Nimble Climber — climb faster
    dps: 4, tank: 2, support: 8, stealth: 5,
    tags: ["climbing", "mobility"],
    buildNote: "Faster climbing — key for mobility-focused playstyles",
  },
  mob_2l: {
    // Marathon Runner — sprint longer before fatigue
    dps: 5, tank: 2, support: 8, stealth: 6,
    tags: ["stamina", "mobility"],
    buildNote: "Extended sprint duration for repositioning and escapes",
  },
  mob_2r: {
    // Slip and Slide — slide further
    dps: 4, tank: 2, support: 7, stealth: 3,
    tags: ["sliding", "mobility"],
    buildNote: "Longer slides for covering distance and evading fire",
  },
  mob_3l: {
    // Youthful Lungs — faster stamina regen while sprinting
    dps: 5, tank: 2, support: 8, stealth: 5,
    tags: ["stamina", "mobility"],
    buildNote: "Sustain sprinting longer — excellent for roaming builds",
  },
  mob_3r: {
    // Sturdy Ankles — reduced fall damage
    dps: 2, tank: 4, support: 6, stealth: 5,
    tags: ["mobility"],
    buildNote: "Take shortcuts via drops without health penalty",
  },
  mob_4l: {
    // Carry The Momentum — maintain speed after actions
    dps: 5, tank: 2, support: 9, stealth: 4,
    tags: ["mobility", "combat"],
    buildNote: "Stay fast while fighting — excellent for hit-and-run tactics",
  },
  mob_4r: {
    // Calming Stroll — regen stamina while walking
    dps: 2, tank: 3, support: 7, stealth: 6,
    tags: ["stamina", "mobility"],
    buildNote: "Passive stamina regen during downtime — great for sustained movement",
  },
  mob_5c: {
    // Crawl Before You Walk — faster crawl speed
    dps: 1, tank: 3, support: 3, stealth: 7,
    tags: ["stealth", "crouch", "downed"],
    buildNote: "Faster prone movement — useful for stealth and when downed",
  },
  mob_5l: {
    // Effortless Roll — faster dodge roll recovery
    dps: 6, tank: 4, support: 7, stealth: 2,
    tags: ["mobility", "combat"],
    buildNote: "Quicker recovery after dodging — improves combat survivability",
  },
  mob_5r: {
    // Off The Wall — wall-jump ability
    dps: 3, tank: 1, support: 8, stealth: 4,
    tags: ["mobility", "climbing"],
    buildNote: "Unique traversal option — reach otherwise inaccessible spots",
  },
  mob_6c: {
    // Vigorous Vaulter — vault over obstacles faster
    dps: 3, tank: 2, support: 7, stealth: 4,
    tags: ["vaulting", "mobility"],
    buildNote: "Faster vaults for fluid movement through terrain",
  },
  mob_6l: {
    // Heroic Leap — longer jump distance
    dps: 3, tank: 1, support: 8, stealth: 3,
    tags: ["mobility"],
    buildNote: "Extended jump range for gap crossing and shortcuts",
  },
  mob_6r: {
    // Ready To Roll — dodge roll available sooner after landing
    dps: 5, tank: 3, support: 7, stealth: 2,
    tags: ["mobility", "combat"],
    buildNote: "Chain movement abilities faster — aggressive mobility",
  },
  mob_7l: {
    // Vaults on Vaults on Vaults — chain vaults without slowing
    dps: 3, tank: 1, support: 9, stealth: 4,
    tags: ["vaulting", "mobility"],
    buildNote: "Seamless vault chains — peak mobility perk",
  },
  mob_7r: {
    // Vault Spring — gain speed boost after vaulting
    dps: 4, tank: 1, support: 9, stealth: 4,
    tags: ["vaulting", "mobility"],
    buildNote: "Speed boost from vaults — great for aggressive pushes or escapes",
  },
};

// ─── SURVIVAL Branch ──────────────────────────────────────────

const SURVIVAL: Record<string, SkillNodeAttributes> = {
  surv_1: {
    // Agile Croucher — faster crouch movement
    dps: 2, tank: 3, support: 4, stealth: 8,
    tags: ["stealth", "crouch", "mobility"],
    buildNote: "Core stealth perk — move quickly while staying hidden",
  },
  surv_2l: {
    // Looter's Instincts — see loot through walls briefly
    dps: 0, tank: 0, support: 2, stealth: 9,
    tags: ["looting", "stealth"],
    buildNote: "Locate loot faster — essential for efficient farming",
  },
  surv_2r: {
    // Revitalizing Squat — regen health while crouched
    dps: 1, tank: 6, support: 3, stealth: 5,
    tags: ["health", "crouch", "stealth"],
    buildNote: "Passive healing while crouched — good for patient playstyles",
  },
  surv_3l: {
    // Silent Scavenger — quieter looting
    dps: 0, tank: 0, support: 1, stealth: 8,
    tags: ["stealth", "looting"],
    buildNote: "Loot without alerting nearby enemies — stealth farming essential",
  },
  surv_3r: {
    // In-Round Crafting — craft during raids
    dps: 3, tank: 4, support: 5, stealth: 3,
    tags: ["crafting"],
    buildNote: "Craft items mid-raid — versatile utility for any build",
  },
  surv_4l: {
    // Portable Workbench — expanded in-raid crafting options
    dps: 2, tank: 3, support: 5, stealth: 4,
    tags: ["crafting", "looting"],
    buildNote: "More crafting recipes available in-raid — pairs with In-Round Crafting",
  },
  surv_4r: {
    // Efficient Crafter — less materials per craft
    dps: 2, tank: 3, support: 4, stealth: 5,
    tags: ["crafting", "recycling"],
    buildNote: "Stretch your materials further — good for economy-focused play",
  },
  surv_5c: {
    // Resourceful — chance to not consume crafting materials
    dps: 2, tank: 2, support: 4, stealth: 6,
    tags: ["crafting"],
    buildNote: "RNG material savings — value increases with more crafting",
  },
  surv_5l: {
    // Recycler — get more from recycling items
    dps: 0, tank: 0, support: 2, stealth: 7,
    tags: ["recycling", "looting"],
    buildNote: "Better recycling yields — maximizes value from found items",
  },
  surv_5r: {
    // Craftmaster — crafted items have bonus stats
    dps: 5, tank: 5, support: 4, stealth: 2,
    tags: ["crafting"],
    buildNote: "Crafted gear gets stat bonuses — benefits any equipment-focused build",
  },
  surv_6c: {
    // Practiced Hand — faster crafting speed
    dps: 2, tank: 2, support: 4, stealth: 4,
    tags: ["crafting"],
    buildNote: "Craft faster in-raid — less time exposed while crafting",
  },
  surv_6l: {
    // Material Harvester — bonus materials from harvesting
    dps: 0, tank: 0, support: 2, stealth: 8,
    tags: ["looting", "recycling"],
    buildNote: "More materials from harvest nodes — farming efficiency boost",
  },
  surv_6r: {
    // Salvage Expert — bonus from dismantling items
    dps: 0, tank: 1, support: 2, stealth: 7,
    tags: ["recycling", "looting"],
    buildNote: "Better dismantling returns — maximize item value extraction",
  },
  surv_7c: {
    // Fortified Reserves — bonus health/shield from crafted items
    dps: 3, tank: 7, support: 3, stealth: 1,
    tags: ["crafting", "health", "shield_synergy"],
    buildNote: "Crafted items give defensive bonuses — pairs with crafting tree for tanky builds",
  },
};

/** Complete skill node attributes mapping — all branches merged */
export const SKILL_NODE_ATTRIBUTES: Record<string, SkillNodeAttributes> = {
  ...CONDITIONING,
  ...MOBILITY,
  ...SURVIVAL,
};

/** Get attributes for a node, or undefined if unknown */
export function getNodeAttributes(nodeId: string): SkillNodeAttributes | undefined {
  return SKILL_NODE_ATTRIBUTES[nodeId];
}

/** Derive the branch label from a node ID prefix */
export function getBranchLabel(nodeId: string): string {
  if (nodeId.startsWith("cond_")) return "COND";
  if (nodeId.startsWith("mob_")) return "MOB";
  if (nodeId.startsWith("surv_")) return "SURV";
  return "???";
}
