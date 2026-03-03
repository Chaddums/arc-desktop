/**
 * OverlayDailyQuests — Manual daily quest tracking overlay panel.
 * Shows user-added daily quests with checkboxes. Auto-minimizes when all checked.
 * Tier 1 HUD panel.
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { DailyQuest } from "../hooks/useDailyQuests";
import { Colors } from "../theme";

interface Props {
  quests: DailyQuest[];
  allChecked: boolean;
  onToggle: (id: string) => void;
  expanded: boolean;
  onToggleExpand: () => void;
  headerColor?: string;
  borderColor?: string;
}

export default function OverlayDailyQuests({
  quests,
  allChecked,
  onToggle,
  expanded,
  onToggleExpand,
  headerColor,
  borderColor,
}: Props) {
  const doneCount = quests.filter((q) => q.checked).length;
  // Auto-minimize when all done: show collapsed even if expanded
  const showBody = expanded && !allChecked;

  return (
    <View style={[styles.container, borderColor ? { borderColor } : undefined]}>
      <TouchableOpacity onPress={onToggleExpand} style={styles.header} activeOpacity={0.7}>
        <Text style={[styles.headerText, headerColor ? { color: headerColor } : undefined]}>
          {showBody ? "\u25B4" : "\u25BE"} DAILIES ({doneCount}/{quests.length})
        </Text>
        {allChecked && (
          <Text style={styles.doneTag}>ALL DONE</Text>
        )}
      </TouchableOpacity>

      {showBody && (
        <View style={styles.body}>
          {quests.map((quest) => (
            <TouchableOpacity
              key={quest.id}
              style={styles.row}
              onPress={() => onToggle(quest.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, quest.checked && styles.checkboxDone]}>
                {quest.checked && <Text style={styles.checkmark}>{"\u2713"}</Text>}
              </View>
              <Text
                style={[styles.questName, quest.checked && styles.questNameDone]}
                numberOfLines={1}
              >
                {quest.name}
              </Text>
            </TouchableOpacity>
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
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    gap: 6,
  },
  headerText: {
    fontSize: 8,
    fontWeight: "700",
    color: "rgba(107, 132, 152, 0.8)",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  doneTag: {
    fontSize: 7,
    fontWeight: "700",
    color: Colors.green,
    letterSpacing: 0.5,
  },
  body: {
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    height: 24,
  },
  checkbox: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: "rgba(42, 90, 106, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  checkboxDone: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  checkmark: {
    fontSize: 8,
    color: "#fff",
    fontWeight: "700",
  },
  questName: {
    flex: 1,
    fontSize: 10,
    color: Colors.text,
    fontWeight: "500",
  },
  questNameDone: {
    textDecorationLine: "line-through",
    color: Colors.textMuted,
  },
});
