/**
 * useMarket — Market tab state machine.
 * Wraps trader browser, price history, crafting profit, watchlist.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { fetchTraders } from "../services/metaforge";
import { usePriceHistory } from "./usePriceHistory";
import { useMarketWatchlist } from "./useMarketWatchlist";
import type { Trader, MarketViewMode, CraftingProfitResult, ArdbItemDetail } from "../types";

export function useMarket() {
  const [viewMode, setViewMode] = useState<MarketViewMode>("traderList");
  const [traders, setTraders] = useState<Trader[]>([]);
  const [selectedTrader, setSelectedTrader] = useState<string | null>(null);
  const [traderSearch, setTraderSearch] = useState("");
  const [selectedPriceItem, setSelectedPriceItem] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priceHistory = usePriceHistory();
  const watchlist = useMarketWatchlist();

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

  // Placeholder crafting profits (would need ardb data for real calculation)
  const craftingProfits = useMemo<CraftingProfitResult[]>(() => [], []);

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
    setViewMode,
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
