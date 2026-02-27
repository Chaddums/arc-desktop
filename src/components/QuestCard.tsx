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
      style={[
        styles.card,
        { backgroundColor: Colors.card, borderColor: Colors.border },
        isCompleted && { opacity: 0.6, borderColor: Colors.green, borderLeftWidth: 3 },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <TouchableOpacity
        style={[
          styles.checkbox,
          { borderColor: Colors.borderAccent },
          isCompleted && { backgroundColor: Colors.green, borderColor: Colors.green },
        ]}
        onPress={onToggle}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {isCompleted && <Text style={styles.checkmark}>{"\u2713"}</Text>}
      </TouchableOpacity>
      <View style={styles.content}>
        <Text
          style={[
            styles.name,
            { color: Colors.text },
            isCompleted && { textDecorationLine: "line-through", color: Colors.textSecondary },
          ]}
          numberOfLines={2}
        >
          {name}
        </Text>
        <View style={styles.meta}>
          {trader && <Text style={[styles.trader, { color: Colors.accent }]}>{trader}</Text>}
          {xp != null && xp > 0 && (
            <Text style={[styles.xp, { color: Colors.textSecondary }]}>{xp.toLocaleString()} XP</Text>
          )}
        </View>
      </View>
      <Text style={[styles.chevron, { color: Colors.textMuted }]}>{"\u203A"}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
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
  },
  meta: {
    flexDirection: "row",
    gap: 6,
    marginTop: 2,
  },
  trader: {
    fontSize: 11,
    fontWeight: "600",
  },
  xp: {
    fontSize: 11,
  },
  chevron: {
    fontSize: 18,
    marginLeft: 6,
  },
});
