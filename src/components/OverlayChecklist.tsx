/**
 * OverlayChecklist — Compact vertical checklist rendered below the HUD strip.
 * Only visible when items have been pinned.
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useLoadoutChecklist } from "../hooks/useLoadoutChecklist";
import { Colors } from "../theme";

export default function OverlayChecklist() {
  const { items, toggleItem, clearChecked } = useLoadoutChecklist();

  if (items.length === 0) return null;

  const hasChecked = items.some((it) => it.checked);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerText}>CHECKLIST</Text>
        {hasChecked && (
          <TouchableOpacity onPress={clearChecked}>
            <Text style={styles.clearText}>Clear done</Text>
          </TouchableOpacity>
        )}
      </View>
      {items.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.row}
          onPress={() => toggleItem(item.id)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, item.checked && styles.checkboxDone]}>
            {item.checked && <Text style={styles.checkmark}>{"\u2713"}</Text>}
          </View>
          <Text
            style={[styles.itemName, item.checked && styles.itemNameDone]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          {item.quantity > 1 && (
            <Text style={styles.quantity}>{"\u00D7"}{item.quantity}</Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(10, 14, 18, 0.85)",
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
  clearText: {
    fontSize: 9,
    color: Colors.accent,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    height: 28,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.borderAccent,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  checkboxDone: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  checkmark: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "700",
  },
  itemName: {
    flex: 1,
    fontSize: 11,
    color: Colors.text,
    fontWeight: "500",
  },
  itemNameDone: {
    textDecorationLine: "line-through",
    color: Colors.textMuted,
  },
  quantity: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: "600",
    marginLeft: 6,
  },
});
