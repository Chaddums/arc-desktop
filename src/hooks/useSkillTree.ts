/**
 * useSkillTree — Skill node viewer with allocation persistence.
 */

import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchSkillNodes } from "../services/raidtheory";
import type { SkillNode } from "../types";

const STORAGE_KEY = "@arcview/skill_allocations";

export function useSkillTree() {
  const [skillNodes, setSkillNodes] = useState<SkillNode[]>([]);
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nodes = await fetchSkillNodes();
      setSkillNodes(Array.isArray(nodes) ? nodes : []);
    } catch (e: any) {
      setError(e.message || "Failed to load skill nodes");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load allocations from storage
  useEffect(() => {
    loadData();
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setAllocations(JSON.parse(raw));
        } catch {}
      }
    }).catch(() => {});
  }, [loadData]);

  const persistAllocations = useCallback((updated: Record<string, number>) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  }, []);

  const allocateSkill = useCallback(
    (nodeId: string) => {
      const node = skillNodes.find((n) => n.id === nodeId);
      if (!node) return;
      const current = allocations[nodeId] ?? 0;
      const max = node.maxPoints ?? 1;
      if (current >= max) return;
      const updated = { ...allocations, [nodeId]: current + 1 };
      setAllocations(updated);
      persistAllocations(updated);
    },
    [skillNodes, allocations, persistAllocations]
  );

  const deallocateSkill = useCallback(
    (nodeId: string) => {
      const current = allocations[nodeId] ?? 0;
      if (current <= 0) return;
      const updated = { ...allocations, [nodeId]: current - 1 };
      setAllocations(updated);
      persistAllocations(updated);
    },
    [allocations, persistAllocations]
  );

  return {
    skillNodes,
    allocations,
    selectedNode,
    setSelectedNode,
    allocateSkill,
    deallocateSkill,
    loading,
    error,
    refresh: loadData,
  };
}
