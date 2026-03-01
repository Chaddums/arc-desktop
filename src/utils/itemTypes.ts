/**
 * itemTypes — Centralized mapping between equipment slots, item browser
 * categories, and MetaForge API item_type values.
 *
 * API item_types observed: Weapon, Shield, Augment, Gadget, Throwable,
 * Quick Use, Consumable, Nature, Modification, Mods, Ammunition,
 * Blueprint, Key, Quest Item, Topside Material, Refined Material,
 * Advanced Material, Basic Material, Material, Recyclable, Trinket,
 * Cosmetic, Misc
 */

import type { EquipmentSlot } from "../hooks/useMyLoadout";

/** item_type substrings that belong to each equipment slot */
export const SLOT_TYPE_MAP: Record<EquipmentSlot, string[]> = {
  weapon: ["weapon"],
  shield: ["shield"],
  augment: ["augment"],
  gadget: ["gadget"],
  consumable: ["quick use", "consumable", "nature"],
  throwable: ["throwable"],
};

/** Check whether an item's item_type belongs to a given equipment slot */
export function matchesSlot(itemType: string, slot: EquipmentSlot): boolean {
  const t = itemType.toLowerCase();
  return SLOT_TYPE_MAP[slot].some((pattern) => t.includes(pattern));
}

/** Item browser category definitions — label shown in UI + item_type patterns */
export const BROWSER_CATEGORIES = [
  { label: "Weapon", patterns: ["weapon"] },
  { label: "Shield", patterns: ["shield"] },
  { label: "Augment", patterns: ["augment"] },
  { label: "Consumable", patterns: ["quick use", "consumable", "nature", "throwable"] },
  { label: "Mod", patterns: ["modification", "mods"] },
  { label: "Material", patterns: ["material"] },
  { label: "Key", patterns: ["key", "quest item"] },
];

/** Check whether an item_type matches a browser category label */
export function matchesBrowserCategory(itemType: string, categoryLabel: string): boolean {
  const cat = BROWSER_CATEGORIES.find((c) => c.label === categoryLabel);
  if (!cat) return false;
  const t = itemType.toLowerCase();
  return cat.patterns.some((p) => t.includes(p));
}
