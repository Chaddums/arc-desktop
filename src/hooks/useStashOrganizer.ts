/**
 * useStashOrganizer — Bulk keep/sell/recycle verdict engine.
 * Fetches all items, runs advisor logic in batches, returns grouped verdicts.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchAllItems } from "../services/metaforge";
import { fetchItemDetail } from "../services/ardb";
import type {
  MetaForgeItem,
  AdvisorVerdict,
  StashVerdict,
  ArdbItemDetail,
} from "../types";

const BATCH_CONCURRENCY = 5;

export interface StashStats {
  keepCount: number;
  sellCount: number;
  recycleCount: number;
  totalSellValue: number;
  totalRecycleValue: number;
}

function computeVerdict(
  item: MetaForgeItem,
  ardbData: ArdbItemDetail | null,
  allItems: MetaForgeItem[],
): StashVerdict {
  const sellValue = item.value ?? 0;

  // Recycle yields
  const recycleYields = (ardbData?.breaksInto ?? []).map((r) => {
    const recycledItem = allItems.find((i) => i.id === r.itemId);
    return {
      itemName: recycledItem?.name ?? r.itemId.replace(/_/g, " "),
      quantity: r.quantity,
      estimatedValue: (recycledItem?.value ?? 0) * r.quantity,
    };
  });

  const totalRecycleValue = recycleYields.reduce(
    (sum, y) => sum + y.estimatedValue,
    0,
  );

  // Crafting uses
  const craftingUses: string[] = [];
  if (ardbData?.craftingRequirement) {
    craftingUses.push("Used as crafting material");
  }

  // Verdict logic (same as useItemAdvisor)
  let verdict: AdvisorVerdict;
  let reasoning: string;

  if (craftingUses.length > 0) {
    verdict = "keep";
    reasoning =
      "This item is used in crafting recipes. Keep it until you have enough for your builds.";
  } else if (totalRecycleValue > sellValue * 1.2) {
    verdict = "recycle";
    reasoning = `Recycling yields ~${totalRecycleValue} total value, which is ${Math.round(((totalRecycleValue / (sellValue || 1)) - 1) * 100)}% more than selling.`;
  } else if (sellValue > 0) {
    verdict = "sell";
    reasoning = `No crafting use found. Selling for ${sellValue} is better than recycling (~${totalRecycleValue}).`;
  } else {
    verdict = "recycle";
    reasoning = "No sell value detected. Recycle for components.";
  }

  return {
    item,
    verdict,
    reasoning,
    sellValue,
    recycleValue: totalRecycleValue,
    craftingUses,
    recycleYields: recycleYields.map((y) => ({
      itemName: y.itemName,
      quantity: y.quantity,
    })),
  };
}

export function useStashOrganizer() {
  const [verdicts, setVerdicts] = useState<StashVerdict[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const analyze = useCallback(async () => {
    setLoading(true);
    setError(null);
    abortRef.current = false;

    try {
      const allItems = await fetchAllItems();
      if (abortRef.current) return;

      const results: StashVerdict[] = [];

      // Process in batches of BATCH_CONCURRENCY
      for (let i = 0; i < allItems.length; i += BATCH_CONCURRENCY) {
        if (abortRef.current) return;
        const batch = allItems.slice(i, i + BATCH_CONCURRENCY);

        const batchResults = await Promise.all(
          batch.map(async (item) => {
            let ardbData: ArdbItemDetail | null = null;
            try {
              ardbData = await fetchItemDetail(item.id);
            } catch {
              // Skip on 429 or error — verdict still works without ARDB data
            }
            return computeVerdict(item, ardbData, allItems);
          }),
        );

        results.push(...batchResults);
      }

      if (!abortRef.current) {
        setVerdicts(results);
      }
    } catch (e: any) {
      if (!abortRef.current) {
        setError(e?.message ?? "Failed to analyze stash");
      }
    } finally {
      if (!abortRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Auto-run on mount
  useEffect(() => {
    analyze();
    return () => {
      abortRef.current = true;
    };
  }, [analyze]);

  const stats: StashStats = {
    keepCount: verdicts.filter((v) => v.verdict === "keep").length,
    sellCount: verdicts.filter((v) => v.verdict === "sell").length,
    recycleCount: verdicts.filter((v) => v.verdict === "recycle").length,
    totalSellValue: verdicts
      .filter((v) => v.verdict === "sell")
      .reduce((sum, v) => sum + v.sellValue, 0),
    totalRecycleValue: verdicts
      .filter((v) => v.verdict === "recycle")
      .reduce((sum, v) => sum + v.recycleValue, 0),
  };

  return { verdicts, loading, error, refresh: analyze, stats };
}
