/**
 * OverlaySquadLoadout — Teammate gear loadout per member (4 slots).
 * Shows weapon / shield / backpack / explosive with separators.
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { SquadInfo } from "../types";
import { Colors } from "../theme";

interface Props {
  squad: SquadInfo | null;
  expanded: boolean;
  onToggle: () => void;
  headerColor?: string;
  borderColor?: string;
}

function formatGear(member: { weapon?: string; shield?: string; backpack?: string; explosive?: string }) {
  const items = [
    member.weapon || "--",
    member.shield || "--",
    member.backpack || "--",
    member.explosive || "--",
  ];
  return items.join(" / ");
}

export default function OverlaySquadLoadout({ squad, expanded, onToggle, headerColor, borderColor }: Props) {
  if (!squad || squad.members.length === 0) return null;

  return (
    <View style={[styles.container, borderColor ? { borderColor } : undefined]}>
      <TouchableOpacity onPress={onToggle} style={styles.header} activeOpacity={0.7}>
        <Text style={[styles.headerText, headerColor ? { color: headerColor } : undefined]}>
          {expanded ? "\u25B4" : "\u25BE"} SQUAD ({squad.members.length})
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.body}>
          {squad.members.map((member) => (
            <View key={member.accountId} style={styles.memberBlock}>
              <View style={styles.nameRow}>
                <View
                  style={[
                    styles.dot,
                    member.isOnline ? styles.dotOnline : styles.dotOffline,
                  ]}
                />
                <Text style={styles.memberName} numberOfLines={1}>
                  {member.displayName}
                </Text>
              </View>
              <Text style={styles.gearLine} numberOfLines={1}>
                {formatGear(member)}
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
  memberBlock: {
    marginBottom: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 18,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotOnline: {
    backgroundColor: Colors.statusOnline,
  },
  dotOffline: {
    backgroundColor: Colors.statusOffline,
  },
  memberName: {
    flex: 1,
    fontSize: 10,
    fontWeight: "600",
    color: Colors.text,
  },
  gearLine: {
    fontSize: 9,
    color: Colors.textSecondary,
    paddingLeft: 12,
    marginTop: -1,
  },
});
