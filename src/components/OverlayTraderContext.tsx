/**
 * OverlayTraderContext — Context panel shown when trader menu detected.
 * Alerts player to check available quests and shows trader's quest count.
 * Tier 2 context-aware panel.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { RaidTheoryQuest } from "../types";
import { Colors, fonts } from "../theme";

interface Props {
  questsByTrader: Record<string, RaidTheoryQuest[]>;
  completedIds: Set<string>;
  headerColor?: string;
  borderColor?: string;
}

export default function OverlayTraderContext({ questsByTrader, completedIds, headerColor, borderColor }: Props) {
  // Find traders with available (incomplete) quests
  const tradersWithQuests = Object.entries(questsByTrader)
    .map(([trader, quests]) => ({
      trader,
      available: quests.filter((q) => !completedIds.has(q.id)).length,
      total: quests.length,
    }))
    .filter((t) => t.available > 0)
    .sort((a, b) => b.available - a.available);

  if (tradersWithQuests.length === 0) return null;

  const totalAvailable = tradersWithQuests.reduce((sum, t) => sum + t.available, 0);

  return (
    <View style={[styles.container, borderColor ? { borderColor } : undefined]}>
      <View style={styles.header}>
        <View style={styles.contextDot} />
        <Text style={[styles.headerText, headerColor ? { color: headerColor } : undefined]}>TRADER INTEL</Text>
      </View>

      {/* Alert banner */}
      <View style={styles.alertBanner}>
        <Text style={styles.alertIcon}>{"\u26A0"}</Text>
        <Text style={styles.alertText}>
          Check QUESTS tab! {totalAvailable} quest{totalAvailable !== 1 ? "s" : ""} available
        </Text>
      </View>

      {/* Trader quest counts */}
      {tradersWithQuests.slice(0, 4).map((t) => (
        <View key={t.trader} style={styles.traderRow}>
          <Text style={styles.traderName}>{t.trader}</Text>
          <Text style={styles.questCount}>
            {t.available} available
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
    backgroundColor: Colors.purple,
  },
  headerText: {
    fontSize: 8,
    fontWeight: "700",
    color: "rgba(107, 132, 152, 0.8)",
    letterSpacing: 1.2,
  },
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(230, 126, 34, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(230, 126, 34, 0.3)",
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginBottom: 4,
    gap: 4,
  },
  alertIcon: {
    fontSize: 10,
  },
  alertText: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.amber,
  },
  traderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 20,
  },
  traderName: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.text,
  },
  questCount: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.accent,
    fontFamily: fonts.mono,
  },
});
