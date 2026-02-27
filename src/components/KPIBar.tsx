/**
 * KPIBar — 3-cell stat bar adapted from LAMA's KPIBar.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors, spacing, fontSize as fs } from "../theme";
import type { KPICell } from "../types";

interface KPIBarProps {
  cells: KPICell[];
}

export default function KPIBar({ cells }: KPIBarProps) {
  return (
    <View style={[styles.container, { backgroundColor: Colors.card, borderColor: Colors.border }]}>
      {cells.map((cell, i) => (
        <View
          key={i}
          style={[styles.cell, i < cells.length - 1 && [styles.cellBorder, { borderRightColor: Colors.border }]]}
        >
          <Text style={[styles.value, { color: cell.color || Colors.accent }]}>
            {cell.value}
          </Text>
          <Text style={[styles.label, { color: Colors.textSecondary }]}>{cell.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 6,
    overflow: "hidden",
  },
  cell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  cellBorder: {
    borderRightWidth: 1,
  },
  value: {
    fontSize: fs.xl,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  label: {
    fontSize: fs.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 1,
  },
});
