/**
 * useItemBrowser — Item list with category pills + search + detail.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { fetchAllItems } from "../services/metaforge";
import { fetchItemDetail } from "../services/ardb";
import type { MetaForgeItem, ArdbItemDetail } from "../types";

export function useItemBrowser() {
  const [items, setItems] = useState<MetaForgeItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [ardbDetail, setArdbDetail] = useState<ArdbItemDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllItems();
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || "Failed to load items");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Load ardb detail when item selected
  useEffect(() => {
    if (!selectedItem) {
      setArdbDetail(null);
      return;
    }
    fetchItemDetail(selectedItem)
      .then(setArdbDetail)
      .catch(() => setArdbDetail(null));
  }, [selectedItem]);

  const itemDetail = useMemo(() => {
    if (!selectedItem) return null;
    return items.find((i) => i.id === selectedItem) ?? null;
  }, [selectedItem, items]);

  return {
    items,
    search,
    setSearch,
    selectedCategory,
    setSelectedCategory,
    selectedItem,
    setSelectedItem,
    itemDetail,
    ardbDetail,
    loading,
    error,
    refresh: loadItems,
  };
}
