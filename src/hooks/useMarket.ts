/**
 * useMarket — Market tab state machine.
 * Wraps trader browser, price history, crafting profit, watchlist.
 */

import { useState, useEffect, useCallback } from "react";
import { fetchTraders } from "../services/metaforge";
import { fetchItemDetail } from "../services/ardb";
import { usePriceHistory } from "./usePriceHistory";
import { useMarketWatchlist } from "./useMarketWatchlist";
import { useCraftingProfit } from "./useCraftingProfit";
import type { Trader, MarketViewMode, ArdbItemDetail } from "../types";

export function useMarket() {
  const [viewMode, setViewMode] = useState<MarketViewMode>("traderList");
  const [traders, setTraders] = useState<Trader[]>([]);
  const [selectedTrader, setSelectedTrader] = useState<string | null>(null);
  const [traderSearch, setTraderSearch] = useState("");
  const [selectedPriceItem, setSelectedPriceItem] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ardb detail data for crafting profit
  const [ardbDetails, setArdbDetails] = useState<Map<string, ArdbItemDetail>>(new Map());
  const [ardbLoading, setArdbLoading] = useState(false);

  const priceHistory = usePriceHistory();
  const watchlist = useMarketWatchlist();
  const { profits: craftingProfits } = useCraftingProfit(ardbDetails);

  const loadTraders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTraders();
      setTraders(Array.isArray(data) ? data : []);

      // Record price snapshots for all trader items
      for (const trader of data) {
        for (const item of trader.inventory) {
          if (item.trader_price != null) {
            priceHistory.record(item.id, item.trader_price);
          }
        }
      }
    } catch (e: any) {
      setError(e.message || "Failed to load traders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTraders();
  }, [loadTraders]);

  // Lazy-load ardb details when crafting profit view is opened
  const loadArdbDetails = useCallback(async () => {
    if (ardbDetails.size > 0 || ardbLoading || traders.length === 0) return;
    setArdbLoading(true);
    const allItemIds = new Set<string>();
    for (const trader of traders) {
      for (const item of trader.inventory) {
        allItemIds.add(item.id);
      }
    }
    const detailMap = new Map<string, ArdbItemDetail>();
    const ids = [...allItemIds];
    for (let i = 0; i < Math.min(ids.length, 60); i += 5) {
      const batch = ids.slice(i, i + 5);
      const results = await Promise.allSettled(batch.map((id) => fetchItemDetail(id)));
      for (const result of results) {
        if (result.status === "fulfilled") {
          detailMap.set(result.value.id, result.value);
        }
      }
    }
    setArdbDetails(new Map(detailMap));
    setArdbLoading(false);
  }, [traders, ardbDetails.size, ardbLoading]);

  // Trigger ardb load when entering crafting profit view
  const setViewModeWrapped = useCallback(
    (mode: MarketViewMode) => {
      setViewMode(mode);
      if (mode === "craftingProfit") {
        loadArdbDetails();
      }
    },
    [loadArdbDetails],
  );

  const goBack = useCallback(() => {
    switch (viewMode) {
      case "traderInventory":
      case "priceHistory":
      case "craftingProfit":
      case "watchlist":
        setSelectedTrader(null);
        setTraderSearch("");
        setViewMode("traderList");
        break;
      case "itemPriceDetail":
        setSelectedPriceItem(null);
        setViewMode("priceHistory");
        break;
      default:
        setViewMode("traderList");
    }
  }, [viewMode]);

  const refresh = useCallback(async () => {
    await loadTraders();
    await priceHistory.refresh();
  }, [loadTraders, priceHistory.refresh]);

  return {
    viewMode,
    setViewMode: setViewModeWrapped,
    // Traders
    traders,
    selectedTrader,
    setSelectedTrader,
    traderSearch,
    setTraderSearch,
    // Price history
    priceHistory: priceHistory.history,
    selectedPriceItem,
    setSelectedPriceItem,
    // Crafting profit
    craftingProfits,
    ardbLoading,
    // Watchlist
    watchlist: watchlist.watchlist,
    addToWatchlist: watchlist.addToWatchlist,
    removeFromWatchlist: watchlist.removeFromWatchlist,
    watchlistPrices: watchlist.watchlistPrices,
    // Common
    loading,
    error,
    goBack,
    refresh,
  };
}
