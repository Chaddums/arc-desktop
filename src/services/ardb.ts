/**
 * ardb.app API — Item detail, crafting recipes, quest data.
 * Base: https://ardb.app/api
 */

import type { ArdbItemDetail, ArdbQuest } from "../types";
import { crossFetch } from "../utils/fetch";

const BASE_URL = "https://ardb.app/api";
const CACHE_TTL = 15 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
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

async function fetchJSON<T>(path: string): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const resp = await crossFetch(url);
  if (!resp.ok) throw new Error(`ardb ${path}: ${resp.status}`);
  return resp.json();
}

/** Fetch detailed item info (crafting recipe, recycling, weapon specs, variants) */
export async function fetchItemDetail(id: string): Promise<ArdbItemDetail> {
  const key = `item_${id}`;
  const cached = getCached<ArdbItemDetail>(key);
  if (cached) return cached;

  const data = await fetchJSON<ArdbItemDetail>(`/items/${id}`);
  setCache(key, data);
  return data;
}

/** Fetch all quests with full trader objects, steps, required items */
export async function fetchQuests(): Promise<ArdbQuest[]> {
  const key = "quests";
  const cached = getCached<ArdbQuest[]>(key);
  if (cached) return cached;

  const data = await fetchJSON<ArdbQuest[]>("/quests");
  setCache(key, data);
  return data;
}
