/**
 * KPIBar — 3-cell stat bar adapted from LAMA's KPIBar.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors, spacing, fontSize as fs, fonts } from "../theme";
import type { KPICell } from "../types";

interface KPIBarProps {
  cells: KPICell[];
}

export default function KPIBar({ cells }: KPIBarProps) {
  return (
    <View style={styles.container}>
      {cells.map((cell, i) => (
        <View
          key={i}
          style={[styles.cell, i < cells.length - 1 && styles.cellBorder]}
        >
          <Text style={[styles.value, cell.color ? { color: cell.color } : null]}>
            {cell.value}
          </Text>
          <Text style={styles.label}>{cell.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
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
    borderRightColor: Colors.border,
  },
  value: {
    fontSize: fs.xl,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    color: Colors.accent,
  },
  label: {
    fontSize: fs.xs,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 1,
  },
});
