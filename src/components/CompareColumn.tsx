/**
 * CompareColumn — Side-by-side stat column for item comparison.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../theme";

interface CompareColumnProps {
  name: string;
  stats: { label: string; value: number | string }[];
  color?: string;
}

export default function CompareColumn({
  name,
  stats,
  color = Colors.accent,
}: CompareColumnProps) {
  return (
    <View style={styles.column}>
      <Text style={[styles.name, { color }]} numberOfLines={2}>{name}</Text>
      {stats.map((stat, i) => (
        <View key={i} style={styles.statRow}>
          <Text style={styles.label}>{stat.label}</Text>
          <Text style={styles.value}>{stat.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    flex: 1,
    padding: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center",
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  label: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  value: {
    fontSize: 12,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    color: Colors.text,
  },
});
