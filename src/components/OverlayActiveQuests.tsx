/**
 * OverlayActiveQuests — Tracked quests with current objective text.
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { RaidTheoryQuest } from "../types";
import { Colors } from "../theme";

interface Props {
  quests: RaidTheoryQuest[];
  completedIds: Set<string>;
  expanded: boolean;
  onToggle: () => void;
}

export default function OverlayActiveQuests({
  quests,
  completedIds,
  expanded,
  onToggle,
}: Props) {
  const active = quests.filter((q) => !completedIds.has(q.id)).slice(0, 3);
  if (active.length === 0) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onToggle} style={styles.header} activeOpacity={0.7}>
        <Text style={styles.headerText}>
          {expanded ? "\u25B4" : "\u25BE"} QUESTS ({active.length})
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.body}>
          {active.map((quest) => (
            <View key={quest.id} style={styles.row}>
              <View style={styles.textCol}>
                <Text style={styles.questName} numberOfLines={1}>
                  {quest.name.en}
                </Text>
                {quest.objectives && quest.objectives[0] && (
                  <Text style={styles.objective} numberOfLines={1}>
                    {quest.objectives[0]}
                  </Text>
                )}
              </View>
              {quest.trader && (
                <View style={styles.traderBadge}>
                  <Text style={styles.traderText}>
                    {quest.trader.slice(0, 3).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
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
    paddingHorizontal: 10,
  },
  header: {
    paddingVertical: 4,
  },
  headerText: {
    fontSize: 8,
    fontWeight: "700",
    color: "rgba(107, 132, 152, 0.8)",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  body: {
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 26,
    gap: 6,
  },
  textCol: {
    flex: 1,
  },
  questName: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.text,
  },
  objective: {
    fontSize: 9,
    color: Colors.textMuted,
    marginTop: 1,
  },
  traderBadge: {
    backgroundColor: "rgba(0, 180, 216, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(0, 180, 216, 0.3)",
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  traderText: {
    fontSize: 7,
    fontWeight: "700",
    color: Colors.accent,
    letterSpacing: 0.5,
  },
});
