/**
 * OverlayMapIntel — In-game overlay panel showing intel for the current map.
 * Displays enemies, relevant quests, loot, and active events.
 */

import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { MapIntel } from "../hooks/useMapDetection";
import { Colors } from "../theme";

const THREAT_COLORS: Record<string, string> = {
  low: Colors.green,
  medium: Colors.amber,
  high: "#e74c3c",
  extreme: "#c0392b",
};

interface Props {
  intel: MapIntel | null;
}

export default function OverlayMapIntel({ intel }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [section, setSection] = useState<"enemies" | "quests" | "loot">("enemies");

  if (!intel) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.headerRow}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.headerLabel}>MAP INTEL</Text>
          <Text style={styles.mapName}>{intel.mapName}</Text>
          {intel.source === "ocr" && <Text style={styles.sourceTag}>OCR</Text>}
        </View>
        <Text style={styles.collapseIcon}>{expanded ? "\u25B4" : "\u25BE"}</Text>
      </TouchableOpacity>

      {expanded && (
        <>
          {/* Section tabs */}
          <View style={styles.tabRow}>
            {([
              { key: "enemies" as const, label: `THREATS (${intel.enemies.length})` },
              { key: "quests" as const, label: `QUESTS (${intel.quests.length})` },
              { key: "loot" as const, label: `LOOT (${intel.loot.length})` },
            ]).map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, section === tab.key && styles.tabActive]}
                onPress={() => setSection(tab.key)}
              >
                <Text style={[styles.tabText, section === tab.key && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Active events banner */}
          {intel.activeEvents.length > 0 && (
            <View style={styles.eventBanner}>
              {intel.activeEvents.map((ev, i) => (
                <Text key={i} style={styles.eventText}>
                  {"\u26A0"} {ev.name}
                </Text>
              ))}
            </View>
          )}

          {/* Enemies */}
          {section === "enemies" && (
            <View style={styles.sectionBody}>
              {intel.enemies.length === 0 ? (
                <Text style={styles.emptyText}>No known threats</Text>
              ) : (
                intel.enemies.slice(0, 8).map((enemy, i) => (
                  <View key={i} style={styles.enemyRow}>
                    <View
                      style={[
                        styles.threatDot,
                        { backgroundColor: THREAT_COLORS[enemy.threat.toLowerCase()] ?? Colors.textMuted },
                      ]}
                    />
                    <Text style={styles.enemyName} numberOfLines={1}>
                      {enemy.name}
                    </Text>
                    <Text style={[styles.threatLabel, { color: THREAT_COLORS[enemy.threat.toLowerCase()] ?? Colors.textSecondary }]}>
                      {enemy.threat}
                    </Text>
                    {enemy.weakness !== "None" && (
                      <Text style={styles.weakness}>
                        {"\u2022"} {enemy.weakness}
                      </Text>
                    )}
                  </View>
                ))
              )}
            </View>
          )}

          {/* Quests */}
          {section === "quests" && (
            <View style={styles.sectionBody}>
              {intel.quests.length === 0 ? (
                <Text style={styles.emptyText}>No active quests for this map</Text>
              ) : (
                intel.quests.slice(0, 6).map((quest) => (
                  <View key={quest.id} style={styles.questRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.questName} numberOfLines={1}>
                        {quest.name}
                      </Text>
                      {quest.trader && (
                        <Text style={styles.questTrader}>{quest.trader}</Text>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* Loot */}
          {section === "loot" && (
            <View style={styles.sectionBody}>
              {intel.loot.length === 0 ? (
                <Text style={styles.emptyText}>No known drops</Text>
              ) : (
                <View style={styles.lootGrid}>
                  {intel.loot.map((item, i) => (
                    <Text key={i} style={styles.lootItem} numberOfLines={1}>
                      {"\u2022"} {item}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(10, 14, 18, 0.90)",
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "rgba(42, 90, 106, 0.6)",
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    paddingHorizontal: 10,
    paddingBottom: 6,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerLabel: {
    fontSize: 8,
    fontWeight: "700",
    color: "rgba(107, 132, 152, 0.8)",
    letterSpacing: 1.2,
  },
  mapName: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.accent,
  },
  sourceTag: {
    fontSize: 7,
    fontWeight: "700",
    color: Colors.green,
    backgroundColor: "rgba(39, 174, 96, 0.15)",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    letterSpacing: 0.5,
    overflow: "hidden",
  },
  collapseIcon: {
    fontSize: 10,
    color: "rgba(107, 132, 152, 0.8)",
  },
  tabRow: {
    flexDirection: "row",
    gap: 2,
    marginBottom: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 3,
    alignItems: "center",
    borderRadius: 3,
    backgroundColor: "rgba(42, 90, 106, 0.15)",
  },
  tabActive: {
    backgroundColor: "rgba(0, 180, 216, 0.2)",
  },
  tabText: {
    fontSize: 8,
    fontWeight: "700",
    color: "rgba(107, 132, 152, 0.7)",
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: Colors.accent,
  },
  eventBanner: {
    backgroundColor: "rgba(230, 126, 34, 0.12)",
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginBottom: 4,
  },
  eventText: {
    fontSize: 9,
    fontWeight: "600",
    color: Colors.amber,
  },
  sectionBody: {
    paddingBottom: 2,
  },
  emptyText: {
    fontSize: 9,
    color: Colors.textMuted,
    textAlign: "center",
    paddingVertical: 4,
  },
  enemyRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 22,
    gap: 6,
  },
  threatDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  enemyName: {
    flex: 1,
    fontSize: 10,
    fontWeight: "600",
    color: Colors.text,
  },
  threatLabel: {
    fontSize: 8,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  weakness: {
    fontSize: 8,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  questRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
  },
  questName: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.text,
  },
  questTrader: {
    fontSize: 8,
    fontWeight: "600",
    color: Colors.accent,
    marginTop: 1,
  },
  lootGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
  },
  lootItem: {
    fontSize: 9,
    color: Colors.textSecondary,
    width: "48%",
  },
});
