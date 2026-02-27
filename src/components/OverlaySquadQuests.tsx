/**
 * OverlaySquadQuests — Compact in-game overlay showing squad members' quest progress.
 * Renders below the OverlayChecklist in the overlay window.
 */

import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSquad } from "../hooks/useSquad";
import { useQuestTracker } from "../hooks/useQuestTracker";
import { loc } from "../utils/loc";
import { Colors } from "../theme";

const ROW_HEIGHT = 24;

export default function OverlaySquadQuests() {
  const { squad, toggleMemberQuest } = useSquad();
  const { questsByTrader } = useQuestTracker();
  const allQuests = Object.values(questsByTrader).flat();
  const [expanded, setExpanded] = useState(true);

  if (!squad || squad.members.length === 0) return null;

  // Only show members who have tracked quests
  const membersWithQuests = squad.members.filter(
    (m) => (m.activeQuestIds ?? []).length > 0 || (m.completedQuestIds ?? []).length > 0
  );

  if (membersWithQuests.length === 0) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.headerRow}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <Text style={styles.headerText}>SQUAD QUESTS</Text>
        <Text style={styles.collapseIcon}>{expanded ? "\u25B4" : "\u25BE"}</Text>
      </TouchableOpacity>

      {expanded &&
        membersWithQuests.map((member) => {
          const active = member.activeQuestIds ?? [];
          const completed = member.completedQuestIds ?? [];
          const allIds = [...active, ...completed.filter((id) => !active.includes(id))];
          const doneCount = completed.length;

          return (
            <View key={member.accountId} style={styles.memberBlock}>
              <View style={styles.memberHeader}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: member.isOnline ? Colors.green : Colors.textMuted },
                  ]}
                />
                <Text style={styles.memberName} numberOfLines={1}>
                  {member.displayName}
                </Text>
                <Text style={styles.memberProgress}>
                  {doneCount}/{allIds.length}
                </Text>
              </View>

              {allIds.map((questId) => {
                const quest = allQuests.find((q) => q.id === questId);
                const isDone = completed.includes(questId);
                return (
                  <TouchableOpacity
                    key={questId}
                    style={styles.questRow}
                    onPress={() => toggleMemberQuest(member.accountId, questId)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        isDone && styles.checkboxDone,
                      ]}
                    >
                      {isDone && <Text style={styles.checkmark}>{"\u2713"}</Text>}
                    </View>
                    <Text
                      style={[styles.questName, isDone && styles.questNameDone]}
                      numberOfLines={1}
                    >
                      {quest ? loc(quest.name) : questId}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(10, 14, 18, 0.88)",
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
  headerText: {
    fontSize: 8,
    fontWeight: "700",
    color: "rgba(107, 132, 152, 0.8)",
    letterSpacing: 1.2,
  },
  collapseIcon: {
    fontSize: 10,
    color: "rgba(107, 132, 152, 0.8)",
  },
  memberBlock: {
    marginBottom: 4,
  },
  memberHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  memberName: {
    flex: 1,
    fontSize: 10,
    fontWeight: "700",
    color: Colors.text,
  },
  memberProgress: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.accent,
    fontVariant: ["tabular-nums"],
  },
  questRow: {
    flexDirection: "row",
    alignItems: "center",
    height: ROW_HEIGHT,
    paddingLeft: 12,
  },
  checkbox: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: Colors.borderAccent,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  checkboxDone: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  checkmark: {
    fontSize: 9,
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
