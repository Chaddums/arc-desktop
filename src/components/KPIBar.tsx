/**
 * KPIBar — 3-cell stat bar adapted from LAMA's KPIBar.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../theme";
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
    borderRadius: 8,
    overflow: "hidden",
  },
  cell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  cellBorder: {
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  value: {
    fontSize: 18,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    color: Colors.accent,
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
