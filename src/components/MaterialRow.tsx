/**
 * MaterialRow — Displays a material with quantity and source badges.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../theme";
import type { MaterialRequirement } from "../utils/materialCalculator";

interface MaterialRowProps {
  material: MaterialRequirement;
}

export default function MaterialRow({ material }: MaterialRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text style={styles.name}>{material.itemName}</Text>
        <View style={styles.sources}>
          {material.sources.map((src, i) => (
            <View
              key={i}
              style={[
                styles.badge,
                src.type === "bot_drop" && styles.badgeDrop,
                src.type === "map_loot" && styles.badgeMap,
                src.type === "trade" && styles.badgeTrade,
              ]}
            >
              <Text style={styles.badgeText}>
                {src.type === "bot_drop"
                  ? `Drop: ${src.name}`
                  : src.type === "map_loot"
                  ? `Map: ${src.name}`
                  : `Trade: ${src.name}`}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <Text style={styles.quantity}>x{material.quantity}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 4,
  },
  sources: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  badgeDrop: {
    backgroundColor: "rgba(192, 57, 43, 0.2)",
  },
  badgeMap: {
    backgroundColor: "rgba(0, 180, 216, 0.2)",
  },
  badgeTrade: {
    backgroundColor: "rgba(45, 155, 78, 0.2)",
  },
  badgeText: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  quantity: {
    fontSize: 16,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    color: Colors.accent,
    marginLeft: 12,
  },
});
