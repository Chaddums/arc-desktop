/**
 * DataCache — Shared two-tier cache (memory + AsyncStorage).
 * Extracted from duplicated pattern in metaforge/raidtheory/ardb.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

interface MemoryEntry<T> {
  data: T;
  timestamp: number;
}

interface DataCacheOptions {
  name: string;
  memoryTtl?: number;
  storageTtl?: number;
}

const DEFAULT_MEMORY_TTL = 15 * 60 * 1000;  // 15 min
const DEFAULT_STORAGE_TTL = 24 * 60 * 60 * 1000;  // 24 hr

export class DataCache {
  private name: string;
  private memoryTtl: number;
  private storageTtl: number;
  private memory = new Map<string, MemoryEntry<unknown>>();

  constructor({ name, memoryTtl, storageTtl }: DataCacheOptions) {
    this.name = name;
    this.memoryTtl = memoryTtl ?? DEFAULT_MEMORY_TTL;
    this.storageTtl = storageTtl ?? DEFAULT_STORAGE_TTL;
  }

  private storageKey(key: string): string {
    return `@arcview/cache/${this.name}/${key}`;
  }

  /** Get from memory cache (fast path) */
  get<T>(key: string): T | null {
    const entry = this.memory.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.memoryTtl) {
      this.memory.delete(key);
      return null;
    }
    return entry.data as T;
  }

  /** Set to both memory and AsyncStorage */
  set<T>(key: string, data: T): void {
    const now = Date.now();
    this.memory.set(key, { data, timestamp: now });
    AsyncStorage.setItem(
      this.storageKey(key),
      JSON.stringify({ data, timestamp: now })
    ).catch(() => {});
  }

  /** Get from cache or fetch, writing back to cache */
  async getOrFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    // Memory first
    const memCached = this.get<T>(key);
    if (memCached !== null) return memCached;

    // AsyncStorage second
    try {
      const raw = await AsyncStorage.getItem(this.storageKey(key));
      if (raw) {
        const parsed = JSON.parse(raw) as MemoryEntry<T>;
        if (Date.now() - parsed.timestamp < this.storageTtl) {
          // Restore to memory
          this.memory.set(key, parsed);
          return parsed.data;
        }
      }
    } catch {}

    // Fetch fresh
    const data = await fetcher();
    this.set(key, data);
    return data;
  }

  /** Hydrate memory from AsyncStorage (cold start) */
  async hydrate(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const prefix = `@arcview/cache/${this.name}/`;
      const relevant = allKeys.filter((k) => k.startsWith(prefix));
      if (relevant.length === 0) return;

      const pairs = await AsyncStorage.multiGet(relevant);
      for (const [fullKey, raw] of pairs) {
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw) as MemoryEntry<unknown>;
          if (Date.now() - parsed.timestamp < this.storageTtl) {
            const key = fullKey.replace(prefix, "");
            this.memory.set(key, parsed);
          }
        } catch {}
      }
    } catch {}
  }

  /** Clear both memory and AsyncStorage caches */
  async clear(): Promise<void> {
    this.memory.clear();
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const prefix = `@arcview/cache/${this.name}/`;
      const relevant = allKeys.filter((k) => k.startsWith(prefix));
      if (relevant.length > 0) {
        await AsyncStorage.multiRemove(relevant);
      }
    } catch {}
  }
}
