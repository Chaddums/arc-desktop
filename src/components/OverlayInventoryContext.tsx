/**
 * OverlayInventoryContext — Context panel shown when inventory/stash menu detected.
 * Shows stash verdicts (keep/sell/recycle counts) and items needed for active quests.
 * Tier 2 context-aware panel.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { StashStats } from "../hooks/useStashOrganizer";
import { Colors, fonts } from "../theme";

interface Props {
  stats: StashStats | null;
  loading: boolean;
  neededItems: { name: string; quantity: number; questName: string }[];
  headerColor?: string;
  borderColor?: string;
}

export default function OverlayInventoryContext({ stats, loading, neededItems, headerColor, borderColor }: Props) {
  const hasContent = stats || neededItems.length > 0;
  if (!hasContent && !loading) return null;

  return (
    <View style={[styles.container, borderColor ? { borderColor } : undefined]}>
      <View style={styles.header}>
        <View style={styles.contextDot} />
        <Text style={[styles.headerText, headerColor ? { color: headerColor } : undefined]}>INVENTORY INTEL</Text>
      </View>

      {loading && (
        <Text style={styles.loadingText}>Analyzing stash...</Text>
      )}

      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{stats.keepCount}</Text>
            <Text style={[styles.statLabel, { color: Colors.green }]}>KEEP</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{stats.sellCount}</Text>
            <Text style={[styles.statLabel, { color: Colors.amber }]}>SELL</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{stats.recycleCount}</Text>
            <Text style={[styles.statLabel, { color: Colors.accent }]}>RECYCLE</Text>
          </View>
          {stats.totalSellValue > 0 && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statBlock}>
                <Text style={[styles.statValue, { color: Colors.amber }]}>
                  {stats.totalSellValue.toLocaleString()}
                </Text>
                <Text style={styles.statLabel}>VALUE</Text>
              </View>
            </>
          )}
        </View>
      )}

      {neededItems.length > 0 && (
        <View style={styles.neededSection}>
          <Text style={styles.neededHeader}>QUEST ITEMS NEEDED</Text>
          {neededItems.slice(0, 4).map((item, i) => (
            <View key={i} style={styles.neededRow}>
              <Text style={styles.neededIcon}>{"\u25B8"}</Text>
              <Text style={styles.neededName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.neededQty}>{"\u00D7"}{item.quantity}</Text>
              <Text style={styles.neededQuest} numberOfLines={1}>
                {item.questName}
              </Text>
            </View>
          ))}
        </View>
      )}
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
    backgroundColor: Colors.amber,
  },
  headerText: {
    fontSize: 8,
    fontWeight: "700",
    color: "rgba(107, 132, 152, 0.8)",
    letterSpacing: 1.2,
  },
  loadingText: {
    fontSize: 9,
    color: Colors.textMuted,
    fontStyle: "italic",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  statBlock: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
    fontFamily: fonts.mono,
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    fontSize: 7,
    fontWeight: "700",
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: "rgba(42, 90, 106, 0.4)",
  },
  neededSection: {
    borderTopWidth: 1,
    borderTopColor: "rgba(42, 90, 106, 0.3)",
    paddingTop: 4,
  },
  neededHeader: {
    fontSize: 7,
    fontWeight: "700",
    color: "rgba(107, 132, 152, 0.6)",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  neededRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 18,
    gap: 4,
  },
  neededIcon: {
    fontSize: 7,
    color: Colors.accent,
  },
  neededName: {
    flex: 1,
    fontSize: 9,
    fontWeight: "600",
    color: Colors.text,
  },
  neededQty: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.accent,
    fontFamily: fonts.mono,
  },
  neededQuest: {
    fontSize: 8,
    color: Colors.textMuted,
    maxWidth: 80,
  },
});
