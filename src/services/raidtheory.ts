/**
 * RaidTheory GitHub Data — Bots, maps, quests, hideout stations, skill tree.
 * Base: https://raw.githubusercontent.com/RaidTheory/arcraiders-data/main
 */

import type {
  Bot,
  GameMap,
  Trade,
  SkillNode,
  CraftingStation,
  RaidTheoryQuest,
} from "../types";
import { crossFetch } from "../utils/fetch";

const BASE_URL =
  "https://raw.githubusercontent.com/RaidTheory/arcraiders-data/main";
const CACHE_TTL = 15 * 60 * 1000;
const QUEST_CACHE_TTL = 60 * 60 * 1000; // 1hr for quests (batch fetch)

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string, ttl = CACHE_TTL): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > ttl) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export function clearCache(): void {
  cache.clear();
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchJSON<T>(path: string, retries = 3): Promise<T> {
  const url = `${BASE_URL}/${path}`;
  for (let attempt = 0; attempt < retries; attempt++) {
    const resp = await crossFetch(url);
    if (resp.status === 429) {
      const wait = Math.min(2000 * 2 ** attempt, 10000);
      console.warn(`RaidTheory ${path}: 429 — retrying in ${wait}ms`);
      await delay(wait);
      continue;
    }
    if (!resp.ok) throw new Error(`RaidTheory ${path}: ${resp.status}`);
    return resp.json();
  }
  throw new Error(`RaidTheory ${path}: 429 after ${retries} retries`);
}

/** Fetch bots (16 enemies with threat, drops, maps, XP, weakness) */
export async function fetchBots(): Promise<Bot[]> {
  const key = "bots";
  const cached = getCached<Bot[]>(key);
  if (cached) return cached;

  const data = await fetchJSON<Bot[]>("bots.json");
  setCache(key, data);
  return data;
}

/** Fetch maps (6 maps with localized names) */
export async function fetchMaps(): Promise<GameMap[]> {
  const key = "maps";
  const cached = getCached<GameMap[]>(key);
  if (cached) return cached;

  const data = await fetchJSON<GameMap[]>("maps.json");
  setCache(key, data);
  return data;
}

/** Fetch trades (153 trades with costs + daily limits) */
export async function fetchTrades(): Promise<Trade[]> {
  const key = "trades";
  const cached = getCached<Trade[]>(key);
  if (cached) return cached;

  const data = await fetchJSON<Trade[]>("trades.json");
  setCache(key, data);
  return data;
}

/** Fetch skill nodes (47 nodes with prerequisites, positions) */
export async function fetchSkillNodes(): Promise<SkillNode[]> {
  const key = "skillNodes";
  const cached = getCached<SkillNode[]>(key);
  if (cached) return cached;

  const data = await fetchJSON<SkillNode[]>("skillNodes.json");
  setCache(key, data);
  return data;
}

/** Fetch a single hideout station by ID */
export async function fetchHideoutStation(
  id: string
): Promise<CraftingStation> {
  const key = `hideout_${id}`;
  const cached = getCached<CraftingStation>(key);
  if (cached) return cached;

  const raw = await fetchJSON<any>(`hideout/${id}.json`);
  // Normalize: API uses "requirementItemIds", we use "requirements"
  const data: CraftingStation = {
    ...raw,
    levels: (raw.levels || []).map((lvl: any) => ({
      level: lvl.level,
      requirements: (lvl.requirements || lvl.requirementItemIds || []).map(
        (r: any) => ({
          itemId: r.itemId,
          itemName: r.itemName || r.itemId.replace(/_/g, " "),
          quantity: r.quantity,
        })
      ),
    })),
  };
  setCache(key, data);
  return data;
}

/** Fetch all 9 hideout stations in parallel */
export async function fetchAllHideoutStations(): Promise<CraftingStation[]> {
  const key = "hideout_all";
  const cached = getCached<CraftingStation[]>(key);
  if (cached) return cached;

  const stationIds = [
    "weapon_bench",
    "equipment_bench",
    "explosives_bench",
    "med_station",
    "refiner",
    "scrappy",
    "stash",
    "utility_bench",
    "workbench",
  ];

  // Fetch stations sequentially to avoid rate limits
  const stations: (CraftingStation | null)[] = [];
  for (const id of stationIds) {
    if (stations.length > 0) await delay(300);
    stations.push(await fetchHideoutStation(id).catch(() => null));
  }

  const valid = stations.filter(Boolean) as CraftingStation[];
  setCache(key, valid);
  return valid;
}

/** Fetch all quests via GitHub API directory listing → batch fetch */
export async function fetchAllQuests(): Promise<RaidTheoryQuest[]> {
  const key = "quests_all";
  const cached = getCached<RaidTheoryQuest[]>(key, QUEST_CACHE_TTL);
  if (cached) return cached;

  // Get directory listing from GitHub API (with retry for rate limits)
  let dirEntries: { name: string; download_url: string }[] = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    const dirResp = await crossFetch(
      "https://api.github.com/repos/RaidTheory/arcraiders-data/contents/quests"
    );
    if (dirResp.status === 403 || dirResp.status === 429) {
      const wait = Math.min(3000 * 2 ** attempt, 15000);
      console.warn(`GitHub quests dir: ${dirResp.status} — retrying in ${wait}ms`);
      await delay(wait);
      continue;
    }
    if (!dirResp.ok) throw new Error(`GitHub quests dir: ${dirResp.status}`);
    dirEntries = await dirResp.json();
    break;
  }

  const jsonFiles = dirEntries.filter((e) => e.name.endsWith(".json"));

  // Batch fetch with concurrency limit of 5 + delay between batches
  const quests: RaidTheoryQuest[] = [];
  for (let i = 0; i < jsonFiles.length; i += 5) {
    if (i > 0) await delay(500);
    const batch = jsonFiles.slice(i, i + 5);
    const results = await Promise.all(
      batch.map(async (file) => {
        try {
          const resp = await crossFetch(file.download_url);
          if (!resp.ok) return null;
          return resp.json() as Promise<RaidTheoryQuest>;
        } catch {
          return null;
        }
      })
    );
    quests.push(...(results.filter(Boolean) as RaidTheoryQuest[]));
  }

  setCache(key, quests);
  return quests;
}
