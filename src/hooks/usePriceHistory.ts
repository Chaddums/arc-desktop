/**
 * usePriceHistory — Price snapshots + sparklines.
 * Pattern from LAMA's rateHistory.
 */

import { useState, useEffect, useCallback } from "react";
import { getAllPriceHistory, recordPrice } from "../services/priceTracker";
import type { PriceSnapshot } from "../types";

export function usePriceHistory() {
  const [history, setHistory] = useState<PriceSnapshot[]>([]);

  const loadHistory = useCallback(async () => {
    const data = await getAllPriceHistory();
    setHistory(data);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const record = useCallback(
    async (itemId: string, value: number) => {
      await recordPrice(itemId, value);
      await loadHistory();
    },
    [loadHistory]
  );

  return {
    history,
    record,
    refresh: loadHistory,
  };
}
