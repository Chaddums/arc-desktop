/**
 * StatBar — Horizontal stat comparison bar with label, value, and quality label.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../theme";

interface StatBarProps {
  label: string;
  value: number;
  maxValue: number;
  color?: string;
  showValue?: boolean;
}

export default function StatBar({
  label,
  value,
  maxValue,
  color = Colors.accent,
  showValue = true,
}: StatBarProps) {
  const pct = maxValue > 0 ? Math.min(1, value / maxValue) : 0;
  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: Colors.textSecondary }]}>{label}</Text>
        {showValue && <Text style={[styles.value, { color: Colors.text }]}>{value}</Text>}
      </View>
      <View style={[styles.track, { backgroundColor: Colors.border }]}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 6,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 11,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  track: {
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: {
    height: 5,
    borderRadius: 3,
  },
});
