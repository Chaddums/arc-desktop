/**
 * useItemAdvisor — Keep/sell/recycle verdict engine.
 */

import { useState, useCallback } from "react";
import { fetchItemDetail } from "../services/ardb";
import type { MetaForgeItem, AdvisorResult, AdvisorVerdict } from "../types";

export function useItemAdvisor(items: MetaForgeItem[]) {
  const [result, setResult] = useState<AdvisorResult | null>(null);

  const runAdvisor = useCallback(
    async (itemId: string) => {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      let ardbData = null;
      try {
        ardbData = await fetchItemDetail(itemId);
      } catch {}

      const sellValue = item.value ?? 0;

      // Calculate recycle yields
      const recycleYields = (ardbData?.breaksInto ?? []).map((r) => {
        const recycledItem = items.find((i) => i.id === r.itemId);
        const unitValue = recycledItem?.value ?? 0;
        return {
          itemId: r.itemId,
          itemName: recycledItem?.name ?? r.itemId.replace(/_/g, " "),
          quantity: r.quantity,
          estimatedValue: unitValue * r.quantity,
        };
      });

      const totalRecycleValue = recycleYields.reduce((sum, y) => sum + y.estimatedValue, 0);

      // Crafting uses
      const craftingUses: string[] = [];
      if (ardbData?.craftingRequirement) {
        craftingUses.push("Used as crafting material");
      }

      // Determine verdict
      let verdict: AdvisorVerdict;
      let reasoning: string;

      if (craftingUses.length > 0) {
        verdict = "keep";
        reasoning = "This item is used in crafting recipes. Keep it until you have enough for your builds.";
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

      setResult({
        verdict,
        sellValue,
        recycleYields,
        totalRecycleValue,
        reasoning,
        craftingUses,
      });
    },
    [items]
  );

  return { result, runAdvisor };
}
