/**
 * Price Tracker — Snapshot recording and history retrieval.
 * Pattern from LAMA's rateHistory.ts.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PriceSnapshot } from "../types";

const STORAGE_KEY = "@arcview/price_history";
const MAX_SNAPSHOTS_PER_ITEM = 100;

let priceCache: PriceSnapshot[] | null = null;

async function loadHistory(): Promise<PriceSnapshot[]> {
  if (priceCache) return priceCache;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    priceCache = raw ? JSON.parse(raw) : [];
  } catch {
    priceCache = [];
  }
  return priceCache!;
}

async function persistHistory(history: PriceSnapshot[]): Promise<void> {
  priceCache = history;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(history)).catch(() => {});
}

/** Record a price snapshot for an item */
export async function recordPrice(itemId: string, value: number): Promise<void> {
  const history = await loadHistory();

  // Don't record duplicate if last snapshot was same value within 1 hour
  const lastForItem = history
    .filter((s) => s.itemId === itemId)
    .sort((a, b) => b.timestamp - a.timestamp)[0];

  if (lastForItem && lastForItem.value === value && Date.now() - lastForItem.timestamp < 3600000) {
    return;
  }

  history.push({ timestamp: Date.now(), itemId, value });

  // Prune old entries per item
  const byItem = new Map<string, PriceSnapshot[]>();
  for (const snap of history) {
    const arr = byItem.get(snap.itemId) ?? [];
    arr.push(snap);
    byItem.set(snap.itemId, arr);
  }

  const pruned: PriceSnapshot[] = [];
  for (const [, snaps] of byItem) {
    const sorted = snaps.sort((a, b) => b.timestamp - a.timestamp);
    pruned.push(...sorted.slice(0, MAX_SNAPSHOTS_PER_ITEM));
  }

  await persistHistory(pruned);
}

/** Get price history for a specific item */
export async function getPriceHistory(itemId: string): Promise<PriceSnapshot[]> {
  const history = await loadHistory();
  return history
    .filter((s) => s.itemId === itemId)
    .sort((a, b) => a.timestamp - b.timestamp);
}

/** Get all price history */
export async function getAllPriceHistory(): Promise<PriceSnapshot[]> {
  const history = await loadHistory();
  return history.sort((a, b) => a.timestamp - b.timestamp);
}

/** Clear price history */
export async function clearPriceHistory(): Promise<void> {
  priceCache = [];
  await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}
