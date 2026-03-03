/**
 * OverlayWorkshopContext — Context panel shown when workshop/crafting menu detected.
 * Lists all workbenches and what they craft, highlights active bench.
 * Tier 2 context-aware panel.
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import type { MetaForgeItem } from "../types";
import { Colors, fonts } from "../theme";

interface Props {
  items: MetaForgeItem[];
  headerColor?: string;
  borderColor?: string;
}

interface BenchInfo {
  benchName: string;
  craftCount: number;
  topCrafts: string[];
}

export default function OverlayWorkshopContext({ items, headerColor, borderColor }: Props) {
  const benches = useMemo<BenchInfo[]>(() => {
    // Group items by workbench
    const benchMap = new Map<string, MetaForgeItem[]>();
    for (const item of items) {
      const bench = item.workbench;
      if (!bench) continue;
      const existing = benchMap.get(bench) ?? [];
      existing.push(item);
      benchMap.set(bench, existing);
    }

    return Array.from(benchMap.entries())
      .map(([benchName, craftItems]) => ({
        benchName,
        craftCount: craftItems.length,
        topCrafts: craftItems
          .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
          .slice(0, 3)
          .map((it) => it.name),
      }))
      .sort((a, b) => b.craftCount - a.craftCount);
  }, [items]);

  if (benches.length === 0) return null;

  return (
    <View style={[styles.container, borderColor ? { borderColor } : undefined]}>
      <View style={styles.header}>
        <View style={styles.contextDot} />
        <Text style={[styles.headerText, headerColor ? { color: headerColor } : undefined]}>WORKSHOP GUIDE</Text>
      </View>

      {benches.slice(0, 5).map((bench) => (
        <View key={bench.benchName} style={styles.benchBlock}>
          <View style={styles.benchRow}>
            <Text style={styles.benchName}>{bench.benchName}</Text>
            <Text style={styles.craftCount}>{bench.craftCount} items</Text>
          </View>
          <Text style={styles.topCrafts} numberOfLines={1}>
            {bench.topCrafts.join(" \u2022 ")}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(10, 14, 18, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(42, 90, 106, 0.6)",
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  contextDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.green,
  },
  headerText: {
    fontSize: 8,
    fontWeight: "700",
    color: "rgba(107, 132, 152, 0.8)",
    letterSpacing: 1.2,
  },
  benchBlock: {
    marginBottom: 4,
  },
  benchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  benchName: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.text,
  },
  craftCount: {
    fontSize: 9,
    fontWeight: "600",
    color: Colors.accent,
    fontFamily: fonts.mono,
  },
  topCrafts: {
    fontSize: 8,
    color: Colors.textMuted,
    marginTop: 1,
  },
});
