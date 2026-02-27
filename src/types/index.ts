/**
 * ARC View Types — All shared interfaces for Arc Raiders data.
 */

// ─── Common ─────────────────────────────────────────────────────

export interface LocalizedString {
  en: string;
  [locale: string]: string;
}

// ─── MetaForge ──────────────────────────────────────────────────

export interface StatBlock {
  damage?: number;
  fireRate?: number;
  magazineSize?: number;
  range?: number;
  stability?: number;
  agility?: number;
  stealth?: number;
  weight?: number;
  [key: string]: number | undefined;
}

export interface MetaForgeItem {
  id: string;
  name: string;
  description?: string;
  item_type: string;
  rarity?: string;
  value?: number;
  icon?: string;
  stat_block?: StatBlock;
  workbench?: string;
  loadout_slots?: string[];
}

export interface GameEvent {
  name: string;
  map: string;
  icon?: string;
  startTime: number;
  endTime: number;
}

export interface TraderInventoryItem {
  id: string;
  name: string;
  rarity?: string;
  value?: number;
  trader_price?: number;
  icon?: string;
  item_type?: string;
}

export interface Trader {
  id: string;
  name: string;
  inventory: TraderInventoryItem[];
}

// ─── RaidTheory ─────────────────────────────────────────────────

export interface Bot {
  id: string;
  name: LocalizedString;
  type?: string;
  threat?: string;
  weakness?: string;
  maps: string[];
  drops: string[];
  destroyXp?: number;
  lootXp?: number;
}

export interface GameMap {
  id: string;
  name: LocalizedString;
  image?: string;
}

export interface Trade {
  trader: string;
  itemId: string;
  quantity: number;
  cost: { itemId: string; quantity: number }[];
  dailyLimit?: number;
}

export interface SkillNode {
  id: string;
  name: LocalizedString;
  category?: string;
  isMajor?: boolean;
  maxPoints?: number;
  position?: { x: number; y: number };
  prerequisiteNodeIds?: string[];
}

export interface StationRequirement {
  itemId: string;
  itemName?: string;
  quantity: number;
}

export interface StationLevel {
  level: number;
  requirements: StationRequirement[];
  requirementItemIds?: StationRequirement[];
}

export interface CraftingStation {
  id: string;
  name: LocalizedString;
  maxLevel?: number;
  levels: StationLevel[];
}

export interface RaidTheoryQuest {
  id: string;
  name: LocalizedString;
  trader?: string;
  objectives?: string[];
  previousQuestIds: string[];
  nextQuestIds: string[];
  xp?: number;
}

// ─── ardb.app ───────────────────────────────────────────────────

export interface ArdbCraftingRequirement {
  itemId: string;
  itemName: string;
  quantity: number;
}

export interface ArdbItemDetail {
  id: string;
  name: string;
  craftingRequirement?: ArdbCraftingRequirement[];
  breaksInto?: { itemId: string; quantity: number }[];
  weaponSpecs?: Record<string, number>;
  variants?: string[];
  foundIn?: string[];
}

export interface ArdbQuestStep {
  description: string;
  type?: string;
}

export interface ArdbQuest {
  id: string;
  title: string;
  trader?: { name: string; type?: string };
  steps?: ArdbQuestStep[];
  requiredItems?: { itemId: string; itemName: string; quantity: number }[];
  xpReward?: number;
}

// ─── App State Types ────────────────────────────────────────────

export type StationId =
  | "weapon_bench"
  | "equipment_bench"
  | "explosives_bench"
  | "med_station"
  | "refiner"
  | "scrappy"
  | "stash"
  | "utility_bench"
  | "workbench";

export type CraftingViewMode =
  | "stationSelect"
  | "stationDetail"
  | "itemDetail"
  | "shoppingList";

export type QuestsViewMode =
  | "traderList"
  | "questChain"
  | "questDetail";

// ─── View Modes ─────────────────────────────────────────────────

export type IntelViewMode =
  | "dashboard"
  | "eventList"
  | "mapDetail"
  | "enemyList"
  | "enemyDetail"
  | "routePlanner"
  | "routeDetail";

export type LoadoutViewMode =
  | "itemBrowser"
  | "itemDetail"
  | "itemCompare"
  | "skillTree"
  | "skillDetail"
  | "damageSim"
  | "advisor"
  | "riskScore"
  | "raidLog"
  | "buildAdvisor"
  | "stashOrganizer";

export type MarketViewMode =
  | "traderList"
  | "traderInventory"
  | "priceHistory"
  | "itemPriceDetail"
  | "craftingProfit"
  | "watchlist";

export type MissionsViewMode =
  | "traderList"
  | "questChain"
  | "questDetail"
  | "hideoutOverview"
  | "stationDetail"
  | "shoppingList"
  | "dailyOptimizer";

export type MoreViewMode =
  | "menu"
  | "account"
  | "squad"
  | "squadMember"
  | "settings"
  | "about";

// ─── Route Planner ──────────────────────────────────────────────

export interface Waypoint {
  id: string;
  mapId: string;
  zoneName?: string;
  notes?: string;
  estimatedMinutes?: number;
  lootTargets?: string[];
}

export interface SavedRoute {
  id: string;
  name: string;
  mapId: string;
  waypoints: Waypoint[];
  lootPerMinute?: number;
  createdAt: number;
}

// ─── Damage Sim ─────────────────────────────────────────────────

export interface DamageCalcInput {
  weaponDamage: number;
  fireRate: number;
  magazineSize: number;
  reloadTime?: number;
  targetHealth?: number;
  targetWeakness?: string;
}

export interface DamageCalcOutput {
  dps: number;
  damagePerHit: number;
  ttk: number | null;
  magDumpDamage: number;
  effectiveDps: number;
}

// ─── Advisor ────────────────────────────────────────────────────

export type AdvisorVerdict = "keep" | "sell" | "recycle";

export interface AdvisorResult {
  verdict: AdvisorVerdict;
  sellValue: number;
  recycleYields: {
    itemId: string;
    itemName: string;
    quantity: number;
    estimatedValue: number;
  }[];
  totalRecycleValue: number;
  reasoning: string;
  craftingUses: string[];
}

// ─── Stash Organizer ────────────────────────────────────────────

export interface StashVerdict {
  item: MetaForgeItem;
  verdict: AdvisorVerdict;
  reasoning: string;
  sellValue: number;
  recycleValue: number;
  craftingUses: string[];
  recycleYields: { itemName: string; quantity: number }[];
}

// ─── Price Tracking ─────────────────────────────────────────────

export interface PriceSnapshot {
  timestamp: number;
  itemId: string;
  value: number;
}

export interface MarketWatchItem {
  itemId: string;
  itemName: string;
  addedAt: number;
}

// ─── Crafting Profit ────────────────────────────────────────────

export interface CraftingProfitResult {
  itemName: string;
  costs: {
    itemId: string;
    itemName: string;
    quantity: number;
    unitValue: number;
    totalValue: number;
  }[];
  totalCost: number;
  sellValue: number;
  profitMargin: number;
  profitable: boolean;
}

// ─── Raid Log (UNIQUE) ─────────────────────────────────────────

export type RaidOutcome = "extracted" | "died" | "partial";

export interface RaidEntry {
  id: string;
  date: number;
  mapId: string;
  loadout: string[];
  outcome: RaidOutcome;
  lootValue?: number;
  notes?: string;
}

export interface LoadoutStats {
  loadoutKey: string;
  items: string[];
  totalRaids: number;
  extractions: number;
  successRate: number;
  avgLootValue: number;
}

export interface MapStats {
  mapId: string;
  totalRaids: number;
  extractions: number;
  successRate: number;
}

// ─── Risk Score (UNIQUE) ────────────────────────────────────────

export interface RiskAssessment {
  score: number;
  factors: { label: string; impact: number; detail: string }[];
  recommendation: string;
}

// ─── Squad ──────────────────────────────────────────────────────

export interface SquadMember {
  accountId: string;
  displayName: string;
  isOnline: boolean;
  lastSeen: number;
  loadoutSummary?: string;
  suggestedRole?: string;
  activeQuestIds?: string[];
  completedQuestIds?: string[];
}

export interface SquadInfo {
  id: string;
  code: string;
  members: SquadMember[];
  createdAt: number;
}

// ─── KPI ────────────────────────────────────────────────────────

export interface KPICell {
  label: string;
  value: string;
  color?: string;
}
