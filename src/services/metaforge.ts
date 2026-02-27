/**
 * MetaForge API — Items, traders, event schedule for Arc Raiders.
 * Base: https://metaforge.app/api/arc-raiders
 */

import type { MetaForgeItem, GameEvent, Trader } from "../types";
import { crossFetch } from "../utils/fetch";

const BASE_URL = "https://metaforge.app/api/arc-raiders";
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

/** Clear all service caches (called from About screen) */
export function clearAllCaches(): void {
  cache.clear();
  // Import other services dynamically to avoid circular deps
  try {
    const rt = require("./raidtheory");
    rt.clearCache?.();
  } catch {}
  try {
    const ardb = require("./ardb");
    ardb.clearCache?.();
  } catch {}
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchJSON<T>(path: string, retries = 3): Promise<T> {
  const url = `${BASE_URL}${path}`;
  for (let attempt = 0; attempt < retries; attempt++) {
    const resp = await crossFetch(url);
    if (resp.status === 429) {
      const wait = Math.min(2000 * 2 ** attempt, 10000);
      console.warn(`MetaForge ${path}: 429 — retrying in ${wait}ms`);
      await delay(wait);
      continue;
    }
    if (!resp.ok) throw new Error(`MetaForge ${path}: ${resp.status}`);
    return resp.json();
  }
  throw new Error(`MetaForge ${path}: 429 after ${retries} retries`);
}

/** Fetch items page (50 per page) */
export async function fetchItems(page = 1): Promise<MetaForgeItem[]> {
  const key = `items_p${page}`;
  const cached = getCached<MetaForgeItem[]>(key);
  if (cached) return cached;

  const raw = await fetchJSON<any>(`/items?page=${page}`);
  const data: MetaForgeItem[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
  setCache(key, data);
  return data;
}

/** Fetch all items across all pages */
export async function fetchAllItems(): Promise<MetaForgeItem[]> {
  const key = "items_all";
  const cached = getCached<MetaForgeItem[]>(key);
  if (cached) return cached;

  const allItems: MetaForgeItem[] = [];
  let page = 1;
  while (true) {
    if (page > 1) await delay(500);
    const items = await fetchItems(page);
    if (!items || items.length === 0) break;
    allItems.push(...items);
    if (items.length < 50) break;
    page++;
  }

  setCache(key, allItems);
  return allItems;
}

/** Fetch traders with inventories */
export async function fetchTraders(): Promise<Trader[]> {
  const key = "traders";
  const cached = getCached<Trader[]>(key);
  if (cached) return cached;

  const raw = await fetchJSON<any>("/traders");
  // API returns { success, data: { Apollo: [...], Celeste: [...], ... } }
  const traderMap = raw?.data ?? raw;
  const data: Trader[] = Object.entries(traderMap).map(([name, inventory]) => ({
    id: name.toLowerCase(),
    name,
    inventory: Array.isArray(inventory) ? inventory as any[] : [],
  }));
  setCache(key, data);
  return data;
}

/** Fetch event schedule */
export async function fetchEventsSchedule(): Promise<GameEvent[]> {
  const key = "events";
  const cached = getCached<GameEvent[]>(key);
  if (cached) return cached;

  const raw = await fetchJSON<any>("/events-schedule");
  // API returns { data: [...], cachedAt } wrapper
  const data: GameEvent[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
  setCache(key, data);
  return data;
}
