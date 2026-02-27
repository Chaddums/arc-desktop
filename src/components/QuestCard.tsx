/**
 * QuestCard — Quest display with completion toggle.
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Colors } from "../theme";

interface QuestCardProps {
  name: string;
  trader?: string;
  xp?: number;
  isCompleted: boolean;
  onToggle: () => void;
  onPress?: () => void;
}

export default function QuestCard({
  name,
  trader,
  xp,
  isCompleted,
  onToggle,
  onPress,
}: QuestCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, isCompleted && styles.cardCompleted]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <TouchableOpacity
        style={[styles.checkbox, isCompleted && styles.checkboxChecked]}
        onPress={onToggle}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {isCompleted && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>
      <View style={styles.content}>
        <Text
          style={[styles.name, isCompleted && styles.nameCompleted]}
          numberOfLines={2}
        >
          {name}
        </Text>
        <View style={styles.meta}>
          {trader && <Text style={styles.trader}>{trader}</Text>}
          {xp != null && xp > 0 && (
            <Text style={styles.xp}>{xp.toLocaleString()} XP</Text>
          )}
        </View>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 4,
  },
  cardCompleted: {
    opacity: 0.6,
    borderColor: Colors.green,
    borderLeftWidth: 3,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.borderAccent,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  checkmark: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
  },
  nameCompleted: {
    textDecorationLine: "line-through",
    color: Colors.textSecondary,
  },
  meta: {
    flexDirection: "row",
    gap: 6,
    marginTop: 2,
  },
  trader: {
    fontSize: 11,
    color: Colors.accent,
    fontWeight: "600",
  },
  xp: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  chevron: {
    fontSize: 18,
    color: Colors.textMuted,
    marginLeft: 6,
  },
});
