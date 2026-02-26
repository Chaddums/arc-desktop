/**
 * useCraftingProfit — Recipe cost vs sell value calculation.
 */

import { useState, useEffect, useMemo } from "react";
import { fetchAllItems } from "../services/metaforge";
import type { MetaForgeItem, CraftingProfitResult, ArdbItemDetail } from "../types";

export function useCraftingProfit(itemDetails: Map<string, ArdbItemDetail>) {
  const [items, setItems] = useState<MetaForgeItem[]>([]);

  useEffect(() => {
    fetchAllItems()
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const profits = useMemo<CraftingProfitResult[]>(() => {
    const results: CraftingProfitResult[] = [];
    const itemMap = new Map(items.map((i) => [i.id, i]));

    for (const [id, detail] of itemDetails) {
      if (!detail.craftingRequirement || detail.craftingRequirement.length === 0) continue;
      const item = itemMap.get(id);
      if (!item || !item.value) continue;

      const costs = detail.craftingRequirement.map((req) => {
        const reqItem = itemMap.get(req.itemId);
        const unitValue = reqItem?.value ?? 0;
        return {
          itemId: req.itemId,
          itemName: req.itemName,
          quantity: req.quantity,
          unitValue,
          totalValue: unitValue * req.quantity,
        };
      });

      const totalCost = costs.reduce((sum, c) => sum + c.totalValue, 0);
      const sellValue = item.value;
      const profitMargin = totalCost > 0 ? (sellValue - totalCost) / totalCost : 0;

      results.push({
        itemName: item.name,
        costs,
        totalCost,
        sellValue,
        profitMargin,
        profitable: sellValue > totalCost,
      });
    }

    return results.sort((a, b) => b.profitMargin - a.profitMargin);
  }, [items, itemDetails]);

  return { profits };
}
