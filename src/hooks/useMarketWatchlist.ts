/**
 * useMarketWatchlist — Watched items (LAMA watchlist pattern).
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getPriceHistory } from "../services/priceTracker";
import type { MarketWatchItem, PriceSnapshot } from "../types";

const STORAGE_KEY = "@arcview/watchlist";

export function useMarketWatchlist() {
  const [watchlist, setWatchlist] = useState<MarketWatchItem[]>([]);
  const [watchlistPrices, setWatchlistPrices] = useState<Record<string, number[]>>({});

  // Load watchlist from storage
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setWatchlist(JSON.parse(raw));
        } catch {}
      }
    }).catch(() => {});
  }, []);

  // Load prices for watched items
  useEffect(() => {
    if (watchlist.length === 0) return;
    let cancelled = false;
    (async () => {
      const prices: Record<string, number[]> = {};
      for (const item of watchlist) {
        try {
          const history = await getPriceHistory(item.itemId);
          prices[item.itemId] = history.map((s) => s.value);
        } catch {}
      }
      if (!cancelled) setWatchlistPrices(prices);
    })();
    return () => { cancelled = true; };
  }, [watchlist]);

  const persist = useCallback((updated: MarketWatchItem[]) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  }, []);

  const addToWatchlist = useCallback(
    (itemId: string, itemName: string) => {
      if (watchlist.some((w) => w.itemId === itemId)) return;
      const updated = [...watchlist, { itemId, itemName, addedAt: Date.now() }];
      setWatchlist(updated);
      persist(updated);
    },
    [watchlist, persist]
  );

  const removeFromWatchlist = useCallback(
    (itemId: string) => {
      const updated = watchlist.filter((w) => w.itemId !== itemId);
      setWatchlist(updated);
      persist(updated);
    },
    [watchlist, persist]
  );

  return {
    watchlist,
    watchlistPrices,
    addToWatchlist,
    removeFromWatchlist,
  };
}
